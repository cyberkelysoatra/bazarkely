// RELEVE-CC-11: two writes of screen 6 started together (place name confirmed, then X and Y typed at once)
// were both sent with the same rev: the second was refused with « Ce relevé a changé dans un autre
// onglet » (seen on bench CC-07 once a session runs the sync). Now they run one after the other and the
// later one merges on the values just written: nothing refused, nothing lost.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import './environnement'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { db } = await import('../../../db/base')
const depot = await import('../../../db/depot')
const { default: EcranBornes } = await import('../EcranBornes')
const { AvisGlobal } = await import('../../../composants/Avis')

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
})
afterEach(cleanup)

function taper(libelle: string, chiffres: string) {
  fireEvent.click(screen.getByRole('button', { name: libelle }))
  const pave = screen.getByRole('dialog', { name: libelle })
  for (const c of chiffres) fireEvent.click(within(pave).getByRole('button', { name: c === ',' ? 'Virgule' : c }))
  fireEvent.click(within(pave).getByRole('button', { name: 'OK' }))
}

describe('écran 6 : écritures rapprochées', () => {
  it('nom de l’endroit puis X et Y aussitôt : tout est gardé, aucun conflit', async () => {
    const d = await depot.creerDomaine('Essai')
    const c = await depot.creerChantier(d.id, 'Chantier')
    const r = await depot.creerReleve(c.id, { nom: 'Relevé' })
    render(
      <MemoryRouter initialEntries={[`/r/${r.id}/bornes`]}>
        <AvisGlobal />
        <Routes>
          <Route path="/r/:releve/bornes" element={<EcranBornes />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Étape 1 : les bornes' })
    const nom = screen.getByLabelText("Nom de l'endroit de A")
    // Synchronous gestures, no wait: the three writes start before the first one is written.
    fireEvent.change(nom, { target: { value: 'Borne ouest' } })
    fireEvent.blur(nom)
    taper('X de A', '47')
    taper('Y de A', '22')
    await waitFor(async () => {
      const a = (await db.objets.where('releve_id').equals(r.id).toArray()).find((o) => o.type === 'borne' && (o.donnees as { lettre: string }).lettre === 'A')!
      const dn = a.donnees as { nom: string; plan?: { x: number | null; y: number | null } }
      expect(dn.nom).toBe('Borne ouest')
      expect(dn.plan?.x).toBe(47)
      expect(dn.plan?.y).toBe(22)
    })
    expect(screen.queryByText(depot.MESSAGE_CONFLIT)).toBeNull()
  })
})
