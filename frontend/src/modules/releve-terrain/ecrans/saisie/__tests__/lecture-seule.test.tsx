// RELEVE-CC-09, C2: the states of the band (held here, elsewhere, the account's other phone, free, finish
// waiting, taken over, right withdrawn, no account) and the read-only screens of a relevé this phone does
// not hold (no Saisir in the bar, screens 6, 7, 10, 12 read-only, screen 14 with the owner's take-over
// dialog), plus the guard of db/depot.ts. Real Dexie on fake-indexeddb, memory router.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import '../../bornes/__tests__/environnement'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'

// The global setup replaces localStorage by empty mocks: a real one in memory here (session presence).
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
const { useReleve } = await import('../../../etat/useReleve')
const { useBandeauReleve } = await import('../../../etat/useEnvoi')
const { lireAvis } = await import('../../../etat/avis')
const { Bandeau } = await import('../../../composants/Bandeau')
const { SESSION_STORAGE_KEY } = await import('../../../sync/client')
const { signalerSession } = await import('../../../sync/session')
const { MESSAGE_DROIT_RETIRE, MESSAGE_FIN_EN_ATTENTE, MESSAGE_RESEAU_PRENDRE } = await import('../../../sync/messages')
const { default: EcranBornes } = await import('../../bornes/EcranBornes')
const { default: EcranCalage } = await import('../../calage/EcranCalage')
const { default: Ephemere } = await import('../../ephemere/Ephemere')
const { default: Saisir } = await import('../../saisir/Saisir')
const { default: EcranSaisie } = await import('../EcranSaisie')
const { default: Resultats } = await import('../../resultats/Resultats')
type Detenteur = import('../../../db/types').Detenteur
type Releve = import('../../../db/types').Releve

const COMPTE = '00000000-0000-0000-0000-000000000001'
/** 07:42 and 09:12 in Madagascar. */
const DEPUIS = '2026-11-18T04:42:00.000Z'
const DERNIERE = '2026-11-18T06:12:00.000Z'
const REPRISE = '2026-11-18T07:20:00.000Z'

function reseau(enLigne: boolean) {
  ;(navigator as unknown as { onLine: boolean }).onLine = enLigne
}

function fausseSession() {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ access_token: 'faux', user: { id: COMPTE, email: 'p@x.mg' } }))
  signalerSession()
}

function detenteur(m: Partial<Detenteur> = {}): Detenteur {
  return { user_id: 'r', nom: 'R', appareil: 'appareil-r', appareil_libelle: 'Android', depuis: DEPUIS, moi: false, ...m }
}

async function releveJeuB(etat: Partial<Releve>) {
  const d = await depot.creerDomaine('Domaine A')
  const c = await depot.creerChantier(d.id, 'Premier chantier')
  const r = await depot.importerReleve(c.id, jeu('B')!, 'garder_les_deux')
  await db.releves.update(r.id, etat)
  return r.id
}

function Sonde({ compacte = false }: { compacte?: boolean }) {
  const { releve } = useParams()
  const r = useReleve(releve)
  const b = useBandeauReleve(r.etat.statut === 'pret' ? r.etat.releve : undefined, { compacte })
  if (r.etat.statut !== 'pret') return null
  return <Bandeau compacte={compacte} {...b} />
}

