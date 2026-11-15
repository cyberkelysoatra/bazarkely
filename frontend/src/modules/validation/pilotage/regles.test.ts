import { describe, expect, it } from 'vitest';
import {
  aRendre,
  adresseWhatsApp,
  brouillonSuivant,
  dateCourte,
  ilYa,
  lienInvitation,
  ligneCorrection,
  lignesCorrections,
  lignesPorte,
  messageInvitation,
  messageRelance,
  messageSuite,
  numeroWhatsApp,
  questionsEtDuree,
  ligneSousApercu,
  libelleInvitation,
  etapeSuivi,
  actionsSuivi,
  avertissementPorte,
  suiteAProposer
} from './regles';
import type { EntreeJournal, QuestionnaireClient } from './api';

describe('person corrections (VC-44)', () => {
  const at = '2026-11-03T17:45:00Z'; // 20 h 45 in Madagascar
  it('writes one line per field', () => {
    expect(ligneCorrection({ champ: 'nom', avant: 'Rakotto', apres: 'Rakoto' }, at)).toBe('Nom corrigé le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « Rakotto ».');
    expect(ligneCorrection({ champ: 'civilite', avant: 'Monsieur', apres: 'Madame' }, at)).toBe('Civilité corrigée le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « Monsieur ».');
    expect(ligneCorrection({ champ: 'fonction', avant: null, apres: 'Gérante' }, at)).toBe('Fonction corrigée le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « (vide) ».');
    expect(ligneCorrection({ champ: 'whatsapp', avant: '', apres: '+261340000000' }, at)).toBe('Numéro corrigé le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « (vide) ».');
  });

  const ligne = (personne: string, iso: string, champs: string[]): EntreeJournal => ({
    action: 'personne_corrigee',
    personne_id: personne,
    at: iso,
    details: { changements: champs.map((c) => ({ champ: c as 'nom', avant: `${c}-${iso.slice(11, 13)}`, apres: 'x' })) }
  });

  it('keeps the person and the action, newest first, at most 3 then « et <n> autres »', () => {
    const journal: EntreeJournal[] = [
      ligne('p1', '2026-11-03T10:00:00Z', ['nom']),
      ligne('p1', '2026-11-03T12:00:00Z', ['nom', 'fonction']),
      ligne('p2', '2026-11-03T13:00:00Z', ['nom']),
      { action: 'suivi_preparation', personne_id: 'p1', at: '2026-11-03T14:00:00Z', details: null },
      ligne('p1', '2026-11-03T11:00:00Z', ['civilite'])
    ];
    const l = lignesCorrections(journal, 'p1');
    expect(l).toHaveLength(4);
    expect(l[0]).toContain('« nom-12 »');
    expect(l[1]).toContain('« fonction-12 »');
    expect(l[2]).toContain('Civilité corrigée');
    expect(l[3]).toBe('et 1 autre correction');
    expect(lignesCorrections([...journal, ligne('p1', '2026-11-03T09:00:00Z', ['nom'])], 'p1')[3]).toBe('et 2 autres corrections');
    expect(lignesCorrections(journal, 'p2')).toHaveLength(1);
    expect(lignesCorrections(undefined, 'p1')).toEqual([]);
  });
});

describe('next version to publish (VC-38)', () => {
  const q = (id: string, etat: QuestionnaireClient['etat'], type: string, version: string, cree_at: string): QuestionnaireClient => ({
    id,
    etat,
    type,
    version,
    titre_client: '',
    saisi_par: 'joel',
    cree_at,
    publie_at: null,
    confirme_at: null,
    questions: null
  });
  const confirme = q('c', 'confirme', 'note_cadrage', '0.1', '2026-11-02T10:00:00Z');

  it('takes the newest draft of the same type created later', () => {
    const qs = [
      confirme,
      q('a', 'brouillon', 'note_cadrage', '0.2', '2026-11-03T10:00:00Z'),
      q('b', 'brouillon', 'note_cadrage', '0.3', '2026-11-03T12:00:00Z'),
      q('t', 'brouillon', 'prd', '1.0', '2026-11-03T13:00:00Z'),
      q('o', 'brouillon', 'note_cadrage', '0.0', '2026-11-01T10:00:00Z')
    ];
    expect(brouillonSuivant(qs, confirme)?.id).toBe('b');
  });

  it('ignores another type, an older draft and non drafts', () => {
    const qs = [
      confirme,
      q('t', 'brouillon', 'prd', '1.0', '2026-11-03T13:00:00Z'),
      q('o', 'brouillon', 'note_cadrage', '0.0', '2026-11-01T10:00:00Z'),
      q('x', 'ouvert', 'note_cadrage', '0.2', '2026-11-03T10:00:00Z')
    ];
    expect(brouillonSuivant(qs, confirme)).toBeNull();
    expect(brouillonSuivant([confirme], confirme)).toBeNull();
  });
});

