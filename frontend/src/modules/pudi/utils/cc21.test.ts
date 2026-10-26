// PUDI-CC-21: closing switch. Only the server « clos » closes; a passed date with the switch off stays open.
import { describe, expect, it } from 'vitest';
import { clotureDepasseeOuverte, tempsRestant } from './format';
import { conditionsAuto } from '../appels/autoEnregistrement';

const etat = (clos: boolean, cloture_depassee?: boolean, verrou_cloture?: boolean) => ({ clos, cloture_depassee, verrou_cloture });

describe('clotureDepasseeOuverte', () => {
  it('date in the future, switch on: countdown as today', () => {
    expect(clotureDepasseeOuverte(etat(false, false, true), false)).toBe(false);
  });
  it('date passed, switch off: text replaces the countdown', () => {
    expect(clotureDepasseeOuverte(etat(false, true, false), true)).toBe(true);
  });
  it('date passed, switch on: closed screens, never the text', () => {
    expect(clotureDepasseeOuverte(etat(true, true, true), true)).toBe(false);
  });
  it('state read before the date, countdown at zero on the device, switch off: text', () => {
    expect(clotureDepasseeOuverte(etat(false, false, false), true)).toBe(true);
  });
  it('state read before the date, countdown at zero, switch on: nothing deduced on the device', () => {
    expect(clotureDepasseeOuverte(etat(false, false, true), true)).toBe(false);
  });
  it('older server answer without the new fields, or no state: nothing', () => {
    expect(clotureDepasseeOuverte(etat(false), true)).toBe(false);
    expect(clotureDepasseeOuverte(null, true)).toBe(false);
  });
  it('a countdown at zero is only a display value', () => {
    expect(tempsRestant(1000, 2000).fini).toBe(true);
  });
});

describe('autosave after the date with the switch off', () => {
  it('stays active while the server says open', () => {
    const etatReel = { publie: true, cloture_at: '2026-10-27T05:00:00Z', maintenant: '2026-10-27T06:00:00Z', clos: false,
      cloture_depassee: true, verrou_cloture: false, connecte: true, a_vote: true, est_admin: false };
    expect(conditionsAuto({ etatReel, apercu: null, monVote: { priorites: ['A1'] } as never, envoiOuvert: true })).toBe(true);
    expect(conditionsAuto({ etatReel: { ...etatReel, clos: true }, apercu: null, monVote: { priorites: ['A1'] } as never, envoiOuvert: true })).toBe(false);
  });
});
