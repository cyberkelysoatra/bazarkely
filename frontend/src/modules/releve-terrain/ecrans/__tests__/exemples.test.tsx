// C4 (RELEVE-CC-11, D35): every field of the module shows an example while empty. The forms and screens
// of the prompt (3.4) are rendered on a real IndexedDB; the test fails when a field (other than a date,
// a password or a file) has neither a value nor an example. The example goes as soon as something is
// typed and comes back when the field is emptied (text field and keypad).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import '../bornes/__tests__/environnement'
import { Suspense } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { db } = await import('../../db/base')
const depot = await import('../../db/depot')
const { jeu, NUMEROS } = await import('../../etat/jeux')
const { ECRANS } = await import('../registre')
const { default: Accueil } = await import('../Accueil')
const { default: Chantier } = await import('../Chantier')
const { default: Connexion } = await import('../Connexion')
const { AIDES, EXEMPLES } = await import('../exemples')

if (!window.scrollTo || String(window.scrollTo).includes('not implemented')) window.scrollTo = () => undefined

function monter(chemin: string) {
  return render(
    <MemoryRouter initialEntries={[chemin]}>
      <Suspense fallback={<p>chargement</p>}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/c/:chantier" element={<Chantier />} />
          {ECRANS.map((e) => (
            <Route key={e.route} path={e.route} element={<e.composant />} />
          ))}
        </Routes>
      </Suspense>
    </MemoryRouter>,
  )
}

const EXCLUS = ['date', 'password', 'file', 'checkbox', 'radio', 'hidden']

function nomDe(el: Element): string {
  const id = el.getAttribute('id')
  const lie = el.getAttribute('aria-labelledby')?.split(' ')[0]
  const label = (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null) ?? (lie ? document.getElementById(lie) : null)
  return label?.textContent?.trim() || el.outerHTML.slice(0, 80)
}

/** Fields shown without a value and without an example. */
function sansExemple(): string[] {
  const manquants: string[] = []
  for (const el of Array.from(document.body.querySelectorAll('input, textarea'))) {
    const i = el as HTMLInputElement
    if (EXCLUS.includes((i.getAttribute('type') ?? 'text').toLowerCase())) continue
    if (i.value === '' && !(i.getAttribute('placeholder') ?? '').startsWith('ex. ')) manquants.push(nomDe(i))
  }
  for (const b of Array.from(document.body.querySelectorAll('[data-champ-nombre]'))) {
    const valeur = b.querySelector('[id$="-v"]')!
    const vide = valeur.querySelector('span') !== null
    if (vide && !valeur.querySelector('[data-exemple]')) manquants.push(nomDe(b))
  }
  return manquants
}

/** Every field visible now has a value or an example; returns how many were checked. */
function verifier(): number {
  expect(sansExemple()).toEqual([])
  return document.body.querySelectorAll('input:not([type=date]):not([type=password]):not([type=file]):not([type=checkbox]), textarea, [data-champ-nombre]').length
}

async function releveVide() {
  const d = await depot.creerDomaine('Essai')
  const c = await depot.creerChantier(d.id, 'Chantier essai')
  const r = await depot.creerReleve(c.id, { nom: 'Relevé vide' })
  return { d, c, r }
}

async function releveJeu(lettre: string) {
  const d = await depot.creerDomaine('Essai')
  const c = await depot.creerChantier(d.id, 'Jeux du PRD')
  return depot.importerReleve(c.id, jeu(lettre)!, 'garder_les_deux')
}

const stationNumero = async (releveId: string, numero: string) =>
  (await db.objets.where('releve_id').equals(releveId).toArray()).find((o) => o.type === 'station' && (o.donnees as { numero?: string }).numero === numero)!

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
})
afterEach(cleanup)

