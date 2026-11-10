// Progress of module 1: share of its text fields filled (tree, client, value proposition, why me).
import type { Plan } from '../../types';

export function champsM1(plan: Plan): string[] {
  const m = plan.m1;
  const c = m.client;
  const pv = m.pv;
  return [m.consequences, m.probleme, m.causes, c.qui, c.ou, c.combien, c.aujourdhui, c.prixAujourdhui, c.decideur, pv.pour, pv.qui, pv.propose, pv.quiBenefice, pv.contrairement, m.pourquoiMoi];
}

export function progression(plan: Plan): number {
  const champs = champsM1(plan);
  return Math.round((champs.filter((c) => c.trim()).length / champs.length) * 100);
}
