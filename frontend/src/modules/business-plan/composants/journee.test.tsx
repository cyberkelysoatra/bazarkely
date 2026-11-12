// NEC-CC-18: "Ma journée" timeline (fake clock injected) and the end-of-step celebration rules.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { forwardRef, type ReactNode } from 'react';

// The global setup mocks the router and localStorage: a plain link and a real in-memory storage here.
vi.mock('react-router-dom', () => ({
  useNavigate: () => () => undefined,
  Link: forwardRef<HTMLAnchorElement, { to: string; children: ReactNode } & Record<string, string | undefined>>(({ to, children, ...reste }, ref) => (
    <a ref={ref} href={to} {...reste}>
      {children}
    </a>
  ))
}));
const MemoryRouter = ({ children }: { children: ReactNode }) => <>{children}</>;
import { MaJournee } from './MaJournee';
import { FinEtape, useFeteEtape } from './FinEtape';
import { planVide } from '../etat/vide';
import { lireFetes } from '../etat/journee';
import type { Plan } from '../types';

const a = (heure: number, minute: number) => () => new Date(2026, 10, 12, heure, minute, 0);

function remplirIdentite(p: Plan) {
  Object.assign(p.identite, { nomPrenom: 'Rasoa', nomProjet: 'Test', secteur: 'agriculture', lieu: 'Hell-Ville', unePhrase: 'Une phrase', avancement: 'idee', porteurs: 'Moi', attentes: 'Apprendre' });
}
function remplirM1(p: Plan, sauf = false) {
  const m = p.m1;
  Object.assign(m, { consequences: 'x', probleme: 'x', causes: 'x', pourquoiMoi: sauf ? '' : 'x' });
  Object.assign(m.client, { qui: 'x', ou: 'x', combien: 'x', aujourdhui: 'x', prixAujourdhui: 'x', decideur: 'x' });
  Object.assign(m.pv, { pour: 'x', qui: 'x', propose: 'x', quiBenefice: 'x', contrairement: 'x' });
}

function timeline(plan: Plan, horloge: () => Date) {
  return render(
    <MemoryRouter>
      <MaJournee plan={plan} horloge={horloge} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  const donnees = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (k: string) => donnees.get(k) ?? null,
      setItem: (k: string, v: string) => void donnees.set(k, String(v)),
      removeItem: (k: string) => void donnees.delete(k),
      clear: () => donnees.clear(),
      key: () => null,
      length: 0
    }
  });
});
afterEach(cleanup);

describe('NEC-CC-18 Ma journée', () => {
  it('identity and module 1 done: dots 1 and 2 checked, dot 3 is the current step', () => {
    const p = planVide();
    remplirIdentite(p);
    remplirM1(p);
    const { container } = timeline(p, a(9, 50));
    const points = container.querySelectorAll('.bp-point');
    expect(points).toHaveLength(12);
    expect(points[0].getAttribute('aria-label')).toContain(', faite');
    expect(points[1].getAttribute('aria-label')).toContain(', faite');
    expect(points[2].getAttribute('aria-label')).not.toContain(', faite');
    expect(points[2].getAttribute('aria-current')).toBe('step');
    expect(container.querySelector('.bp-etape-courante')?.textContent).toBe('Étape 3 : Business Model Canvas');
    expect(container.querySelector('.bp-restantes')?.textContent).toBe('Il te reste 9 étapes');
  });

  it('at 14:10 the pulse is on dot 8 and the badge says late', () => {
    const p = planVide();
    remplirIdentite(p);
    const { container } = timeline(p, a(14, 10));
    const pouls = container.querySelectorAll('.bp-pouls');
    expect(pouls).toHaveLength(1);
    expect(pouls[0].closest('li')?.getAttribute('data-etape')).toBe('8');
    expect(container.querySelector('.bp-badge-retard')?.textContent).toBe(
      "Décalage de plus d'une heure : fais d'abord 1b (ton client) et 1c (ta proposition de valeur), le reste peut attendre ce soir."
    );
  });

  it('outside 08:15 to 17:30: no pulse and no badge', () => {
    for (const t of [a(8, 10), a(17, 40), a(22, 0)]) {
      const { container, unmount } = timeline(planVide(), t);
      expect(container.querySelector('.bp-pouls')).toBeNull();
      expect(container.querySelector('.bp-badge-ecart')).toBeNull();
      unmount();
    }
  });

  it('dot 9 opens the synthesis, dot 12 the export', () => {
    const p = planVide();
    const { container } = timeline(p, a(10, 0));
    const liens = container.querySelectorAll('.bp-point');
    expect(liens[8].getAttribute('href')).toBe(`/p/${p.id}/synthese`);
    expect(liens[11].getAttribute('href')).toBe(`/p/${p.id}/exporter`);
  });
});

