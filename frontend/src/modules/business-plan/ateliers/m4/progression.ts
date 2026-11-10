// Progress of module 4: the 4 P, 4b (steps, team, suppliers), the 4 periods of 4c, 4d (form, why, procedures).
import type { Plan } from '../../types';

export function progression(plan: Plan): number {
  const m4 = plan.m4;
  const t = (s: string) => s.trim() !== '';
  const etapes = [
    t(m4.produit),
    t(m4.prix),
    t(m4.place),
    t(m4.promotion),
    t(m4.etapes),
    m4.equipe.some((e) => t(e.personne) || t(e.role)),
    t(m4.fournisseurs),
    ...(['t1', 't2', 't3', 't4'] as const).map((p) => t(m4.calendrier.find((c) => c.periode === p)?.objectif ?? '')),
    t(m4.forme),
    t(m4.formePourquoi),
    m4.demarches.length > 0 && m4.demarches.every((d) => d.fait || t(d.datePrevue))
  ];
  return Math.round((etapes.filter(Boolean).length / etapes.length) * 100);
}
