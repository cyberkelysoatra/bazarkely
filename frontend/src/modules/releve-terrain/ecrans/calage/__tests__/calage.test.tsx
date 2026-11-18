// Screen 7 rendered on a real IndexedDB (fake-indexeddb) with the games of the PRD: C2 (A2), C3 (A3),
// C5 (limits of the readings), C4 (no-sensor path refuses 361).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import '../../bornes/__tests__/environnement'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { db } = await import('../../../db/base')
const depot = await import('../../../db/depot')
const { jeu } = await import('../../../etat/jeux')
const { default: EcranCalage } = await import('../EcranCalage')

async function charger(lettre: string, variante?: string, avant?: (releveId: string) => Promise<void>) {
  const d = await depot.creerDomaine('Essai')
  const c = await depot.creerChantier(d.id, 'Jeux du PRD')
  const r = await depot.importerReleve(c.id, jeu(lettre, variante)!, 'garder_les_deux')
  if (avant) await avant(r.id)
  render(
    <MemoryRouter initialEntries={[`/r/${r.id}/calage`]}>
      <Routes>
        <Route path="/r/:releve/calage" element={<EcranCalage />} />
        <Route path="/r/:releve/saisir" element={<p>Écran Saisir</p>} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Étape 2 : caler les bornes' })
  return r.id
}

const ligneBorne = (l: string) => Array.from(document.querySelector(`[data-borne-placee="${l}"]`)!.children).map((td) => td.textContent).join(' ')
const ligneControle = (cle: string) => document.querySelector(`[data-controle-ligne="${cle}"]`)!.textContent!.replace(/\s+/g, ' ')

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
})
afterEach(cleanup)