describe('NEC-CC-18 end-of-step celebration', () => {
  it('celebrates once when module 1 becomes done during the visit', () => {
    const p = planVide();
    remplirIdentite(p);
    remplirM1(p, true);
    const { result, rerender } = renderHook(({ plan }) => useFeteEtape(plan, 'm1', true), { initialProps: { plan: p } });
    expect(result.current.fete).toBeNull();
    const fini = { ...p, m1: { ...p.m1, pourquoiMoi: 'parce que' } };
    rerender({ plan: fini });
    expect(result.current.fete).toBe(2);
    expect(lireFetes(p.id)).toEqual([2]);
    act(() => result.current.fermer());
    expect(result.current.fete).toBeNull();
    // Reopened later (new mount, already recorded): never again, even if it goes undone then done.
    const h2 = renderHook(({ plan }) => useFeteEtape(plan, 'm1', true), { initialProps: { plan: p } });
    h2.rerender({ plan: fini });
    expect(h2.result.current.fete).toBeNull();
  });

  it('a step already done when the page opens is recorded silently', () => {
    const p = planVide();
    remplirM1(p);
    const { result } = renderHook(() => useFeteEtape(p, 'm1', true));
    expect(result.current.fete).toBeNull();
    expect(lireFetes(p.id)).toEqual([2]);
  });

  it('inactive (example or read only): never celebrates, records nothing', () => {
    const p = planVide();
    remplirM1(p, true);
    const { result, rerender } = renderHook(({ plan }) => useFeteEtape(plan, 'm1', false), { initialProps: { plan: p } });
    rerender({ plan: { ...p, m1: { ...p.m1, pourquoiMoi: 'x' } } });
    expect(result.current.fete).toBeNull();
    expect(lireFetes(p.id)).toEqual([]);
  });

  it('optional sections belong to no step', () => {
    const { result } = renderHook(() => useFeteEtape(planVide(), 'notes', true));
    expect(result.current.fete).toBeNull();
  });

  it('screen texts: step 2 then next step 3, step 11 then the PDF', () => {
    const p = planVide();
    const r = render(
      <MemoryRouter>
        <FinEtape plan={p} n={2} onFermer={() => undefined} />
      </MemoryRouter>
    );
    const dialogue = r.getByRole('dialog');
    expect(dialogue.getAttribute('aria-modal')).toBe('true');
    expect(dialogue.textContent).toContain('Étape 2 terminée');
    expect(dialogue.textContent).toContain('5 points sur 20 de la grille du jury sont posés.');
    const bouton = r.getByRole('button', { name: 'Étape suivante : Business Model Canvas (40 min)' });
    expect(document.activeElement).toBe(bouton);
    r.unmount();
    const r11 = render(
      <MemoryRouter>
        <FinEtape plan={p} n={11} onFermer={() => undefined} />
      </MemoryRouter>
    );
    expect(r11.getByRole('link', { name: 'Prochaine étape : mon PDF' }).getAttribute('href')).toBe(`/p/${p.id}/exporter`);
  });
});
