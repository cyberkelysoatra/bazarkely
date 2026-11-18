// RELEVE-CC-10, C2: the rights of 6.8 in the screens, for the owner, an invited « relever » and an invited
// « consulter »: home (« Partagés avec moi », ⋯), work site (« + Nouveau relevé », ⋯ of the work site and of
// the relevés), relevé (bottom bar, « Prendre la saisie », read-only steps), routes 16 and 17 guarded, and
// screen 18 (preview, « Se connecter et accepter », used link). Real Dexie on fake-indexeddb, memory router.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import '../../bornes/__tests__/environnement'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

const memoire = new Map<string, string>()
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => memoire.get(k) ?? null,
    setItem: (k: string, v: string) => void memoire.set(k, String(v)),
    removeItem: (k: string) => void memoire.delete(k),
    clear: () => memoire.clear(),
    key: (i: number) => [...memoire.keys()][i] ?? null,
    get length() {
      return memoire.size
    },
  },
})

const { db } = await import('../../../db/base')
const depot = await import('../../../db/depot')
const { jeu } = await import('../../../etat/jeux')
const { SESSION_STORAGE_KEY } = await import('../../../sync/client')
const { signalerSession } = await import('../../../sync/session')
const { MESSAGE_PLUS_VALABLE, MESSAGE_RESERVE_PROPRIETAIRE } = await import('../../../sync/partage')
const { default: Accueil } = await import('../../Accueil')
const { default: Chantier } = await import('../../Chantier')
const { default: Resultats } = await import('../../resultats/Resultats')
const { default: EcranBornes } = await import('../../bornes/EcranBornes')
const { default: EcranSaisie } = await import('../../saisie/EcranSaisie')
const { default: Partager } = await import('../Partager')
const { default: Acces } = await import('../Acces')
const { default: Invitation, CLE_INVITATION, poserRpcApercu } = await import('../Invitation')
type Droit = import('../../../db/types').Droit

const COMPTE = '00000000-0000-0000-0000-000000000002'

function fausseSession() {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ access_token: 'faux', user: { id: COMPTE, email: 'r@x.mg' } }))
  signalerSession()
}

/** A domain with one work site and the relevé of jeu B; shared with the account when `droit` is not the owner's. */
async function terrain(droit: Droit, creeParMoi = false) {
  const d = await depot.creerDomaine('Domaine A')
  const c = await depot.creerChantier(d.id, 'Premier chantier')
  const r = await depot.importerReleve(c.id, jeu('B')!, 'garder_les_deux')
  await depot.poserCompte({ user_id: COMPTE, nom: 'r' })
  await db.domaines.update(d.id, { envoi: 'envoye', proprietaire: droit === 'proprietaire' ? COMPTE : 'partage', a_moi: droit === 'proprietaire', proprietaire_nom: 'Joël' })
  await db.chantiers.update(c.id, { envoi: 'envoye', droit })
  await db.releves.update(r.id, {
    envoi: 'envoye',
    serveur_connu: true,
    cree_par: creeParMoi ? COMPTE : 'autre-compte',
    cree_par_nom: creeParMoi ? 'r' : 'Joël',
    saisie: droit === 'consulter' ? 'lecture' : 'libre',
  })
  await db.objets.toCollection().modify({ envoi: 'envoye' })
  return { d, c, r }
}

function Ou() {
  const l = useLocation()
  return <p data-testid="ou">{l.pathname}</p>
}

