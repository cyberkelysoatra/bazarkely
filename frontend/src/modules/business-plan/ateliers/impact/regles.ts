// "Impact et emplois" (fiche ETAPE-06): pure computations, prefill from module 4 and the canvas, the
// proposed impact sentence and the rule checks V1 to V6 plus the cross-check with module 5. No React here.
import type { Impact, Plan } from '../../types';
import { impactDe, nouvelId } from '../../etat/vide';
import { calculerMarche } from '../m3/calculs';
import type { DonneesBoucle } from '../../composants/BoucleComprehension';

type Emploi = Impact['emplois'][number];

/** Year 1 of the plan (the training is in November 2026, the companies start in 2027). */
export const PREMIERE_ANNEE = 2027;

export const BOUCLE_A1: DonneesBoucle = {
  questions: [
    {
      enonce: 'Pour TRANO KELY, coche tout ce qui compte comme un emploi créé par le projet (une personne payée par lui).',
      cases: [
        { texte: 'Le gérant lui-même, qui vit du projet', juste: true, code: 'G' },
        { texte: 'La femme de ménage payée chaque mois', juste: true, code: 'E' },
        { texte: 'Un apprenti payé 3 jours par semaine', juste: true, code: 'T' },
        { texte: 'Sa mère, qui aide sans être payée', juste: false, code: 'B' },
        { texte: 'Les voyageurs qui dorment à la pension', juste: false, code: 'C' }
      ]
    }
  ],
  ordre: ['B', 'C', 'G', 'T', 'E'],
  explications: {
    B: "Un emploi, c'est une personne payée. L'aide bénévole est précieuse, note-la à part, mais le jury ne la compte pas comme un emploi.",
    C: 'Les clients profitent de ton projet : ce sont des bénéficiaires, partie 6b. Ils ne travaillent pas pour toi.',
    G: "Toi aussi tu comptes : si tu vis de ton projet, c'est un emploi créé, souvent le premier.",
    T: 'Un temps partiel est un vrai emploi. Note-le comme temps partiel, le jury fait la différence.',
    E: 'Tu as oublié une personne payée. Reprends ton équipe du module 4.'
  }
};

export const RAPPEL_BENEVOLE = BOUCLE_A1.explications.B;

const estMoi = (texte: string) => /\b(moi|porteu[rs]e?|g[ée]rante?)\b/i.test(texte);
const compte = (e: Emploi) => e.statut !== 'benevole';

/** Number of paid people in years 1, 2 and 3. */
export function totaux(impact: Impact): [number, number, number] {
  const t: [number, number, number] = [0, 0, 0];
  for (const e of impact.emplois) if (compte(e)) e.annees.forEach((a, k) => void (a ? t[k]++ : 0));
  return t;
}

/** Salaried people (not "moi") paid in year k (0, 1, 2). */
export function salaries(impact: Impact, k: number): number {
  return impact.emplois.filter((e) => e.statut === 'salarie' && e.annees[k]).length;
}

/** Year 1 lines built from the team of module 4: "moi", the salaried people, the volunteers. */
export function emploisDepuisEquipe(plan: Plan): Emploi[] {
  const lignes: Emploi[] = [];
  for (const m of plan.m4.equipe) {
    const role = [m.role.trim(), m.personne.trim()].filter(Boolean).join(', ');
    if (!role) continue;
    const temps = m.temps === 'plein' || m.temps === 'partiel' ? m.temps : '';
    const statut = m.temps === 'benevole' ? 'benevole' : estMoi(m.personne) || estMoi(m.role) ? 'moi' : 'salarie';
    lignes.push({ id: nouvelId(), role, statut, annees: [temps, '', ''], equipeId: m.id });
  }
  if (!lignes.some((e) => e.statut === 'moi')) lignes.unshift({ id: nouvelId(), role: "Moi, j'en vis", statut: 'moi', annees: ['', '', ''] });
  return lignes;
}

/** Suppliers and partners of block 8 of the canvas, one per item. */
export function partenairesDepuisCanvas(plan: Plan): Impact['partenaires'] {
  return plan.m2.partenaires
    .split(/[\n;,]+/)
    .map((s) => s.replace(/^[-\d.\s]+/, '').replace(/[.!]+$/, '').trim())
    .filter(Boolean)
    .map((nom) => ({ id: nouvelId(), nom, local: false }));
}

/** Clients served per month in year 1: sales aimed at in module 3 divided by the quantity bought per client. */
export function clientsProposes(plan: Plan): number | null {
  const { ventesMois } = calculerMarche(plan.m3);
  const q = plan.m3.qteParAchat;
  if (ventesMois === null || !q) return null;
  return Math.max(1, Math.round(ventesMois / q));
}

