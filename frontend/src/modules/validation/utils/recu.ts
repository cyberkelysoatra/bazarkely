// Content of the PDF receipt (VC-12): the lines of the receipt screen, then every refusal and every
// reservation with its question number, subject and reason, then the follow-up line and the
// footer. Pure (the layout is appels/recuPdf.ts), unit tested in recu.test.ts.
import { calculerChemin } from './chemin';
import { comptes, dateHeure, fonctionEnLigne, nomCycle, sansCivilite } from './regles';
import { TEXTE_DISPONIBLE, etapeSuivi } from './suivi';
import type { DocumentEspace, Espace, QuestionnaireComplet } from './types';

export interface PointRecu {
  nature: 'refus' | 'reserve';
  /** « Refus, question 3 : Le calendrier » */
  titre: string;
  motif: string;
}

export interface ModeleRecu {
  titre: string;
  lignes: [string, string][];
  points: PointRecu[];
  suite: string;
  pied: string;
  nomFichier: string;
}

export const TITRE_RECU = 'Reçu de vos réponses';
export const PIED_RECU = '1saKELY, CyberKELY SARL, Nosy Be. Heures de Madagascar.';

/** « Recu-VC-2026-0002.pdf » (no accent nor space in a file name). */
export function nomFichierRecu(numero: string | null | undefined): string {
  const n = (numero ?? '').replace(/[^A-Za-z0-9-]/g, '') || 'recu';
  return `Recu-${n}.pdf`;
}

/** Follow-up line: the current stage and, until it is ready, the deadline of CyberKELY. */
export function ligneSuite(d: DocumentEspace): string {
  const e = etapeSuivi(d.etape_suivi);
  if (e.cle === 'disponible') return `Suite : ${TEXTE_DISPONIBLE.charAt(0).toLowerCase()}${TEXTE_DISPONIBLE.slice(1)}`;
  const etape = e.cle === 'preparation' ? 'version suivante en préparation' : 'en analyse chez CyberKELY';
  return d.echeance_at ? `Suite : ${etape}. Engagement CyberKELY : au plus tard le ${dateHeure(d.echeance_at)}.` : `Suite : ${etape}.`;
}

export function modeleRecu(d: DocumentEspace, p: Espace, q: QuestionnaireComplet): ModeleRecu {
  const par = [sansCivilite(d.confirme_par), d.confirme_par_fonction ? fonctionEnLigne(d.confirme_par_fonction) : ''].filter(Boolean).join(', ');
  const reponses = Object.fromEntries((q.mes_reponses ?? []).map((r) => [r.question_id, r.choix_id]));
  const commentaires = Object.fromEntries((q.mes_reponses ?? []).map((r) => [r.question_id, r.commentaire ?? '']));
  // Answers on the path only (RM14): the ones outside it are kept but no longer count.
  const points: PointRecu[] = [];
  for (const etape of calculerChemin(q.questions, reponses)) {
    const c = etape.choix;
    if (!c || (c.nature !== 'refus' && c.nature !== 'reserve')) continue;
    const nature = c.nature === 'refus' ? 'refus' : 'reserve';
    points.push({
      nature,
      titre: `${nature === 'refus' ? 'Refus' : 'Réserve'}, question ${etape.question.numero} : ${etape.question.sujet_client}`,
      motif: (commentaires[etape.question.id] ?? '').trim()
    });
  }
  return {
    titre: TITRE_RECU,
    lignes: [
      ['Reçu n°', d.numero_recu ?? ''],
      ['Confirmé par', par],
      ['Document', nomCycle(d.type, d.version).replace(', version ', ', v')],
      ['Date', d.confirme_at ? dateHeure(d.confirme_at) : ''],
      ['Client', p.entreprise ?? ''],
      ['Projet', p.nom_court ?? ''],
      ['Réponses', comptes(d)]
    ],
    points,
    suite: ligneSuite(d),
    pied: PIED_RECU,
    nomFichier: nomFichierRecu(d.numero_recu)
  };
}