function rendre(chemin: string) {
  render(
    <MemoryRouter initialEntries={[chemin]}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/c/:chantier" element={<Chantier />} />
        <Route path="/r/:releve/bornes" element={<EcranBornes />} />
        <Route path="/r/:releve/resultats" element={<Resultats />} />
        <Route path="/r/:releve/saisie" element={<EcranSaisie />} />
        <Route path="/d/:domaine/partager" element={<Partager />} />
        <Route path="/d/:domaine/acces" element={<Acces />} />
        <Route path="/i/:jeton" element={<Invitation />} />
        <Route path="/connexion" element={<Ou />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function itemsMenu(nomBouton: RegExp | string): Promise<string[]> {
  fireEvent.click(await screen.findByRole('button', { name: nomBouton }))
  const items = await screen.findAllByRole('menuitem')
  return items.map((i) => i.textContent?.trim() ?? '')
}

async function fermerMenu() {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
  cleanup()
}

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
  localStorage.clear()
  fausseSession()
  ;(navigator as unknown as { onLine: boolean }).onLine = false
  poserRpcApercu(null)
})
afterEach(cleanup)

describe('propriétaire', () => {
  it('accueil : ⋯ du domaine avec partage et accès ; chantier : « + Nouveau relevé », ⋯ complet ; écrans 16 et 17 ouverts', async () => {
    const { d, c, r } = await terrain('proprietaire', true)
    rendre('/')
    expect(await itemsMenu('Plus d’actions sur Domaine A')).toEqual(['+ Nouveau chantier', 'Partager ce domaine', 'Qui a accès', 'Renommer le domaine', 'Supprimer le domaine'])
    expect(screen.queryByText('Partagés avec moi')).toBeNull()
    await fermerMenu()

    rendre(`/c/${c.id}`)
    expect(await screen.findByRole('button', { name: '+ Nouveau relevé' })).toBeTruthy()
    expect(await itemsMenu(`Plus d’actions sur le chantier ${c.nom}`)).toEqual(['Partager ce chantier', 'Qui a accès', 'Ouvrir une sauvegarde ici', 'Renommer le chantier', 'Supprimer le chantier'])
    await fermerMenu()
    rendre(`/c/${c.id}`)
    expect(await itemsMenu(`Plus d’actions sur ${r.nom}`)).toEqual(['Dupliquer', 'Supprimer le relevé'])
    await fermerMenu()

    rendre(`/d/${d.id}/partager`)
    expect(await screen.findByRole('heading', { name: 'Partager' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Tout le domaine Domaine A/ })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Premier chantier' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Relever' }).getAttribute('aria-checked')).toBe('true')
    cleanup()
    rendre(`/d/${d.id}/partager?chantier=${c.id}`)
    expect(((await screen.findByRole('checkbox', { name: 'Premier chantier' })) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: /Tout le domaine/ }) as HTMLInputElement).checked).toBe(false)
    // Without network the message is not prepared.
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le message WhatsApp' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Il faut du réseau pour partager')
    cleanup()
    rendre(`/d/${d.id}/acces`)
    expect(await screen.findByRole('heading', { name: 'Qui a accès' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '+ Partager encore' })).toBeTruthy()
  })
})