describe('pilotage rules', () => {
  const base = { civilite: 'Madame', nom: 'Fara Rakoto', questions: 4, minutes: 4, lien: lienInvitation('abc') };

  it('builds the WhatsApp message of VC-24', () => {
    expect(messageInvitation({ ...base, nomCourt: 'Réservations en ligne', phraseReve: 'Et si votre hôtel prenait ses réservations tout seul ?' })).toBe(
      [
        '*VOTRE PROJET : RÉSERVATIONS EN LIGNE*',
        '',
        '_Et si votre hôtel prenait ses réservations tout seul ?_',
        '',
        'Bonjour Madame Fara Rakoto,',
        'Votre projet prend forme. Avant de le construire, nous avons besoin de votre avis : 4 questions au plus, environ 4 minutes, depuis votre téléphone.',
        'https://1sakely.org/validation/i/abc',
        'Joël SOATRA, CyberKELY'
      ].join('\n')
    );
  });

  it('uses the general sentence when the dream is empty', () => {
    expect(messageInvitation({ ...base, nomCourt: 'x', phraseReve: '  ' })).toContain("_Et si votre idée devenait l'application dont vous rêvez ?_");
  });

  it('builds the wa.me address without « + » and with the encoded message', () => {
    expect(adresseWhatsApp('+261 34 00 000 00', 'a b\n*c*')).toBe('https://wa.me/261340000000?text=a%20b%0A*c*');
  });

  it('formats dates and delays in Madagascar time', () => {
    expect(dateCourte('2026-11-02T22:30:00Z')).toBe('03/11/2026');
    const t = Date.parse('2026-11-02T12:00:00Z');
    expect(ilYa('2026-11-02T11:50:00Z', t)).toBe('il y a 10 min');
    expect(ilYa('2026-10-31T12:00:00Z', t)).toBe('il y a 2 j');
    expect(aRendre('2026-11-05T11:00:00Z', t)).toBe('À rendre dans 2 j 23 h');
    expect(aRendre('2026-11-02T11:00:00Z', t)).toBeNull();
  });

  it('checks WhatsApp numbers', () => {
    expect(numeroWhatsApp('+261 32 00 000 00')).toBe('+261320000000');
    expect(numeroWhatsApp('0320000000')).toBeNull();
  });

  it('builds the reminder (VC-28) and the follow-up message (VC-38)', () => {
    expect(messageRelance({ nomCourt: 'Essai Validation', civilite: 'Monsieur', nom: 'Joël SOATRA', titreClient: 'Le résumé de votre projet', restantes: 3 })).toBe(
      [
        '*VOTRE PROJET : ESSAI VALIDATION*',
        '',
        'Bonjour Monsieur Joël SOATRA, votre avis sur le résumé de votre projet nous attend : il reste 3 questions.',
        'https://1sakely.org/validation/',
        'Joël SOATRA, CyberKELY'
      ].join('\n')
    );
    expect(messageRelance({ nomCourt: 'x', civilite: 'Madame', nom: 'Fara', titreClient: 'PRD', restantes: 1 })).toContain('votre avis sur PRD nous attend : il reste 1 question.');
    expect(messageSuite({ nomCourt: 'Essai Validation', civilite: 'Monsieur', nom: 'Joël SOATRA' })).toBe(
      '*VOTRE PROJET : ESSAI VALIDATION*\n\nBonjour Monsieur Joël SOATRA, la suite de votre projet est prête : https://1sakely.org/validation/\nJoël SOATRA, CyberKELY'
    );
  });
});