async function bandeau(id: string, compacte = false) {
  render(
    <MemoryRouter initialEntries={[`/r/${id}`]}>
      <Routes>
        <Route path="/r/:releve" element={<Sonde compacte={compacte} />} />
        <Route path="/r/:releve/saisie" element={<p>Écran saisie</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.findByRole('status')
}

function ecran(id: string, chemin: string) {
  render(
    <MemoryRouter initialEntries={[`/r/${id}/${chemin}`]}>
      <Routes>
        <Route path="/r/:releve/bornes" element={<EcranBornes />} />
        <Route path="/r/:releve/calage" element={<EcranCalage />} />
        <Route path="/r/:releve/ephemere" element={<Ephemere />} />
        <Route path="/r/:releve/saisir/:station?" element={<Saisir />} />
        <Route path="/r/:releve/saisie" element={<EcranSaisie />} />
        <Route path="/r/:releve/resultats" element={<Resultats />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The bottom bar has Carte and Résultats, never Saisir. */
async function barreSansSaisir() {
  const barre = await screen.findByRole('navigation', { name: 'Barre du relevé' })
  expect(within(barre).queryByRole('link', { name: /Saisir/ })).toBeNull()
  expect(within(barre).getByRole('link', { name: /Carte/ })).toBeTruthy()
  expect(within(barre).getByRole('link', { name: /Résultats/ })).toBeTruthy()
}

/** Every button and field of the content is disabled. */
async function contenuVerrouille(minimum = 1) {
  const f = (await waitFor(() => {
    const x = document.querySelector('fieldset[data-lecture-seule]')
    if (!x) throw new Error('pas de lecture seule')
    return x
  })) as HTMLFieldSetElement
  expect(f.disabled).toBe(true)
  const controles = [...f.querySelectorAll('button, input, select, textarea')] as HTMLButtonElement[]
  expect(controles.length).toBeGreaterThanOrEqual(minimum)
  // A disabled fieldset disables its descendants (HTML): none of them can be activated.
  for (const c of controles) expect(c.matches(':disabled')).toBe(true)
}

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
  localStorage.clear()
  signalerSession()
  reseau(true)
})
afterEach(cleanup)

describe('bandeau de saisie (3.1)', () => {
  it('sans compte : « Enregistré sur ce téléphone »', async () => {
    const id = await releveJeuB({ saisie: null })
    expect((await bandeau(id)).textContent).toContain('Enregistré sur ce téléphone')
  })

  it('tenue ici : « Vous tenez la saisie », repère d’envoi et « Terminer la saisie » ; une ligne sur l’écran 8', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ici' })
    const b = await bandeau(id)
    await waitFor(() => expect(b.textContent).toMatch(/saisies en attente d'envoi/))
    expect(b.getAttribute('data-bandeau')).toBe('tenue')
    expect(b.textContent).toContain('Vous tenez la saisie')
    expect(within(b).getByRole('button', { name: 'Terminer la saisie' })).toBeTruthy()
    cleanup()
    await db.objets.toCollection().modify({ envoi: 'envoye' })
    await db.releves.update(id, { envoi: 'envoye' })
    const c = await bandeau(id, true)
    await waitFor(() => expect(c.textContent).toContain('Vous tenez la saisie, tout est envoyé'))
    expect(within(c).getByRole('button', { name: 'Terminer' })).toBeTruthy()
  })

  it('tenue ailleurs : téléphone de X, lecture seule, dernière donnée reçue', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur(), derniere_donnee_at: DERNIERE })
    const b = await bandeau(id)
    expect(b.getAttribute('data-bandeau')).toBe('ailleurs')
    expect(b.textContent).toContain('En saisie sur le téléphone de R depuis le 18/11 à 07:42. Lecture seule.')
    expect(b.textContent).toContain('dernière donnée reçue à 09:12')
    expect(within(b).queryByRole('button')).toBeNull()
  })

  it('autre téléphone du même compte : il est nommé', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur({ moi: true, appareil_libelle: 'Téléphone B test' }) })
    expect((await bandeau(id)).textContent).toContain('En saisie sur votre autre téléphone, Téléphone B test, depuis le 18/11 à 07:42.')
  })

  it('libre : « Prendre la saisie » ; sans réseau, le message de H27', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'libre', detenteur: null })
    const b = await bandeau(id)
    expect(b.textContent).toContain('Saisie libre')
    reseau(false)
    fireEvent.click(within(b).getByRole('button', { name: 'Prendre la saisie' }))
    await waitFor(() => expect(lireAvis()?.texte).toBe(MESSAGE_RESEAU_PRENDRE))
  })

  it('fin en attente du réseau (écran 13), reprise, droit retiré', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'fin_en_attente', terminer_demande: true })
    expect((await bandeau(id)).textContent).toContain(MESSAGE_FIN_EN_ATTENTE)
    cleanup()
    await db.releves.update(id, { saisie: 'reprise', reprise_at: REPRISE, detenteur: detenteur({ nom: 'P' }) })
    const r = await bandeau(id)
    expect(r.getAttribute('data-bandeau')).toBe('reprise')
    expect(r.textContent).toContain('Saisie reprise par le propriétaire le 18/11 à 10:20. Lecture seule.')
    cleanup()
    await db.releves.update(id, { saisie: 'lecture', detenteur: null })
    const d = await bandeau(id)
    await waitFor(() => expect(d.textContent).toContain(MESSAGE_DROIT_RETIRE))
    expect(d.getAttribute('data-bandeau')).toBe('retire')
  })
})