describe('invité « relever »', () => {
  it('« Partagés avec moi » avec le droit ; crée des relevés ; ⋯ réduit ; supprime seulement les siens ; routes 16 et 17 gardées', async () => {
    const { d, c, r } = await terrain('relever')
    rendre('/')
    const section = await screen.findByRole('region', { name: 'Partagés avec moi' })
    expect(within(section).getByText('Domaine A')).toBeTruthy()
    expect(within(section).getByText('Propriétaire : Joël')).toBeTruthy()
    expect(section.querySelector('[data-droit="relever"]')).toBeTruthy()
    expect(within(section).queryByRole('button', { name: /Plus d’actions sur Domaine A/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Plus d’actions sur Domaine A' })).toBeNull()
    expect(await itemsMenu(`Plus d’actions sur ${c.nom}`)).toEqual(['Ouvrir une sauvegarde ici'])
    await fermerMenu()

    rendre(`/c/${c.id}`)
    expect(await screen.findByRole('button', { name: '+ Nouveau relevé' })).toBeTruthy()
    expect(await itemsMenu(`Plus d’actions sur le chantier ${c.nom}`)).toEqual(['Ouvrir une sauvegarde ici'])
    await fermerMenu()
    // A relevé of the owner: duplicate only; its own relevé: delete too.
    rendre(`/c/${c.id}`)
    expect(await itemsMenu(`Plus d’actions sur ${r.nom}`)).toEqual(['Dupliquer'])
    await fermerMenu()
    await db.releves.update(r.id, { cree_par: COMPTE })
    rendre(`/c/${c.id}`)
    expect(await itemsMenu(`Plus d’actions sur ${r.nom}`)).toEqual(['Dupliquer', 'Supprimer le relevé'])
    await fermerMenu()

    // Free relevé: Saisir in the bar, « Prendre la saisie » offered (screen 14).
    rendre(`/r/${r.id}/saisie`)
    // Band and screen 14 both offer it.
    expect((await screen.findAllByRole('button', { name: 'Prendre la saisie' })).length).toBeGreaterThanOrEqual(1)
    cleanup()

    for (const chemin of [`/d/${d.id}/partager`, `/d/${d.id}/acces`]) {
      rendre(chemin)
      expect((await screen.findByRole('alert')).textContent).toBe(MESSAGE_RESERVE_PROPRIETAIRE)
      expect(screen.queryByRole('button', { name: 'Préparer le message WhatsApp' })).toBeNull()
      cleanup()
    }
  })
})

describe('invité « consulter »', () => {
  it('ni « + Nouveau relevé » ni ⋯ ; barre sans Saisir ; pas de « Prendre la saisie » ; étapes en lecture seule ; routes gardées', async () => {
    const { d, c, r } = await terrain('consulter')
    rendre('/')
    const section = await screen.findByRole('region', { name: 'Partagés avec moi' })
    expect(section.querySelector('[data-droit="consulter"]')).toBeTruthy()
    expect(within(section).queryByRole('button', { name: /Plus d’actions/ })).toBeNull()
    cleanup()

    rendre(`/c/${c.id}`)
    expect(await screen.findByText(/Vous consultez ce chantier/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '+ Nouveau relevé' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Plus d’actions/ })).toBeNull()
    cleanup()

    rendre(`/r/${r.id}/resultats`)
    const barre = await screen.findByRole('navigation', { name: 'Barre du relevé' })
    expect(within(barre).queryByRole('link', { name: /Saisir/ })).toBeNull()
    expect(within(barre).getByRole('link', { name: /Carte/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Prendre/ })).toBeNull()
    // Exports stay.
    expect(await screen.findByText(/Exporter|Exports/)).toBeTruthy()
    cleanup()

    rendre(`/r/${r.id}/bornes`)
    const f = (await waitFor(() => {
      const x = document.querySelector('fieldset[data-lecture-seule]')
      if (!x) throw new Error('pas de lecture seule')
      return x
    })) as HTMLFieldSetElement
    expect(f.disabled).toBe(true)
    cleanup()

    rendre(`/r/${r.id}/saisie`)
    await screen.findByRole('navigation', { name: 'Barre du relevé' })
    expect(screen.queryByRole('button', { name: 'Prendre la saisie' })).toBeNull()
    cleanup()

    // The phone refuses creating, re-importing and duplicating as well (the server refuses anyway).
    await expect(depot.creerReleve(c.id, { nom: 'x' })).rejects.toBeInstanceOf(depot.DroitInsuffisant)
    await expect(depot.importerReleve(c.id, jeu('B')!, 'garder_les_deux')).rejects.toBeInstanceOf(depot.DroitInsuffisant)

    for (const chemin of [`/d/${d.id}/partager`, `/d/${d.id}/acces`]) {
      rendre(chemin)
      expect((await screen.findByRole('alert')).textContent).toBe(MESSAGE_RESERVE_PROPRIETAIRE)
      cleanup()
    }
  })
})

describe('écran 18 : invitation reçue', () => {
  it('aperçu sans session, « Se connecter et accepter » garde le jeton puis va à la connexion ; lien usé', async () => {
    localStorage.clear()
    signalerSession()
    ;(navigator as unknown as { onLine: boolean }).onLine = true
    const appels: string[] = []
    poserRpcApercu(async (f, a) => {
      appels.push(f)
      return a.p_jeton === 'bon'
        ? { valide: true, proprietaire_nom: 'Joël', domaine_nom: 'Domaine A', domaine_entier: false, droit: 'relever', chantiers: ['Premier chantier', 'Deuxième chantier'] }
        : { valide: false, plus_valable: true }
    })
    rendre('/i/bon')
    const dl = await waitFor(() => {
      const x = document.querySelector('dl')
      if (!x) throw new Error('pas encore')
      return x
    })
    expect(dl.textContent).toContain('DeJoël')
    expect(dl.textContent).toContain('DomaineDomaine A')
    expect(dl.textContent).toContain('ChantiersPremier chantier, Deuxième chantier')
    expect(dl.querySelector('[data-droit="relever"]')).toBeTruthy()
    expect(appels).toEqual(['rt_invitation_apercu'])
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter et accepter' }))
    expect((await screen.findByTestId('ou')).textContent).toBe('/connexion')
    expect(localStorage.getItem(CLE_INVITATION)).toBe('bon')
    cleanup()

    rendre('/i/use')
    expect((await screen.findByRole('alert')).textContent).toBe(MESSAGE_PLUS_VALABLE)
    expect(screen.queryByRole('button', { name: /accepter/i })).toBeNull()
  })
})
