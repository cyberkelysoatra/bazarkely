// Error boundary of the screens (RELEVE-CC-07): a broken screen shows a way out, never a blank page.
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LimiteErreur } from '../LimiteErreur'

function Casse(): never {
  throw new Error('écran cassé')
}

describe('LimiteErreur', () => {
  afterEach(() => vi.restoreAllMocks())

  it('montre « Un problème est survenu » et le bouton Recharger quand un écran plante', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <LimiteErreur cle="/r/x/saisir">
        <Casse />
      </LimiteErreur>,
    )
    expect(screen.getByRole('heading', { name: 'Un problème est survenu' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeTruthy()
    expect(screen.getByText('Vos mesures restent enregistrées sur ce téléphone. Rechargez la page pour continuer.')).toBeTruthy()
  })

  it('redonne sa chance à l’écran quand l’adresse change', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(
      <LimiteErreur cle="/a">
        <Casse />
      </LimiteErreur>,
    )
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeTruthy()
    rerender(
      <LimiteErreur cle="/b">
        <p>Écran sain</p>
      </LimiteErreur>,
    )
    expect(screen.getByText('Écran sain')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Recharger' })).toBeNull()
  })

  it('laisse passer un écran sans erreur', () => {
    render(
      <LimiteErreur cle="/">
        <p>Accueil</p>
      </LimiteErreur>,
    )
    expect(screen.getByText('Accueil')).toBeTruthy()
  })
})
