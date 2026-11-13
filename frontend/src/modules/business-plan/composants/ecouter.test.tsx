// NEC-CC-23: "Écouter" (text cleaning, sentence splitting, voice choice, one reading at a time).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Aide } from './Aide';
import { arreterLecture, choisirVoix, decouperPhrases, demarrerLecture, nettoyerTexte, texteALire, textePourLaVoix, trouverVoix } from './Ecouter';

const voix = (lang: string, localService = true, name = lang) => ({ lang, localService, name, default: false, voiceURI: name }) as SpeechSynthesisVoice;

class FauxEnonce {
  text: string;
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(t: string) {
    this.text = t;
  }
}

function fausseSynthese(liste: SpeechSynthesisVoice[] = [voix('fr-FR')]) {
  const file: FauxEnonce[] = [];
  return {
    file,
    speak: vi.fn((u: FauxEnonce) => file.push(u)),
    cancel: vi.fn(() => file.splice(0)),
    getVoices: vi.fn(() => liste),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
}

beforeEach(() => {
  vi.stubGlobal('SpeechSynthesisUtterance', FauxEnonce);
});
afterEach(() => {
  arreterLecture(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('nettoyerTexte / texteALire', () => {
  it('removes "(?)", emojis, pictograms and collapses whitespace', () => {
    expect(nettoyerTexte('Ton  prix (?) 👉 est   juste ✅\n\n  Bravo 🎉')).toBe('Ton prix est juste\nBravo');
  });

  it('excludes the button marked data-ne-pas-lire', () => {
    const el = document.createElement('div');
    el.innerHTML = '<button data-ne-pas-lire>Écouter</button><p>Le seuil, c’est (?) le nombre.</p>';
    expect(texteALire(el)).toBe('Le seuil, c’est le nombre.');
  });
});

describe('decouperPhrases', () => {
  it('splits on . ! ? and line breaks (NEC-CC-25: never on a colon), drops empty pieces', () => {
    expect(decouperPhrases('Un. Deux ! Trois ? Quatre : cinq\nSix\n\n-')).toEqual(['Un.', 'Deux !', 'Trois ?', 'Quatre : cinq', 'Six']);
  });

  it('NEC-CC-25: a colon followed by a line break still ends the piece', () => {
    expect(decouperPhrases('Total :\n120 Ar.')).toEqual(['Total :', '120 ariary.']);
  });

  it('NEC-CC-25: "Total : 120 Ar. Marge : 40 Ar." gives exactly 2 sentences', () => {
    expect(decouperPhrases('Total : 120 Ar. Marge : 40 Ar.')).toEqual(['Total : 120 ariary.', 'Marge : 40 ariary.']);
  });

  it('NEC-CC-25: "Total : 120 Ar." and "Ma part : 20 %" stay one sentence each', () => {
    expect(decouperPhrases('Total : 120 Ar.')).toEqual(['Total : 120 ariary.']);
    expect(decouperPhrases('Ma part : 20 %')).toEqual(['Ma part : 20 pour cent']);
  });

  it('splits a very long sentence on commas', () => {
    const long = Array.from({ length: 30 }, (_, i) => `morceau ${i}`).join(', ');
    const p = decouperPhrases(long);
    expect(p.length).toBeGreaterThan(1);
    expect(p.every((x) => x.length <= 220)).toBe(true);
  });
});

describe('textePourLaVoix (NEC-CC-25)', () => {
  it.each([
    ['2 x 8', '2 fois 8'],
    ['2x8', '2 fois 8'],
    ['2 X 8', '2 fois 8'],
    ['50 × 15 %', '50 fois 15 pour cent'],
    ['8 000 Ar x 12', '8000 ariary fois 12'],
    ['(2 + 3) x (4)', '(2 plus 3) fois (4)'],
    ['Total : 120 Ar.', 'Total : 120 ariary.'],
    ['8 000 Ar/mois', '8000 ariary par mois'],
    ['3 000 Ar / jour', '3000 ariary par jour'],
    ['120/semaine', '120 par semaine'],
    ['15 990 000 Ar', '15990000 ariary'],
    ['15 990 000 Ar', '15990000 ariary'],
    ['15 990 000 Ar', '15990000 ariary'],
    ['prix = coût + marge', 'prix égale coût + marge'],
    ['10 + 5', '10 plus 5'],
    ['Ma part : 20 %', 'Ma part : 20 pour cent'],
    ['un taxi', 'un taxi'],
    ['Excel', 'Excel'],
    ['le point x du plan', 'le point x du plan'],
    ['Arrivage et Art', 'Arrivage et Art'],
    ['2 8', '2 8'],
    ['en 2024 2025 2026', 'en 2024 2025 2026'],
    ['et/ou', 'et/ou'],
  ])('%s -> %s', (avant, apres) => {
    expect(textePourLaVoix(avant)).toBe(apres);
  });
});

describe('choisirVoix / trouverVoix', () => {
  it('prefers an installed French voice, then fr-FR', () => {
    const v = choisirVoix([voix('en-US'), voix('fr-FR', false, 'Google'), voix('fr-CA', true, 'Local CA'), voix('fr-FR', true, 'Hortense')]);
    expect(v?.name).toBe('Hortense');
    expect(choisirVoix([voix('fr-FR', false, 'Google'), voix('fr-CA', true, 'Local CA')])?.name).toBe('Local CA');
  });

  it('returns "not available" (null) with only an English voice, an empty list, or no speechSynthesis', async () => {
    vi.useFakeTimers();
    const anglais = trouverVoix(fausseSynthese([voix('en-US')]) as never);
    const vide = trouverVoix(fausseSynthese([]) as never);
    vi.advanceTimersByTime(3100);
    await expect(anglais).resolves.toBeNull();
    await expect(vide).resolves.toBeNull();
    await expect(trouverVoix(null)).resolves.toBeNull();
  });

  it('finds a voice that loads late (within 3 s)', async () => {
    vi.useFakeTimers();
    const liste: SpeechSynthesisVoice[] = [];
    const p = trouverVoix(fausseSynthese(liste) as never);
    liste.push(voix('fr-FR'));
    vi.advanceTimersByTime(300);
    await expect(p).resolves.toMatchObject({ lang: 'fr-FR' });
  });
});

describe('one reading at a time', () => {
  it('queues one utterance per sentence in fr-FR at 0.95', () => {
    const s = fausseSynthese();
    demarrerLecture(['Un.', 'Deux.'], () => {}, { synth: s as never });
    expect(s.file.map((u) => [u.text, u.lang, u.rate])).toEqual([
      ['Un.', 'fr-FR', 0.95],
      ['Deux.', 'fr-FR', 0.95]
    ]);
  });

  it('starting B cancels A and notifies A only', () => {
    const s = fausseSynthese();
    const finA = vi.fn();
    const finB = vi.fn();
    demarrerLecture(['A.'], finA, { synth: s as never });
    demarrerLecture(['B.'], finB, { synth: s as never });
    expect(finA).toHaveBeenCalledTimes(1);
    expect(finB).not.toHaveBeenCalled();
    expect(s.cancel).toHaveBeenCalledTimes(2);
    expect(s.file.map((u) => u.text)).toEqual(['B.']);
    arreterLecture(s as never);
    expect(finB).toHaveBeenCalledTimes(1);
  });
});

describe('Aide', () => {
  it('no button while closed, button inside the opened content', async () => {
    vi.stubGlobal('speechSynthesis', fausseSynthese());
    const user = userEvent.setup();
    render(
      <Aide titre="À retenir">
        <p>Le loyer est une charge fixe.</p>
      </Aide>
    );
    expect(screen.queryByRole('button', { name: /écouter/i })).toBeNull();
    await user.click(screen.getByRole('button', { name: /à retenir/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /écouter/i })).toBeTruthy());
  });
});
