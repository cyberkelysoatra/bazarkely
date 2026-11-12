// Pure computations of module 5 "Les chiffres clés" (all integers in ariary). No React here.
import type { Ligne, Montant, Plan } from '../types';
import { ariary, grouper, pluriel } from './format';

const val = (m: Montant | undefined): number => (typeof m === 'number' && Number.isFinite(m) ? m : 0);
const rempli = (m: Montant | undefined): m is number => typeof m === 'number' && Number.isFinite(m);
export const somme = (lignes: Ligne[]): number => lignes.reduce((t, l) => t + val(l.montant), 0);

export interface Annee {
  quantites: number;
  ca: number;
  cv: number;
  marge: number;
  chargesFixesMois: number;
  chargesAnnee: number;
  resultat: number;
  impot: number | null;
  net: number | null;
}

export interface Chiffres {
  /** Coût variable unitaire (A) */
  coutUnitaire: number;
  /** Prix de vente (B), null when not typed */
  prix: number | null;
  marge: number | null;
  tauxMarge: number | null;
  /** Total des charges fixes par mois (C) */
  chargesFixes: number;
  seuilMois: number | null;
  seuilJour: number | null;
  investissements: number;
  stock: number;
  fondsPropose: number;
  fondsRetenu: number;
  besoins: number;
  ressources: number;
  ecart: number;
  annees: (Annee | null)[];
}

export function chargesFixesMois(m5: Plan['m5']): number {
  const c = m5.chargesFixes;
  return val(c.loyer) + val(c.salaires) + val(c.energie) + val(c.transport) + val(c.telephone) + val(c.autres) + somme(c.lignes);
}

export function calculer(plan: Plan): Chiffres {
  const m5 = plan.m5;
  const A = somme(m5.couts);
  const B = rempli(m5.prixVente) ? m5.prixVente : null;
  const marge = B === null ? null : B - A;
  const tauxMarge = B === null || B === 0 || marge === null ? null : Math.round((marge / B) * 100);
  const C = chargesFixesMois(m5);
  const seuilMois = marge !== null && marge > 0 ? Math.ceil(C / marge) : null;
  const seuilJour = seuilMois !== null && m5.joursParMois > 0 ? Math.ceil(seuilMois / m5.joursParMois) : null;
  const investissements = somme(m5.investissements);
  const stock = val(m5.stockDepart);
  const fondsPropose = 3 * C + stock;
  const fondsRetenu = rempli(m5.fondsRoulementSaisi) ? m5.fondsRoulementSaisi : fondsPropose;
  // The starting stock is inside the working capital: never added a second time.
  const besoins = investissements + fondsRetenu;
  const r = m5.ressources;
  const ressources = val(r.apport) + val(r.subvention) + val(r.pret) + val(r.autre);
  const ecart = ressources - besoins;

  const annees = m5.annees.slice(0, 3).map((a, i): Annee | null => {
    if (!rempli(a.ventesParMois)) return null;
    const quantites = a.ventesParMois * 12;
    const prix = B ?? 0;
    const ca = quantites * prix;
    const cv = quantites * A;
    const margeTotale = ca - cv;
    const cfm = i === 0 ? C : rempli(a.chargesFixesMois) ? a.chargesFixesMois : C;
    const chargesAnnee = cfm * 12;
    const resultat = margeTotale - chargesAnnee;
    const impot = rempli(m5.tauxImpot) ? Math.round((Math.max(resultat, 0) * m5.tauxImpot) / 100) : null;
    const net = impot === null ? null : resultat - impot;
    return { quantites, ca, cv, marge: margeTotale, chargesFixesMois: cfm, chargesAnnee, resultat, impot, net };
  });

  return { coutUnitaire: A, prix: B, marge, tauxMarge, chargesFixes: C, seuilMois, seuilJour, investissements, stock, fondsPropose, fondsRetenu, besoins, ressources, ecart, annees };
}

export type CleAlerte = 'marge' | 'seuil' | 'financement' | 'fonds';
export interface AlerteChiffres {
  cle: CleAlerte;
  /** Subsection where the alert belongs (5a to 5f). */
  section: '5a' | '5b' | '5c' | '5d';
  texte: string;
}

