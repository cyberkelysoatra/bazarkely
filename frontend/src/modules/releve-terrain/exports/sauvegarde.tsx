// H20: backup file of a relevé (`Releve_<nom>_<AAAA-MM-JJ>.releve.json`, SCHEMA-STRUCTURE section 5) and
// its re-import into a work site. A relevé of the same name in the work site asks « Remplacer » or
// « Garder les deux ». Writes only through db/depot.ts.
import { createRoot } from 'react-dom/client'
import { Confirmation } from '../composants/Feuilles'
import { db } from '../db/base'
import * as depot from '../db/depot'
import type { SauvegardeReleve } from '../db/types'
import { executer, montrerAvis } from '../etat/avis'
import { baseNomFichier, partagerFichier } from './fichiers'

export const MESSAGE_PAS_SAUVEGARDE = "Ce fichier n'est pas une sauvegarde de relevé."
export const TAILLE_MAX = 5 * 1024 * 1024

export function nomSauvegarde(s: SauvegardeReleve): string {
  return `${baseNomFichier(s.releve.nom, s.releve.entete?.date || depot.dateMadagascar())}.releve.json`
}

export function texteSauvegarde(s: SauvegardeReleve): string {
  return JSON.stringify(s, null, 1)
}

export async function fichierSauvegarde(releveId: string): Promise<File> {
  const s = await depot.lireSauvegarde(releveId)
  return new File([texteSauvegarde(s)], nomSauvegarde(s), { type: 'application/json' })
}

/** « Sauvegarde complète » and the delete confirmations of RELEVE-CC-03: share or download the file. */
export async function exporterSauvegarde(releveId: string): Promise<void> {
  const f = await fichierSauvegarde(releveId)
  const r = await partagerFichier(f, f.name)
  if (r === 'telechargement') montrerAvis(`Sauvegarde enregistrée : ${f.name}`)
}

/** Text of a file (FileReader: also on older phones). */
export function lireTexte(f: Blob): Promise<string> {
  return new Promise((ok, ko) => {
    const l = new FileReader()
    l.onload = () => ok(typeof l.result === 'string' ? l.result : '')
    l.onerror = () => ko(l.error)
    l.readAsText(f, 'utf-8')
  })
}

/** Reads and checks a chosen file: size, JSON, format, schema, shape. */
export async function lireFichier(f: Blob): Promise<SauvegardeReleve> {
  if (f.size > TAILLE_MAX) throw new depot.SauvegardeInvalide(MESSAGE_PAS_SAUVEGARDE)
  let brut: unknown
  try {
    brut = JSON.parse(await lireTexte(f))
  } catch {
    throw new depot.SauvegardeInvalide(MESSAGE_PAS_SAUVEGARDE)
  }
  try {
    return depot.verifierSauvegarde(brut)
  } catch (e) {
    // A file from a newer version of the tool keeps its own message; any other refusal is the generic one.
    if (e instanceof depot.SauvegardeInvalide && /plus récente/.test(e.message)) throw e
    throw new depot.SauvegardeInvalide(MESSAGE_PAS_SAUVEGARDE)
  }
}

export type ChoixImport = 'remplacer' | 'garder_les_deux' | null

/** Relevé of this work site that the backup would meet: same name, or same id. */
export async function releveEnConflit(chantierId: string, s: SauvegardeReleve): Promise<{ id: string; nom: string } | null> {
  const nom = s.releve.nom.trim()
  const vivants = (await db.releves.where('chantier_id').equals(chantierId).toArray()).filter((r) => !r.supprime_at)
  const r = vivants.find((x) => x.nom === nom) ?? vivants.find((x) => x.id === s.releve.id)
  return r ? { id: r.id, nom: r.nom } : null
}

/**
 * Mode of the import. Asked when a relevé of the same name (or id) is in the work site; otherwise the ids
 * of the file are kept, unless that id already lives in another work site (then a copy is made).
 */
export async function modeImport(chantierId: string, s: SauvegardeReleve, demander: (nom: string) => Promise<ChoixImport>): Promise<ChoixImport> {
  const conflit = await releveEnConflit(chantierId, s)
  if (conflit) return demander(conflit.nom)
  const meme = await db.releves.get(s.releve.id)
  return meme && !meme.supprime_at ? 'garder_les_deux' : 'remplacer'
}

/** Dialog « Remplacer » / « Garder les deux », rendered outside the screens (called from a menu). */
export function demanderRemplacer(nom: string): Promise<ChoixImport> {
  return new Promise((resoudre) => {
    const hote = document.createElement('div')
    document.body.appendChild(hote)
    const racine = createRoot(hote)
    const fin = (c: ChoixImport) => {
      racine.unmount()
      hote.remove()
      resoudre(c)
    }
    racine.render(
      <Confirmation
        ouvert
        titre="Ce relevé existe déjà"
        texte={
          <>
            Le chantier contient déjà le relevé « {nom} ». Remplacer le relevé du téléphone par la sauvegarde, ou garder les deux ?
          </>
        }
        autre={{ libelle: 'Garder les deux', onClick: () => fin('garder_les_deux') }}
        confirmer={{ libelle: 'Remplacer', onClick: () => fin('remplacer') }}
        onAnnuler={() => fin(null)}
      />,
    )
  })
}

/** Reads a chosen file and imports it into the work site (the screens of RELEVE-CC-03 show the result). */
export async function importerFichier(chantierId: string, f: Blob, demander: (nom: string) => Promise<ChoixImport> = demanderRemplacer): Promise<string | null> {
  const s = await lireFichier(f)
  const mode = await modeImport(chantierId, s, demander)
  if (!mode) return null
  const r = await depot.importerReleve(chantierId, s, mode)
  montrerAvis(`Sauvegarde ouverte : « ${r.nom} ».`)
  return r.id
}

/** Menu « Ouvrir une sauvegarde ici » (H20): file picker, then import. Returns once the picker is open. */
export function ouvrirSauvegarde(chantierId: string): void {
  const entree = document.createElement('input')
  entree.type = 'file'
  entree.accept = '.json,application/json'
  entree.style.display = 'none'
  entree.setAttribute('data-releve-sauvegarde', '')
  document.body.appendChild(entree)
  const nettoyer = () => entree.remove()
  entree.addEventListener('change', () => {
    const f = entree.files?.[0]
    nettoyer()
    if (f) void executer(() => importerFichier(chantierId, f))
  })
  entree.addEventListener('cancel', nettoyer)
  entree.click()
}
