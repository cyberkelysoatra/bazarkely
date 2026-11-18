// D10: screen kept on while the station input is open, when the browser offers it (Wake Lock API).
// The lock is lost when the page is hidden: it is asked again when the page comes back.
import { useEffect } from 'react'

interface Verrou {
  release: () => Promise<void>
  addEventListener?: (t: 'release', f: () => void) => void
}
type NavigateurVerrou = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Verrou> } }

/** State read by the bench: 'actif', 'indisponible' or 'refuse'. */
function noter(etat: string) {
  try {
    document.documentElement.dataset.verrouEcran = etat
  } catch {
    // no DOM (tests)
  }
}

export function useVerrouEcran(actif = true): void {
  useEffect(() => {
    if (!actif) return
    const nav = navigator as NavigateurVerrou
    if (!nav.wakeLock) {
      noter('indisponible')
      return
    }
    let verrou: Verrou | null = null
    let fini = false
    const demander = async () => {
      if (fini || document.visibilityState !== 'visible') return
      try {
        const v = await nav.wakeLock!.request('screen')
        if (fini) {
          void v.release().catch(() => undefined)
          return
        }
        verrou = v
        noter('actif')
        v.addEventListener?.('release', () => {
          if (verrou === v) verrou = null
        })
      } catch {
        noter('refuse')
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible' && !verrou) void demander()
    }
    void demander()
    document.addEventListener('visibilitychange', visible)
    return () => {
      fini = true
      document.removeEventListener('visibilitychange', visible)
      if (verrou) void verrou.release().catch(() => undefined)
      verrou = null
      noter('libre')
    }
  }, [actif])
}
