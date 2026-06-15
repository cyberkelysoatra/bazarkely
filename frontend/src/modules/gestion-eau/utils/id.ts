/** Génère un identifiant client (uuid v4) — réutilisé tel quel comme PK Supabase. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (environnements sans crypto.randomUUID) — RFC4122 v4 approximatif.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Horodatage ISO courant (compatible timestamptz Supabase). */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Identifiant DÉTERMINISTE (forme UUID) dérivé d'une chaîne stable. Deux appels avec la
 * même clé renvoient le MÊME id → un upsert par PK écrase toujours la même ligne au lieu
 * d'en créer une neuve (évite les doublons au recalcul). La forme 8-4-4-4-12 hex est
 * acceptée par le type `uuid` Postgres (il valide la disposition, pas la version/variante).
 *
 * Utilisé pour les bilans (clé = instant du relevé déclencheur) : un relevé donné produit
 * toujours le même id de bilan, à chaque reconstruction.
 */
export function deterministicUuid(key: string): string {
  // FNV-1a 32 bits, décliné en 4 mots pour remplir 32 hex de façon déterministe.
  const fnv = (seed: number): number => {
    let h = seed >>> 0;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };
  const w = [fnv(0x811c9dc5), fnv(0x9e3779b1), fnv(0x85ebca77), fnv(0xc2b2ae3d)];
  const hex = w.map((x) => x.toString(16).padStart(8, '0')).join(''); // 32 hex
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
