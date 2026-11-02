// Questionnaires kept on the device and the queue of answers (D6, VC-09, VC-10, VC-11).
// Each answer is saved locally first (shown at once), then sent with vc_repondre; without network
// it waits in the queue and is replayed when the network comes back, with the same id (the server
// ignores a replay: no duplicate). A failed send is never dropped silently: it stays queued and the
// page shows « Réponse non enregistrée, réessayez. ».
import { useSyncExternalStore } from 'react';
import { lireQuestionnaire, repondre } from './api';
import { ecrireLocal, lireLocal } from './local';
import type { EtatPersonne, MaReponse, QuestionnaireComplet } from '../utils/types';

export interface EnvoiReponse {
  id: string;
  questionnaire: string;
  question: string;
  choix: string;
  commentaire: string | null;
  repondu_at: string;
  appareil: string;
}

export type Chargement = 'chargement' | 'pret' | 'erreur' | 'refuse';

export interface EtatFile {
  file: EnvoiReponse[];
  /** Question whose answer is being sent right now. */
  envoi: string | null;
  /** question id → 'reseau' (send failed, still queued) or a server code (refused, removed). */
  erreurs: Record<string, string>;
  /** questionnaire id → QUESTIONNAIRE_REMPLACE / QUESTIONNAIRE_CLOS / QUESTIONNAIRE_CONFIRME. */
  codes: Record<string, string>;
  /** questionnaire id → last state returned by vc_repondre (C1: same t and gauge as the device). */
  etatServeur: Record<string, EtatPersonne>;
  questionnaires: Record<string, QuestionnaireComplet>;
  chargements: Record<string, Chargement>;
  enLigne: boolean;
}

let etat: EtatFile = {
  file: [],
  envoi: null,
  erreurs: {},
  codes: {},
  etatServeur: {},
  questionnaires: {},
  chargements: {},
  enLigne: typeof navigator === 'undefined' ? true : navigator.onLine
};
const abonnes = new Set<() => void>();

function changer(m: Partial<EtatFile>): void {
  etat = { ...etat, ...m };
  abonnes.forEach((f) => f());
}

export function useFile(): EtatFile {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => etat
  );
}

export function etatFile(): EtatFile {
  return etat;
}

// ---------------------------------------------------------------- queue

let fileLue: Promise<void> | null = null;

function lireFile(): Promise<void> {
  if (!fileLue) {
    fileLue = lireLocal<EnvoiReponse[]>('file').then((f) => {
      if (Array.isArray(f) && f.length) changer({ file: [...f, ...etat.file.filter((x) => !f.some((y) => y.id === x.id))] });
    });
  }
  return fileLue;
}

async function poserFile(file: EnvoiReponse[]): Promise<void> {
  changer({ file });
  await ecrireLocal('file', file);
}

/** Answers of a questionnaire with the queued ones on top (the queue is always newer). */
function superposer(q: QuestionnaireComplet, file: EnvoiReponse[]): QuestionnaireComplet {
  const enAttente = file.filter((r) => r.questionnaire === q.id);
  if (!enAttente.length) return q;
  const mes: MaReponse[] = [...(q.mes_reponses ?? [])];
  for (const r of enAttente) {
    const i = mes.findIndex((m) => m.question_id === r.question);
    const m = { question_id: r.question, choix_id: r.choix, commentaire: r.commentaire, repondu_at: r.repondu_at };
    if (i >= 0) mes[i] = m;
    else mes.push(m);
  }
  return { ...q, mes_reponses: mes };
}

async function garderQuestionnaire(q: QuestionnaireComplet): Promise<void> {
  changer({ questionnaires: { ...etat.questionnaires, [q.id]: q } });
  await ecrireLocal(`q:${q.id}`, q);
}

/** Server refusals that will never pass on a replay. */
function definitif(message: string): boolean {
  return /^VC_|permission denied|JWT|violates/i.test(message);
}

let vidage: Promise<void> | null = null;