/** Alerts of module 5, each one only when its inputs are filled. */
export function alertes(plan: Plan, c: Chiffres = calculer(plan)): AlerteChiffres[] {
  const m5 = plan.m5;
  const out: AlerteChiffres[] = [];
  const coutSaisi = m5.couts.some((l) => rempli(l.montant));

  if (c.marge !== null && coutSaisi && c.marge <= 0) {
    out.push({ cle: 'marge', section: '5a', texte: "Votre prix ne couvre pas le coût d'une unité : chaque vente vous fait perdre de l'argent." });
  }

  const ventes = m5.annees[0]?.ventesParMois;
  if (c.seuilMois !== null && c.chargesFixes > 0 && rempli(ventes) && c.seuilMois > ventes) {
    out.push({
      cle: 'seuil',
      section: '5d',
      texte: `Pour ne pas perdre d'argent, il faut vendre ${grouper(c.seuilMois)} ${pluriel(plan.uniteVente, c.seuilMois)} par mois. Vous en prévoyez ${grouper(ventes)}.`
    });
  }

  const r = m5.ressources;
  const ressourceSaisie = [r.apport, r.subvention, r.pret, r.autre].some(rempli);
  const besoinSaisi = m5.investissements.some((l) => rempli(l.montant)) || rempli(m5.stockDepart) || rempli(m5.fondsRoulementSaisi) || c.chargesFixes > 0;
  if (ressourceSaisie && besoinSaisi && c.ecart !== 0) {
    out.push({
      cle: 'financement',
      section: '5c',
      texte: c.ecart < 0 ? `Il manque ${grouper(-c.ecart)} Ar pour financer le démarrage.` : `Vos ressources dépassent vos besoins de ${grouper(c.ecart)} Ar.`
    });
  }

  if (rempli(m5.fondsRoulementSaisi) && c.chargesFixes > 0 && m5.fondsRoulementSaisi < c.fondsPropose) {
    out.push({
      cle: 'fonds',
      section: '5c',
      texte: `Fonds de roulement trop faible : prévoyez au moins 3 mois de charges fixes (${grouper(3 * c.chargesFixes)} Ar) plus votre stock de départ.`
    });
  }
  return out;
}

/** Sentence of 5b: "Mon seuil de rentabilité : 750 bouteilles par mois, soit 30 par jour de travail." */
export function phraseSeuil(plan: Plan, c: Chiffres): string | null {
  if (c.seuilMois === null || c.chargesFixes <= 0) return null;
  const debut = `Mon seuil de rentabilité : ${grouper(c.seuilMois)} ${pluriel(plan.uniteVente, c.seuilMois)} par mois`;
  return c.seuilJour === null ? debut + '.' : `${debut}, soit ${grouper(c.seuilJour)} par jour de travail.`;
}

/** Plain text summary of module 5, for WhatsApp. No em dash, no en dash, no middle dot. */
export function texteChiffres(plan: Plan, c: Chiffres = calculer(plan)): string {
  const nom = plan.identite.nomProjet.trim() || 'Projet sans nom';
  const l: string[] = [`Mon business plan : ${nom}`, 'Chiffres clés (module 5)', ''];
  if (plan.uniteVente.trim()) l.push(`Unité de vente : ${plan.uniteVente.trim()}`);
  l.push(`Coût variable unitaire : ${ariary(c.coutUnitaire)}`);
  if (c.prix !== null) l.push(`Prix de vente : ${ariary(c.prix)}`);
  if (c.marge !== null) l.push(`Marge unitaire : ${ariary(c.marge)}${c.tauxMarge !== null ? ` (${c.tauxMarge} %)` : ''}`);
  l.push(`Charges fixes par mois : ${ariary(c.chargesFixes)}`);
  const seuil = phraseSeuil(plan, c);
  if (seuil) l.push(seuil.replace('Mon seuil de rentabilité', 'Seuil de rentabilité'));
  l.push('', `Besoins de démarrage : ${ariary(c.besoins)}`, `Ressources : ${ariary(c.ressources)}`);
  if (c.ecart !== 0) l.push(c.ecart < 0 ? `Il manque : ${ariary(-c.ecart)}` : `Excédent : ${ariary(c.ecart)}`);
  const annees = c.annees.map((a, i) => (a ? `Année ${i + 1} : chiffre d'affaires ${ariary(a.ca)}, résultat avant amortissements et avant impôt ${ariary(a.resultat)}${a.net !== null ? `, résultat net ${ariary(a.net)}` : ''}` : null)).filter((x): x is string => !!x);
  if (annees.length) l.push('', 'Résultats sur 3 ans', ...annees);
  l.push('', 'Fait avec Mon business plan, NEC 2026');
  return l.join('\n').replace(/[—–·]/g, ' ');
}
