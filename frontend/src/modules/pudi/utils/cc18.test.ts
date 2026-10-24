// PUDI-CC-18: no « urgents » question, urgency read from the votes ranking, old votes converted to 4 + 4 + 4.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { frPages } from '../i18n/frPages';
import {
  CHANGEMENT_REGLE,
  COMMENT_URGENCE,
  TITRE_CLASSEMENT,
  TITRE_URGENCE,
  URGENCE_DEDUITE,
  csvSynthese,
  preparerSynthese,
  texteVotesConvertis,
  type ResultatsSynthese
} from './synthese';
import { brouillonAncien111, doitRemplirDepuisServeur } from './monVote';
import { brouillonValide } from './regles';

const D = donneesBrutes as unknown as PudiDonnees;
const CONVERTI = ['A1', 'A1', 'A1', 'A1', 'T3', 'T3', 'T3', 'T3', 'W3', 'W3', 'W3', 'W3'];

describe('converted voter: draft prefill', () => {
  const serveur = { priorites: CONVERTI, manquant: null, converti_4x: true };
  it('an empty draft takes 4 + 4 + 4', () => {
    expect(doitRemplirDepuisServeur({ priorites: [], manquant: '' }, serveur)).toBe(true);
  });
  it('the old 1 + 1 + 1 draft of the same programmes is replaced (any order)', () => {
    expect(brouillonAncien111({ priorites: ['W3', 'A1', 'T3'], manquant: '' }, serveur)).toBe(true);
    expect(doitRemplirDepuisServeur({ priorites: ['T3', 'A1', 'W3'], manquant: '' }, serveur)).toBe(true);
  });
  it('a redistributed draft is kept', () => {
    expect(doitRemplirDepuisServeur({ priorites: ['T3', 'A1', 'W3', 'A4'], manquant: '' }, serveur)).toBe(false);
    expect(doitRemplirDepuisServeur({ priorites: ['T3', 'T3', 'W3'], manquant: '' }, serveur)).toBe(false);
    expect(doitRemplirDepuisServeur({ priorites: ['T3', 'A1', 'A4'], manquant: '' }, serveur)).toBe(false);
  });
  it('a vote not converted keeps the rule of PUDI-CC-16.1', () => {
    expect(doitRemplirDepuisServeur({ priorites: ['T3', 'A1', 'W3'], manquant: '' }, { ...serveur, converti_4x: false })).toBe(false);
  });
  it('4 + 4 + 4 is a valid draft of 12 votes', () => {
    expect(brouillonValide({ priorites: CONVERTI, manquant: '' })).toBe(true);
  });
});

describe('old draft with urgents', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear()
    });
  });
  it('reads without error and drops the urgents', async () => {
    localStorage.setItem('pudi_brouillon_v1', JSON.stringify({ priorites: ['T3', 'A1', 'W3'], urgents: ['A6', 'N2'], manquant: 'x' }));
    const { lireBrouillon } = await import('../appels/brouillon');
    const b = lireBrouillon();
    expect(b).toEqual({ priorites: ['T3', 'A1', 'W3'], manquant: 'x' });
    expect('urgents' in b).toBe(false);
  });
});

