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
