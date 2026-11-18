// Whole relevé recalculated from the contract objects of etat/jeux.ts (PRD 11, tolerances of the PRD).
import { describe, expect, it } from 'vitest'
import { REGLAGES_DEFAUT } from '../../calcul'
import type { Objet, SauvegardeReleve } from '../../db/types'
import { calculerReleve } from '../releveCalcule'
import { jeuA, jeuA2, jeuA3, jeuB, jeuC, jeuF, jeuG } from '../jeux'

function proche(v: number | null | undefined, attendu: number, tol = 0.01) {
  expect(v, `attendu ${attendu}`).toBeTypeOf('number')
  expect(Math.abs((v as number) - attendu), `valeur ${v}, attendu ${attendu} ± ${tol}`).toBeLessThanOrEqual(tol + 1e-9)
}

function objets(s: SauvegardeReleve): Objet[] {
  return s.objets.map((o) => ({ ...o, releve_id: s.releve.id, supprime: false, saisi_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', maj_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', apres_reprise: false, envoi: 'a_envoyer' }) as Objet)
}

const calc = (s: SauvegardeReleve) => calculerReleve(s.releve.entete, objets(s), REGLAGES_DEFAUT)

describe('calculerReleve : jeu A (calage)', () => {
  const r = calc(jeuA())

  it('trois côtés : distance retenue, écart décamètre, biais, dénivelé, couleur', () => {
    proche(r.cotes.ab?.distanceRetenue, 52.468)
    proche(r.cotes.ab?.ecartDecaApp, 0.016)
    proche(r.cotes.ab?.biais, -0.017)
    proche(r.cotes.ab?.denivele, -11.245)
    expect(r.cotes.ab?.couleur).toBe('vert')
    proche(r.cotes.bc?.distanceRetenue, 45.457)
    proche(r.cotes.bc?.ecartDecaApp, -0.124)
    proche(r.cotes.bc?.biais, 0.125)
    proche(r.cotes.bc?.denivele, -5.489)
    expect(r.cotes.bc?.couleur).toBe('orange')
    proche(r.cotes.ac?.distanceRetenue, 71.31)
    proche(r.cotes.ac?.ecartDecaApp, 0.011)
    proche(r.cotes.ac?.biais, -0.012)
    proche(r.cotes.ac?.denivele, -16.723)
    expect(r.cotes.ac?.couleur).toBe('vert')
  })

  it('fermeture −0,011 vert, bornes calées A, B, C', () => {
    proche(r.calage?.fermeture, -0.011)
    expect(r.calage?.couleurFermeture).toBe('vert')
    const { a, b, c } = r.principales
    proche(a?.position?.x, 0)
    proche(a?.position?.y, 0)
    proche(a?.position?.z, 38.11)
    proche(b?.position?.x, 47.312)
    proche(b?.position?.y, 22.681)
    proche(b?.position?.z, 26.865)
    proche(c?.position?.x, 69.217)
    proche(c?.position?.y, -17.15)
    proche(c?.position?.z, 21.382)
    expect(a?.etiquette).toBe('A, Borne ouest')
  })

  it('contrôles du plan : B 0,025 vert, C 0,182 orange, altitudes +0,035 et +0,052 vertes', () => {
    const k = r.calage!.controle
    proche(k.positionB, 0.025)
    expect(k.couleurs.positionB).toBe('vert')
    proche(k.positionC, 0.182)
    expect(k.couleurs.positionC).toBe('orange')
    proche(k.altitudeB, 0.035)
    expect(k.couleurs.altitudeB).toBe('vert')
    proche(k.altitudeC, 0.052)
    expect(k.couleurs.altitudeC).toBe('vert')
  })

  it('cap lu 74,4, corrigé 64,4, direction du plan 64,39, écart 0,0 vert ; calage orange', () => {
    proche(r.calage?.capLu, 74.4, 0.1)
    proche(r.calage?.capCorrige, 64.4, 0.1)
    proche(r.calage?.controle.directionPlan, 64.39, 0.1)
    proche(r.calage?.controle.ecartCap, 0, 0.1)
    expect(r.calage?.controle.couleurs.cap).toBe('vert')
    expect(r.couleurCalage).toBe('orange')
    expect(r.orientation).toBe('plan')
    expect(r.etape).toBe(2)
    expect(r.prochainNumero).toBe('S01')
  })

  it('le sens de saisie d’un côté ne change rien (B vers A au lieu de A vers B)', () => {
    const s = jeuA()
    const ab = s.objets.find((o) => o.id === 'AB')!
    if (ab.type !== 'cote') throw new Error('type')
    ab.donnees = { ...ab.donnees, de: 'B', vers: 'A', lectures: ab.donnees.lectures.map((l) => ({ ...l, sens: 'retour' as const })), decametre: { aller: 53.68, retour: 53.64 } }
    const r2 = calc(s)
    proche(r2.cotes.ab?.distanceRetenue, 52.468)
    proche(r2.cotes.ab?.denivele, -11.245)
    proche(r2.principales.b?.position?.x, 47.312)
  })
})

