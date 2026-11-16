// Pure computations of module 5 "Les chiffres clés" (all integers in ariary). No React here.
// NEC-CC-38: products with recipes, detailed investments, one list of resources (cahier CGA v0.3,
// rules R2, R3, R4, R7). Totals always cover every product; the "produit principal" is the first one.
import type { Composant, Ligne, M5, Montant, Plan, Produit } from '../types';
import { ariary, grouper, pluriel } from './format';

const val = (m: Montant | undefined): number => (typeof m === 'number' && Number.isFinite(m) ? m : 0);
const rempli = (m: Montant | undefined): m is number => typeof m === 'number' && Number.isFinite(m);
export const somme = (lignes: Ligne[]): number => lignes.reduce((t, l) => t + val(l.montant), 0);
/** Rounded to the ariary, safe from floating noise (900.0000000001 -> 900, 12.4999999999 -> 13). */
const arrondi = (x: number): number => Math.round(Math.round(x * 1e6) / 1e6);

// ---------- Units (R2) ----------
export const UNITES_BASE = ['piece', 'kg', 'g', 'l', 'ml'] as const;
/** "Pièce", " KG " -> "piece", "kg". */
export function normaliserUnite(u: string | undefined): string {
  const t = (u ?? '').trim().toLowerCase();
  if (!t || t === 'pièce' || t === 'pièces' || t === 'pieces') return 'piece';
  return t;
}
const FACTEUR: Record<string, { famille: 'masse' | 'volume'; f: number }> = { kg: { famille: 'masse', f: 1000 }, g: { famille: 'masse', f: 1 }, l: { famille: 'volume', f: 1000 }, ml: { famille: 'volume', f: 1 } };
/** Units the used quantity can be typed in, for a lot unit (g and kg, ml and l; else the lot unit only). */
export function unitesUtilisables(uniteLot: string): string[] {
  const u = normaliserUnite(uniteLot);
  const fam = FACTEUR[u]?.famille;
  if (!fam) return [u];
  return Object.keys(FACTEUR).filter((k) => FACTEUR[k].famille === fam);
}
/** Used unit actually applied: the typed one when it converts with the lot unit, else the lot unit. */
export function uniteUtiliseeEffective(c: Pick<Composant, 'uniteLot' | 'uniteUtilisee'>): string {
  const lot = normaliserUnite(c.uniteLot);
  const util = normaliserUnite(c.uniteUtilisee);
  return unitesUtilisables(lot).includes(util) ? util : lot;
}
/** "piece" -> "pièce", 2 -> "pièces"; other units as typed. */
export function libelleUnite(u: string, n = 1): string {
  const x = normaliserUnite(u);
  if (x === 'piece') return n > 1 ? 'pièces' : 'pièce';
  return x;
}

export interface CoutComposant {
  /** Cost for ONE unit sold, rounded to the ariary; null = not computable (ignored in the total). */
  cout: number | null;
  /** Price typed but lot quantity empty or 0: ignored and flagged (never NaN). */
  ignore: boolean;
}

/** R2: price of the lot ÷ quantity of the lot × quantity used, after unit conversion, rounded. */
export function coutComposant(c: Composant): CoutComposant {
  if (!rempli(c.prixLot)) return { cout: null, ignore: false };
  const q = c.quantiteLot;
  if (!rempli(q) || q <= 0) return { cout: null, ignore: true };
  if (!rempli(c.quantiteUtilisee)) return { cout: null, ignore: true };
  const lot = normaliserUnite(c.uniteLot);
  const util = uniteUtiliseeEffective(c);
  const facteur = FACTEUR[lot] && FACTEUR[util] ? FACTEUR[util].f / FACTEUR[lot].f : 1;
  return { cout: arrondi((c.prixLot * c.quantiteUtilisee * facteur) / q), ignore: false };
}

