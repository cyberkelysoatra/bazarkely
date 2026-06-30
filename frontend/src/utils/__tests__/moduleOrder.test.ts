import { describe, it, expect } from 'vitest';
import { orderModules } from '../moduleOrder';
import type { Module } from '../../contexts/ModuleSwitcherContext';

const M = (id: string): Module => ({ id, name: id, icon: '•', path: `/${id}` });

const A = M('a');
const B = M('b');
const C = M('c');

describe('orderModules', () => {
  it('savedOrder vide ou absent → liste d\'origine inchangée', () => {
    expect(orderModules([A, B, C])).toEqual([A, B, C]);
    expect(orderModules([A, B, C], [])).toEqual([A, B, C]);
  });

  it('respecte l\'ordre sauvegardé', () => {
    expect(orderModules([A, B, C], ['c', 'a', 'b'])).toEqual([C, A, B]);
  });

  it('ignore un id sauvegardé qui a disparu des modules', () => {
    expect(orderModules([A, B], ['b', 'zzz', 'a'])).toEqual([B, A]);
  });

  it('ajoute un nouveau module (absent de l\'ordre) à la fin, ordre par défaut', () => {
    // c est nouveau (pas dans savedOrder) → à la fin
    expect(orderModules([A, B, C], ['b', 'a'])).toEqual([B, A, C]);
  });

  it('combine id disparu + nouveau module', () => {
    expect(orderModules([A, C], ['c', 'b'])).toEqual([C, A]);
  });

  it('ne duplique jamais un module', () => {
    const out = orderModules([A, B, C], ['a', 'a', 'b']);
    expect(out).toEqual([A, B, C]);
  });
});