/** Sends the queue in order, one answer at a time; stops at the first network failure. */
export function viderFile(): Promise<void> {
  if (vidage) return vidage;
  vidage = (async () => {
    await lireFile();
    while (etat.file.length && (typeof navigator === 'undefined' || navigator.onLine)) {
      const r = etat.file[0];
      changer({ envoi: r.question });
      try {
        const res = await repondre(r);
        const erreurs = { ...etat.erreurs };
        delete erreurs[r.question];
        if (res?.ok) {
          if (res.etat) changer({ etatServeur: { ...etat.etatServeur, [r.questionnaire]: res.etat } });
        } else if (res?.code && /^QUESTIONNAIRE_/.test(res.code)) {
          changer({ codes: { ...etat.codes, [r.questionnaire]: res.code } });
        } else {
          erreurs[r.question] = res?.code ?? 'REFUSE';
        }
        changer({ erreurs });
        await poserFile(etat.file.filter((x) => x.id !== r.id));
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        if (definitif(m)) {
          changer({ erreurs: { ...etat.erreurs, [r.question]: m } });
          await poserFile(etat.file.filter((x) => x.id !== r.id));
        } else {
          changer({ erreurs: { ...etat.erreurs, [r.question]: 'reseau' } });
          break;
        }
      }
    }
    changer({ envoi: null });
  })().finally(() => {
    vidage = null;
  });
  return vidage;
}

export type Issue = 'envoye' | 'garde' | 'erreur' | string;

/**
 * Saves an answer locally (queue + questionnaire on the device), then tries to send it.
 * 'envoye': recorded by the server; 'garde': no network, it will leave later; 'erreur': send
 * failed, still queued; any other value: server code (QUESTIONNAIRE_REMPLACE, MOTIF_OBLIGATOIRE...).
 */
export async function ajouterReponse(r: EnvoiReponse): Promise<Issue> {
  await lireFile();
  const erreurs = { ...etat.erreurs };
  delete erreurs[r.question];
  changer({ erreurs });
  await poserFile([...etat.file, r]);
  const q = etat.questionnaires[r.questionnaire];
  if (q) await garderQuestionnaire(superposer(q, [r]));
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'garde';
  await viderFile();
  if (etat.file.some((x) => x.id === r.id)) return navigator.onLine ? 'erreur' : 'garde';
  return etat.codes[r.questionnaire] ?? etat.erreurs[r.question] ?? 'envoye';
}

/** « Réessayer »: sends the queue again (same ids). */
export function reessayer(): Promise<void> {
  const erreurs = { ...etat.erreurs };
  for (const k of Object.keys(erreurs)) if (erreurs[k] === 'reseau') delete erreurs[k];
  changer({ erreurs });
  return viderFile();
}

// ---------------------------------------------------------------- questionnaires

const demandes: Record<string, Promise<void> | undefined> = {};

/**
 * Questionnaire from the device at once (when kept), then from the server when online; the queued
 * answers stay on top of the server's. Never throws.
 */
export function chargerQuestionnaire(id: string, forcer = false): Promise<void> {
  if (demandes[id] && !forcer) return demandes[id]!;
  const p = (async () => {
    await lireFile();
    if (!etat.questionnaires[id]) {
      const local = await lireLocal<QuestionnaireComplet>(`q:${id}`);
      if (local?.id) changer({ questionnaires: { ...etat.questionnaires, [id]: superposer(local, etat.file) } });
    }
    if (!etat.questionnaires[id]) changer({ chargements: { ...etat.chargements, [id]: 'chargement' } });
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      changer({ chargements: { ...etat.chargements, [id]: etat.questionnaires[id] ? 'pret' : 'erreur' } });
      return;
    }
    try {
      const q = await lireQuestionnaire(id);
      await garderQuestionnaire(superposer(q, etat.file));
      changer({ chargements: { ...etat.chargements, [id]: 'pret' } });
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      const refuse = /VC_ACCES_REFUSE|VC_CONNEXION_REQUISE/.test(m);
      changer({ chargements: { ...etat.chargements, [id]: refuse ? 'refuse' : etat.questionnaires[id] ? 'pret' : 'erreur' } });
    }
  })().finally(() => {
    delete demandes[id];
  });
  demandes[id] = p;
  return p;
}

/** After vc_confirmer: the questionnaire becomes read-only on the device too. */
export async function marquerConfirme(id: string): Promise<void> {
  const q = etat.questionnaires[id];
  if (q) await garderQuestionnaire({ ...q, etat: 'confirme' });
}

// ---------------------------------------------------------------- network

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    changer({ enLigne: true });
    void viderFile();
  });
  window.addEventListener('offline', () => changer({ enLigne: false }));
  // Answers left in the queue by an earlier visit leave as soon as the app opens online.
  if (navigator.onLine) window.setTimeout(() => void viderFile(), 1500);
}
