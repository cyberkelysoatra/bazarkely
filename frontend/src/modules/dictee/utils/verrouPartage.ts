/**
 * Lock shared by every tab and window of the app (Web Locks API).
 *
 * The queue lives in IndexedDB, which all tabs share: a SIGNED_IN or `online`
 * event reaches every open tab at once, and an in-memory flag only protects
 * one tab. Seen in production (2026-10-28): two tabs processed the same
 * dictation, two AI calls, two transactions. Without the API (old browsers)
 * the function runs directly; the atomic claim in Dexie still protects.
 */
export async function sousVerrou<T>(
  nom: string,
  mode: 'essayer' | 'attendre',
  fn: () => Promise<T>
): Promise<T | undefined> {
  const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined
  if (!locks?.request) return fn()
  return locks.request(nom, mode === 'essayer' ? { ifAvailable: true } : {}, async (lock: unknown) => {
    if (!lock) return undefined // another tab holds it: it does the work
    return fn()
  })
}
