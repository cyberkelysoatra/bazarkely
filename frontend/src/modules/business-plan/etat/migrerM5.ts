// NEC-CC-38 (cahier CGA R9, PRD NEC-193): module 5 saved before the lists (single product) becomes
// the list model, losslessly. Pure, idempotent, deterministic ids (two phones migrating the same old
// plan give the same object). Called by completerPlan BEFORE the merge with planVide().
import type { Composant, Investissement, Ligne, M5, Montant, Ressource } from '../types';

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const nombre = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const texte = (v: unknown): string => (typeof v === 'string' ? v : '');
const lignes = (v: unknown): Ligne[] =>
  Array.isArray(v) ? v.filter(estObjet).map((l, i) => ({ id: texte(l.id) || `m5-l${i + 1}`, libelle: texte(l.libelle), montant: nombre(l.montant) })) : [];

/** Keys of the old single-product module 5, dropped once moved into the lists. */
const ANCIENNES = ['couts', 'prixVente', 'investissements', 'ressources', 'annees'];

/** True for a module 5 saved in the new list model. */
export function estM5Liste(m5: unknown): boolean {
  return estObjet(m5) && m5.modele === 2;
}

/** Growth in % from one year to the next, exact (no rounding); null when one side is empty or zero. */
export function hausseEntre(avant: Montant | undefined, apres: Montant | undefined): number | null {
  const a = nombre(avant);
  const b = nombre(apres);
  if (a === null || b === null || a === 0 || b === 0) return null;
  return (b / a - 1) * 100;
}

/**
 * Old module 5 -> list model (R9). A module 5 already in the list model is returned unchanged
 * (same object). `uniteVente` = plan.uniteVente (unit of the first product).
 */
export function migrerM5(ancien: unknown, uniteVente = ''): M5 {
  if (!estObjet(ancien) || ancien.modele === 2) return ancien as unknown as M5;
  const a = ancien;
  const annees = Array.isArray(a.annees) ? a.annees.map((x) => (estObjet(x) ? x : {})) : [];
  const ventes = [0, 1, 2].map((i) => nombre(annees[i]?.ventesParMois));

  const composants: Composant[] = lignes(a.couts).map((l) => ({
    id: l.id,
    designation: l.libelle,
    prixLot: l.montant,
    quantiteLot: 1,
    uniteLot: 'piece',
    quantiteUtilisee: 1,
    uniteUtilisee: 'piece'
  }));
  const investissements: Investissement[] = lignes(a.investissements).map((l) => ({ id: l.id, designation: l.libelle, quantite: 1, prixUnitaire: l.montant }));

  const r = estObjet(a.ressources) ? a.ressources : {};
  const ressources: Ressource[] = [];
  const ajouter = (cle: string, nature: Ressource['nature'], designation: string) => {
    const v = nombre(r[cle]);
    if (v !== null && v !== 0) ressources.push({ id: `m5-r-${cle}`, nature, designation, valeur: v });
  };
  ajouter('apport', 'argent', 'Apport personnel');
  ajouter('subvention', 'subvention', 'Subvention');
  ajouter('pret', 'pret', 'Prêt');
  ajouter('autre', 'autre', texte(r.autreLibelle).trim() || 'Autre ressource');

  // Unknown keys (written by a later version) are kept; the old single fields are dropped.
  const reste: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a)) if (!ANCIENNES.includes(k)) reste[k] = v;

  return {
    ...(reste as Partial<M5>),
    modele: 2,
    produits: [{ id: 'm5-p1', nom: 'Produit principal', unite: uniteVente, prix: nombre(a.prixVente), ventesParMois: ventes[0], composants }],
    investissements,
    ressources,
    hausses: [hausseEntre(ventes[0], ventes[1]), hausseEntre(ventes[1], ventes[2])],
    annees: [0, 1, 2].map((i) => ({ chargesFixesMois: nombre(annees[i]?.chargesFixesMois) }))
  } as M5;
}
