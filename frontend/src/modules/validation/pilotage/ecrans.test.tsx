// Screen tests of VALIDCLIENT-CC-13 (gaps 2, 4, 5, 6): client detail and questionnaire page, server mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { FicheClient, QuestionnaireClient, QuestionnaireComplet } from './api';

const api = vi.hoisted(() => ({
  ficheClient: vi.fn(),
  tableau: vi.fn(),
  publier: vi.fn(),
  marquerPorte: vi.fn(),
  creerInvitation: vi.fn(),
  suivi: vi.fn(),
  clore: vi.fn(),
  archiverClient: vi.fn(),
  revoquerAcces: vi.fn(),
  nommerValidant: vi.fn(),
  questionnaire: vi.fn(),
  supprimerBrouillon: vi.fn()
}));
vi.mock('./api', () => api);
// src/test/setup.ts mocks the router globally: these screens need the real one.
vi.mock('react-router-dom', async (original) => await original());
vi.mock('../EspaceContexte', () => ({ useEspace: () => ({ session: null }) }));
vi.mock('../composants/EnTete', () => ({ default: ({ titre }: { titre: string }) => <header>{titre}</header> }));

import Detail from './Detail';
import Questionnaire from './Questionnaire';

const choix = (q: string) =>
  ['A', 'B', 'C'].map((l, i) => ({ id: `${q}${l}`, lettre: l, nature: ['validation', 'reserve', 'refus'][i], libelle: `Choix ${l}`, conseille: false, suivante: null }));

const questionnaireClient = (o: Partial<QuestionnaireClient> & Pick<QuestionnaireClient, 'id' | 'etat' | 'version' | 'cree_at'>): QuestionnaireClient => ({
  type: 'note_cadrage',
  titre_client: 'Le résumé de votre projet',
  saisi_par: 'assistant',
  publie_at: null,
  confirme_at: null,
  questions: [{ id: `x-${o.id}`, numero: '1', choix: choix(o.id), sujet_client: 'Le besoin', reponses: [] }],
  ...o
});

function ficheEssai(validantNumero: string | null = '+261321106618'): FicheClient {
  return {
    client: { id: 'c1', entreprise: 'Essai atelier (à archiver)', nom_court: 'Essai', phrase_reve: null, statut: 'actif' },
    personnes: [
      { id: 'p1', civilite: 'Monsieur', nom: 'Joël SOATRA Essai', fonction: null, role: 'validant', whatsapp: validantNumero, whatsapp_fiche: validantNumero, email: 'x@y.z', inscrit_at: '2026-11-01T00:00:00Z', revoque_at: null, invitation: 'utilisee' },
      { id: 'p2', civilite: 'Madame', nom: 'Jamais Invitée', fonction: null, role: 'contributeur', whatsapp: null, whatsapp_fiche: '+261320000000', email: null, inscrit_at: null, revoque_at: null, invitation: null },
      { id: 'p3', civilite: 'Monsieur', nom: 'Déjà Invité', fonction: null, role: 'contributeur', whatsapp: null, whatsapp_fiche: '+261330000000', email: null, inscrit_at: null, revoque_at: null, invitation: 'envoyee' }
    ],
    questionnaires: [
      questionnaireClient({ id: 'ouv', etat: 'ouvert', version: '2.0', type: 'cahier_charges', cree_at: '2026-11-07T00:00:00Z', publie_at: '2026-11-07T01:00:00Z', etat_validant: { total: 1, repondues: 0, acceptees: 0, refus: 0, reserves: 0, jauge: 0, pret: false } }),
      questionnaireClient({
        id: 'conf',
        etat: 'confirme',
        version: '1.9',
        cree_at: '2026-11-03T00:00:00Z',
        publie_at: '2026-11-03T01:00:00Z',
        confirme_at: '2026-11-04T04:31:00Z',
        echeance_at: '2099-11-07T04:31:00Z',
        etape_suivi: 'analyse',
        etat_validant: { total: 10, repondues: 10, acceptees: 8, refus: 2, reserves: 1, jauge: 80, pret: true }
      }),
      questionnaireClient({ id: 'brou', etat: 'brouillon', version: '1.10', cree_at: '2026-11-05T00:00:00Z' })
    ],
    journal: []
  };
}