describe('messages naming the step (VC-46)', () => {
  const base = { civilite: 'Madame', nom: 'Fara Rakoto', questions: 5, minutes: 5, lien: lienInvitation('abc'), nomCourt: 'x', phraseReve: '' };

  it('invitation: « étape par étape » with the step of the counted questionnaire', () => {
    expect(messageInvitation({ ...base, type: 'note_cadrage' }).split('\n')[5]).toBe(
      'Votre projet prend forme, étape par étape. Pour valider la 1re étape, le résumé de votre projet (note de cadrage), nous avons besoin de votre avis : 5 questions au plus, environ 5 minutes, depuis votre téléphone.'
    );
    expect(messageInvitation({ ...base, type: 'prd' })).toContain('Pour valider la 3e étape, le fonctionnement écran par écran (spécifications fonctionnelles), nous avons besoin');
  });

  it('reminder and follow-up name the step', () => {
    expect(messageRelance({ nomCourt: 'x', civilite: 'Monsieur', nom: 'Joël SOATRA', titreClient: 'Le résumé de votre projet', restantes: 3, type: 'cahier_charges' }).split('\n')[2]).toBe(
      'Bonjour Monsieur Joël SOATRA, votre avis nous attend pour valider la 2e étape, le détail de votre application (cahier des charges) : il reste 3 questions.'
    );
    expect(messageRelance({ nomCourt: 'x', civilite: 'Madame', nom: 'Fara', titreClient: 'T', restantes: 1, type: 'recette' })).toContain(
      'valider la 5e étape, le contrôle avant la mise en ligne (recette) : il reste 1 question.'
    );
    expect(messageSuite({ nomCourt: 'Essai Validation', civilite: 'Monsieur', nom: 'Joël SOATRA', type: 'maquette' })).toBe(
      '*VOTRE PROJET : ESSAI VALIDATION*\n\nBonjour Monsieur Joël SOATRA, la suite de votre projet est prête : la 4e étape, l’aperçu à essayer sur votre téléphone (maquette), vous attend : https://1sakely.org/validation/\nJoël SOATRA, CyberKELY'
    );
  });

  it('without a step type (avenant, découverte, unknown): the texts stay as they were', () => {
    for (const type of ['avenant', 'decouverte', 'autre', null, undefined]) {
      expect(messageInvitation({ ...base, type })).toBe(messageInvitation(base));
      expect(messageInvitation({ ...base, type })).toContain('Votre projet prend forme. Avant de le construire, nous avons besoin de votre avis');
      expect(messageRelance({ nomCourt: 'x', civilite: 'Madame', nom: 'Fara', titreClient: 'PRD', restantes: 2, type })).toContain('votre avis sur PRD nous attend : il reste 2 questions.');
      expect(messageSuite({ nomCourt: 'x', civilite: 'Madame', nom: 'Fara', type })).toContain('la suite de votre projet est prête : https://1sakely.org/validation/');
    }
  });

  it('history lines of the step gate, newest first, this questionnaire only', () => {
    const journal: EntreeJournal[] = [
      { action: 'porte_franchie', personne_id: null, at: '2026-11-04T06:00:00Z', details: { questionnaire: 'q1', type: 'note_cadrage' } },
      { action: 'porte_annulee', personne_id: null, at: '2026-11-04T07:30:00Z', details: { questionnaire: 'q1', type: 'note_cadrage' } },
      { action: 'porte_franchie', personne_id: null, at: '2026-11-04T08:00:00Z', details: { questionnaire: 'q2', type: 'prd' } },
      { action: 'questionnaire_clos', personne_id: null, at: '2026-11-04T09:00:00Z', details: { questionnaire: 'q1' } }
    ];
    expect(lignesPorte(journal, 'q1')).toEqual([
      'Étape franchie annulée le 04/11/2026 à 10 h 30 par Joël SOATRA.',
      'Étape marquée franchie le 04/11/2026 à 09 h 00 par Joël SOATRA.'
    ]);
    expect(lignesPorte(undefined, 'q1')).toEqual([]);
  });
});

