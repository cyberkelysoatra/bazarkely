// PRD 6.9: letters of the targets.
import { MESSAGES } from './seuils'
import type { BorneEtiquette, Validation } from './types'

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const norm = (l: string) => l.trim().toUpperCase()

/** True when no active target carries this letter. */
export function lettreLibre(lettre: string, lettresActives: string[]): boolean {
  const l = norm(lettre)
  return ALPHABET.includes(l) && !lettresActives.map(norm).includes(l)
}

/** Next free panel: first letter of the alphabet carried by no active target; null when the 26 are taken. */
export function prochaineLettreLibre(lettresActives: string[]): string | null {
  const prises = new Set(lettresActives.map(norm))
  return ALPHABET.find((l) => !prises.has(l)) ?? null
}

/** Message when no letter is free (section 8). */
export function messageAucuneLettre(lettresActives: string[]): string | null {
  return prochaineLettreLibre(lettresActives) === null ? MESSAGES.plusDeLettre : null
}

/** Checks a letter and a place name against the active targets (6.9, section 8). */
export function verifierLettre(lettre: string, nom: string, actives: { lettre: string; nom: string }[]): Validation {
  if (nom.trim() === '') return { ok: false, message: MESSAGES.nomVide }
  const l = norm(lettre)
  const porteur = actives.find((b) => norm(b.lettre) === l)
  if (porteur) {
    return { ok: false, message: MESSAGES.lettreDejaPortee.replace('X', l).replace('NOM', porteur.nom) }
  }
  if (!ALPHABET.includes(l)) return { ok: false, message: MESSAGES.plusDeLettre }
  return { ok: true }
}

/** Usage number of a letter for a new target: previous uses + 1. */
export function prochainUsage(lettre: string, historique: { lettre: string; usage: number }[]): number {
  const l = norm(lettre)
  return historique.filter((b) => norm(b.lettre) === l).reduce((m, b) => Math.max(m, b.usage), 0) + 1
}

/** Export line of a target (game G): 'D (1) ; Piquet du manguier ; borne éphémère ; 1 ; retirée'. */
export function ligneExportBorne(b: BorneEtiquette & { rang: 0 | 1 | 2 }): string {
  const type = b.rang === 0 ? 'borne principale' : 'borne éphémère'
  return `${b.lettre} (${b.usage}) ; ${b.nom} ; ${type} ; ${b.rang} ; ${b.etat === 'retiree' ? 'retirée' : 'active'}`
}

/** 'D (1), Piquet du manguier, retirée' ; without usage: 'D, Piquet du manguier'. */
export function etiquetteBorne(b: BorneEtiquette, avecUsage: boolean): string {
  const tete = avecUsage ? `${b.lettre} (${b.usage})` : b.lettre
  return `${tete}, ${b.nom}${b.etat === 'retiree' ? ', retirée' : ''}`
}
