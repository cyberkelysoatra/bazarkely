// Dexie live query as a React hook: the value follows every write (this tab and the others).
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/**
 * `cle` identifies the query (a new key = a new query, the old value is never shown for it).
 * `relecture`: a new number reads again with the same key, the value shown stays until the new one.
 * Returns undefined while the first answer is awaited.
 */
export function useRequete<T>(cle: string, requete: () => Promise<T>, relecture = 0): T | undefined {
  const [etat, setEtat] = useState<{ cle: string; valeur: T } | null>(null)
  useEffect(() => {
    let fini = false
    const abonnement = liveQuery(requete).subscribe({
      next: (valeur) => {
        if (!fini) setEtat({ cle, valeur })
      },
      error: (e) => console.error('[releve] lecture', e),
    })
    return () => {
      fini = true
      abonnement.unsubscribe()
    }
    // The query is identified by its key only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, relecture])
  return etat && etat.cle === cle ? etat.valeur : undefined
}
