// Screen 6 rendered on a real IndexedDB (fake-indexeddb): C5 (letters, place name), C6 (H06, calibration
// skipped), C7 (hi 1,50 -> 1,60 after stations: confirmation, S01 from 33,274 to 33,174 in useReleve).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import './environnement'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'

const { db } = await import('../../../db/base')
const depot = await import('../../../db/depot')
const { jeu } = await import('../../../etat/jeux')
const { useReleve } = await import('../../../etat/useReleve')
const { default: EcranBornes } = await import('../EcranBornes')

/** Probe: altitude of S01 as useReleve computes it. */
function Sonde() {
  const { releve } = useParams()
  const r = useReleve(releve)
  if (r.etat.statut !== 'pret') return null
  const s = r.etat.calcule.stations.find((x) => x.numero === 'S01')
  return <output data-testid="s01">{s?.retenu ? s.retenu.z.toFixed(3) : 'aucune'}</output>
}

async function charger(lettre: string) {
  const d = await depot.creerDomaine('Essai')
  const c = await depot.creerChantier(d.id, 'Jeux du PRD')
  const r = await depot.importerReleve(c.id, jeu(lettre)!, 'garder_les_deux')
  render(
    <MemoryRouter initialEntries={[`/r/${r.id}/bornes`]}>
      <Routes>
        <Route
          path="/r/:releve/bornes"
          element={
            <>
              <EcranBornes />
              <Sonde />
            </>
          }
        />
        <Route path="/r/:releve/saisir" element={<p>Écran Saisir</p>} />
        <Route path="/r/:releve/calage" element={<p>Écran Calage</p>} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Étape 1 : les bornes' })
  return r.id
}

const objetsDe = async (id: string) => db.objets.where('releve_id').equals(id).toArray()

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
})
afterEach(cleanup)

describe('écran 6, lettres et noms (C5)', () => {
  it('changer A en B est refusé (règle 6.9) ; une lettre libre est acceptée', async () => {
    const user = userEvent.setup()
    const id = await charger('A')
    await user.click(await screen.findByRole('button', { name: 'Lettre A : changer la lettre' }))
    const feuille = await screen.findByRole('dialog', { name: 'Lettre de la borne A' })
    await user.click(within(feuille).getByRole('button', { name: 'B' }))
    expect(within(feuille).getByRole('alert')).toHaveTextContent('La lettre B est déjà portée par Borne nord')
    expect((await objetsDe(id)).filter((o) => o.type === 'borne' && o.donnees.lettre === 'A')).toHaveLength(1)
    await user.click(within(feuille).getByRole('button', { name: 'K' }))
    await waitFor(async () => expect((await objetsDe(id)).some((o) => o.type === 'borne' && o.donnees.lettre === 'K')).toBe(true))
    expect(await screen.findByRole('button', { name: 'Lettre K : changer la lettre' })).toBeInTheDocument()
  })

  it('un nom de l’endroit vide est refusé', async () => {
    const user = userEvent.setup()
    const id = await charger('A')
    const champ = await screen.findByRole('textbox', { name: "Nom de l'endroit de A" })
    await user.clear(champ)
    await user.tab()
    expect(await screen.findByText("Donnez le nom de l'endroit.")).toBeInTheDocument()
    const a = (await objetsDe(id)).find((o) => o.type === 'borne' && o.donnees.ordre === 1)
    expect(a?.type === 'borne' && a.donnees.nom).toBe('Borne ouest')
  })
})

describe('écran 6, bornes déjà calées (C6, H06)', () => {
  it('« saisir comme vérifiées » : calage sauté, journal, bornes vérifiées, Saisir ouvert', async () => {
    const user = userEvent.setup()
    const id = await charger('A')
    await user.click(screen.getByRole('button', { name: 'Bornes déjà calées : les saisir comme vérifiées et sauter le calage' }))
    await screen.findByText('Écran Saisir')
    const r = await db.releves.get(id)
    expect(r!.entete.calage.etat).toBe('saute')
    const objets = await objetsDe(id)
    expect(objets.filter((o) => o.type === 'borne' && o.donnees.type === 'principale' && o.donnees.verifiee)).toHaveLength(3)
    expect(objets.filter((o) => o.type === 'journal' && o.donnees.action === 'calage_saute')).toHaveLength(1)
  })

  it('sans X, Y et altitude des 3 bornes : refusé', async () => {
    const user = userEvent.setup()
    const id = await charger('A2')
    await user.click(screen.getByRole('button', { name: 'Bornes déjà calées : les saisir comme vérifiées et sauter le calage' }))
    expect(await screen.findByText('Pour sauter le calage, saisissez X, Y et altitude des 3 bornes.')).toBeInTheDocument()
    expect((await db.releves.get(id))!.entete.calage.etat).toBe('a_faire')
  })
})

describe('écran 6, hauteurs après des stations (C7)', () => {
  it('hi 1,50 -> 1,60 : confirmation, puis S01 passe de 33,274 à 33,174 dans useReleve', async () => {
    const user = userEvent.setup()
    const id = await charger('B')
    expect(await screen.findByTestId('s01')).toHaveTextContent('33.274')
    await user.click(screen.getByRole('button', { name: /Hauteur de l'appareil/ }))
    await user.keyboard('1,60{Enter}')
    const dialogue = await screen.findByRole('alertdialog')
    expect(dialogue).toHaveTextContent('Toutes les stations seront recalculées. Continuer ?')
    expect(screen.getByTestId('s01')).toHaveTextContent('33.274')
    await user.click(within(dialogue).getByRole('button', { name: 'Continuer' }))
    await waitFor(() => expect(screen.getByTestId('s01')).toHaveTextContent('33.174'))
    expect((await db.releves.get(id))!.entete.hi).toBe(1.6)
    const j = (await objetsDe(id)).filter((o) => o.type === 'journal' && o.donnees.action === 'hauteurs_modifiees')
    expect(j).toHaveLength(1)
  })

  it('« Annuler » garde 1,50', async () => {
    const user = userEvent.setup()
    const id = await charger('B')
    await screen.findByTestId('s01')
    await user.click(screen.getByRole('button', { name: /Hauteur de l'appareil/ }))
    await user.keyboard('1,60{Enter}')
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Annuler' }))
    expect((await db.releves.get(id))!.entete.hi).toBe(1.5)
    expect(screen.getByTestId('s01')).toHaveTextContent('33.274')
  })
})