// ---------- Products (R3) ----------
export interface ChiffresProduit {
  id: string;
  nom: string;
  unite: string;
  /** Rank in the list (0 = produit principal). */
  rang: number;
  prix: number | null;
  ventesParMois: number | null;
  composants: CoutComposant[];
  /** Coût de revient par unité = sum of the computable components. */
  cout: number;
  /** At least one component with a computable cost. */
  coutCalcule: boolean;
  ignores: number;
  marge: number | null;
  /** Rounded to the unit (display). */
  tauxMarge: number | null;
  /** Per month (year 1): prix x ventes, cout x ventes. */
  caMois: number;
  cvMois: number;
}

export function chiffresProduit(p: Produit, rang = 0): ChiffresProduit {
  const composants = (p.composants ?? []).map(coutComposant);
  const cout = composants.reduce((t, x) => t + (x.cout ?? 0), 0);
  const prix = rempli(p.prix) ? p.prix : null;
  const marge = prix === null ? null : prix - cout;
  const tauxMarge = prix === null || prix === 0 || marge === null ? null : Math.round((marge / prix) * 100);
  const v = rempli(p.ventesParMois) ? p.ventesParMois : 0;
  return {
    id: p.id,
    nom: p.nom,
    unite: p.unite,
    rang,
    prix,
    ventesParMois: rempli(p.ventesParMois) ? p.ventesParMois : null,
    composants,
    cout,
    coutCalcule: composants.some((x) => x.cout !== null),
    ignores: composants.filter((x) => x.ignore).length,
    marge,
    tauxMarge,
    caMois: (prix ?? 0) * v,
    cvMois: cout * v
  };
}

/** Name shown for a product: typed name, else "Produit 2"; the first one is the "produit principal". */
export function nomProduit(p: { nom: string }, rang: number): string {
  return p.nom.trim() || `Produit ${rang + 1}`;
}

// ---------- Investments and resources (R5, R6, R7) ----------
/** R5: quantity x unit price (an empty quantity counts 1). */
export function totalInvestissement(i: { quantite: number | null; prixUnitaire: Montant }): number {
  if (!rempli(i.prixUnitaire)) return 0;
  return arrondi((rempli(i.quantite) ? i.quantite : 1) * i.prixUnitaire);
}

export interface Annee {
  /** Units sold in the year, all products added (meaningful for one product only). */
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
  produits: ChiffresProduit[];
  /** First product of the list (R8), null when the plan has no product. */
  principal: ChiffresProduit | null;
  /** Cost, price, margin and rate of the PRODUIT PRINCIPAL (R8). */
  coutUnitaire: number;
  prix: number | null;
  marge: number | null;
  tauxMarge: number | null;
  /** Totals per month of year 1, all products (R4). */
  caMois: number;
  cvMois: number;
  margeMois: number;
  /** Exact average margin rate (fraction, not rounded), null without turnover. */
  tauxMoyen: number | null;
  /** Total des charges fixes par mois (C) */
  chargesFixes: number;
  /** R4: break-even in TURNOVER (ariary) per month and per working day (null when not computable). */
  seuilCaMois: number | null;
  seuilCaJour: number | null;
  /** Only when the plan has exactly ONE product: break-even in units (sentence kept, R4). */
  seuilUnites: number | null;
  seuilUnitesJour: number | null;
  /** Bought investments (R5). */
  investissements: number;
  /** Equipment brought (resources of nature 'materiel'), added to the needs (R6). */
  apporte: number;
  stock: number;
  fondsPropose: number;
  fondsRetenu: number;
  besoins: number;
  ressources: number;
  ecart: number;
  annees: (Annee | null)[];
}

export function chargesFixesMois(m5: Pick<M5, 'chargesFixes'>): number {
  const c = m5.chargesFixes;
  return val(c.loyer) + val(c.salaires) + val(c.energie) + val(c.transport) + val(c.telephone) + val(c.autres) + somme(c.lignes);
}

/** ceil(a / b) for positive integers, exact (no floating error on an exact division). */
function plafondDivision(a: number, b: number): number {
  const q = Math.ceil(a / b - 1e-9);
  return q * b >= a ? q : q + 1;
}

