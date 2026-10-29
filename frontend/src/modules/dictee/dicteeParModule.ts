/**
 * Which module offers a dictation, and where (BARRE-CC-01).
 * Navigation asks this map whether to show the mic for the active module:
 * a module absent from it shows no mic at all. Kept tiny: main bundle.
 */
export const DICTEE_PAR_MODULE: Readonly<Record<string, string>> = {
  bazarkely: '/dicter'
}

/** Dictation route of a module, or null when the module has no dictation. */
export function routeDictee(moduleId: string | null | undefined): string | null {
  if (!moduleId) return null
  return DICTEE_PAR_MODULE[moduleId] ?? null
}