describe('results: one ranking, « écart avec le PUDi », urgency deduced', () => {
  // A5 tranche 3 (2036-2040) and A6 tranche 2 (2031-2035) in the top 15: flagged; A1 tranche 1: not.
  const r: ResultatsSynthese = {
    nb_votants: 2,
    cloture_at: '2026-10-27T05:00:00Z',
    calcule_at: '2026-10-25T08:00:00Z',
    priorites: [
      { id: 'A5', n: 1, pct: 50, voix: 3, votants: 1, tranche_pudi: 3, ecart_pudi: true },
      { id: 'A1', n: 1, pct: 50, voix: 2, votants: 1, tranche_pudi: 1, ecart_pudi: false },
      { id: 'A6', n: 1, pct: 50, voix: 2, votants: 1, tranche_pudi: 2, ecart_pudi: true },
      { id: 'D1', n: 1, pct: 50, voix: 1, votants: 1, tranche_pudi: 2, ecart_pudi: false }
    ],
    par_profil: {},
    par_fokontany: {},
    reseaux: { dans_nos_reseaux: 0, hors_reseaux: 2 },
    manquants: [],
    nb_votes_convertis: 25,
    top_ecart: 15
  };
  const s = preparerSynthese(r, D, { provisoire: true });
  it('flag text of the « Écart avec le PUDi » column', () => {
    expect(s.priorites.map((l) => l.ecart)).toEqual([
      'Avancé par les votants (PUDi : 2036-2040)',
      '',
      'Avancé par les votants (PUDi : 2031-2035)',
      ''
    ]);
    expect(frPages.resultats.ecart('2031-2035')).toBe('Avancé par les votants (PUDi : 2031-2035)');
    expect(frPages.resultats.ecartAide).toBe('Programme parmi les 15 qui ont reçu le plus de voix alors que le PUDi le prévoit après 2030.');
  });
  it('no urgent ranking in the synthesis nor the CSV', () => {
    expect('urgents' in s).toBe(false);
    expect(csvSynthese(s)).not.toMatch(/urgent/i);
  });
  it('CSV says right under its header that urgency is deduced', () => {
    const l = csvSynthese(s).replace('﻿', '').split('\r\n');
    expect(l[1]).toContain(URGENCE_DEDUITE);
    expect(l[1].startsWith('note;')).toBe(true);
    expect(l.some((x) => x.includes('Avancé par les votants (PUDi : 2036-2040)'))).toBe(true);
  });
  it('verbatim texts of the results page and the PDF', () => {
    expect(URGENCE_DEDUITE).toBe(
      "L'urgence n'est pas demandée à part : elle se déduit des voix. Plus un programme reçoit de voix, plus les votants le jugent prioritaire."
    );
    expect(frPages.resultats.urgenceDeduite).toBe(URGENCE_DEDUITE);
    expect(TITRE_URGENCE).toBe("Comment l'urgence est déterminée");
    expect(COMMENT_URGENCE).toBe(
      "Il n'y a pas de question séparée sur l'urgence. L'ordre du classement, établi par le nombre de voix reçues, indique les programmes que les votants veulent voir réalisés en premier. La colonne « Écart avec le PUDi » signale les programmes classés parmi les 15 premiers alors que le PUDi les prévoit en 2031-2035 ou 2036-2040 : les votants souhaitent les avancer."
    );
    expect(TITRE_CLASSEMENT).toBe('Classement des programmes par voix reçues (ordre de priorité)');
    expect(frPages.resultats.prioritesTitre).toBe(TITRE_CLASSEMENT);
  });
  it('method sentence followed by the converted votes kept as they are', () => {
    const i = s.methode.indexOf(CHANGEMENT_REGLE);
    expect(i).toBeGreaterThan(-1);
    expect(s.methode[i + 1]).toBe(texteVotesConvertis(25));
    expect(s.nbVotesConvertis).toBe(25);
  });
});

describe('voting texts', () => {
  it('two questions, banner of the converted vote, no urgent anywhere', () => {
    expect(frPages.voix.question(1)).toBe('Question 1 sur 2');
    expect(frPages.voix.question(2)).toBe('Question 2 sur 2');
    expect(frPages.voix.banniere + ' ' + frPages.voix.banniereTexte).toBe(
      "Vos 3 programmes ont reçu 4 voix chacun. Vous pouvez les répartir autrement jusqu'à la clôture."
    );
    expect(JSON.stringify(frPages.voix)).not.toMatch(/urgent/i);
    expect(JSON.stringify(frPages.resultats) + CHANGEMENT_REGLE + COMMENT_URGENCE).not.toContain('—');
  });
});
