// C2: signing out is refused while rows wait to be sent (PRD section 8), with the message
// « N saisies pas encore envoyées : attendez le réseau ou exportez la sauvegarde ». Rule and top menu.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import Dexie from 'dexie'
import { webcrypto } from 'node:crypto'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange
const cryptoGlobal = globalThis.crypto as unknown as { randomUUID: () => string }
cryptoGlobal.randomUUID = () => webcrypto.randomUUID()

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { LigneLue } from '../../db/depot'

// The global setup replaces localStorage by empty mocks: a real one in memory here.
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

const { db } = await import('../../db/base')
const depot = await import('../../db/depot')
const { verifierDeconnexion, refusSuppression } = await import('../regles')
const { messageAttente, messageDeconnexionRefusee, messageTenuAilleurs } = await import('../messages')
const { SESSION_STORAGE_KEY } = await import('../client')
const { signalerSession } = await import('../session')
const { MenuHaut } = await import('../../ecrans/MenuHaut')
const { AvisGlobal } = await import('../../composants/Avis')

/** A fabricated session (no real token): only its presence matters to the phone. */
function fausseSession() {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ access_token: 'faux', user: { id: '00000000-0000-0000-0000-000000000001', email: 'p@x.mg' } }))
  signalerSession()
}

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
  localStorage.clear()
})

describe('Déconnexion refusée tant que des saisies attendent', () => {
  it('compte les saisies en attente et rédige le message de la section 8', async () => {
    expect(await verifierDeconnexion()).toEqual({ ok: true })
    const d = await depot.creerDomaine('Domaine')
    const c = await depot.creerChantier(d.id, 'Chantier')
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    // Domain 1 + work site 1 + the 3 targets of the relevé.
    const v = await verifierDeconnexion()
    expect(v).toEqual({ ok: false, n: 5, message: '5 saisies pas encore envoyées : attendez le réseau ou exportez la sauvegarde' })
    expect(messageDeconnexionRefusee(1)).toBe('1 saisie pas encore envoyée : attendez le réseau ou exportez la sauvegarde')
    // Everything sent: allowed.
    const lignes: LigneLue[] = [
      ...(await db.domaines.toArray()).map((x) => ({ table: 'domaines' as const, id: x.id, maj_at: x.maj_at })),
      ...(await db.chantiers.toArray()).map((x) => ({ table: 'chantiers' as const, id: x.id, maj_at: x.maj_at })),
      ...(await db.releves.toArray()).map((x) => ({ table: 'releves' as const, id: x.id, maj_at: x.maj_at })),
      ...(await db.objets.toArray()).map((x) => ({ table: 'objets' as const, id: x.id, maj_at: x.maj_at })),
    ]
    await depot.marquerEnvoye(lignes)
    expect(await verifierDeconnexion()).toEqual({ ok: true })
    // A row written after it was read for sending stays waiting.
    const avant = (await db.releves.get(r.id))!
    await depot.renommerReleve(r.id, 'R bis', avant.rev)
    expect(await depot.marquerEnvoye([{ table: 'releves', id: r.id, maj_at: avant.maj_at }])).toBe(0)
    expect(await verifierDeconnexion()).toMatchObject({ ok: false, n: 1 })
  })

  it('le menu du haut refuse « Se déconnecter » et garde la session', async () => {
    fausseSession()
    await depot.creerDomaine('En attente')
    render(
      <MemoryRouter>
        <AvisGlobal />
        <MenuHaut />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Se déconnecter' }))
    await waitFor(() => expect(screen.getByText('1 saisie pas encore envoyée : attendez le réseau ou exportez la sauvegarde')).toBeInTheDocument())
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
  })
})

describe('Textes de l’envoi', () => {
  it('repère du bandeau et suppression refusée', async () => {
    expect(messageAttente(0)).toBe('Tout est envoyé')
    expect(messageAttente(1)).toBe("1 saisie en attente d'envoi")
    expect(messageAttente(3)).toBe("3 saisies en attente d'envoi")
    const det = { user_id: 'u', nom: 'Rado', appareil: 'autre', appareil_libelle: 'Itel', depuis: '2026-11-18T05:07:00Z', moi: false }
    expect(messageTenuAilleurs(det)).toBe('En saisie sur le téléphone de Rado depuis le 18/11 à 08:07.')
    const d = await depot.creerDomaine('D')
    const c = await depot.creerChantier(d.id, 'C')
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    expect(await refusSuppression({ domaineId: d.id })).toBeNull()
    await depot.appliquerServeur({ releves: [{ id: r.id, chantier_id: c.id, nom: 'R', entete: r.entete, cree_par: 'u', cree_at: r.cree_at, maj_at: r.maj_at, saisie: det }] })
    expect(await refusSuppression({ domaineId: d.id })).toBe('En saisie sur le téléphone de Rado depuis le 18/11 à 08:07.')
    expect(await refusSuppression({ chantierId: c.id })).not.toBeNull()
    expect(await refusSuppression({ releveId: r.id })).not.toBeNull()
  })
})
