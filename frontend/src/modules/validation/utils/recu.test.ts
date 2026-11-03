import { describe, expect, it } from 'vitest';
import { PIED_RECU, TITRE_RECU, ligneSuite, modeleRecu, nomFichierRecu } from './recu';
import type { ChoixClient, DocumentEspace, Espace, QuestionClient, QuestionnaireComplet } from './types';

function choix(id: string, nature: string, libelle: string): ChoixClient {
  return { id, lettre: id.slice(-1), nature, libelle, ligne: null, avantages: null, faiblesses: null, conseille: false, suivante: null };
}

function question(n: number, sujet: string): QuestionClient {
  return {
    id: `q${n}`,
    numero: String(n),
    ordre: n,
    type: 'validation',
    sujet_client: sujet,
    texte: `Question ${n}`,
    extrait: null,
    choix: [choix(`q${n}a`, 'validation', 'Je valide'), choix(`q${n}b`, 'reserve', 'Oui, avec une réserve'), choix(`q${n}c`, 'refus', 'Je ne valide pas')]
  };
}

const d: DocumentEspace = {
  questionnaire_id: 'qq',
  document_id: 'dd',
  type: 'note_cadrage',
  version: '0.1',
  titre_client: 'Le résumé de votre projet',
  etat: 'confirme',
  etat_personne: { total: 4, repondues: 4, acceptees: 3, refus: 1, reserves: 1, jauge: 100, pret: true },
  confirme_at: '2026-11-02T18:32:00Z',
  confirme_par: 'Monsieur Joël SOATRA',
  confirme_par_fonction: 'Gérant',
  etape_suivi: 'analyse',
  echeance_at: '2026-11-05T18:32:00Z',
  numero_recu: 'VC-2026-0002'
};

const p: Espace = { client_id: 'c', revoque: false, entreprise: 'Essai atelier (à archiver)', nom_court: 'Essai Validation' };

const q: QuestionnaireComplet = {
  id: 'qq',
  etat: 'confirme',
  type: 'note_cadrage',
  version: '0.1',
  titre_client: 'Le résumé de votre projet',
  document_id: 'dd',
  role: 'validant',
  personne_id: 'pp',
  questions: [question(1, 'Le besoin'), question(2, 'Le budget'), question(3, 'Le calendrier'), question(4, 'La suite')],
  mes_reponses: [
    { question_id: 'q1', choix_id: 'q1b', commentaire: 'Préciser la saison creuse.', repondu_at: '2026-11-02T18:00:00Z' },
    { question_id: 'q2', choix_id: 'q2a', commentaire: null, repondu_at: '2026-11-02T18:01:00Z' },
    { question_id: 'q3', choix_id: 'q3c', commentaire: 'Essai phase 4 : calendrier trop court.', repondu_at: '2026-11-02T18:02:00Z' },
    { question_id: 'q4', choix_id: 'q4a', commentaire: 'Très bien.', repondu_at: '2026-11-02T18:03:00Z' }
  ]
};

describe('PDF receipt content (VC-12)', () => {
  it('title, the lines of the receipt screen, footer and file name', () => {
    const m = modeleRecu(d, p, q);
    expect(m.titre).toBe(TITRE_RECU);
    expect(m.titre).toBe('Reçu de vos réponses');
    expect(m.lignes).toEqual([
      ['Reçu n°', 'VC-2026-0002'],
      ['Confirmé par', 'Joël SOATRA, gérant'],
      ['Document', 'Note de cadrage, v0.1'],
      ['Date', '02/11/2026 à 21 h 32'],
      ['Client', 'Essai atelier (à archiver)'],
      ['Projet', 'Essai Validation'],
      ['Réponses', '2 validées, 1 réserve, 1 refus']
    ]);
    expect(m.pied).toBe(PIED_RECU);
    expect(m.pied).toBe('1saKELY, CyberKELY SARL, Nosy Be. Heures de Madagascar.');
    expect(m.nomFichier).toBe('Recu-VC-2026-0002.pdf');
  });
  it('every refusal and every reservation, with its number, subject and reason, in path order', () => {
    expect(modeleRecu(d, p, q).points).toEqual([
      { nature: 'reserve', titre: 'Réserve, question 1 : Le besoin', motif: 'Préciser la saison creuse.' },
      { nature: 'refus', titre: 'Refus, question 3 : Le calendrier', motif: 'Essai phase 4 : calendrier trop court.' }
    ]);
  });
  it('follow-up line by stage', () => {
    expect(ligneSuite(d)).toBe('Suite : en analyse chez CyberKELY. Engagement CyberKELY : au plus tard le 05/11/2026 à 21 h 32.');
    expect(ligneSuite({ ...d, etape_suivi: 'preparation' })).toBe(
      'Suite : version suivante en préparation. Engagement CyberKELY : au plus tard le 05/11/2026 à 21 h 32.'
    );
    expect(ligneSuite({ ...d, etape_suivi: 'disponible' })).toBe('Suite : la suite de votre projet est prête.');
    expect(ligneSuite({ ...d, echeance_at: null })).toBe('Suite : en analyse chez CyberKELY.');
  });
  it('file name without any unsafe character', () => {
    expect(nomFichierRecu(null)).toBe('Recu-recu.pdf');
    expect(nomFichierRecu('VC 2026/0003')).toBe('Recu-VC20260003.pdf');
  });
});
