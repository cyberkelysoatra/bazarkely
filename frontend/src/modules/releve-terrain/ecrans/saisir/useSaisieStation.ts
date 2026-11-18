// Input of one station (screen 8, and step 2 of screen 10): the station is created at the first value
// typed (never an empty station), every value is written at once through useReleve (db/depot.ts), writes
// are queued so that two quick values never overwrite each other, and a typed reading of a computed station
// is replaced only after confirmation, the old one kept in `historique` (H09).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { nouvelId } from '../../db/depot'
import type { DonneesStation, ViseeStation } from '../../db/types'
import type { ReleveCalcule, StationCalculee } from '../../etat/releveCalcule'
import type { ActionsReleve } from '../../etat/useReleve'
import { demandeRemplacement, lignesStation, modifierVisee, nouvelleStation, type LigneVisee, type Modification } from './logique'

export interface DemandeRemplacement {
  borneId: string
  lettre: string
  ancienne: ViseeStation
  modification: Modification
}

export interface SaisieStation {
  /** Station shown (null: nothing typed yet). */
  donnees: DonneesStation | null
  station: StationCalculee | null
  stationId: string | null
  numero: string
  lignes: LigneVisee[]
  modifier: (borneId: string, m: Modification) => void
  demande: DemandeRemplacement | null
  confirmerRemplacement: () => void
  annulerRemplacement: () => void
  /** Resolves when every value typed is written and shown by useReleve. */
  attendre: () => Promise<void>
  ecrituresEnCours: boolean
  /** New confirmation for every target (after « Calculer la station »). */
  fermerRemplacements: () => void
}

const meme = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function useSaisieStation(calcule: ReleveCalcule, actions: ActionsReleve, stationId: string | null, onCreee: (id: string) => void): SaisieStation {
  const station = useMemo(() => (stationId ? (calcule.stations.find((s) => s.id === stationId) ?? null) : null), [calcule, stationId])
  const donneesDb = station?.donnees ?? null

  // Local copy while writes are on their way (never older than the stored one).
  const [local, setLocal] = useState<DonneesStation | null>(null)
  const localRef = useRef<DonneesStation | null>(null)
  const idRef = useRef<string | null>(stationId)
  const file = useRef<Promise<unknown>>(Promise.resolve())
  const enCours = useRef(0)
  const [ecritures, setEcritures] = useState(0)
  const ouverts = useRef(new Set<string>())
  const [demande, setDemande] = useState<DemandeRemplacement | null>(null)
  const attentes = useRef<(() => void)[]>([])

  // Another station opened: forget the local copy and the confirmations.
  useEffect(() => {
    idRef.current = stationId
    if (enCours.current === 0) {
      localRef.current = null
      setLocal(null)
    }
    ouverts.current = new Set()
    setDemande(null)
  }, [stationId])

  // Stored value caught up with the local copy: show the stored one.
  useEffect(() => {
    if (enCours.current === 0 && localRef.current && donneesDb && meme(donneesDb, localRef.current)) {
      localRef.current = null
      setLocal(null)
    }
  }, [donneesDb, ecritures])

  const synchro = enCours.current === 0 && local === null
  useEffect(() => {
    if (!synchro) return
    const a = attentes.current
    attentes.current = []
    for (const f of a) f()
  }, [synchro])

  const donnees = local ?? donneesDb
  const numero = donnees?.numero ?? calcule.prochainNumero
  const lignes = useMemo(() => lignesStation(calcule.bornes, donnees), [calcule.bornes, donnees])

  const ecrire = useCallback(
    (suivantes: DonneesStation) => {
      let id = idRef.current
      const creation = !id
      if (!id) {
        id = nouvelId()
        idRef.current = id
      }
      localRef.current = suivantes
      setLocal(suivantes)
      enCours.current += 1
      setEcritures((n) => n + 1)
      const cible = id
      file.current = file.current
        .then(async () => {
          const ok = await actions.ecrireObjet({ id: cible, type: 'station', donnees: suivantes })
          if (ok && creation) onCreee(cible)
          if (!ok) {
            // Refused (conflict, memory): show the stored relevé again.
            localRef.current = null
            setLocal(null)
          }
        })
        .catch(() => undefined)
        .finally(() => {
          enCours.current -= 1
          setEcritures((n) => n + 1)
        })
    },
    [actions, onCreee],
  )

  const base = useCallback((): DonneesStation => localRef.current ?? donneesDb ?? nouvelleStation(calcule.prochainNumero, new Date().toISOString()), [donneesDb, calcule.prochainNumero])

  const appliquer = useCallback(
    (borneId: string, m: Modification, remplacement: boolean) => {
      // Typed during this input: corrected freely until « Calculer la station ».
      ouverts.current.add(borneId)
      ecrire(modifierVisee(base(), borneId, m, remplacement ? { le: new Date().toISOString() } : null))
    },
    [base, ecrire],
  )

  const modifier = useCallback(
    (borneId: string, m: Modification) => {
      const ancienne = demandeRemplacement(station, borneId)
      const actuelle = base().visees.find((v) => v.borne_id === borneId)
      const change = !actuelle || (m.champ === 'pas_visible' ? actuelle.pas_visible !== m.valeur : actuelle[m.champ] !== m.valeur)
      if (!change) return
      if (ancienne && !ouverts.current.has(borneId)) {
        const lettre = calcule.bornes.find((b) => b.id === borneId)?.donnees.lettre ?? '?'
        setDemande({ borneId, lettre, ancienne, modification: m })
        return
      }
      appliquer(borneId, m, false)
    },
    [station, base, calcule.bornes, appliquer],
  )

  const confirmerRemplacement = useCallback(() => {
    if (!demande) return
    ouverts.current.add(demande.borneId)
    appliquer(demande.borneId, demande.modification, true)
    setDemande(null)
  }, [demande, appliquer])

  const attendre = useCallback(async () => {
    await file.current
    if (enCours.current === 0 && localRef.current === null) return
    await new Promise<void>((resolve) => {
      attentes.current.push(resolve)
      // Never blocks the operator: after 1 s the stored value is shown anyway.
      window.setTimeout(() => {
        if (enCours.current === 0 && localRef.current !== null) {
          localRef.current = null
          setLocal(null)
        }
        resolve()
      }, 1000)
    })
  }, [])

  return {
    donnees,
    station,
    stationId: idRef.current,
    numero,
    lignes,
    modifier,
    demande,
    confirmerRemplacement,
    annulerRemplacement: () => setDemande(null),
    attendre,
    ecrituresEnCours: !synchro,
    fermerRemplacements: () => {
      ouverts.current = new Set()
    },
  }
}