describe('calculerReleve : jeux A2 et A3', () => {
  it('A2 : nord approximatif, B (47,317 ; 22,671), C (69,213 ; −17,165)', () => {
    const r = calc(jeuA2())
    expect(r.orientation).toBe('nord_approximatif')
    expect(r.mentionOrientation).toBe('nord approximatif')
    proche(r.principales.b?.position?.x, 47.317)
    proche(r.principales.b?.position?.y, 22.671)
    proche(r.principales.c?.position?.x, 69.213)
    proche(r.principales.c?.position?.y, -17.165)
  })
  it('A2 sans cap : B (52,468 ; 0), orientation libre', () => {
    const r = calc(jeuA2('sans_cap'))
    proche(r.principales.b?.position?.x, 52.468)
    proche(r.principales.b?.position?.y, 0)
    expect(r.mentionOrientation).toBe('orientation libre (axe A vers B)')
  })
  it('A3 cap inversé : écart 180 rouge, calage rouge, positions du jeu A', () => {
    const r = calc(jeuA3())
    proche(r.calage?.controle.ecartCap, 180, 0.1)
    expect(r.couleurCalage).toBe('rouge')
    proche(r.principales.c?.position?.x, 69.217)
  })
  it('A3 altitude de C 22,33 : écart −0,948 rouge', () => {
    const r = calc(jeuA3('altitude_c'))
    proche(r.calage?.controle.altitudeC, -0.948)
    expect(r.couleurCalage).toBe('rouge')
  })
})

