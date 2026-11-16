// Drafts of the 6 cards of the synthesis (workbook page 16), built ONLY from the answers of the plan:
// each sentence is a fixed label followed by the participant's own words or a computed figure. An
// empty answer is skipped, never invented. No React here.
import type { Plan } from '../../types';
import { calculer, libelleAutres, nomProduit, seuilTexte, totalNature } from '../../utils/chiffres';
import { ariary, grouper, pluriel } from '../../utils/format';
import { calculerMarche } from '../m3/calculs';
import { contracter } from '../m1/phrase';

export type CleCarte = keyof Plan['synthese'];

export const CARTES: { cle: CleCarte; n: number; titre: string; source: string }[] = [
  { cle: 'probleme', n: 1, titre: 'Le problème et mon client', source: 'Ateliers 1a et 1b' },
  { cle: 'solution', n: 2, titre: 'Ma solution et ma proposition de valeur', source: 'Atelier 1c' },
  { cle: 'marche', n: 3, titre: 'Mon marché et mes concurrents', source: 'Module 3' },
  { cle: 'organisation', n: 4, titre: 'Mon organisation et ma forme juridique', source: 'Module 4' },
  { cle: 'chiffres', n: 5, titre: 'Mes chiffres clés', source: "Besoin total, financement demandé, chiffre d'affaires année 1, seuil de rentabilité" },
  { cle: 'equipeDemande', n: 6, titre: 'Mon équipe et ce que je demande', source: 'Pourquoi nous ; montant ou appui demandé' }
];

/** Trimmed, single spaces, final punctuation removed (the sentence adds its own). */
export function nettoyer(v: string): string {
  return v.trim().replace(/\s+/g, ' ').replace(/[.,;:\s]+$/, '');
}

/** "Label : answer." or nothing when the answer is empty. */
function phrase(label: string, valeur: string): string | null {
  const v = nettoyer(valeur);
  return v ? `${label}${v}.` : null;
}

function joindre(morceaux: (string | null | undefined | false)[]): string {
  return morceaux.filter((m): m is string => !!m).join(' ');
}

export interface ChiffresCles {
  besoinTotal: number | null;
  financementDemande: number | null;
  subvention: number | null;
  pret: number | null;
  autre: number | null;
  /** Money and equipment brought by the founder (resources argent + materiel). */
  apport: number | null;
  caAnnee1: number | null;
  /** NEC-CC-38: break-even in turnover per month (ariary), cahier R4. */
  seuilCaMois: number | null;
  /** "5 686 247 Ar de chiffre d'affaires par mois" (one product: with the units), null when not computed. */
  seuil: string | null;
  /** Produit principal (R8): first product of the list, null when it has no name nor price. */
  principal: { nom: string; prix: number | null; marge: number | null; tauxMarge: number | null } | null;
}

/** Figures of card 5: total need, money asked (grant + loan + other), year 1 turnover, break-even point. */
export function chiffresCles(plan: Plan): ChiffresCles {
  const c = calculer(plan);
  const m5 = plan.m5;
  const besoinSaisi = c.besoins > 0;
  const subvention = totalNature(m5, 'subvention');
  const pret = totalNature(m5, 'pret');
  const autre = totalNature(m5, 'autre');
  const demandes = [subvention, pret, autre];
  const financement = demandes.some((v) => v !== null) ? demandes.reduce<number>((t, v) => t + (v ?? 0), 0) : null;
  const argent = totalNature(m5, 'argent');
  const materiel = totalNature(m5, 'materiel');
  const apport = argent === null && materiel === null ? null : (argent ?? 0) + (materiel ?? 0);
  const a1 = c.annees[0];
  const p = c.principal;
  return {
    besoinTotal: besoinSaisi ? c.besoins : null,
    financementDemande: financement,
    subvention,
    pret,
    autre,
    apport,
    caAnnee1: a1 && a1.ca > 0 ? a1.ca : null,
    seuilCaMois: c.chargesFixes > 0 ? c.seuilCaMois : null,
    seuil: seuilTexte(plan, c),
    principal: p && (p.nom.trim() || p.prix !== null) ? { nom: nomProduit(p, 0), prix: p.prix, marge: p.marge, tauxMarge: p.tauxMarge } : null
  };
}

function texteFinancement(plan: Plan, k: ChiffresCles): string | null {
  if (k.financementDemande === null) return null;
  const autreLibelle = nettoyer(libelleAutres(plan.m5)) || 'autre ressource';
  const detail = [
    k.subvention ? `subvention ${ariary(k.subvention)}` : null,
    k.pret ? `prêt ${ariary(k.pret)}` : null,
    k.autre ? `${autreLibelle} ${ariary(k.autre)}` : null
  ].filter(Boolean);
  return `Financement demandé : ${ariary(k.financementDemande)}${detail.length > 1 ? ` (${detail.join(', ')})` : ''}.`;
}

function carteProbleme(plan: Plan): string {
  const m1 = plan.m1;
  const c = m1.client;
  return joindre([
    phrase('Le problème : ', m1.probleme),
    phrase('Ses causes : ', m1.causes),
    phrase('Mon client : ', c.qui),
    phrase('Où : ', c.ou),
    phrase('Combien : ', c.combien),
    phrase("Ce qu'il fait aujourd'hui : ", c.aujourdhui)
  ]);
}

