// D10: screen wake lock while screen 7 is open, when the browser offers it (taken again when the page
// comes back to the front, released on leaving the screen).
import { useEffect } from 'react'

interface Verrou {
  release: () => Promise<void>
}
type NavigateurVeille = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Verrou> } }

export function useVeille(actif = true): void {
  useEffect(() => {
    const nav = navigator as NavigateurVeille
    if (!actif || !nav.wakeLock) return
    let verrou: Verrou | null = null
    let fini = false
    const prendre = async () => {
      try {
        const v = await nav.wakeLock!.request('screen')
        if (fini) void v.release().catch(() => undefined)
        else verrou = v
      } catch {
        // Refused (battery saver, page hidden): the screen may sleep, nothing else changes.
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void prendre()
    }
    void prendre()
    document.addEventListener('visibilitychange', visible)
    return () => {
      fini = true
      document.removeEventListener('visibilitychange', visible)
      if (verrou) void verrou.release().catch(() => undefined)
    }
  }, [actif])
}
