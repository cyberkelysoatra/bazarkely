// C4: compass of screen 7 with synthetic `deviceorientationabsolute` events.
import { describe, expect, it } from 'vitest'
import { DELAI_AUCUNE, capCorrige, capDepuisAlpha, ecouterBoussole } from '../boussole'
import { degres } from '../format'
import { moyenneCaps } from '../../../calcul'

/** Fake clock and timers, events dispatched on a plain EventTarget. */
function banc() {
  let t = 0
  const minuteries: { a: number; f: () => void; fait: boolean }[] = []
  const cible = new EventTarget()
  return {
    cible,
    maintenant: () => t,
    attendre: (f: () => void, ms: number) => {
      const m = { a: t + ms, f, fait: false }
      minuteries.push(m)
      return m
    },
    annuler: (m: unknown) => {
      ;(m as { fait: boolean }).fait = true
    },
    avancer(ms: number) {
      t += ms
      for (const m of minuteries) if (!m.fait && m.a <= t) {
        m.fait = true
        m.f()
      }
    },
    alpha(alpha: number | null) {
      const e = new Event('deviceorientationabsolute') as Event & { alpha: number | null; absolute: boolean }
      Object.defineProperty(e, 'alpha', { value: alpha })
      Object.defineProperty(e, 'absolute', { value: true })
      cible.dispatchEvent(e)
    },
  }
}

/** Sends one event every 100 ms for `ms` milliseconds, alpha given by the function. */
function tenir(b: ReturnType<typeof banc>, ms: number, alpha: (i: number) => number) {
  for (let i = 0; i <= ms / 100; i++) {
    b.alpha(alpha(i))
    b.avancer(100)
  }
}

describe('boussole (C4)', () => {
  it('alpha 285,6 : cap 74,4 et cap corrigé 64,4', () => {
    expect(degres(capDepuisAlpha(285.6))).toBe('74,4')
    expect(degres(capCorrige(capDepuisAlpha(285.6), 10))).toBe('64,4')
    // Screen turned by 90 degrees: the top of the phone points 90 degrees further.
    expect(degres(capDepuisAlpha(285.6, 90))).toBe('164,4')

    const b = banc()
    const stables: number[] = []
    ecouterBoussole({ ...b, onStable: (r) => stables.push(r.cap), onAucune: () => stables.push(-1) })
    tenir(b, 2500, () => 285.6)
    expect(stables).toHaveLength(1)
    expect(degres(stables[0])).toBe('74,4')
    expect(degres(capCorrige(stables[0], 10))).toBe('64,4')
  })

  it('lectures 358 et 2 : moyenne 0,0, jamais 180', () => {
    const b = banc()
    const stables: number[] = []
    // heading = 360 - alpha: alpha 2 gives 358, alpha 358 gives 2
    ecouterBoussole({ ...b, onStable: (r) => stables.push(r.cap), onAucune: () => undefined })
    // Heading 2 at t = 0, then every 100 ms heading 358 and, 1 ms later, heading 2: when the window
    // reaches 2 s (on a 358), it holds as many readings of each.
    b.alpha(358)
    for (let i = 0; i < 25; i++) {
      b.avancer(i === 0 ? 100 : 99)
      b.alpha(2)
      b.avancer(1)
      b.alpha(358)
    }
    expect(stables).toHaveLength(1)
    expect(degres(stables[0])).toBe('0,0')
    expect(moyenneCaps([358, 2]).moyenne).toBe(0)
  })

  it('cap lu 5,0 : cap corrigé 355,0', () => {
    expect(degres(capCorrige(5, 10))).toBe('355,0')
    expect(degres(capCorrige(capDepuisAlpha(355), 10))).toBe('355,0')
  })

  it('lectures instables (dispersion de 3° ou plus) : rien n’est gardé', () => {
    const b = banc()
    const stables: number[] = []
    ecouterBoussole({ ...b, onStable: (r) => stables.push(r.cap), onAucune: () => stables.push(-1) })
    // 74 and 80 alternate: dispersion 3 around the mean 77, never under 3
    tenir(b, 6000, (i) => 360 - (i % 2 ? 74 : 80))
    expect(stables).toEqual([])
    // then the hand stops shaking: kept
    tenir(b, 2500, () => 360 - 76)
    expect(stables).toHaveLength(1)
    expect(degres(stables[0])).toBe('76,0')
  })

  it('aucun événement en 3 s : chemin sans boussole', () => {
    const b = banc()
    let aucune = 0
    ecouterBoussole({ ...b, onStable: () => undefined, onAucune: () => aucune++ })
    b.avancer(DELAI_AUCUNE - 1)
    expect(aucune).toBe(0)
    b.avancer(1)
    expect(aucune).toBe(1)
  })

  it('événements sans alpha (capteur absent) : chemin sans boussole', () => {
    const b = banc()
    let aucune = 0
    ecouterBoussole({ ...b, onStable: () => undefined, onAucune: () => aucune++ })
    b.alpha(null)
    b.avancer(DELAI_AUCUNE)
    expect(aucune).toBe(1)
  })
})
