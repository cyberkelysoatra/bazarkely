// C1 (RELEVE-CC-11, D33): the « Installer sur mon téléphone » entry on the home screen and in the top
// menu: shown without beforeinstallprompt (gesture sheet of the browser), the browser offer used when it
// exists, hidden inside the installed app.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')
vi.unmock('react-router-dom')

import '../../ecrans/bornes/__tests__/environnement'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { demarrerPwa } = await import('../../etat/pwa')
const { BoutonInstallation } = await import('../Installation')
const { MenuHaut } = await import('../../ecrans/MenuHaut')

const CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const nav = window.navigator as Navigator & { brave?: unknown; standalone?: boolean }

let standalone = false
function navigateur(ua: string, brave: boolean) {
  Object.defineProperty(nav, 'userAgent', { configurable: true, get: () => ua })
  if (brave) Object.defineProperty(nav, 'brave', { configurable: true, value: { isBrave: () => Promise.resolve(true) } })
  else delete (nav as { brave?: unknown }).brave
}

beforeAll(() => {
  window.matchMedia = ((q: string) => ({
    matches: standalone && q.includes('display-mode: standalone'),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
  demarrerPwa()
})
beforeEach(() => {
  standalone = false
  Object.defineProperty(nav, 'standalone', { configurable: true, value: undefined })
  navigateur(CHROME, false)
})
afterEach(cleanup)

const monter = (el: React.ReactNode) => render(<MemoryRouter>{el}</MemoryRouter>)

describe("C1 : entrée « Installer sur mon téléphone »", () => {
  it('montrée sans beforeinstallprompt ; Brave : gestes de Brave, ligne Chrome et « Ouvrir dans Chrome »', async () => {
    const user = userEvent.setup()
    navigateur(CHROME, true)
    monter(<BoutonInstallation />)
    await user.click(screen.getByRole('button', { name: 'Installer sur mon téléphone' }))
    const feuille = screen.getByRole('dialog', { name: 'Installer Relevé terrain' })
    const etapes = within(feuille).getAllByRole('listitem').map((li) => li.textContent)
    expect(etapes).toEqual(['1Touchez ⋮ en bas à droite.', "2Puis « Ajouter à l'écran d'accueil »."])
    expect(within(feuille).getByText('Pour une installation complète, ouvrez cette page dans Chrome.')).toBeInTheDocument()
    const lien = within(feuille).getByRole('link', { name: 'Ouvrir dans Chrome' })
    expect(lien.getAttribute('href')).toMatch(/^intent:\/\/.+#Intent;scheme=https;package=com\.android\.chrome;end$/)
  })

  it('Chrome sans offre : feuille avec ⋮ en haut à droite, sans « Ouvrir dans Chrome »', async () => {
    const user = userEvent.setup()
    monter(<BoutonInstallation />)
    await user.click(screen.getByRole('button', { name: 'Installer sur mon téléphone' }))
    const feuille = screen.getByRole('dialog', { name: 'Installer Relevé terrain' })
    expect(within(feuille).getAllByRole('listitem')[0]).toHaveTextContent('1Touchez ⋮ en haut à droite.')
    // The ⋮ key is drawn (the condensed font turns the glyph into a colon), the glyph kept for screen readers.
    expect(feuille.querySelector('[data-touche="⋮"] svg')).not.toBeNull()
    expect(within(feuille).queryByRole('link', { name: 'Ouvrir dans Chrome' })).toBeNull()
  })

  it('menu du haut : l’entrée est une ligne du menu, elle ouvre la feuille', async () => {
    const user = userEvent.setup()
    monter(<MenuHaut />)
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Installer sur mon téléphone' }))
    expect(screen.getByRole('dialog', { name: 'Installer Relevé terrain' })).toBeInTheDocument()
  })

  it("l'offre du navigateur est utilisée quand elle existe (pas de feuille)", async () => {
    const user = userEvent.setup()
    const offre = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(async () => undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    monter(<BoutonInstallation />)
    act(() => {
      window.dispatchEvent(offre)
    })
    expect(offre.defaultPrevented).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Installer sur mon téléphone' }))
    expect(offre.prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Installer Relevé terrain' })).toBeNull()
  })

  it("cachée dans l'application installée (display-mode standalone, puis navigator.standalone d'iOS)", async () => {
    const user = userEvent.setup()
    standalone = true
    monter(
      <>
        <BoutonInstallation />
        <MenuHaut />
      </>,
    )
    expect(screen.queryByRole('button', { name: 'Installer sur mon téléphone' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getAllByRole('menuitem').map((b) => b.textContent)).not.toContain('Installer sur mon téléphone')
    cleanup()
    standalone = false
    Object.defineProperty(nav, 'standalone', { configurable: true, value: true })
    monter(<BoutonInstallation />)
    expect(screen.queryByRole('button', { name: 'Installer sur mon téléphone' })).toBeNull()
  })
})
