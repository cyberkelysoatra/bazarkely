import { describe, expect, it } from 'vitest';
import { brouillonDuVote, doitRemplirDepuisServeur, comparerAuVote, titreCourt, voteDuCompte, type VoteResume } from './monVote';

const V: VoteResume = { compte: 'a@b.mg', priorites: ['P3', 'A4', 'P1'], date: '2026-10-23T10:00:00Z' };

describe('PUDI-CC-16.1 own vote', () => {
  it('no vote', () => {
    expect(comparerAuVote({ priorites: [], manquant: '' }, null)).toBe('aucun');
  });
  it('same choice in another order is unchanged', () => {
    expect(comparerAuVote({ priorites: ['P1', 'P3', 'A4'], manquant: '' }, V)).toBe('identique');
  });
  it('a different vote is a change', () => {
    expect(comparerAuVote({ priorites: ['P1', 'P3', 'A5'], manquant: '' }, V)).toBe('modifie');
  });
  it('missing project compared only when known (never cached)', () => {
    const b = { priorites: ['P3', 'A4', 'P1'], manquant: 'Un ponton' };
    expect(comparerAuVote(b, V)).toBe('identique');
    expect(comparerAuVote(b, { ...V, manquant: null })).toBe('modifie');
    expect(comparerAuVote(b, { ...V, manquant: ' Un ponton ' })).toBe('identique');
  });
  it('draft rebuilt from the server vote', () => {
    expect(brouillonDuVote({ priorites: ['P3'], manquant: null })).toEqual({ priorites: ['P3'], manquant: '' });
  });
  it('device copy of another account is ignored', () => {
    expect(voteDuCompte(V, 'A@B.mg')).toBe(V);
    expect(voteDuCompte(V, 'autre@b.mg')).toBeNull();
    expect(voteDuCompte(V, null)).toBeNull();
  });
  it('server vote fills an empty draft or completes the missing project only', () => {
    const s = { priorites: ['P3', 'A4', 'P1'], manquant: 'Un ponton' };
    expect(doitRemplirDepuisServeur({ priorites: [], manquant: '' }, s)).toBe(true);
    expect(doitRemplirDepuisServeur({ priorites: ['P1', 'P3', 'A4'], manquant: '' }, s)).toBe(true);
    expect(doitRemplirDepuisServeur({ priorites: ['P1', 'P3', 'A5'], manquant: '' }, s)).toBe(false);
    expect(doitRemplirDepuisServeur({ priorites: ['P1', 'P3', 'A4'], manquant: 'Autre' }, s)).toBe(false);
  });
  it('short titles', () => {
    expect(titreCourt('Port de plaisance')).toBe('Port de plaisance');
    expect(titreCourt('Assainissement et drainage des eaux pluviales de Hell-Ville', 28)).toBe('Assainissement et drainage…');
  });
});
