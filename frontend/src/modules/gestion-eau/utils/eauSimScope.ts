/**
 * Périmètre de données de la Simulation « Propriétaire » (module Gestion Eau).
 *
 * En admin, la synchro tire TOUT (eauSync.pullTable → select('*')) : Dexie contient
 * l'ensemble des compteurs/relevés/factures de la copropriété. Pour « voir en tant que
 * villa X », on RE-FILTRE côté app, en mémoire, sur les `compteurIds` du compte client
 * choisi. Aucune requête Supabase ajoutée ; le filtre n'agit QUE si `scope` est non-null.
 */

/** Périmètre = ensemble de compteurs visibles pour la villa simulée. */
export interface EauDataScope {
  compteurIds: string[];
}

/**
 * Ne garde que les lignes dont le compteur appartient au périmètre. Si `scope` est
 * `null` (pas de simulation propriétaire), renvoie `rows` inchangé (identité).
 *
 * @param rows          lignes à filtrer (relevés, factures, …)
 * @param getCompteurId extrait l'id du compteur d'une ligne (null/undefined = exclue si scopé)
 * @param scope         périmètre courant, ou null pour ne rien filtrer
 */
export function filterByScope<T>(
  rows: T[],
  getCompteurId: (row: T) => string | null | undefined,
  scope: EauDataScope | null,
): T[] {
  if (!scope) return rows;
  const allowed = new Set(scope.compteurIds);
  return rows.filter((row) => {
    const id = getCompteurId(row);
    return id != null && allowed.has(id);
  });
}

/**
 * Cas particulier fréquent : filtrer la LISTE DES COMPTEURS eux-mêmes (clé = `id`).
 * Équivaut à `filterByScope(compteurs, (c) => c.id, scope)`.
 */
export function filterCompteursByScope<T extends { id: string }>(
  compteurs: T[],
  scope: EauDataScope | null,
): T[] {
  return filterByScope(compteurs, (c) => c.id, scope);
}
