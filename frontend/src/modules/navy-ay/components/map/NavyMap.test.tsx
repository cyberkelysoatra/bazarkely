import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// The two engines are replaced: the test only checks which one NavyMap shows.
const vectorMode = { value: 'throw' as 'throw' | 'fail' | 'ok' };
vi.mock('./NavyMapVector', () => ({
  default: function FakeVector(props: { onEngineFail?: (r: string) => void }) {
    useEffect(() => {
      if (vectorMode.value === 'fail') props.onEngineFail?.('Failed to initialize WebGL');
    }, [props]);
    if (vectorMode.value === 'throw') throw new Error('vector chunk failed');
    return <div>vector map</div>;
  },
}));
const leafletMode = { value: 'ok' as 'ok' | 'throw' };
vi.mock('./NavyMapLeaflet', () => ({
  default: function FakeLeaflet() {
    if (leafletMode.value === 'throw') throw new Error('leaflet chunk failed');
    return <div>leaflet map</div>;
  },
}));

import NavyMap, { canUseVectorMap, FORCE_LEAFLET_KEY } from './NavyMap';

const webgl = (ctx: unknown) => ({ createElement: () => ({ getContext: () => ctx }) }) as unknown as Document;

describe('NavyMap engine choice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('uses the vector map only when WebGL exists and the fallback is not forced', () => {
    expect(canUseVectorMap(webgl({}), null)).toBe(true);
    expect(canUseVectorMap(webgl(null), null)).toBe(false);
    expect(canUseVectorMap(webgl({}), { getItem: (k: string) => (k === FORCE_LEAFLET_KEY ? '1' : null) })).toBe(false);
    const broken = { createElement: () => { throw new Error('no canvas'); } } as unknown as Document;
    expect(canUseVectorMap(broken, null)).toBe(false);
  });

  it('shows Leaflet when the phone has no WebGL', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vectorMode.value = 'ok';
    render(<NavyMap ariaLabel="Carte test" />);
    expect(await screen.findByText('leaflet map')).toBeTruthy();
    expect(screen.queryByText('vector map')).toBeNull();
  });

  it('shows the vector map when WebGL works', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    vectorMode.value = 'ok';
    render(<NavyMap ariaLabel="Carte test" />);
    expect(await screen.findByText('vector map')).toBeTruthy();
  });

  it('falls back to Leaflet by itself when the vector engine crashes', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vectorMode.value = 'throw';
    render(<NavyMap ariaLabel="Carte test" />);
    expect(await screen.findByText('leaflet map')).toBeTruthy();
  });

  it('falls back to Leaflet when the map cannot start (WebGL context refused)', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vectorMode.value = 'fail';
    render(<NavyMap ariaLabel="Carte test" />);
    expect(await screen.findByText('leaflet map')).toBeTruthy();
  });

  it('never breaks the page when no engine can load: a clear message instead', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vectorMode.value = 'throw';
    leafletMode.value = 'throw';
    render(<NavyMap ariaLabel="Carte test" />);
    expect(await screen.findByText(/Carte indisponible/)).toBeTruthy();
    leafletMode.value = 'ok';
  });

  it('forced fallback (test switch) shows Leaflet', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
    // src/test/setup.ts replaces sessionStorage by a mock: answer the switch directly.
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation((k: string) => (k === FORCE_LEAFLET_KEY ? '1' : null));
    vectorMode.value = 'ok';
    render(<NavyMap ariaLabel="Carte test" />);
    expect(await screen.findByText('leaflet map')).toBeTruthy();
  });
});