/** R4: ceil(C / average rate) = ceil(C x turnover / margin), computed on integers. */
function seuilCa(C: number, ca: number, marge: number): number {
  const num = C * ca;
  if (Number.isSafeInteger(num) && Number.isSafeInteger(marge)) {
    const q = Math.floor(num / marge);
    // Correct a floating error of the quotient on very large values.
    for (let k = q - 1; k <= q + 1; k++) if (k * marge >= num) return k;
    return q + 1;
  }
  return Math.ceil(num / marge);
}

export function calculer(plan: Plan): Chiffres {
  const m5 = plan.m5;
  const produits = (m5.produits ?? []).map(chiffresProduit);
  const principal = produits[0] ?? null;
  const caMois = arrondi(produits.reduce((t, p) => t + p.caMois, 0));
  const cvMois = arrondi(produits.reduce((t, p) => t + p.cvMois, 0));
  const margeMois = caMois - cvMois;
  const tauxMoyen = caMois > 0 ? margeMois / caMois : null;
  const C = chargesFixesMois(m5);
  const jours = m5.joursParMois;
  const seuilCaMois = C > 0 && caMois > 0 && margeMois > 0 ? seuilCa(C, caMois, margeMois) : null;
  const seuilCaJour = seuilCaMois !== null && jours > 0 ? plafondDivision(seuilCaMois, jours) : null;
  // One product: the break-even in units stays (old sentence), from its unit margin.
  const seul = produits.length === 1 ? produits[0] : null;
  const seuilUnites = seul && seul.marge !== null && seul.marge > 0 && C > 0 ? plafondDivision(C, seul.marge) : null;
  const seuilUnitesJour = seuilUnites !== null && jours > 0 ? plafondDivision(seuilUnites, jours) : null;

  const investissements = (m5.investissements ?? []).reduce((t, i) => t + totalInvestissement(i), 0);
  const ressourcesListe = m5.ressources ?? [];
  const apporte = ressourcesListe.filter((r) => r.nature === 'materiel').reduce((t, r) => t + val(r.valeur), 0);
  const stock = val(m5.stockDepart);
  const fondsPropose = 3 * C + stock;
  const fondsRetenu = rempli(m5.fondsRoulementSaisi) ? m5.fondsRoulementSaisi : fondsPropose;
  // R7: the starting stock is inside the working capital, never added a second time.
  const besoins = investissements + apporte + fondsRetenu;
  const ressources = ressourcesListe.reduce((t, r) => t + val(r.valeur), 0);
  const ecart = ressources - besoins;

  // R3: year 1 from the sales typed per product; years 2 and 3 from one growth in % for all products.
  const avecVentes = produits.some((p) => p.ventesParMois !== null);
  const facteurs: (number | null)[] = [avecVentes ? 1 : null];
  const h = m5.hausses ?? [null, null];
  for (const k of [0, 1]) {
    const avant = facteurs[k];
    const hk = h[k];
    facteurs.push(avant !== null && rempli(hk) && hk > -100 ? avant * (1 + hk / 100) : null);
  }
  const annees = facteurs.map((f, i): Annee | null => {
    if (f === null) return null;
    const quantitesExactes = produits.reduce((t, p) => t + (p.ventesParMois ?? 0) * 12 * f, 0);
    const ca = arrondi(produits.reduce((t, p) => t + (p.prix ?? 0) * (p.ventesParMois ?? 0) * 12 * f, 0));
    const cv = arrondi(produits.reduce((t, p) => t + p.cout * (p.ventesParMois ?? 0) * 12 * f, 0));
    const margeTotale = ca - cv;
    const saisie = m5.annees?.[i]?.chargesFixesMois;
    const cfm = i === 0 ? C : rempli(saisie) ? saisie : C;
    const chargesAnnee = cfm * 12;
    const resultat = margeTotale - chargesAnnee;
    const impot = rempli(m5.tauxImpot) ? Math.round((Math.max(resultat, 0) * m5.tauxImpot) / 100) : null;
    const net = impot === null ? null : resultat - impot;
    return { quantites: arrondi(quantitesExactes * 100) / 100, ca, cv, marge: margeTotale, chargesFixesMois: cfm, chargesAnnee, resultat, impot, net };
  });

  return {
    produits,
    principal,
    coutUnitaire: principal?.cout ?? 0,
    prix: principal?.prix ?? null,
    marge: principal?.marge ?? null,
    tauxMarge: principal?.tauxMarge ?? null,
    caMois,
    cvMois,
    margeMois,
    tauxMoyen,
    chargesFixes: C,
    seuilCaMois,
    seuilCaJour,
    seuilUnites,
    seuilUnitesJour,
    investissements,
    apporte,
    stock,
    fondsPropose,
    fondsRetenu,
    besoins,
    ressources,
    ecart,
    annees
  };
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

  const perdants = c.produits.filter((p) => p.coutCalcule && p.marge !== null && p.marge <= 0);
  if (perdants.length) {
    const texte =
      c.produits.length === 1
        ? "Votre prix ne couvre pas le coût d'une unité : chaque vente vous fait perdre de l'argent."
        : `Le prix ne couvre pas le coût d'une unité pour ${perdants.map((p) => `« ${nomProduit(p, p.rang)} »`).join(', ')} : chaque vente vous fait perdre de l'argent.`;
    out.push({ cle: 'marge', section: '5a', texte });
  }

  if (c.chargesFixes > 0) {
    const seul = c.produits.length === 1 ? c.produits[0] : null;
    if (seul && c.seuilUnites !== null && seul.ventesParMois !== null && c.seuilUnites > seul.ventesParMois) {
      out.push({
        cle: 'seuil',
        section: '5d',
        texte: `Pour ne pas perdre d'argent, il faut vendre ${grouper(c.seuilUnites)} ${pluriel(seul.unite || plan.uniteVente, c.seuilUnites)} par mois. Vous en prévoyez ${grouper(seul.ventesParMois)}.`
      });
    } else if (!seul && c.seuilCaMois !== null && c.seuilCaMois > c.caMois) {
      out.push({
        cle: 'seuil',
        section: '5d',
        texte: `Pour ne pas perdre d'argent, il faut vendre pour ${ariary(c.seuilCaMois)} par mois. Vous prévoyez ${ariary(c.caMois)}.`
      });
    }
  }

  const ressourceSaisie = (m5.ressources ?? []).some((r) => rempli(r.valeur));
  const besoinSaisi = (m5.investissements ?? []).some((i) => rempli(i.prixUnitaire)) || rempli(m5.stockDepart) || rempli(m5.fondsRoulementSaisi) || c.chargesFixes > 0;
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

/** R4: "Mon seuil de rentabilité : 5 686 247 Ar de chiffre d'affaires par mois, soit 227 450 Ar par jour de travail." */
export function phraseSeuil(_plan: Plan, c: Chiffres): string | null {
  if (c.seuilCaMois === null || c.chargesFixes <= 0) return null;
  const debut = `Mon seuil de rentabilité : ${ariary(c.seuilCaMois)} de chiffre d'affaires par mois`;
  return c.seuilCaJour === null ? debut + '.' : `${debut}, soit ${ariary(c.seuilCaJour)} par jour de travail.`;
}

/** R4, one product only: "C'est 769 bouteilles de 50 cl par mois, soit 31 par jour de travail." */
export function phraseSeuilUnites(plan: Plan, c: Chiffres): string | null {
  if (c.seuilUnites === null || c.chargesFixes <= 0) return null;
  const u = c.principal?.unite || plan.uniteVente;
  const debut = `En unités : ${grouper(c.seuilUnites)} ${pluriel(u, c.seuilUnites)} par mois`;
  return c.seuilUnitesJour === null ? debut + '.' : `${debut}, soit ${grouper(c.seuilUnitesJour)} par jour de travail.`;
}

/** Break-even for summaries: "5 686 247 Ar de chiffre d'affaires par mois" (one product: ", soit 769 bouteilles"). */
export function seuilTexte(plan: Plan, c: Chiffres): string | null {
  if (c.seuilCaMois === null || c.chargesFixes <= 0) return null;
  const u = c.principal?.unite || plan.uniteVente;
  return `${ariary(c.seuilCaMois)} de chiffre d'affaires par mois${c.seuilUnites !== null ? `, soit ${grouper(c.seuilUnites)} ${pluriel(u, c.seuilUnites)}` : ''}`;
}

/** Sum of the resources of one nature (R6), null when no line of that nature has a value. */
export function totalNature(m5: Pick<M5, 'ressources'>, nature: M5['ressources'][number]['nature']): number | null {
  const l = (m5.ressources ?? []).filter((r) => r.nature === nature && rempli(r.valeur));
  return l.length ? l.reduce((t, r) => t + val(r.valeur), 0) : null;
}

/** Label of the "autre" resources (designations joined), '' when none. */
export function libelleAutres(m5: Pick<M5, 'ressources'>): string {
  return (m5.ressources ?? [])
    .filter((r) => r.nature === 'autre' && rempli(r.valeur))
    .map((r) => r.designation.trim())
    .filter(Boolean)
    .join(', ');
}

/** Plain text summary of module 5, for WhatsApp. No em dash, no en dash, no middle dot. */
export function texteChiffres(plan: Plan, c: Chiffres = calculer(plan)): string {
  const nom = plan.identite.nomProjet.trim() || 'Projet sans nom';
  const l: string[] = [`Mon business plan : ${nom}`, 'Chiffres clés (module 5)', ''];
  const produits = c.produits.filter((p, i) => p.nom.trim() || p.prix !== null || p.coutCalcule || i === 0);
  for (const p of produits) {
    const u = p.unite.trim() || plan.uniteVente.trim();
    const parts = [`Coût de revient ${ariary(p.cout)}${u ? ` par ${pluriel(u, 1)}` : ''}`];
    if (p.prix !== null) parts.push(`prix ${ariary(p.prix)}`);
    if (p.marge !== null) parts.push(`marge ${ariary(p.marge)}${p.tauxMarge !== null ? ` (${p.tauxMarge} %)` : ''}`);
    if (p.ventesParMois !== null) parts.push(`${grouper(p.ventesParMois)} ventes par mois`);
    l.push(`${nomProduit(p, p.rang)}${p.rang === 0 && produits.length > 1 ? ' (produit principal)' : ''} : ${parts.join(', ')}`);
  }
  if (c.caMois > 0) l.push(`Chiffre d'affaires par mois : ${ariary(c.caMois)}, marge ${ariary(c.margeMois)}`);
  l.push(`Charges fixes par mois : ${ariary(c.chargesFixes)}`);
  const seuil = phraseSeuil(plan, c);
  if (seuil) l.push(seuil.replace('Mon seuil de rentabilité', 'Seuil de rentabilité'));
  const unites = phraseSeuilUnites(plan, c);
  if (unites) l.push(unites);
  l.push('', `Besoins de démarrage : ${ariary(c.besoins)}`, `Ressources : ${ariary(c.ressources)}`);
  if (c.ecart !== 0) l.push(c.ecart < 0 ? `Il manque : ${ariary(-c.ecart)}` : `Excédent : ${ariary(c.ecart)}`);
  const annees = c.annees.map((a, i) => (a ? `Année ${i + 1} : chiffre d'affaires ${ariary(a.ca)}, résultat avant amortissements et avant impôt ${ariary(a.resultat)}${a.net !== null ? `, résultat net ${ariary(a.net)}` : ''}` : null)).filter((x): x is string => !!x);
  if (annees.length) l.push('', 'Résultats sur 3 ans', ...annees);
  l.push('', 'Fait avec Mon business plan, NEC 2026');
  return l.join('\n').replace(/[—–·]/g, ' ');
}