describe('C4 : un exemple dans chaque champ', () => {
  it('accueil : nouveau domaine, nouveau chantier, renommer (exemple et ligne d’aide)', async () => {
    const user = userEvent.setup()
    monter('/')
    await user.click(await screen.findByRole('button', { name: '+ Nouveau domaine foncier' }))
    const champ = await screen.findByLabelText('Nom du domaine')
    expect(champ).toHaveAttribute('placeholder', EXEMPLES.domaine)
    expect(screen.getByText(AIDES.domaine)).toBeInTheDocument()
    expect(verifier()).toBeGreaterThan(0)
    cleanup()

    await depot.creerDomaine('Domaine sans chantier')
    monter('/')
    await user.click(await screen.findByRole('button', { name: '+ Nouveau chantier' }))
    const chantier = await screen.findByLabelText('Nom du chantier')
    expect(chantier).toHaveAttribute('placeholder', EXEMPLES.chantier)
    expect(screen.getByText(AIDES.chantier)).toBeInTheDocument()
    verifier()
  })

  it('chantier : formulaire « Nouveau relevé »', async () => {
    const user = userEvent.setup()
    const { c } = await releveVide()
    monter(`/c/${c.id}`)
    await user.click(await screen.findByRole('button', { name: '+ Nouveau relevé' }))
    const dialogue = await screen.findByRole('dialog', { name: 'Nouveau relevé' })
    expect(within(dialogue).getByLabelText('Nom du relevé')).toHaveAttribute('placeholder', EXEMPLES.nomReleve)
    expect(within(dialogue).getByLabelText('Opérateurs')).toHaveAttribute('placeholder', EXEMPLES.operateurs)
    expect(within(dialogue).getByText(AIDES.operateurs)).toBeInTheDocument()
    expect(within(dialogue).getByText(AIDES.hauteurAppareil)).toBeInTheDocument()
    expect(within(dialogue).getByText(AIDES.hauteurCibles)).toBeInTheDocument()
    expect(verifier()).toBeGreaterThanOrEqual(4)
  })

  it('écran Bornes (relevé vide) ; exemple parti à la frappe, revenu au vidage (texte et pavé)', async () => {
    const user = userEvent.setup()
    const { r } = await releveVide()
    monter(`/r/${r.id}/bornes`)
    await screen.findByRole('heading', { name: 'Étape 1 : les bornes' })
    expect(verifier()).toBeGreaterThanOrEqual(14)
    expect(screen.getAllByPlaceholderText(EXEMPLES.endroitBorne)).toHaveLength(3)
    expect(screen.getAllByText(AIDES.xyBorne)).toHaveLength(3)
    expect(screen.getAllByText(AIDES.altitudeBorne)).toHaveLength(3)

    // Text field: typed → value shown (the placeholder is no longer displayed), emptied → example again.
    const endroit = screen.getByLabelText("Nom de l'endroit de A") as HTMLInputElement
    expect(endroit.value).toBe('')
    expect(endroit.matches(':placeholder-shown')).toBe(true)
    await user.type(endroit, 'B')
    expect(endroit.value).toBe('B')
    expect(endroit.matches(':placeholder-shown')).toBe(false)
    await user.clear(endroit)
    expect(endroit.matches(':placeholder-shown')).toBe(true)
    expect(endroit).toHaveAttribute('placeholder', EXEMPLES.endroitBorne)

    // Keypad of « X de A »: example in grey in the display, gone at the first digit, back after erasing.
    const x = screen.getByRole('button', { name: 'X de A' })
    expect(within(x).getByText(EXEMPLES.xyBorne)).toHaveAttribute('data-exemple')
    await user.click(x)
    const pave = await screen.findByRole('dialog', { name: 'X de A' })
    const affichage = pave.querySelector('[data-affichage-pave]')!
    expect(affichage.querySelector('[data-exemple]')?.textContent).toBe(EXEMPLES.xyBorne)
    fireEvent.click(within(pave).getByRole('button', { name: '4' }))
    expect(affichage.querySelector('[data-exemple]')).toBeNull()
    expect(affichage.textContent).toBe('4')
    fireEvent.click(within(pave).getByRole('button', { name: 'Effacer' }))
    expect(affichage.querySelector('[data-exemple]')?.textContent).toBe(EXEMPLES.xyBorne)
    fireEvent.click(within(pave).getByRole('button', { name: '4' }))
    fireEvent.click(within(pave).getByRole('button', { name: '7' }))
    fireEvent.click(within(pave).getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(within(screen.getByRole('button', { name: 'X de A' })).queryByText(EXEMPLES.xyBorne)).toBeNull())
    expect(screen.getByRole('button', { name: 'X de A' })).toHaveTextContent('47')
    // Emptied (empty value allowed): the example comes back.
    await user.click(screen.getByRole('button', { name: 'X de A' }))
    const pave2 = await screen.findByRole('dialog', { name: 'X de A' })
    fireEvent.click(within(pave2).getByRole('button', { name: 'Effacer' }))
    fireEvent.click(within(pave2).getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(within(screen.getByRole('button', { name: 'X de A' })).getByText(EXEMPLES.xyBorne)).toBeInTheDocument())
    verifier()
  })

  it('écran Calage (relevé vide), cap saisi à la main compris', async () => {
    const user = userEvent.setup()
    const { r } = await releveVide()
    monter(`/r/${r.id}/calage`)
    await screen.findByRole('heading', { name: 'Étape 2 : caler les bornes' })
    const manuel = screen.queryByRole('button', { name: 'Saisir le cap à la main' })
    if (manuel) await user.click(manuel)
    await screen.findByRole('button', { name: /Cap A vers B lu sur une boussole/ })
    expect(screen.getByText(AIDES.cap('A', 'B'))).toBeInTheDocument()
    expect(screen.getAllByText(AIDES.distanceCalage).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(AIDES.penteCalage).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(AIDES.decametre).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(EXEMPLES.penteCalage).length).toBeGreaterThanOrEqual(1)
    expect(verifier()).toBeGreaterThanOrEqual(10)
  })

  it('écran Saisir : nouvelle station (jeu B)', async () => {
    const r = await releveJeu('B')
    monter(`/r/${r.id}/saisir`)
    await waitFor(() => expect(document.querySelectorAll('[data-champ-nombre]').length).toBeGreaterThanOrEqual(6))
    expect(screen.getAllByText(EXEMPLES.distanceStation).length).toBeGreaterThanOrEqual(3)
    expect(screen.getAllByText(EXEMPLES.penteStation).length).toBeGreaterThanOrEqual(3)
    verifier()
  })

  it('borne éphémère, étape 4 : lettre et nom de l’endroit', async () => {
    const r = await releveJeu('B')
    const s = await stationNumero(r.id, NUMEROS.B.S06)
    monter(`/r/${r.id}/ephemere?etape=4&station=${s.id}`)
    const nom = await screen.findByLabelText("Nom de l'endroit")
    expect(nom).toHaveAttribute('placeholder', EXEMPLES.endroitEphemere)
    const lettre = screen.getByLabelText('Lettre du panneau')
    expect(lettre).toHaveAttribute('placeholder', EXEMPLES.lettreEphemere)
    expect(screen.getByText(AIDES.lettreEphemere)).toBeInTheDocument()
    fireEvent.change(lettre, { target: { value: '' } })
    expect((lettre as HTMLInputElement).value).toBe('')
    verifier()
  })

  it('station rouge : « Garder quand même », note obligatoire', async () => {
    const user = userEvent.setup()
    const r = await releveJeu('F')
    const s = await stationNumero(r.id, NUMEROS.F.S13)
    monter(`/r/${r.id}/saisir/${s.id}?vue=resultat`)
    await user.click(await screen.findByRole('button', { name: 'Garder quand même' }))
    expect(await screen.findByLabelText('Note (obligatoire)')).toHaveAttribute('placeholder', EXEMPLES.noteRouge)
    verifier()
  })

  it('résultats : point du plan à comparer et réglages des seuils', async () => {
    const user = userEvent.setup()
    const r = await releveJeu('B')
    monter(`/r/${r.id}/resultats`)
    await user.click(await screen.findByRole('button', { name: 'Ajouter un point du plan' }))
    expect(await screen.findByLabelText('Nom du point')).toHaveAttribute('placeholder', EXEMPLES.pointPlan)
    for (const ex of [EXEMPLES.xPlan, EXEMPLES.yPlan, EXEMPLES.altitudePlan]) expect(screen.getByText(ex)).toHaveAttribute('data-exemple')
    expect(verifier()).toBeGreaterThanOrEqual(4)
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    await user.click(await screen.findByRole('button', { name: 'Modifier les seuils' }))
    await screen.findByRole('dialog', { name: 'Réglages des seuils' })
    expect(verifier()).toBeGreaterThanOrEqual(17)
  })

  it('connexion par e-mail (le mot de passe garde son champ sans exemple)', async () => {
    const user = userEvent.setup()
    monter('/connexion')
    await user.click(await screen.findByRole('button', { name: 'Se connecter par e-mail' }))
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('placeholder', EXEMPLES.email)
    expect(screen.getByLabelText('Mot de passe')).not.toHaveAttribute('placeholder')
    verifier()
  })
})
