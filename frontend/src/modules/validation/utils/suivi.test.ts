import { describe, expect, it } from 'vitest';
import { etapeSuivi } from './suivi';

describe('follow-up stage (home card and receipt, item E)', () => {
  it('analyse: « En analyse chez CyberKELY » with the countdown', () => {
    expect(etapeSuivi('analyse')).toEqual({ cle: 'analyse', rang: 1, titreAccueil: 'En analyse chez CyberKELY', compteARebours: true });
  });
  it('preparation: « En préparation » with the countdown', () => {
    expect(etapeSuivi('preparation')).toEqual({ cle: 'preparation', rang: 2, titreAccueil: 'En préparation', compteARebours: true });
  });
  it('disponible: never a countdown', () => {
    expect(etapeSuivi('disponible')).toEqual({ cle: 'disponible', rang: 3, titreAccueil: 'Disponible', compteARebours: false });
  });
  it('empty or unknown: « analyse » (set by the confirmation)', () => {
    expect(etapeSuivi(null).cle).toBe('analyse');
    expect(etapeSuivi(undefined).cle).toBe('analyse');
    expect(etapeSuivi('recues').cle).toBe('analyse');
  });
});
