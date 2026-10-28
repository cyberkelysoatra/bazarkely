/**
 * Live counts of the current user's dictations (DICTEE-CC-02), for the badges.
 * Dexie `liveQuery`: the counts follow every write to `pendingDictations`, in
 * this tab and in the others. Kept tiny: it lives in the main bundle.
 */
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../lib/database'
import { useAppStore } from '../../stores/appStore'
import { compterParStatut, COMPTES_VIDES, type ComptesDictees } from './utils/compteurs'

export { compterParStatut, libelleBadge, COMPTES_VIDES, type ComptesDictees } from './utils/compteurs'

export function usePendingDictations(): ComptesDictees {
  const userId = useAppStore((s) => s.user?.id)
  const [comptes, setComptes] = useState<ComptesDictees>(COMPTES_VIDES)

  useEffect(() => {
    if (!userId) {
      setComptes(COMPTES_VIDES)
      return
    }
    const abonnement = liveQuery(() => db.pendingDictations.where('userId').equals(userId).toArray()).subscribe({
      next: (liste) => setComptes(compterParStatut(liste, userId)),
      error: () => setComptes(COMPTES_VIDES)
    })
    return () => abonnement.unsubscribe()
  }, [userId])

  return comptes
}