describe('gaps reported by Stay Easy (VALIDCLIENT-CC-13)', () => {
  it('gap 1: count and duration agree in number, nothing for 0', () => {
    expect(questionsEtDuree(0, 1)).toBeNull();
    expect(questionsEtDuree(1, 1)).toBe('1 question au plus, environ 1 minute');
    expect(questionsEtDuree(2, 2)).toBe('2 questions au plus, environ 2 minutes');
    expect(questionsEtDuree(4, 4)).toBe('4 questions au plus, environ 4 minutes');
    expect(questionsEtDuree(10, 10)).toBe('10 questions au plus, environ 10 minutes');
    expect(questionsEtDuree(2, 1)).toBe('2 questions au plus, environ 1 minute');
  });

  it('gap 1: invitation without a published questionnaire shows no count', () => {
    const base = { nomCourt: 'x', phraseReve: '', civilite: 'Madame', nom: 'Fara', lien: lienInvitation('abc') };
    const zero = messageInvitation({ ...base, questions: 0, minutes: 1 });
    expect(zero).toContain('Votre projet prend forme. Avant de le construire, nous avons besoin de votre avis, en quelques minutes, depuis votre téléphone.');
    expect(zero).not.toMatch(/0 question|au plus|environ/);
    expect(messageInvitation({ ...base, questions: 0, minutes: 1, type: 'note_cadrage' })).toContain(
      'Pour valider la 1re étape, le résumé de votre projet (note de cadrage), nous avons besoin de votre avis, en quelques minutes, depuis votre téléphone.'
    );
    expect(messageInvitation({ ...base, questions: 1, minutes: 1 })).toContain('nous avons besoin de votre avis : 1 question au plus, environ 1 minute, depuis votre téléphone.');
    expect(ligneSousApercu(0)).toBe("Le nombre de questions s'affichera dès qu'une consultation sera publiée.");
    expect(ligneSousApercu(4)).toBe('Le nombre de questions et la durée sont calculés à partir du questionnaire publié.');
  });

  it('gap 2: « Envoyer » until an invitation was sent, then « Renvoyer »', () => {
    expect(libelleInvitation(null)).toBe("Envoyer l'invitation");
    expect(libelleInvitation(undefined)).toBe("Envoyer l'invitation");
    expect(libelleInvitation('annulee')).toBe("Envoyer l'invitation");
    expect(libelleInvitation('envoyee')).toBe("Renvoyer l'invitation");
  });

  const draft = { id: 'd', etat: 'brouillon', type: 'note_cadrage', version: '1.10', titre_client: '', saisi_par: 'joel', cree_at: '2026-11-06T00:00:00Z', publie_at: null, confirme_at: null, questions: null } as QuestionnaireClient;

  it('gap 3: the follow-up step comes from the server only', () => {
    expect(etapeSuivi({ etape_suivi: null, confirme_at: null })).toBeNull();
    expect(etapeSuivi({ etape_suivi: null, confirme_at: '2026-11-03T07:31:00Z' })).toBe('analyse');
    expect(etapeSuivi({ etape_suivi: 'preparation', confirme_at: '2026-11-03T07:31:00Z' })).toBe('preparation');
    expect(etapeSuivi({ etape_suivi: 'disponible', confirme_at: '2026-11-03T07:31:00Z' })).toBe('disponible');
  });

  it('gap 5: no « En préparation » nor publish before the confirmation', () => {
    const aucune = { preparation: false, publier: false, importer: false };
    expect(actionsSuivi({ etape_suivi: null, confirme_at: null }, null)).toEqual(aucune);
    expect(actionsSuivi({ etape_suivi: null, confirme_at: null }, draft)).toEqual(aucune);
    expect(actionsSuivi({ etape_suivi: 'preparation', confirme_at: null }, draft)).toEqual(aucune);
    expect(actionsSuivi({ etape_suivi: null, confirme_at: '2026-11-03T07:31:00Z' }, draft)).toEqual({ preparation: true, publier: true, importer: false });
    expect(actionsSuivi({ etape_suivi: 'analyse', confirme_at: '2026-11-03T07:31:00Z' }, null)).toEqual({ preparation: true, publier: false, importer: true });
    expect(actionsSuivi({ etape_suivi: 'disponible', confirme_at: '2026-11-03T07:31:00Z' }, draft)).toEqual(aucune);
  });

  it('gap 6: gate warning with the right counts, none at 100 % without refusal or reservation', () => {
    const fin = " La règle de la porte demande un accord complet avant de franchir l'étape.";
    expect(avertissementPorte({ refus: 2, reserves: 3, jauge: 80 })).toBe(`Attention : cette version compte 2 refus et 3 réserves.${fin}`);
    expect(avertissementPorte({ refus: 1, reserves: 1, jauge: 90 })).toBe(`Attention : cette version compte 1 refus et 1 réserve.${fin}`);
    expect(avertissementPorte({ refus: 0, reserves: 2, jauge: 100 })).toBe(`Attention : cette version compte 0 refus et 2 réserves.${fin}`);
    expect(avertissementPorte({ refus: 0, reserves: 0, jauge: 90 })).toBe(`Attention : cette version compte 0 refus et 0 réserve.${fin}`);
    expect(avertissementPorte({ refus: 0, reserves: 0, jauge: 100 })).toBeNull();
    expect(avertissementPorte(null)).toBeNull();
  });

  it('gap 4: the follow-up message is proposed after a publication when the client already had one', () => {
    expect(suiteAProposer([{ id: 'd', etat: 'brouillon' }], 'd')).toBe(false);
    expect(suiteAProposer([{ id: 'd', etat: 'brouillon' }, { id: 'o', etat: 'brouillon' }], 'd')).toBe(false);
    expect(suiteAProposer([{ id: 'd', etat: 'brouillon' }, { id: 'c', etat: 'confirme' }], 'd')).toBe(true);
    expect(suiteAProposer([{ id: 'd', etat: 'ouvert' }, { id: 'r', etat: 'remplace' }], 'd')).toBe(true);
  });
});
