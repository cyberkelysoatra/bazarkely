// Value proposition sentence of 1c, built live from its 5 parts and the project name.
import type { Plan } from '../../types';

export interface Morceau {
  texte: string;
  /** 'fixe': words of the template; 'saisi': typed by the person; 'vide': bracket placeholder of an empty part. */
  sorte: 'fixe' | 'saisi' | 'vide';
}

/** "les jus importés." -> "les jus importés" (the sentence adds its own punctuation). */
function nettoyer(v: string): string {
  return v.trim().replace(/\s+/g, ' ').replace(/[.,;:\s]+$/, '');
}

/** French contraction after "contrairement à": "les jus" -> ["aux ", "jus"], "le marché" -> ["au ", "marché"]. */
export function contracter(apres: string): [string, string] {
  if (/^les\s/i.test(apres)) return ['aux ', apres.slice(4)];
  if (/^le\s/i.test(apres)) return ['au ', apres.slice(3)];
  return ['à ', apres];
}

const fixe = (texte: string): Morceau => ({ texte, sorte: 'fixe' });

function part(valeur: string, vide: string): Morceau {
  const t = nettoyer(valeur);
  return t ? { texte: t, sorte: 'saisi' } : { texte: vide, sorte: 'vide' };
}

/** The sentence as pieces: fixed words, then each part (or its placeholder in brackets). */
export function phraseValeur(plan: Plan): Morceau[] {
  const pv = plan.m1.pv;
  const contre = nettoyer(pv.contrairement);
  const [a, reste] = contre ? contracter(contre) : ['à ', ''];
  return [
    fixe('Pour '),
    part(pv.pour, '[client]'),
    fixe(' qui '),
    part(pv.qui, '[problème ou besoin]'),
    fixe(', '),
    part(plan.identite.nomProjet, '[nom du projet]'),
    fixe(' propose '),
    part(pv.propose, '[solution]'),
    fixe(' qui '),
    part(pv.quiBenefice, '[bénéfice principal]'),
    fixe(', contrairement ' + a),
    part(reste, "[ce qu'il utilise aujourd'hui]"),
    fixe('.')
  ];
}

export function textePhrase(plan: Plan): string {
  return phraseValeur(plan)
    .map((m) => m.texte)
    .join('');
}
