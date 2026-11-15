import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
vi.mock('../../utils/chunkReload', async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    // Same logic and same sessionStorage guard, only the navigation is captured.
    reloadOnceAfterChunkError: () => real.reloadOnceAfterChunkError({ replace, href: 'https://1sakely.org/dashboard' }),
  };
});

import ErrorBoundary from '../ErrorBoundary';
import { chunkReloadKey } from '../../utils/chunkReload';

function Broken(): never {
  throw new TypeError('Failed to fetch dynamically imported module: https://1sakely.org/assets/Budgets-abc.js');
}

describe('ErrorBoundary + chunk reload (MICRO-CC-01)', () => {
  beforeEach(() => {
    // The global test setup replaces sessionStorage with empty spies: use a working one here.
    const m = new Map<string, string>();
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear(), key: () => null, length: 0 },
    });
    replace.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('first failure reloads once, second failure shows the error screen without reloading', () => {
    const first = render(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toMatch(/^https:\/\/1sakely\.org\/dashboard\?_r=\d+$/);
    expect(sessionStorage.getItem(chunkReloadKey())).not.toBeNull();
    first.unmount();

    // The page came back (same tab, same version) and the file still fails.
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Une erreur s'est produite/)).toBeInTheDocument();
  });

  it('an ordinary error never reloads', () => {
    function Other(): never {
      throw new Error('boom');
    }
    render(<ErrorBoundary><Other /></ErrorBoundary>);
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(chunkReloadKey())).toBeNull();
  });
});
