// NEC-CC-21 (NEC-171): text actually drawn in the PDF, page by page (content streams inflated).
import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { creerPdf } from './pdf';
import { planExemple } from '../data/exemple';
import { CARTES, brouillon } from '../ateliers/synthese/brouillons';

/** Text of each page content stream, in the order jsPDF writes them (page 1 first). */
async function textesDesPages(f: File): Promise<string[]> {
  const tampon = await new Promise<ArrayBuffer>((ok, ko) => {
    const l = new FileReader();
    l.onload = () => ok(l.result as ArrayBuffer);
    l.onerror = () => ko(l.error);
    l.readAsArrayBuffer(f);
  });
  const brut = Buffer.from(tampon);
  const latin = brut.toString('latin1');
  const pages: string[] = [];
  const motif = /(?<!end)stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = motif.exec(latin))) {
    const debut = m.index + m[0].length;
    const fin = latin.indexOf('endstream', debut);
    if (fin < 0) break;
    let contenu: string;
    try {
      contenu = inflateSync(brut.subarray(debut, fin), { finishFlush: 2 }).toString('latin1');
    } catch {
      contenu = latin.slice(debut, fin);
    }
    // Page content streams draw text with Tj; keep only the strings, octal escapes decoded.
    if (/\bTj\b|\bTJ\b/.test(contenu)) {
      const chaines = [...contenu.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((x) =>
        x[1].replace(/\\([0-7]{3})/g, (_s, o: string) => String.fromCharCode(parseInt(o, 8))).replace(/\\(.)/g, '$1')
      );
      pages.push(chaines.join('\n'));
    }
    motif.lastIndex = fin;
  }
  return pages;
}

describe('PDF cover (NEC-CC-21)', () => {
  it('page 1 holds the camp name then "Organisé par B-lossom Center"; page 2 is still the one-page summary', async () => {
    const plan = planExemple();
    for (const c of CARTES) plan.synthese[c.cle] = brouillon(plan, c.cle);
    const f = await creerPdf(plan, { coordonnees: false, maintenant: new Date('2026-11-12T15:00:00Z') });
    const pages = await textesDesPages(f);
    expect(pages.length).toBeGreaterThan(2);
    const p1 = pages[0];
    expect(p1).toContain('NOSY BE ENTREPRENEURSHIP CAMP 2026');
    expect(p1).toContain('Organisé par B-lossom Center');
    expect(p1.indexOf('NOSY BE ENTREPRENEURSHIP CAMP 2026')).toBeLessThan(p1.indexOf('Organisé par B-lossom Center'));
    expect(p1).not.toContain('Hell-Ville, Nosy Be');
    expect(/[—–·]/.test(p1)).toBe(false);
    expect(pages[1]).toContain('Mon projet en une page');
  });
});
