/**
 * Dictée vocale (DICTEE-CC-01) : feature of the core budget module.
 * Entry points: /dicter (lazy page), the mic slot of the navigation bars (BottomNav,
 * Header, gated by dicteeParModule), demarrerDictee (main.tsx).
 */
export { demarrerDictee, compterDicteesEnAttente } from './demarrage'
export type { DicteeItem, DicteeResult, PendingDictation, DicteeStatus } from './types'
