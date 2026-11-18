// Contour interval of this phone (`cles.vue_intervalle`: display preference, never in the entete, never
// sent) and the contour lines of a relevé, recomputed only when the points, the cut-off or the interval change.
import { useCallback, useMemo } from 'react'
import * as depot from '../../db/depot'
import { executer } from '../../etat/avis'
import type { ReleveCalcule } from '../../etat/releveCalcule'
import { useRequete } from '../../etat/useRequete'
import { donneesCourbes, intervalleValide, type DonneesCourbes } from './modele'

export function useIntervalle(): { intervalle: number; choisir: (v: number) => void; charge: boolean } {
  const stocke = useRequete('vue_intervalle', () => depot.lireCle('vue_intervalle'))
  const choisir = useCallback((v: number) => {
    void executer(() => depot.ecrireVueIntervalle(v))
  }, [])
  return { intervalle: intervalleValide(stocke), choisir, charge: stocke !== undefined }
}

export function useCourbes(calcule: ReleveCalcule | null, intervalle: number): DonneesCourbes | null {
  const points = calcule?.pointsCourbes
  const coupure = calcule?.reglages.coupure
  return useMemo(() => (points && coupure !== undefined ? donneesCourbes(points, coupure, intervalle) : null), [points, coupure, intervalle])
}