describe('écrans en lecture seule quand la saisie n’est pas tenue ici (6.8)', () => {
  it('écran 6 : tout désactivé, pas de Saisir dans la barre', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur() })
    ecran(id, 'bornes')
    await screen.findByRole('heading', { name: 'Étape 1 : les bornes' })
    await contenuVerrouille()
    await barreSansSaisir()
  })

  it('écran 7 : tout désactivé', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'reprise', reprise_at: REPRISE, detenteur: detenteur() })
    ecran(id, 'calage')
    await contenuVerrouille()
    await barreSansSaisir()
  })

  it('écran 10 : ni création ni retrait de borne éphémère', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur() })
    ecran(id, 'ephemere')
    await contenuVerrouille(0)
    // The fixed block (« Créer la borne... ») is not shown either.
    expect(document.querySelector('[data-pied-station]')).toBeNull()
    await barreSansSaisir()
  })

  it('écran 12 : points du plan, seuils, coupure, déclinaison en lecture ; exports et intervalle permis', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur() })
    ecran(id, 'resultats')
    await screen.findByRole('heading', { name: 'Étape 4 : résultats' })
    const blocs = await waitFor(() => {
      const x = document.querySelectorAll('fieldset[data-lecture-seule]')
      if (x.length < 2) throw new Error('lecture seule absente')
      return x
    })
    expect(blocs).toHaveLength(2)
    for (const f of blocs) expect((f as HTMLFieldSetElement).disabled).toBe(true)
    const libres = [...document.querySelectorAll('main button')].filter((b) => !b.closest('fieldset[data-lecture-seule]')) as HTMLButtonElement[]
    expect(libres.length).toBeGreaterThan(0)
    for (const b of libres) expect(b.matches(':disabled')).toBe(false)
    await barreSansSaisir()
  })

  it('écran 8 : renvoie vers l’écran 14 ; le propriétaire voit « Reprendre la saisie » et l’avertissement de 6.10', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur(), derniere_donnee_at: DERNIERE })
    ecran(id, 'saisir')
    await screen.findByText('Saisir est fermé : vous voyez la carte et les résultats.')
    await barreSansSaisir()
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre la saisie' }))
    const dialogue = await screen.findByRole('alertdialog')
    expect(dialogue.textContent).toContain(
      "La saisie est tenue par le téléphone de R depuis le 18/11 à 07:42 ; ce qu'il n'a pas encore envoyé arrivera plus tard. La reprendre ?",
    )
    expect(within(dialogue).getByRole('button', { name: 'Oui, reprendre la saisie' })).toBeTruthy()
  })

  it('écran 14 : un invité « relever » ne voit pas « Reprendre la saisie »', async () => {
    fausseSession()
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur() })
    const r = await db.releves.get(id)
    await db.chantiers.update(r!.chantier_id, { droit: 'relever' })
    ecran(id, 'saisie')
    await screen.findByText('Saisir est fermé : vous voyez la carte et les résultats.')
    expect(screen.queryByRole('button', { name: 'Reprendre la saisie' })).toBeNull()
  })
})

describe('garde de db/depot.ts', () => {
  it('refuse toute écriture d’un relevé non tenu, accepte la préférence d’intervalle', async () => {
    const id = await releveJeuB({ saisie: 'ailleurs', detenteur: detenteur() })
    const rev = (await db.releves.get(id))!.rev
    const station = { type: 'station' as const, donnees: { numero: 'S99', heure: DEPUIS, visees: [], etat: 'normale' as const, note: null, sans_visee: null } }
    await expect(depot.ecrireObjet(id, station, rev)).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    await expect(depot.modifierEntete(id, { hi: 1.6 }, rev)).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    await expect(depot.renommerReleve(id, 'Autre nom', rev)).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    await expect(depot.supprimerObjets(id, [], rev)).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    await expect(depot.demanderFinSaisie(id)).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    await db.releves.update(id, { saisie: 'reprise' })
    await expect(depot.ecrireObjet(id, station, rev)).rejects.toThrow('Saisie reprise par le propriétaire : ce relevé est en lecture seule.')
    await depot.ecrireVueIntervalle(2)
    expect(await depot.lireCle('vue_intervalle')).toBe(2)
    // Held here again: the write goes through.
    await db.releves.update(id, { saisie: 'ici' })
    await expect(depot.ecrireObjet(id, station, rev)).resolves.toBeTruthy()
  })
})
