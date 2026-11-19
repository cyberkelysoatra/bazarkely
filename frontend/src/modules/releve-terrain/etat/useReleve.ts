// One relevé on screen, used by every screen of a relevé: live data (Dexie), whole relevé recalculated
// (memo), writes guarded by the rev this tab knows. A write refused because another tab changed the
// relevé reloads the data and shows « Ce relevé a changé dans un autre onglet : affichage mis à jour. »
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { REGLAGES_DEFAUT, type Reglages } from '../calcul'
import * as depot from '../db/depot'
import { lireReleve, type ReleveComplet } from '../db/lecture'
import type { EnteteReleve, Objet } from '../db/types'
import { lireReleveOuvert } from '../sync/moteur'
import { ecouterConflits, executer } from './avis'
import { calculerReleve, reglagesEffectifs, type ReleveCalcule } from './releveCalcule'
import { useRequete } from './useRequete'

/** H29: reading period of a relevé held by another phone. */
export const RELECTURE_MS = 30000

export type EtatReleve =
  | { statut: 'chargement' }
  | { statut: 'absent' }
  | ({ statut: 'pret'; calcule: ReleveCalcule } & ReleveComplet)

/** Timed recalculation (performance entry « releve-calcul », read by the bench). */
export function calculerMesure(entete: EnteteReleve, objets: Objet[], defaut: Reglages): ReleveCalcule {
  const t0 = performance.now()
  const r = calculerReleve(entete, objets, defaut)
  try {
    performance.measure('releve-calcul', { start: t0, end: performance.now(), detail: { objets: objets.length } })
  } catch {
    // Old browser without measure options: no timing, same result.
  }
  return r
}

export interface ActionsReleve {
  /** Creates or replaces objects (by id) in one write. */
  ecrireObjets: (objets: depot.ObjetAEcrire[]) => Promise<Objet[] | null>
  ecrireObjet: (objet: depot.ObjetAEcrire) => Promise<Objet | null>
  supprimerObjets: (ids: string[]) => Promise<boolean>
  /** Deep merge into the entete (screens 6, 7, 12). */
  modifierEntete: (patch: depot.PatchProfond<EnteteReleve>) => Promise<boolean>
  renommer: (nom: string) => Promise<boolean>
  supprimer: () => Promise<boolean>
}

export function useReleve(releveId: string | undefined): { etat: EtatReleve; rev: number; reglagesDefaut: Reglages; actions: ActionsReleve } {
  const [recharge, setRecharge] = useState(0)
  const defautStocke = useRequete('reglages_defaut', () => depot.lireCle('reglages_defaut'))
  const reglagesDefaut = useMemo(() => reglagesEffectifs(REGLAGES_DEFAUT, defautStocke), [defautStocke])
  const donnees = useRequete(`releve:${releveId ?? ''}`, () => (releveId ? lireReleve(releveId) : Promise.resolve(null)), recharge)

  // Highest rev known by this tab: the one shown, or the one its own last write produced.
  const revConnue = useRef(0)
  useEffect(() => {
    revConnue.current = 0
  }, [releveId])
  if (donnees && donnees.releve.rev > revConnue.current) revConnue.current = donnees.releve.rev

  const calcule = useMemo(() => (donnees ? calculerMesure(donnees.releve.entete, donnees.objets, reglagesDefaut) : null), [donnees, reglagesDefaut])

  // Opening: ouvert_at and « Reprendre » of the home screen; a relevé this phone does not hold is read
  // from the server (phase 3, H29), never over a row waiting to be sent.
  useEffect(() => {
    if (!releveId) return
    void depot.marquerOuvert(releveId).catch(() => undefined)
    void lireReleveOuvert(releveId)
  }, [releveId])

  // H29: a relevé this phone does not hold is read again every 30 s while visible and online.
  const tenu = donnees ? depot.saisieTenueIci(donnees.releve) : true
  useEffect(() => {
    if (!releveId || tenu) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) void lireReleveOuvert(releveId)
    }, RELECTURE_MS)
    return () => clearInterval(id)
  }, [releveId, tenu])

  // Refused write (older tab), another tab's write, or back to the front: read the stored relevé again.
  useEffect(() => {
    if (!releveId) return
    const relire = () => setRecharge((n) => n + 1)
    const a = ecouterConflits((id) => {
      if (id === releveId) relire()
    })
    const b = depot.ecouterAutresOnglets((m) => {
      if (m.type === 'releve' && m.id === releveId && m.rev > revConnue.current) relire()
    })
    const visible = () => {
      if (document.visibilityState === 'visible') relire()
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      a()
      b()
      document.removeEventListener('visibilitychange', visible)
    }
  }, [releveId])

  const apres = useCallback((rev: number | null | undefined) => {
    if (typeof rev === 'number' && rev > revConnue.current) revConnue.current = rev
  }, [])

  // RELEVE-CC-11: the writes of this tab run one after the other, each with the rev the previous one
  // produced. Two writes started together (a name confirmed, then a number typed at once) used to carry
  // the same rev, and the second was refused as if another tab had written.
  const file = useRef<Promise<unknown>>(Promise.resolve())
  const enFile = useCallback(<T,>(f: () => Promise<T>): Promise<T> => {
    const p = file.current.then(f, f)
    file.current = p.catch(() => undefined)
    return p
  }, [])

  const actions = useMemo<ActionsReleve>(() => {
    const id = releveId ?? ''
    return {
      ecrireObjets: (objets) =>
        enFile(async () => {
          const r = await executer(() => depot.ecrireObjets(id, objets, revConnue.current))
          apres(r?.rev)
          return r?.objets ?? null
        }),
      ecrireObjet: (objet) =>
        enFile(async () => {
          const r = await executer(() => depot.ecrireObjet(id, objet, revConnue.current))
          apres(r?.rev)
          return r?.objet ?? null
        }),
      supprimerObjets: (ids) =>
        enFile(async () => {
          const r = await executer(() => depot.supprimerObjets(id, ids, revConnue.current))
          apres(r)
          return r !== null
        }),
      modifierEntete: (patch) =>
        enFile(async () => {
          const r = await executer(() => depot.modifierEntete(id, patch, revConnue.current))
          apres(r)
          return r !== null
        }),
      renommer: (nom) =>
        enFile(async () => {
          const r = await executer(() => depot.renommerReleve(id, nom, revConnue.current))
          apres(r)
          return r !== null
        }),
      supprimer: () =>
        enFile(async () => {
          const r = await executer(() => depot.supprimerReleve(id, revConnue.current))
          apres(r)
          return r !== null
        }),
    }
  }, [releveId, apres, enFile])

  const etat: EtatReleve = !releveId
    ? { statut: 'absent' }
    : donnees === undefined
      ? { statut: 'chargement' }
      : donnees === null
        ? { statut: 'absent' }
        : { statut: 'pret', ...donnees, calcule: calcule! }

  return { etat, rev: revConnue.current, reglagesDefaut, actions }
}
