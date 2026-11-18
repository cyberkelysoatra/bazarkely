// Screen 10, step 3 « Contrôle » (H13, 6.7) and step 4 checks (6.9), on game F (PRD 11):
// S06 accepted rank 1, E4 (S09) refused « Position trop fragile », S10 accepted rank 2 (it sights D), and a
// station sighting the rank-2 target E refused « trop de reports, précision insuffisante » (C3, S14).
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jeuF } from '../../../etat/jeux'
import { calculerReleve } from '../../../etat/releveCalcule'
import type { DonneesBorne, DonneesStation, Objet } from '../../../db/types'
import { EtapeControle } from '../EtapeControle'
import { controlerStation, lettreProposee, objetsCreation, verifierCreation } from '../logique'

const T = '2026-11-18T06:00:00.000Z'

function objetsDe(extra: Objet[] = []): Objet[] {
  const s = jeuF()
  const base = s.objets.map((o) => ({ ...o, releve_id: 'r', supprime: false, saisi_at: o.saisi_at ?? T, maj_at: T, apres_reprise: false, envoi: 'a_envoyer' }) as Objet)
  return [...base, ...extra]
}

function objet(id: string, type: 'borne' | 'station', donnees: DonneesBorne | DonneesStation, minute: number): Objet {
  const t = new Date(Date.UTC(2026, 10, 18, 6, minute)).toISOString()
  return { id, releve_id: 'r', type, donnees, supprime: false, saisi_at: t, maj_at: t, apres_reprise: false, envoi: 'a_envoyer' } as Objet
}

/** Sight from the point (x, y) at altitude z towards a target (hi = ht = 1,50 m: V = Zb - Zs). */
function visee(px: number, py: number, pz: number, b: { x: number; y: number; z: number }) {
  const h = Math.hypot(b.x - px, b.y - py)
  const v = b.z - pz
  return { distance: Math.round(Math.hypot(h, v) * 1000) / 1000, pente: Math.round((Math.atan2(v, h) * 180) / Math.PI * 10000) / 10000 }
}

const rien = () => undefined

describe('étape 3 : contrôle', () => {
  const c = calculerReleve(jeuF().releve.entete, objetsDe())
  const st = (n: string) => c.stations.find((s) => s.numero === n)!

  it('S06 (verte, indice 1,27) acceptée, rang 1', async () => {
    const continuer = vi.fn()
    // Before D is created (game F: D comes from S06).
    const avantD = calculerReleve(jeuF().releve.entete, objetsDe().filter((o) => !['D1', 'J2', 'S10', 'S11', 'S12', 'S13'].includes(o.id)))
    const s06 = avantD.stations.find((s) => s.numero === 'S06')!
    expect(controlerStation(st('S06'), c.reglages, c.bornes)).toMatchObject({ ok: false, motif: 'deja' })
    const { container } = render(<EtapeControle station={s06} reglages={avantD.reglages} bornes={avantD.bornes} onContinuer={continuer} onAutreEndroit={rien} onCompleter={rien} />)
    expect(container.querySelector('[data-message-controle]')?.textContent).toBe('Accepté : station verte, indice 1,27.')
    expect(container.querySelector('[data-rang]')?.getAttribute('data-rang')).toBe('1')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer : nommer la borne' }))
    expect(continuer).toHaveBeenCalledWith(1)
  })

  it('S09 (E4, indice 3,38) refusée : message de l’étape 3 et « Choisir un autre endroit »', async () => {
    const autre = vi.fn()
    render(<EtapeControle station={st('S09')} reglages={c.reglages} bornes={c.bornes} onContinuer={rien} onAutreEndroit={autre} onCompleter={rien} />)
    expect(screen.getByRole('alert').textContent).toContain('Position trop fragile : choisissez un endroit plus au centre des bornes')
    await userEvent.click(screen.getByRole('button', { name: 'Choisir un autre endroit' }))
    expect(autre).toHaveBeenCalled()
  })

  it('S10 (vise D de rang 1) acceptée en rang 2 ; une station visant E (rang 2) est refusée (rang 3)', () => {
    expect(controlerStation(st('S10'), c.reglages, c.bornes)).toEqual({ ok: true, rang: 2 })

    // E « Piquet du talus » created from S10 (rank 2).
    const e = objetsCreation({ id: 'E1', lettre: 'E', nom: 'Piquet du talus', rang: 2, station: st('S10'), bornes: c.bornes, le: T })
    const borneE = e[0].donnees as DonneesBorne
    expect(borneE).toMatchObject({ lettre: 'E', usage: 1, rang: 2, type: 'ephemere', station_origine: st('S10').id, etat: 'active' })
    const avecE = objetsDe([objet('E1', 'borne', borneE, 30)])
    const c2 = calculerReleve(jeuF().releve.entete, avecE)
    const pE = c2.bornes.find((b) => b.id === 'E1')!.position!
    expect(pE.x).toBeCloseTo(54.993, 2)
    expect(pE.y).toBeCloseTo(11.995, 2)
    expect(pE.z).toBeCloseTo(24.906, 2)

    // Station sighting E, B and C from the point (60 ; 5) at 25,000 m.
    const pos = (id: string) => c2.bornes.find((b) => b.id === id)!.position!
    const v = (id: string) => ({ borne_id: id, ...visee(60, 5, 25, pos(id)), pas_visible: false, historique: [] })
    const s14: DonneesStation = { numero: 'S14', heure: T, visees: [v('E1'), v('B'), v('C')], etat: 'normale', note: null, sans_visee: null }
    const c3 = calculerReleve(jeuF().releve.entete, [...avecE, objet('S14', 'station', s14, 31)])
    const station14 = c3.stations.find((s) => s.numero === 'S14')!
    expect(station14.resultat.x).toBeCloseTo(60, 2)
    expect(station14.resultat.z).toBeCloseTo(25, 2)
    expect(station14.resultat.rangMax).toBe(2)

    render(<EtapeControle station={station14} reglages={c3.reglages} bornes={c3.bornes} onContinuer={rien} onAutreEndroit={rien} onCompleter={rien} />)
    expect(screen.getByRole('alert').textContent).toBe('trop de reports, précision insuffisante')
    expect(screen.queryByRole('button', { name: 'Continuer : nommer la borne' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Choisir un autre endroit' })).toBeTruthy()
  })
})

describe('étape 4 : lettres (6.9)', () => {
  const c = calculerReleve(jeuF().releve.entete, objetsDe())
  it('B refusée pendant que B est active ; prochain panneau libre E ; nom obligatoire', () => {
    expect(verifierCreation('B', 'Angle', c.bornes).lettre).toBe('La lettre B est déjà portée par Borne nord')
    expect(verifierCreation('E', '', c.bornes)).toEqual({ lettre: null, nom: "Le nom de l'endroit est obligatoire" })
    expect(lettreProposee(c.bornes)).toBe('E')
  })
})
