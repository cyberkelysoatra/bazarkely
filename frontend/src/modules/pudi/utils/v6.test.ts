// PUDI-CC-08 (specification v6): page numbers, synonyms, one person one vote, participation, notice.
import { describe, expect, it } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { messageErreur } from './erreurs';
import { libelleMotifRefus } from './format';
import { filtrerParVote, participation } from './groupe';

const D = donneesBrutes as unknown as PudiDonnees;
const P = (id: string) => D.programmes.find((p) => p.id === id)!;
const syn = (mot: string) => D.synonymes?.find((s) => s.mots.includes(mot))?.cibles;

describe('v6 contents', () => {
  it('A6, H1, H2 carry the v6 texts and pages', () => {
    expect(P('A6').precision).toBe(
      "Le PUDi y prévoit un hôpital de 2,67 ha (p. 104) et annonce la construction d'un nouvel hôpital dans la deuxième phase du PUDi (p. 85). Selon le PIC, c'est là que figure le projet de nouveau CHRD."
    );
    expect(P('A6').pagesPudi).toEqual(expect.arrayContaining([85, 104]));
    expect(P('H1').precision).toBe(
      'Le PUDi recense 1 CHRD II et 12 centres de santé publics (7 CSB I, 4 CSB II), p. 34. Un hôpital est prévu dans la nouvelle ville de Madiro (programme A6).'
    );
    expect(P('H2').resume).toBe(
      'Réhabiliter et moderniser les centres de santé de base dans tous les arrondissements, et faire passer les CSB I en CSB II (dont Ambatoloaka, Ambatozavavy et Befotaka).'
    );
    expect(P('H2').precision).toBe(
      'Selon le PIC, la transformation des CSB I en CSB II fait partie de ce programme et concerne tous les arrondissements. Le PUDi prévoit un programme de réhabilitation et de modernisation des CSB (p. 85).'
    );
  });
  it('the v6 synonym list', () => {
    for (const m of ['chrd', 'chrr', 'hopital', 'hôpital', 'evacuation sanitaire', 'évacuation sanitaire']) expect(syn(m)).toEqual(['P1', 'A6', 'H1']);
    expect(syn('csb')).toEqual(['H2', 'H1']);
    expect(syn('komba')).toEqual(['R4']);
    expect(syn('sakatia')).toEqual(['P2']);
    expect(syn('latrines')).toEqual(['W4']);
    expect(syn('jirama')).toEqual(['W1']);
    expect(syn('poubelles')).toEqual(['W2']);
    expect(syn('caméras')).toEqual(['S1', 'P3']);
    expect(syn('bruit')).toEqual(['P4']);
    expect(syn('animaux')).toEqual(['P5']);
    expect(syn('wc')).toEqual(['W4']); // kept from before
  });
});

describe('one person, one vote', () => {
  it('PUDI_PERSONNE_DEJA_VOTEE (returned, not raised) gives the French message, without any number', () => {
    const e = messageErreur({ erreur: 'PUDI_PERSONNE_DEJA_VOTEE' });
    expect(e.code).toBe('PERSONNE_DEJA_VOTEE');
    expect(e.champ).toBe('telephone');
    expect(e.message).toBe(
      "Vous avez déjà voté avec un autre numéro. Une personne ne vote qu'une fois. Pour changer vos choix, connectez-vous avec le compte utilisé pour ce vote."
    );
    expect(e.message).not.toMatch(/\d/);
  });
  it('refusal reasons in French', () => {
    expect(libelleMotifRefus('personne_deja_votee')).toBe('Personne ayant déjà voté avec un autre numéro');
    expect(libelleMotifRefus('numero_deja_utilise')).toBe('Numéro déjà utilisé par un autre compte');
  });
  it('the information notice explains the managers', () => {
    expect(fr.envoi.notice).toContain(
      "Votre numéro peut avoir été inscrit par le responsable d'un groupe. Il sert à reconnaître les votes du groupe et à éviter les doubles votes. Le responsable voit si vous avez voté, jamais ce que vous avez choisi."
    );
  });
});

describe('participation of a group', () => {
  const m = [{ a_vote: true }, { a_vote: false }, { a_vote: true }];
  it('counts, rounds, handles an empty list', () => {
    expect(participation(m)).toEqual({ votants: 2, total: 3, pct: 67 });
    expect(participation([])).toEqual({ votants: 0, total: 0, pct: 0 });
    expect(frPages.groupe.participation(2, 3, 67)).toBe('Participation : 2 / 3 (67 %)');
  });
  it('filters Tous / A voté / Pas encore voté', () => {
    expect(filtrerParVote(m, 'tous')).toHaveLength(3);
    expect(filtrerParVote(m, 'aVote')).toHaveLength(2);
    expect(filtrerParVote(m, 'pasEncore')).toHaveLength(1);
  });
  it('the help says the choice is never shown', () => {
    expect(frPages.groupe.aide).toContain(
      "Chacun est invité à voter, mais son choix n'est pas un sujet de débat. Vous voyez seulement si la personne a voté, jamais ce qu'elle a choisi."
    );
  });
});
