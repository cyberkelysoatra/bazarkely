// C2 (RELEVE-CC-11, D34): Google sign-in started from the installed app. The mark is written before
// leaving for Google; the return page opened outside the app shows « Connexion réussie » only with a mark
// younger than 15 minutes, once the session is there; « Continuer ici » hides it; the mark is removed once
// read. In the app, the session is read again when the app comes back to the foreground. No token is
// ever written to the console.
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// A real localStorage in memory (the global setup replaces it by empty mocks).
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

const JETON = 'jeton-factice-cc11-ne-jamais-journaliser'
const faux = {
  auth: {
    signInWithOAuth: vi.fn(async (_: unknown) => ({ error: null })),
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  },
}
vi.mock('../client', async (original) => ({ ...(await original<typeof import('../client')>()), getSupabase: () => Promise.resolve(faux) }))

const { SESSION_STORAGE_KEY } = await import('../client')
const session = await import('../session')
const { CarteRetourConnexion } = await import('../../composants/RetourConnexion')
const { MARQUE_CONNEXION_APP, connexionGoogle, demarrerRelectureSession, oublierRetourDepuisApp, signalerSession, useSession } = session

let standalone = false
window.matchMedia = ((q: string) => ({
  matches: standalone && q.includes('display-mode: standalone'),
  media: q,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
})) as unknown as typeof window.matchMedia
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })

// Every console line of the run, to prove no token is ever logged.
const journal: unknown[][] = []
const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void journal.push(a)))

/** The session as the browser tab stores it (fabricated, never a real token). */
function ecrireSession() {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ access_token: JETON, refresh_token: JETON, user: { id: '00000000-0000-0000-0000-0000000000cc', email: 'joel@exemple.mg' } }))
}

function Sonde() {
  const s = useSession()
  return <output data-testid="compte">{s ? s.email : 'aucun'}</output>
}

beforeEach(() => {
  memoire.clear()
  standalone = false
  oublierRetourDepuisApp()
  faux.auth.signInWithOAuth.mockClear()
  faux.auth.getSession.mockClear()
  signalerSession()
})
afterEach(cleanup)
afterAll(() => {
  expect(JSON.stringify(journal.map((l) => l.map(String)))).not.toContain(JETON)
  espions.forEach((e) => e.mockRestore())
})

describe('C2 : la marque au départ de la connexion', () => {
  it("écrite dans l'application installée AVANT l'appel à signInWithOAuth", async () => {
    standalone = true
    let vueParGoogle: string | null = 'pas appelé'
    faux.auth.signInWithOAuth.mockImplementationOnce(async () => {
      vueParGoogle = localStorage.getItem(MARQUE_CONNEXION_APP)
      return { error: null }
    })
    const avant = Date.now()
    await connexionGoogle('/')
    expect(faux.auth.signInWithOAuth).toHaveBeenCalledTimes(1)
    expect(Number(vueParGoogle)).toBeGreaterThanOrEqual(avant)
    expect(Number(vueParGoogle)).toBeLessThanOrEqual(Date.now())
    expect(faux.auth.signInWithOAuth.mock.calls[0][0]).toMatchObject({ provider: 'google', options: { redirectTo: `${window.location.origin}/releve/` } })
  })

  it('pas de marque hors de l’application installée', async () => {
    await connexionGoogle('/')
    expect(localStorage.getItem(MARQUE_CONNEXION_APP)).toBeNull()
  })
})

describe('C2 : carte « Connexion réussie » sur la page de retour', () => {
  it('montrée hors application avec une marque fraîche et la session ; marque retirée ; « Continuer ici » la cache', async () => {
    const user = userEvent.setup()
    localStorage.setItem(MARQUE_CONNEXION_APP, String(Date.now() - 60_000))
    ecrireSession()
    render(<CarteRetourConnexion />)
    expect(screen.getByRole('heading', { name: 'Connexion réussie' })).toBeInTheDocument()
    expect(screen.getByText("Retournez dans l'application Relevé terrain : vous y êtes connecté. Vous pouvez fermer cette page.")).toBeInTheDocument()
    expect(localStorage.getItem(MARQUE_CONNEXION_APP)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Continuer ici' }))
    expect(screen.queryByRole('heading', { name: 'Connexion réussie' })).toBeNull()
  })

  it('attend la session : rien avant, la carte dès que la session est établie', () => {
    localStorage.setItem(MARQUE_CONNEXION_APP, String(Date.now() - 5_000))
    render(<CarteRetourConnexion />)
    expect(screen.queryByRole('heading', { name: 'Connexion réussie' })).toBeNull()
    act(() => {
      ecrireSession()
      signalerSession()
    })
    expect(screen.getByRole('heading', { name: 'Connexion réussie' })).toBeInTheDocument()
  })

  it('pas de carte avec une marque de plus de 15 minutes (marque retirée quand même)', () => {
    localStorage.setItem(MARQUE_CONNEXION_APP, String(Date.now() - 16 * 60_000))
    ecrireSession()
    render(<CarteRetourConnexion />)
    expect(screen.queryByRole('heading', { name: 'Connexion réussie' })).toBeNull()
    expect(localStorage.getItem(MARQUE_CONNEXION_APP)).toBeNull()
  })

  it('pas de carte sans marque', () => {
    ecrireSession()
    render(<CarteRetourConnexion />)
    expect(screen.queryByRole('heading', { name: 'Connexion réussie' })).toBeNull()
  })

  it("pas de carte dans l'application installée ; la marque y reste jusqu'à la session", () => {
    standalone = true
    localStorage.setItem(MARQUE_CONNEXION_APP, String(Date.now()))
    ecrireSession()
    render(<CarteRetourConnexion />)
    expect(screen.queryByRole('heading', { name: 'Connexion réussie' })).toBeNull()
    expect(localStorage.getItem(MARQUE_CONNEXION_APP)).not.toBeNull()
  })
})

describe("C2 : relecture de la session dans l'application", () => {
  it('visibilitychange (puis focus) relit la session par getSession et met à jour le compte ; marque retirée', async () => {
    standalone = true
    localStorage.setItem(MARQUE_CONNEXION_APP, String(Date.now()))
    const arret = demarrerRelectureSession()
    render(<Sonde />)
    expect(screen.getByTestId('compte')).toHaveTextContent('aucun')
    // The browser tab finished the sign-in: the shared storage holds the session, the app was asleep
    // (no storage event reached it).
    ecrireSession()
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(faux.auth.getSession).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('compte')).toHaveTextContent('joel@exemple.mg')
    expect(localStorage.getItem(MARQUE_CONNEXION_APP)).toBeNull()
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(faux.auth.getSession).toHaveBeenCalledTimes(2)
    arret()
  })

  it("hors de l'application installée, pas de relecture au premier plan", async () => {
    const arret = demarrerRelectureSession()
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(faux.auth.getSession).not.toHaveBeenCalled()
    arret()
  })
})