/** The value proposition sentence when its 5 parts are filled, else the filled parts one by one. */
function carteSolution(plan: Plan): string {
  const pv = plan.m1.pv;
  const nom = nettoyer(plan.identite.nomProjet);
  const parts = [pv.pour, pv.qui, pv.propose, pv.quiBenefice, pv.contrairement].map(nettoyer);
  if (parts.every(Boolean) && nom) {
    const [a, reste] = contracter(parts[4]);
    return `Pour ${parts[0]} qui ${parts[1]}, ${nom} propose ${parts[2]} qui ${parts[3]}, contrairement ${a}${reste}.`;
  }
  return joindre([
    phrase('Mon client : ', pv.pour),
    phrase('Son besoin : ', pv.qui),
    phrase('Ma solution : ', pv.propose),
    phrase('Le bénéfice principal : ', pv.quiBenefice),
    phrase("Ce qu'il utilise aujourd'hui : ", pv.contrairement)
  ]);
}

function carteMarche(plan: Plan): string {
  const m3 = plan.m3;
  const r = calculerMarche(m3);
  const u = (n: number) => pluriel(plan.uniteVente, n);
  const concurrents = m3.concurrents
    .filter((c) => nettoyer(c.nom))
    .map((c) => `${nettoyer(c.nom)}${c.type ? ` (${c.type === 'direct' ? 'direct' : 'indirect'})` : ''}`);
  const mieux = m3.concurrents.map((c) => nettoyer(c.mieux)).filter(Boolean);
  return joindre([
    r.potentielMois !== null ? `Marché potentiel : ${grouper(r.potentielMois)} ${u(r.potentielMois)} par mois.` : null,
    r.ventesMois !== null && m3.partVisee !== null ? `Part visée en année 1 : ${grouper(m3.partVisee)} %, soit ${grouper(r.ventesMois)} ${u(r.ventesMois)} par mois.` : null,
    concurrents.length ? `Mes concurrents : ${concurrents.join(', ')}.` : null,
    mieux.length ? `Ce que je fais mieux : ${mieux[0]}.` : null
  ]);
}

function carteOrganisation(plan: Plan): string {
  const m4 = plan.m4;
  const equipe = m4.equipe
    .filter((e) => nettoyer(e.personne))
    .map((e) => `${nettoyer(e.personne)}${nettoyer(e.role) ? ` (${nettoyer(e.role)})` : ''}`);
  const objectifs = m4.calendrier.map((c) => nettoyer(c.objectif)).filter(Boolean);
  const forme = nettoyer(m4.forme);
  return joindre([
    phrase('Ma distribution : ', m4.place),
    equipe.length ? `Mon équipe : ${equipe.join(', ')}.` : null,
    objectifs.length ? `Objectif de la fin de l'année 1 : ${objectifs[objectifs.length - 1]}.` : null,
    forme ? `Ma forme juridique : ${forme}.` : null
  ]);
}

function carteChiffres(plan: Plan, k = chiffresCles(plan)): string {
  return joindre([
    k.besoinTotal !== null ? `Besoin total de démarrage : ${ariary(k.besoinTotal)}.` : null,
    k.apport !== null ? `Apport personnel : ${ariary(k.apport)}.` : null,
    texteFinancement(plan, k),
    k.caAnnee1 !== null ? `Chiffre d'affaires de l'année 1 : ${ariary(k.caAnnee1)}.` : null,
    k.principal
      ? `Produit principal : ${k.principal.nom}${k.principal.prix !== null ? `, vendu ${ariary(k.principal.prix)}` : ''}${k.principal.marge !== null ? `, marge ${ariary(k.principal.marge)}${k.principal.tauxMarge !== null ? ` (${k.principal.tauxMarge} %)` : ''}` : ''}.`
      : null,
    k.seuil !== null ? `Seuil de rentabilité : ${k.seuil}.` : null
  ]);
}

function carteEquipe(plan: Plan, k = chiffresCles(plan)): string {
  const membres = plan.m4.equipe.filter((e) => nettoyer(e.personne)).length;
  return joindre([
    phrase('Pourquoi nous : ', plan.m1.pourquoiMoi),
    membres > 1 ? `Nous sommes ${membres} personnes dans l'équipe.` : null,
    k.financementDemande !== null ? `Ce que je demande : ${ariary(k.financementDemande)}.` : null,
    phrase('Mes attentes : ', plan.identite.attentes)
  ]);
}

const BUILDERS: Record<CleCarte, (plan: Plan) => string> = {
  probleme: carteProbleme,
  solution: carteSolution,
  marche: carteMarche,
  organisation: carteOrganisation,
  chiffres: (p) => carteChiffres(p),
  equipeDemande: (p) => carteEquipe(p)
};

/** Draft of one card ("" when the modules hold nothing for it). Never any dash or middle dot. */
export function brouillon(plan: Plan, cle: CleCarte): string {
  return BUILDERS[cle](plan).replace(/[—–·]/g, ',');
}

/** Number of cards filled out of 6. */
export function cartesRemplies(plan: Plan): number {
  return CARTES.filter((c) => plan.synthese[c.cle].trim()).length;
}
