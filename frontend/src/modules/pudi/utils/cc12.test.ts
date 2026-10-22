// PUDI-CC-12: discussion helpers (Madagascar day separators, HH:mm, page merging).
import { describe, expect, it } from 'vitest';
import { fusionner, heureHHmm, libelleJour } from '../pages/Discussion';
import type { MessageDiscussion } from '../appels/discussion';

const msg = (id: string, cree_at: string, texte = id): MessageDiscussion => ({
  id,
  auteur_nom: 'Joël S.',
  texte,
  supprime: false,
  supprime_role: null,
  cree_at,
  reponse_a: null,
  est_moi: false,
  peut_supprimer: false,
  auteur_suspendu: null
});

describe('discussion', () => {
  const maintenant = Date.parse('2026-10-23T09:00:00Z'); // 12:00 in Madagascar
  it('day separators in Madagascar time', () => {
    expect(libelleJour('2026-10-23T05:00:00Z', maintenant)).toBe("Aujourd'hui");
    expect(libelleJour('2026-10-22T22:30:00Z', maintenant)).toBe("Aujourd'hui"); // 01:30 Mada on the 23rd
    expect(libelleJour('2026-10-22T20:30:00Z', maintenant)).toBe('Hier'); // 23:30 Mada on the 22nd
    expect(libelleJour('2026-10-20T08:00:00Z', maintenant)).toBe('20/10');
  });
  it('time HH:mm in Madagascar time', () => {
    expect(heureHHmm('2026-10-23T06:05:00Z')).toBe('09:05');
    expect(heureHHmm('2026-10-22T21:59:00Z')).toBe('00:59');
  });
  it('pages merged by id, newer copy wins, oldest first', () => {
    const a = [msg('b', '2026-10-23T08:00:00Z'), msg('a', '2026-10-23T07:00:00Z')];
    const supprime = { ...msg('b', '2026-10-23T08:00:00Z', ''), supprime: true };
    const r = fusionner(a, [supprime, msg('c', '2026-10-23T09:00:00Z')]);
    expect(r.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(r[1].supprime).toBe(true);
  });
});