let fenetre: { location: { href: string }; close: ReturnType<typeof vi.fn> };
const defile = vi.fn();

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.tableau.mockResolvedValue([]);
  fenetre = { location: { href: '' }, close: vi.fn() };
  vi.spyOn(window, 'open').mockImplementation(() => fenetre as unknown as Window);
  Element.prototype.scrollIntoView = defile;
  defile.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ouvrirDetail = async (fiche: FicheClient) => {
  api.ficheClient.mockResolvedValue(fiche);
  const vue = render(
    <MemoryRouter initialEntries={['/pilotage/client/c1']}>
      <Routes>
        <Route path="/pilotage/client/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText('Personnes');
  return vue;
};

const bloc = (c: HTMLElement, sel: string) => c.querySelector(sel) as HTMLElement;

describe('client detail (VALIDCLIENT-CC-13)', () => {
  it('gap 2: « Envoyer l’invitation » for a person never invited, « Renvoyer » once sent', async () => {
    const { container } = await ouvrirDetail(ficheEssai());
    expect(bloc(container, '[data-renvoyer="p2"]').textContent).toBe("Envoyer l'invitation");
    expect(bloc(container, '[data-renvoyer="p3"]').textContent).toBe("Renvoyer l'invitation");
    expect(container.querySelector('[data-renvoyer="p1"]')).toBeNull();
  });

  it('gap 5: no « En préparation » nor publish in the follow-up block of an unconfirmed consultation', async () => {
    const { container } = await ouvrirDetail(ficheEssai());
    const suivi = bloc(container, '[data-consultation="ouv"] [data-suivi]');
    expect(suivi.getAttribute('data-suivi')).toBe('non-confirme');
    expect(suivi.textContent).toContain('Pas encore confirmée par le client');
    expect(within(suivi).queryByText('En préparation')).toBeNull();
    expect(suivi.querySelector('[data-publier-suite], [data-importer-suite], button')).toBeNull();
    // The confirmed one keeps its buttons.
    const suiviConf = bloc(container, '[data-consultation="conf"] [data-suivi]');
    expect(within(suiviConf).getByText('En préparation')).toBeTruthy();
    expect(within(suiviConf).getByText('Publier la version 1.10')).toBeTruthy();
  });

  it('gap 4: the publish confirmation sits under its button, in view and focused; WhatsApp follow-up after success', async () => {
    const { container } = await ouvrirDetail(ficheEssai());
    const suivi = bloc(container, '[data-consultation="conf"] [data-suivi]');
    fireEvent.click(within(suivi).getByText('Publier la version 1.10'));
    const dialogue = within(suivi).getByRole('alertdialog');
    expect(dialogue.textContent).toContain('Publier la version 1.10 ?');
    expect(container.querySelectorAll('[role="alertdialog"]')).toHaveLength(1);
    // Right after the buttons of this block, never before the people card.
    const boutons = within(suivi).getByText('Publier la version 1.10').closest('div')!;
    expect(boutons.compareDocumentPosition(dialogue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bloc(container, '[data-personnes]').compareDocumentPosition(dialogue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(defile).toHaveBeenCalled();
    expect(defile.mock.instances[0]).toBe(dialogue);
    expect(document.activeElement).toBe(dialogue);

    const apres = ficheEssai();
    apres.questionnaires[1] = { ...apres.questionnaires[1], etat: 'remplace', etape_suivi: 'disponible' };
    apres.questionnaires[2] = { ...apres.questionnaires[2], etat: 'ouvert', publie_at: '2026-11-15T00:00:00Z' };
    api.publier.mockResolvedValue({ ok: true });
    api.ficheClient.mockResolvedValue(apres);
    fireEvent.click(within(dialogue).getByText('Publier'));
    await waitFor(() => expect(api.publier).toHaveBeenCalledWith('brou'));
    await waitFor(() => expect(fenetre.location.href).toMatch(/^https:\/\/wa\.me\/261321106618\?text=/));
    expect(decodeURIComponent(fenetre.location.href.split('?text=')[1])).toContain('la suite de votre projet est prête');
    await waitFor(() => expect(bloc(container, '[data-consultation="conf"] [data-etape]').textContent).toBe('Disponible'));
    const retour = bloc(container, '[data-consultation="conf"] [data-retour="ok"]');
    expect(retour.textContent).toContain('Version 1.10 publiée');
  });

  it('gap 4: a refused publication changes nothing and the error shows next to the button', async () => {
    const { container } = await ouvrirDetail(ficheEssai());
    const suivi = bloc(container, '[data-consultation="conf"] [data-suivi]');
    fireEvent.click(within(suivi).getByText('Publier la version 1.10'));
    api.publier.mockResolvedValue({ ok: false, code: 'SANS_VALIDANT' });
    fireEvent.click(within(within(suivi).getByRole('alertdialog')).getByText('Publier'));
    await waitFor(() => expect(within(suivi).getByRole('alert').textContent).toContain('Désignez d’abord un validant.'));
    expect(fenetre.close).toHaveBeenCalled();
    expect(api.ficheClient).toHaveBeenCalledTimes(1);
    expect(bloc(container, '[data-consultation="conf"] [data-etape]').textContent).toBe('En analyse');
  });

  it('gap 4: without a validant number, the follow-up message is shown to copy', async () => {
    const { container } = await ouvrirDetail(ficheEssai(null));
    const suivi = bloc(container, '[data-consultation="conf"] [data-suivi]');
    fireEvent.click(within(suivi).getByText('Publier la version 1.10'));
    api.publier.mockResolvedValue({ ok: true });
    fireEvent.click(within(within(suivi).getByRole('alertdialog')).getByText('Publier'));
    await waitFor(() => expect(container.querySelector('[data-message-a-copier]')).not.toBeNull());
    expect(window.open).not.toHaveBeenCalled();
    expect(bloc(container, '[data-message-a-copier] pre').textContent).toContain('*VOTRE PROJET : ESSAI*');
  });

  it('gap 6: the gate confirmation warns with the counts, next to its button, and still marks the step', async () => {
    const { container } = await ouvrirDetail(ficheEssai());
    const porte = bloc(container, '[data-consultation="conf"] [data-porte]');
    fireEvent.click(within(porte).getByText("Marquer l'étape franchie"));
    const dialogue = within(porte).getByRole('alertdialog');
    expect(bloc(dialogue, '[data-avertissement-porte]').textContent).toBe(
      "Attention : cette version compte 2 refus et 1 réserve. La règle de la porte demande un accord complet avant de franchir l'étape."
    );
    expect(document.activeElement).toBe(dialogue);
    api.marquerPorte.mockResolvedValue({ ok: true });
    const marquer = within(dialogue).getByText('Marquer') as HTMLButtonElement;
    expect(marquer.disabled).toBe(false);
    fireEvent.click(marquer);
    await waitFor(() => expect(api.marquerPorte).toHaveBeenCalledWith('conf', true));
  });

  it('gap 6: no warning on a version confirmed at 100 % without refusal nor reservation', async () => {
    const f = ficheEssai();
    f.questionnaires[1] = { ...f.questionnaires[1], etat_validant: { total: 4, repondues: 4, acceptees: 4, refus: 0, reserves: 0, jauge: 100, pret: true } };
    const { container } = await ouvrirDetail(f);
    const porte = bloc(container, '[data-consultation="conf"] [data-porte]');
    fireEvent.click(within(porte).getByText("Marquer l'étape franchie"));
    expect(within(porte).getByRole('alertdialog').querySelector('[data-avertissement-porte]')).toBeNull();
  });

  it('gap 4: the person confirmations sit under that person', async () => {
    const { container } = await ouvrirDetail(ficheEssai());
    const personne = bloc(container, '[data-personne="p3"]');
    fireEvent.click(within(personne).getByText('Révoquer son accès'));
    expect(within(personne).getByRole('alertdialog').textContent).toContain('Retirer l’accès de Monsieur Déjà Invité');
  });
});

function questionnaireComplet(): QuestionnaireComplet {
  return {
    questionnaire: { id: 'brou', client_id: 'c1', etat: 'brouillon', saisi_par: 'assistant', cree_at: '2026-11-05T00:00:00Z', publie_at: null },
    document: { id: 'd', type: 'note_cadrage', version: '1.10', titre_client: 'Le résumé de votre projet' },
    arbre: { atteintes: 1, boucle: false, chemin_max: 1 },
    questions: [
      {
        id: 'x1',
        numero: '1',
        ordre: 1,
        type: 'validation',
        sujet_client: 'Le besoin',
        critere: null,
        texte: 'Cette phrase décrit-elle bien votre besoin ?',
        extrait: null,
        essentielle: true,
        choix: choix('x1').map((c) => ({ ...c, nature: c.nature as 'validation', ligne: c.libelle, avantages: null, faiblesses: null }))
      }
    ]
  };
}

const ouvrirQuestionnaire = async (fiche: FicheClient) => {
  api.questionnaire.mockResolvedValue(questionnaireComplet());
  api.ficheClient.mockResolvedValue(fiche);
  const vue = render(
    <MemoryRouter initialEntries={['/pilotage/questionnaire/brou']}>
      <Routes>
        <Route path="/pilotage/questionnaire/:id" element={<Questionnaire />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText('Monsieur Joël SOATRA Essai');
  return vue;
};

describe('questionnaire page (VALIDCLIENT-CC-13)', () => {
  it('gap 4: « Publier ? » right under the Publier button, in view and focused; WhatsApp follow-up after success', async () => {
    const { container } = await ouvrirQuestionnaire(ficheEssai());
    const publierBouton = bloc(container, '[data-publier]');
    fireEvent.click(publierBouton);
    const dialogue = screen.getByRole('alertdialog');
    expect(dialogue.textContent).toContain('Publier ?');
    expect(publierBouton.parentElement!.nextElementSibling).toBe(dialogue);
    expect(document.activeElement).toBe(dialogue);
    expect(defile.mock.instances[0]).toBe(dialogue);

    api.publier.mockResolvedValue({ ok: true });
    api.questionnaire.mockResolvedValue({ ...questionnaireComplet(), questionnaire: { ...questionnaireComplet().questionnaire, etat: 'ouvert', publie_at: '2026-11-15T00:00:00Z' } });
    fireEvent.click(within(dialogue).getByText('Publier'));
    await waitFor(() => expect(api.publier).toHaveBeenCalledWith('brou'));
    await waitFor(() => expect(fenetre.location.href).toMatch(/^https:\/\/wa\.me\/261321106618\?text=/));
    expect(decodeURIComponent(fenetre.location.href.split('?text=')[1])).toContain('la suite de votre projet est prête : la 1re étape');
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('WhatsApp s’ouvre avec le message pour le validant'));
  });

  it('gap 4: without a number, the message is shown to copy; a first consultation stays on the invitation', async () => {
    const { container } = await ouvrirQuestionnaire(ficheEssai(null));
    fireEvent.click(bloc(container, '[data-publier]'));
    api.publier.mockResolvedValue({ ok: true });
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Publier'));
    await waitFor(() => expect(container.querySelector('[data-message-a-copier]')).not.toBeNull());
    cleanup();

    const premiere = ficheEssai();
    premiere.questionnaires = [premiere.questionnaires[2]];
    const v = await ouvrirQuestionnaire(premiere);
    fireEvent.click(bloc(v.container, '[data-publier]'));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Publier'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Vous pouvez inviter depuis la fiche du client.'));
    expect(window.open).not.toHaveBeenCalled();
  });

  it('gap 4: « Supprimer ce brouillon ? » right under its button', async () => {
    const { container } = await ouvrirQuestionnaire(ficheEssai());
    const supprimer = bloc(container, '[data-supprimer]');
    fireEvent.click(supprimer);
    const dialogue = screen.getByRole('alertdialog');
    expect(supprimer.nextElementSibling).toBe(dialogue);
    expect(document.activeElement).toBe(dialogue);
  });
});
