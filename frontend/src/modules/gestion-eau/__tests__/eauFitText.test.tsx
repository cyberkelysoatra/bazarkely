import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Droplets } from 'lucide-react';
import { EauFitText, EauStatCard, EAU_FIT_TEXT_MIN_PX } from '../components/EauUi';

// jsdom has no layout: width of the text = chars * 0.6 * font size, box = 200 px.
const BOX = 200;
let restore: Array<() => void> = [];
function fakeLayout(basePx = 14) {
  const proto = HTMLElement.prototype;
  const sw = Object.getOwnPropertyDescriptor(proto, 'scrollWidth');
  const cw = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  Object.defineProperty(proto, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      const size = parseFloat(this.style.fontSize) || basePx;
      return Math.ceil((this.textContent ?? '').length * 0.6 * size);
    },
  });
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => BOX });
  const gcs = vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (el: Element) => ({ fontSize: (el as HTMLElement).style.fontSize || `${basePx}px` }) as CSSStyleDeclaration,
  );
  restore.push(() => {
    if (sw) Object.defineProperty(proto, 'scrollWidth', sw); else delete (proto as any).scrollWidth;
    if (cw) Object.defineProperty(proto, 'clientWidth', cw); else delete (proto as any).clientWidth;
    gcs.mockRestore();
  });
}

afterEach(() => {
  restore.forEach((r) => r());
  restore = [];
});

const el = (c: HTMLElement) => c.querySelector('[data-eau-fit-text]') as HTMLElement;

describe('EauFitText (MICRO-CC-01)', () => {
  it('a short text keeps the inherited size (no override, no title)', () => {
    fakeLayout();
    const { container } = render(<EauFitText className="text-sm">Débit entrant</EauFitText>);
    expect(el(container).style.fontSize).toBe('');
    expect(el(container).getAttribute('title')).toBeNull();
    expect(el(container).style.whiteSpace).toBe('nowrap');
  });

  it('a long text shrinks until it fits on one line', () => {
    fakeLayout();
    const text = 'Remplissage Max : 120 m3 du bassin'; // 34 chars → 285 px at 14 px
    const { container } = render(<EauFitText>{text}</EauFitText>);
    const size = parseFloat(el(container).style.fontSize);
    expect(size).toBeLessThan(14);
    expect(size).toBeGreaterThanOrEqual(EAU_FIT_TEXT_MIN_PX);
    expect(Math.ceil(text.length * 0.6 * size)).toBeLessThanOrEqual(BOX);
    expect(el(container).getAttribute('title')).toBeNull();
  });

  it('too long even at 9 px: ellipsis and full text in title', () => {
    fakeLayout();
    const text = 'x'.repeat(80);
    const { container } = render(<EauFitText>{text}</EauFitText>);
    expect(parseFloat(el(container).style.fontSize)).toBe(EAU_FIT_TEXT_MIN_PX);
    expect(el(container).style.textOverflow).toBe('ellipsis');
    expect(el(container).getAttribute('title')).toBe(text);
  });

  it('re-measures when the text changes (back to the base size)', () => {
    fakeLayout();
    const { container, rerender } = render(<EauFitText>{'y'.repeat(80)}</EauFitText>);
    expect(el(container).style.fontSize).not.toBe('');
    rerender(<EauFitText>court</EauFitText>);
    expect(el(container).style.fontSize).toBe('');
    expect(el(container).getAttribute('title')).toBeNull();
  });

  it('EauStatCard wraps its hint and keeps the colour and margin classes', () => {
    fakeLayout();
    const { container } = render(<EauStatCard icon={Droplets} label="Stock" value="12 m3" hint="Débit entrant" />);
    const hint = el(container);
    expect(hint).not.toBeNull();
    expect(hint.className).toContain('text-sm');
    expect(hint.className).toContain('mt-0.5');
    expect(hint.className).toContain('text-gray-500');
  });
});
