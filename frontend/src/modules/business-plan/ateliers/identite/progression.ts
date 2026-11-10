// Progress of the identity card: share of the main fields filled (phone and e-mail are optional).
import type { Plan } from '../../types';

export function progression(plan: Plan): number {
  const i = plan.identite;
  const secteur = i.secteur === 'autre' ? i.secteurAutre : i.secteur;
  const champs = [i.nomPrenom, i.nomProjet, secteur, i.lieu, i.unePhrase, i.avancement, i.porteurs, i.attentes];
  return Math.round((champs.filter((c) => c.trim()).length / champs.length) * 100);
}