describe('calculerReleve : jeu B (calage sauté, 8 stations)', () => {
  const r = calc(jeuB())
  const attendus: [string, number, number, number, number, number][] = [
    ['S01', 19.993, 0.006, 33.274, 0.01, 1.55],
    ['S02', 30.006, 5.006, 30.918, 0.013, 1.34],
    ['S03', 39.998, -0.002, 28.455, 0.041, 1.19],
    ['S04', 45.0, -8.001, 27.211, 0.014, 1.24],
    ['S05', 54.993, -0.005, 24.843, 0.055, 1.36],
    ['S06', 35.0, 11.999, 29.728, 0.049, 1.27],
    ['S07', 24.998, -3.007, 32.052, 0.03, 1.38],
    ['S08', 49.988, 7.993, 26.093, 0.05, 1.23],
  ]

  it('bornes vérifiées placées aux valeurs du plan', () => {
    expect(r.etatCalage).toBe('saute')
    proche(r.principales.b?.position?.x, 47.29)
    proche(r.principales.c?.position?.z, 21.33)
    expect(r.etape).toBe(3)
  })

  it.each(attendus)('%s : X, Y, altitude, écart, indice, vert', (n, x, y, z, ecart, indice) => {
    const s = r.stations.find((k) => k.numero === n)!
    proche(s.resultat.x, x)
    proche(s.resultat.y, y)
    proche(s.resultat.z, z)
    proche(s.resultat.ecartAltitude, ecart)
    proche(s.resultat.indice, indice)
    expect(s.couleur).toBe('vert')
  })

  it('8 stations dans l’ordre, prochaine S09, aucune incomplète, 11 points de courbes', () => {
    expect(r.stations.map((s) => s.numero)).toEqual(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08'])
    expect(r.prochainNumero).toBe('S09')
    expect(r.stationsIncompletes).toBe(0)
    expect(r.pointsCourbes).toHaveLength(11)
  })

  it('performance : 100 stations recalculées en moins de 200 ms', () => {
    const s = jeuB()
    const base = s.objets.filter((o) => o.type !== 'station')
    const stations = Array.from({ length: 100 }, (_, i) => {
      const src = s.objets.filter((o) => o.type === 'station')[i % 8]
      const n = `S${String(i + 1).padStart(2, '0')}`
      return { ...src, id: n, donnees: { ...(src.donnees as object), numero: n } } as typeof src
    })
    const grand = { ...s, objets: [...base, ...stations] }
    calc(grand)
    const t0 = performance.now()
    const g = calc(grand)
    const ms = performance.now() - t0
    console.log(`[perf] 100 stations : ${ms.toFixed(1)} ms`)
    expect(g.stations).toHaveLength(100)
    expect(ms).toBeLessThan(200)
  })
})

describe('calculerReleve : jeu C (défauts)', () => {
  const r = calc(jeuC())
  it('E1 = S01 rouge visée suspecte B ; E4 = S03 orange ; E5 = S04 incomplète', () => {
    const s = (n: string) => r.stations.find((k) => k.numero === n)!
    expect(s('S01').couleur).toBe('rouge')
    expect(s('S01').resultat.viseeSuspecte).toBe('B')
    expect(s('S02').resultat.viseeSuspecte).toBe('C')
    expect(s('S03').couleur).toBe('orange')
    proche(s('S03').resultat.indice, 3.38)
    expect(s('S04').incomplete).toBe(true)
    expect(s('S04').resultat.propositionEphemere).toBe(true)
    expect(r.stationsIncompletes).toBe(1)
  })
  it('points de courbes : 3 bornes et la seule station verte ou orange (S03)', () => {
    expect(r.pointsCourbes.map((p) => p.id).sort()).toEqual(['A', 'B', 'C', 'S03'])
  })
})

describe('calculerReleve : jeu F (borne éphémère D créée depuis S06)', () => {
  const r = calc(jeuF())
  const s = (n: string) => r.stations.find((k) => k.numero === n)!

  it('D en (35,000 ; 11,999 ; 29,728), rang 1', () => {
    const d = r.bornes.find((b) => b.id === 'D1')!
    proche(d.position?.x, 35.0)
    proche(d.position?.y, 11.999)
    proche(d.position?.z, 29.728)
    expect(d.donnees.rang).toBe(1)
    expect(d.etiquette).toBe('D, Piquet du manguier')
  })

  it('S10 : X 54,993 ; Y 11,995 ; altitude 24,906 ; écart 0,033 ; indice 1,41 ; vert ; A manquante', () => {
    const k = s('S10').resultat
    proche(k.x, 54.993)
    proche(k.y, 11.995)
    proche(k.z, 24.906)
    proche(k.ecartAltitude, 0.033)
    proche(k.indice, 1.41)
    expect(k.couleur).toBe('vert')
    expect(k.bornesManquantes).toEqual(['A'])
  })

  it('S11 : X 45,001 ; Y 14,998 ; altitude 27,335 ; écart 0,026 ; indice 1,16 ; vert', () => {
    const k = s('S11').resultat
    proche(k.x, 45.001)
    proche(k.y, 14.998)
    proche(k.z, 27.335)
    proche(k.ecartAltitude, 0.026)
    proche(k.indice, 1.16)
    expect(k.couleur).toBe('vert')
  })

  it('S12 : X 54,996 ; Y 11,998 ; altitude 24,906 ; indice 1,10 ; vert', () => {
    const k = s('S12').resultat
    proche(k.x, 54.996)
    proche(k.y, 11.998)
    proche(k.z, 24.906)
    proche(k.indice, 1.1)
    expect(k.couleur).toBe('vert')
  })

  it('S13 : rouge, visée suspecte C, retraits, résultat sans C', () => {
    const k = s('S13').resultat
    proche(k.x, 54.964)
    proche(k.y, 13.194)
    proche(k.z, 24.926)
    expect(k.couleur).toBe('rouge')
    expect(k.viseeSuspecte).toBe('C')
    proche(k.retraits?.C.ecartPosition, 0.003)
    proche(k.retraits?.A.ecartPosition, 0.953)
    proche(k.retraits?.B.ecartPosition, 0.186)
    proche(k.retraits?.D1.ecartPosition, 0.966)
    proche(k.sansSuspecte?.x, 54.996)
    proche(k.sansSuspecte?.y, 12.002)
    proche(k.sansSuspecte?.z, 24.904)
  })

  it('S09 = E4 orange ; D et S06 donnent un seul point ; S13 rouge exclue', () => {
    expect(s('S09').couleur).toBe('orange')
    const ids = r.pointsCourbes.map((p) => p.id)
    expect(ids).toContain('D1')
    expect(ids).not.toContain('S06')
    expect(ids).not.toContain('S13')
    // A, B, C, D + S01..S05, S07, S08 + S09 + S10, S11, S12 = 15 points
    expect(r.pointsCourbes).toHaveLength(15)
    expect(r.prochainNumero).toBe('S14')
  })

  it('S13 gardée sans la visée C : point au résultat sans C', () => {
    const f = jeuF()
    const s13 = f.objets.find((o) => o.id === 'S13')!
    if (s13.type !== 'station') throw new Error('type')
    s13.donnees = { ...s13.donnees, etat: 'gardee', sans_visee: 'C' }
    const r2 = calc(f)
    const p = r2.pointsCourbes.find((k) => k.id === 'S13')!
    proche(p.x, 54.996)
    proche(p.y, 12.002)
    proche(p.z, 24.904)
  })

  it('ordre de calcul : une station qui vise D est calculée après S06 même si son numéro est plus petit', () => {
    const f = jeuF()
    const s10 = f.objets.find((o) => o.id === 'S10')!
    if (s10.type !== 'station') throw new Error('type')
    s10.donnees = { ...s10.donnees, numero: 'S00' }
    const r2 = calc(f)
    const k = r2.stations.find((x) => x.numero === 'S00')!.resultat
    proche(k.x, 54.993)
    proche(k.y, 11.995)
  })
})

describe('calculerReleve : jeu G (D retirée, D (2) depuis S01)', () => {
  const r = calc(jeuG())
  it('D (1) retirée garde sa position, D (2) en (19,993 ; 0,006 ; 33,274), étiquettes avec usage', () => {
    const d1 = r.bornes.find((b) => b.id === 'D1')!
    const d2 = r.bornes.find((b) => b.id === 'D2')!
    expect(d1.active).toBe(false)
    expect(d1.etiquette).toBe('D (1), Piquet du manguier, retirée')
    expect(d2.etiquette).toBe('D (2), Angle sud du parking')
    proche(d2.position?.x, 19.993)
    proche(d2.position?.y, 0.006)
    proche(d2.position?.z, 33.274)
  })
  it('S10 à S13 gardent leurs résultats (renvoient à D (1))', () => {
    proche(r.stations.find((k) => k.numero === 'S10')!.resultat.x, 54.993)
    proche(r.stations.find((k) => k.numero === 'S12')!.resultat.y, 11.998)
  })
  it('points : D (1) et D (2) remplacent S06 et S01', () => {
    const ids = r.pointsCourbes.map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining(['D1', 'D2']))
    expect(ids).not.toContain('S01')
    expect(ids).not.toContain('S06')
  })
})