describe('écran 7, jeu A2 (C2)', () => {
  it('sans plan, C à droite, cap 74,4 : B (47,317 ; 22,671), C (69,213 ; −17,165), nord approximatif', async () => {
    await charger('A2')
    await waitFor(() => expect(document.querySelector('[data-resultat]')).not.toBeNull())
    expect(screen.getByRole('heading', { name: 'C est-il à gauche ou à droite en regardant de A vers B ?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'À droite' })).toHaveAttribute('aria-pressed', 'true')
    expect(ligneBorne('B')).toContain('47,317 22,671')
    expect(ligneBorne('C')).toContain('69,213 −17,165')
    expect(screen.getByText('Nord approximatif')).toBeInTheDocument()
    expect(document.querySelector('[data-cap]')!.textContent).toContain('Cap lu 74,4° ; déclinaison 10° ; cap corrigé 64,4°')
  })

  it('sans cap : B (52,468 ; 0,000), orientation libre (axe A vers B)', async () => {
    await charger('A2', 'sans_cap')
    await waitFor(() => expect(document.querySelector('[data-resultat]')).not.toBeNull())
    expect(ligneBorne('B')).toContain('52,468 0,000')
    expect(screen.getByText('Orientation libre (axe A vers B)')).toBeInTheDocument()
  })

  it('A et B avec X et Y, C sans : la question du côté est posée avant le résultat', async () => {
    const user = userEvent.setup()
    await charger('A', undefined, async (id) => {
      const c = (await db.objets.where('releve_id').equals(id).toArray()).find((o) => o.type === 'borne' && o.donnees.lettre === 'C')!
      if (c.type !== 'borne') return
      const rev = (await db.releves.get(id))!.rev
      await depot.ecrireObjet(id, { id: c.id, type: 'borne', donnees: { ...c.donnees, plan: { x: null, y: null, z: 21.33 } } }, rev)
    })
    const question = await screen.findByRole('heading', { name: 'C est-il à gauche ou à droite en regardant de A vers B ?' })
    expect(question).toBeInTheDocument()
    expect(document.querySelector('[data-resultat]')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'À droite' }))
    await waitFor(() => expect(document.querySelector('[data-resultat]')).not.toBeNull())
    expect(ligneBorne('C')).toContain('69,217 −17,150')
  })
})

describe('écran 7, jeu A3 (C3)', () => {
  it('cap 254,4 : écart 180,0 rouge, calage rouge, « Continuer quand même » note force et journal', async () => {
    const user = userEvent.setup()
    const id = await charger('A3', 'cap_inverse')
    await waitFor(() => expect(document.querySelector('[data-controle]')).not.toBeNull())
    expect(ligneControle('cap')).toContain('écart 180,0°')
    expect(ligneControle('cap')).toContain('ROUGE')
    const controle = document.querySelector('[data-controle]') as HTMLElement
    expect(within(controle).getByText('Le plan et le terrain ne concordent pas')).toBeInTheDocument()
    expect(within(document.querySelector('[data-resultat]') as HTMLElement).getAllByText('ROUGE').length).toBeGreaterThan(0)
    // positions identical to game A
    expect(ligneBorne('B')).toContain('47,312 22,681 26,865')
    await user.click(screen.getByRole('button', { name: 'Étape suivante : valider le calage et relever' }))
    const dialogue = await screen.findByRole('alertdialog')
    expect(within(dialogue).getByText('Le plan et le terrain ne concordent pas : vérifier la borne A ou B ou le plan')).toBeInTheDocument()
    await user.click(within(dialogue).getByRole('button', { name: 'Continuer quand même' }))
    await screen.findByText('Écran Saisir')
    const r = await db.releves.get(id)
    expect(r!.entete.calage.etat).toBe('force')
    const journaux = (await db.objets.where('releve_id').equals(id).toArray()).filter((o) => o.type === 'journal' && o.donnees.action === 'calage_force')
    expect(journaux).toHaveLength(1)
  })

  it('« Refaire » ferme le dialogue sans rien noter', async () => {
    const user = userEvent.setup()
    const id = await charger('A3', 'cap_inverse')
    await waitFor(() => expect(document.querySelector('[data-controle]')).not.toBeNull())
    await user.click(screen.getByRole('button', { name: 'Étape suivante : valider le calage et relever' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Refaire' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect((await db.releves.get(id))!.entete.calage.etat).toBe('a_faire')
  })

  it('altitude du plan de C 22,33 : −0,948 rouge, « vérifier la borne C ou le plan »', async () => {
    const user = userEvent.setup()
    await charger('A3', 'altitude_c')
    await waitFor(() => expect(document.querySelector('[data-controle]')).not.toBeNull())
    expect(ligneControle('altitudeC')).toContain('−0,948 m')
    expect(ligneControle('altitudeC')).toContain('ROUGE')
    expect(ligneBorne('C')).toContain('21,382')
    await user.click(screen.getByRole('button', { name: 'Étape suivante : valider le calage et relever' }))
    expect(within(await screen.findByRole('alertdialog')).getByText('Le plan et le terrain ne concordent pas : vérifier la borne C ou le plan')).toBeInTheDocument()
  })

  it('sans cap : « cap non contrôlé », calage orange, validé sans dialogue', async () => {
    const user = userEvent.setup()
    const id = await charger('A3', 'sans_cap')
    await waitFor(() => expect(document.querySelector('[data-controle]')).not.toBeNull())
    expect(within(document.querySelector('[data-controle]') as HTMLElement).getByText('cap non contrôlé')).toBeInTheDocument()
    const resultat = document.querySelector('[data-resultat]') as HTMLElement
    expect(resultat.querySelector('h3')!.parentElement!.textContent).toContain('ORANGE')
    await user.click(screen.getByRole('button', { name: 'Étape suivante : valider le calage et relever' }))
    await screen.findByText('Écran Saisir')
    expect((await db.releves.get(id))!.entete.calage.etat).toBe('valide')
  })
})

describe('écran 7, valeurs refusées (C5, C4)', () => {
  it('distance 0 et 1 200, pente 95 refusées avec leur message ; cap 361 refusé', async () => {
    const user = userEvent.setup()
    await charger('A')
    const carte = await screen.findByRole('region', { name: 'Côté A vers B' })
    await user.click(within(carte).getByRole('button', { name: /Lecture 1 : distance/ }))
    await user.keyboard('0{Enter}')
    expect(await screen.findByText('Distance entre 0 et 1 000 m.')).toBeInTheDocument()
    await user.keyboard('1200{Enter}')
    expect(screen.getByText('Distance entre 0 et 1 000 m.')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(within(carte).getByRole('button', { name: /Lecture 1 : pente/ }))
    await user.keyboard('95{Enter}')
    expect(await screen.findByText('Pente entre −90° et +90°.')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    // jsdom announces no absolute orientation sensor: the manual field
    await user.click(screen.getByRole('button', { name: 'Lire la boussole' }))
    expect(await screen.findByText('Pas de boussole sur ce téléphone : saisissez le cap lu sur une boussole.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cap A vers B lu sur une boussole/ }))
    await user.keyboard('361{Enter}')
    expect(await screen.findByText('Cap entre 0 et 360°.')).toBeInTheDocument()
  })
})