function liste(noms: string[]): string {
  return noms.length < 2 ? noms.join('') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

const personnes = (n: number) => `${n} personne${n > 1 ? 's' : ''}`;

/** "[Projet] fait vivre [n] personnes dès la première année, [n] en [année], et fait travailler [fournisseurs]." */
export function phraseProposee(plan: Plan): string {
  const impact = impactDe(plan);
  const [n1, ...suite] = totaux(impact);
  const nom = plan.identite.nomProjet.trim() || 'Mon projet';
  let phrase = `${nom} fait vivre ${personnes(n1)} dès la première année`;
  const k = suite.findIndex((n) => n > n1);
  if (k >= 0) phrase += `, ${suite[k]} en ${PREMIERE_ANNEE + k + 1}`;
  const locaux = impact.partenaires.filter((p) => p.local && p.nom.trim());
  const noms = (locaux.length ? locaux : impact.partenaires.filter((p) => p.nom.trim())).map((p) => p.nom.trim().replace(/[.!]+$/, ''));
  if (noms.length) phrase += `, et fait travailler ${liste(noms)}`;
  return phrase + '.';
}

export interface Regle {
  cle: string;
  texte: string;
}

/** Rule checks of the fiche (never blocking). */
export function regles(plan: Plan): Regle[] {
  const impact = impactDe(plan);
  const [n1, n2, n3] = totaux(impact);
  const out: Regle[] = [];
  if (n1 === 0) out.push({ cle: 'V1', texte: 'Et toi, tu vivras de ton projet ? Ton propre emploi compte.' });
  for (const m of plan.m4.equipe) {
    if (m.temps !== 'plein' && m.temps !== 'partiel') continue;
    if (estMoi(m.personne) || estMoi(m.role)) continue;
    const present = impact.emplois.some((e) => e.equipeId === m.id && compte(e) && e.annees[0]);
    const role = m.role.trim() || m.personne.trim();
    if (!present && role) out.push({ cle: `V2-${m.id}`, texte: `${role} est salarié au module 4 : il compte ici.` });
  }
  for (const e of impact.emplois) {
    if (e.statut !== 'benevole' && /b[ée]n[ée]vole/i.test(e.role) && e.annees.some(Boolean)) out.push({ cle: `V3-${e.id}`, texte: RAPPEL_BENEVOLE });
  }
  const v = plan.m5.annees.map((a) => a.ventesParMois);
  if (v.every((x) => typeof x === 'number') && ((n2 > n1 && (v[1] as number) <= (v[0] as number)) || (n3 > n2 && (v[2] as number) <= (v[1] as number)))) {
    out.push({ cle: 'V4', texte: 'Tu embauches, mais tes ventes ne bougent pas : qui paiera ce salaire ?' });
  }
  if (n1 > 10) out.push({ cle: 'V5', texte: '10 personnes dès la première année : as-tu les ventes et le capital pour les payer ?' });
  if (!impact.phrase.trim()) out.push({ cle: 'V6', texte: 'Une phrase pour le jury : combien de personnes fait vivre ton projet ?' });
  return out;
}

/** Cross-check with module 5 (fiche ETAPE-06, section 5): salaries in the fixed costs. */
export function reglesChiffres(plan: Plan): Regle[] {
  const impact = impactDe(plan);
  const out: Regle[] = [];
  const cf = plan.m5.chargesFixes;
  const salairesSaisis = typeof cf.salaires === 'number' && cf.salaires > 0;
  const s1 = salaries(impact, 0);
  if (s1 > 0 && !salairesSaisis) {
    out.push({ cle: 'S1', texte: `Tu paies ${s1} salarié${s1 > 1 ? 's' : ''} en année 1 : prévois ${s1 > 1 ? 'leur' : 'son'} salaire dans les charges fixes du module 5.` });
  }
  if (impact.emplois.some((e) => e.statut === 'moi' && e.annees[0]) && !salairesSaisis) {
    out.push({ cle: 'S2', texte: 'Tu vis de ton projet : prévois aussi ta propre rémunération dans les salaires du module 5.' });
  }
  const a = plan.m5.annees;
  for (const k of [1, 2]) {
    const avant = a[k - 1]?.chargesFixesMois;
    const apres = a[k]?.chargesFixesMois;
    if (salaries(impact, k) > salaries(impact, k - 1) && typeof avant === 'number' && typeof apres === 'number' && apres <= avant) {
      out.push({ cle: `S3-${k}`, texte: `En année ${k + 1}, tu paies plus de salariés, mais tes charges fixes du module 5 ne bougent pas : ajoute leur salaire.` });
    }
  }
  return out;
}

/** Step done (fiche, section 5): at least one job in year 1 and an impact sentence. */
export function impactTermine(plan: Plan): boolean {
  const impact = impactDe(plan);
  return totaux(impact)[0] >= 1 && impact.phrase.trim() !== '';
}
