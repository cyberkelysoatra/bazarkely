import { describe, expect, it } from 'vitest';
import {
  COMPTEUR_MESSAGE_DES,
  MAX_MESSAGE,
  compteurMessage,
  couperMessage,
  fusionnerFil,
  libelleQuestion,
  retirable,
  signature,
  traiterFile,
  type MessageEnAttente
} from './discussion';
import { libellePresence } from './regles';
import type { MessageFil, ResultatMessage } from './types';

describe('counter and limit (section 7, 2 000 characters, counter from 1 800)', () => {
  it('counter hidden at 1 799, shown at 1 800 and 2 000', () => {
    expect(COMPTEUR_MESSAGE_DES).toBe(1800);
    expect(MAX_MESSAGE).toBe(2000);
    expect(compteurMessage(1799)).toBeNull();
    expect(compteurMessage(1800)).toBe('1800 / 2000');
    expect(compteurMessage(2000)).toBe('2000 / 2000');
  });
  it('typing stops at 2 000: 2 001 characters are cut to 2 000, 2 000 stay', () => {
    expect(couperMessage('a'.repeat(2001))).toHaveLength(2000);
    expect(couperMessage('a'.repeat(2000))).toHaveLength(2000);
    expect(couperMessage('a'.repeat(1799))).toHaveLength(1799);
  });
});

describe('withdraw within 5 minutes', () => {
  const t0 = Date.parse('2026-11-03T09:00:00Z');
  const m = { moi: true, retire: false, cree_at: '2026-11-03T09:00:00Z' };
  it('own message: offered before 5 minutes, not at 5 minutes or after', () => {
    expect(retirable(m, t0 + 10_000)).toBe(true);
    expect(retirable(m, t0 + 4 * 60_000 + 59_000)).toBe(true);
    expect(retirable(m, t0 + 5 * 60_000)).toBe(false);
    expect(retirable(m, t0 + 6 * 60_000)).toBe(false);
  });
  it('never for somebody else’s message or a withdrawn one', () => {
    expect(retirable({ ...m, moi: false }, t0 + 1000)).toBe(false);
    expect(retirable({ ...m, retire: true }, t0 + 1000)).toBe(false);
  });
});

const attente = (id: string, texte = `Texte ${id}`): MessageEnAttente => ({
  id,
  client: 'c1',
  texte,
  question: null,
  questionLibelle: null,
  cree_at: '2026-11-03T09:00:00Z'
});

describe('offline queue of messages', () => {
  it('sends in order, one at a time', async () => {
    const ordre: string[] = [];
    const r = await traiterFile([attente('a'), attente('b'), attente('c')], async (m) => {
      ordre.push(m.id);
      return { ok: true };
    });
    expect(ordre).toEqual(['a', 'b', 'c']);
    expect(r.file).toEqual([]);
    expect(r.envoyes).toEqual(['a', 'b', 'c']);
  });

  it('network failure: stops, keeps the rest in order; the resend uses the same ids and the server keeps one row', async () => {
    const serveur = new Map<string, string>();
    let coupe = true;
    const envoyer = async (m: MessageEnAttente): Promise<ResultatMessage> => {
      if (coupe && m.id === 'b') throw new Error('Failed to fetch');
      const deja = serveur.has(m.id);
      serveur.set(m.id, m.texte);
      return { ok: true, deja };
    };
    const r1 = await traiterFile([attente('a'), attente('b'), attente('c')], envoyer);
    expect(r1.reseau).toBe(true);
    expect(r1.file.map((m) => m.id)).toEqual(['b', 'c']);
    coupe = false;
    // Resend of everything (a again too: double tap or replay): never a duplicate.
    const r2 = await traiterFile([attente('a'), ...r1.file], envoyer);
    expect(r2.file).toEqual([]);
    expect([...serveur.keys()]).toEqual(['a', 'b', 'c']);
  });

  it('a refusal stays on its bubble, is never resent, and the next messages still go', async () => {
    const appels: string[] = [];
    const envoyer = async (m: MessageEnAttente): Promise<ResultatMessage> => {
      appels.push(m.id);
      return m.id === 'long' ? { ok: false, code: 'TROP_LONG' } : { ok: true };
    };
    const r = await traiterFile([attente('long'), attente('b')], envoyer);
    expect(r.file).toEqual([{ ...attente('long'), refus: 'TROP_LONG' }]);
    expect(r.envoyes).toEqual(['b']);
    const r2 = await traiterFile(r.file, envoyer);
    expect(appels).toEqual(['long', 'b']);
    expect(r2.file[0].refus).toBe('TROP_LONG');
  });

  it('thread shown: server first, then the queued ones (clock), the server copy wins on the same id', () => {
    const serveur: MessageFil[] = [
      { id: 'a', moi: true, auteur: 'Monsieur Joël SOATRA', fonction: 'Gérant', texte: 'A', retire: false, cree_at: '2026-11-03T08:00:00Z', question_id: null, question: null }
    ];
    const f = fusionnerFil(serveur, [attente('a'), attente('b'), { ...attente('x'), client: 'autre' }, { ...attente('r'), refus: 'MESSAGE_VIDE' }], 'c1', { nom: 'Monsieur Joël SOATRA', fonction: 'Gérant' });
    expect(f.map((b) => [b.id, b.attente, b.refus])).toEqual([
      ['a', false, null],
      ['b', true, null],
      ['r', false, 'MESSAGE_VIDE']
    ]);
  });
});

describe('labels', () => {
  it('question reference, signature and presence', () => {
    expect(libelleQuestion('3', 'le budget')).toBe('À propos de la question 3 : le budget');
    expect(signature({ auteur: 'Monsieur Hery Rakoto', fonction: 'Associé' })).toBe('Hery Rakoto, associé');
    expect(signature({ auteur: 'Joël SOATRA', fonction: 'CyberKELY' })).toBe('Joël SOATRA, CyberKELY');
    expect(libellePresence({ type: 'discussion' })).toBe('Discussion du projet');
  });
});
