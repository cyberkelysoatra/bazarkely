// H23: first opening with network and no session asks to sign in (screen 1, back to the page asked
// before); without network, or with a session, the app opens without asking (local data never blocks).
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.unmock('react-router-dom')

import { render, screen } from '@testing-library/react'
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

const { Porte } = await import('../../App')
const { SESSION_STORAGE_KEY } = await import('../client')
const { signalerSession } = await import('../session')

function Ici() {
  const { pathname, search } = useLocation()
  return <p>page {pathname + search}</p>
}

function monter(chemin: string) {
  return render(
    <MemoryRouter initialEntries={[chemin]}>
      <Porte>
        <Routes>
          <Route path="*" element={<Ici />} />
        </Routes>
      </Porte>
    </MemoryRouter>,
  )
}

function reseau(enLigne: boolean) {
  ;(navigator as unknown as { onLine: boolean }).onLine = enLigne
}

afterEach(() => {
  memoire.clear()
  signalerSession()
  reseau(true)
})

describe('Porte du module (H23)', () => {
  it('avec du réseau et sans session : écran 1, retour vers la page demandée', () => {
    reseau(true)
    monter('/c/abc')
    expect(screen.getByText('page /connexion?retour=%2Fc%2Fabc')).toBeInTheDocument()
  })

  it('sans réseau et sans session : le relevé s’ouvre comme avant', () => {
    reseau(false)
    monter('/c/abc')
    expect(screen.getByText('page /c/abc')).toBeInTheDocument()
  })

  it('avec une session : aucune question', () => {
    reseau(true)
    memoire.set(SESSION_STORAGE_KEY, JSON.stringify({ access_token: 'faux', user: { id: 'u1', email: 'a@b.mg' } }))
    signalerSession()
    monter('/r/x/saisir')
    expect(screen.getByText('page /r/x/saisir')).toBeInTheDocument()
  })
})
