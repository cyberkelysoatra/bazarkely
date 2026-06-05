import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EauAide from '../components/EauAide';
import { AIDE } from '../components/eauAideTextes';

/** Helper : monte une aide autonome avec un id donné. */
function renderAide(id: string) {
  return render(
    <EauAide id={id} quoi="À quoi sert ce test." comment="Comment on s'en sert." />
  );
}

describe('EauAide — aide contextuelle dépliable', () => {
  beforeEach(() => {
    // Le setup global mocke localStorage avec des vi.fn() sans stockage réel ;
    // on installe ici un localStorage en mémoire pour tester la persistance.
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() {
          return store.size;
        },
      },
    });
  });

  it('1ʳᵉ visite : panneau déplié + sections « À quoi ça sert » / « Comment s\'en servir »', () => {
    renderAide('ecran-x');
    expect(screen.getByText('À quoi ça sert')).toBeInTheDocument();
    expect(screen.getByText("Comment s'en servir")).toBeInTheDocument();
    expect(screen.getByText('À quoi sert ce test.')).toBeInTheDocument();
    // Le bouton ⓘ est déplié (aria-expanded=true).
    expect(screen.getByRole('button', { name: /aide/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('mémorise « replié » pour la 2ᵉ visite (1ʳᵉ visite stocke 0)', () => {
    const { unmount } = renderAide('ecran-y');
    expect(localStorage.getItem('eau_aide_ecran-y')).toBe('0');
    unmount();
    // Remontage : doit être replié (suit la valeur mémorisée).
    renderAide('ecran-y');
    expect(screen.queryByText('À quoi ça sert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aide/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggle : un clic replie puis déplie, et persiste le choix', () => {
    renderAide('ecran-z');
    const btn = screen.getByRole('button', { name: /aide/i });
    // Départ déplié → clic = replié + persiste '0'
    fireEvent.click(btn);
    expect(screen.queryByText('À quoi ça sert')).not.toBeInTheDocument();
    expect(localStorage.getItem('eau_aide_ecran-z')).toBe('0');
    // Re-clic = déplié + persiste '1'
    fireEvent.click(btn);
    expect(screen.getByText('À quoi ça sert')).toBeInTheDocument();
    expect(localStorage.getItem('eau_aide_ecran-z')).toBe('1');
  });

  it('respecte un état déplié mémorisé (valeur "1")', () => {
    localStorage.setItem('eau_aide_ecran-w', '1');
    renderAide('ecran-w');
    expect(screen.getByText('À quoi ça sert')).toBeInTheDocument();
  });

  it('le catalogue de textes couvre tous les écrans clés', () => {
    for (const key of [
      'dashboard', 'releves', 'bassinEntree', 'bassinNiveau', 'bassinDebit',
      'saisieCompteur', 'tournee', 'scan', 'anomalies', 'tendances',
      'compteurs', 'carte', 'facturation', 'config', 'utilisateurs', 'demandes',
      'annonces', 'audit', 'client', 'accueil', 'alertes', 'rapports',
    ]) {
      const entry = AIDE[key];
      expect(entry, `entrée manquante : ${key}`).toBeTruthy();
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.quoi.length).toBeGreaterThan(0);
      expect(entry.comment.length).toBeGreaterThan(0);
    }
  });
});
