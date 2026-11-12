// Trainer live tracking (NEC-CC-02). Only a plan whose owner joined the training and gave consent is
// sent: after every save the plan is marked dirty, then sent through bp_envoyer after 5 s of quiet,
// when the phone is online. Phone number and e-mail never leave the phone (removed here, and again by
// the server). Retried on the `online` event, on page show and when the page comes back visible.
import { useEffect, useState } from 'react';
import type { Plan } from '../types';
import { db, type Lien } from '../db/base';
import { lirePlan } from '../db/plans';
import { RUBRIQUES } from '../rubriques/registre';
import { alertes } from '../utils/chiffres';
import { copier } from '../etat/vide';
import { clientParticipant, withTimeout } from './supabase';

export type { Lien } from '../db/base';

const DELAI_ENVOI = 5000;
const CLE_CODE = 'nec.code';
/** Withdrawals asked offline: bp_retirer is called when the network is back. */
const CLE_RETRAITS = 'nec.retraits';

const minuteries = new Map<string, number>();
const enCours = new Set<string>();
const aRelancer = new Set<string>();
/** Number of changes signalled per plan, to know whether the plan changed during a send. */
const modifications = new Map<string, number>();
const abonnes = new Set<() => void>();

function notifier(): void {
  abonnes.forEach((f) => f());
}

export async function lireLien(planId: string): Promise<Lien | null> {
  try {
    return (await db.liens.get(planId)) ?? null;
  } catch {
    return null;
  }
}

async function majLien(planId: string, patch: Partial<Lien>): Promise<void> {
  try {
    await db.liens.update(planId, patch);
  } finally {
    notifier();
  }
}

function enLigne(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** NEC-CC-10: the server answered RETIRE (plan removed by the trainer); it will never accept it again. */
function estRetire(lien: Lien): boolean {
  return lien.refus === 'RETIRE';
}

function planifier(planId: string, ms: number): void {
  const avant = minuteries.get(planId);
  if (avant !== undefined) window.clearTimeout(avant);
  minuteries.set(
    planId,
    window.setTimeout(() => {
      minuteries.delete(planId);
      void envoyer(planId);
    }, ms)
  );
}

/** 32 random bytes in hex. */
function nouveauJeton(): string {
  const octets = new Uint8Array(32);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

function progressionParRubrique(plan: Plan): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of RUBRIQUES) {
    let v = 0;
    try {
      v = Math.round(Math.max(0, Math.min(100, r.progression(plan))));
    } catch {
      v = 0;
    }
    out[r.id] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

function alertesActives(plan: Plan): string[] {
  try {
    return alertes(plan).map((a) => a.cle);
  } catch {
    return [];
  }
}

/** Arguments of bp_envoyer: the whole plan without identite.telephone and identite.email. */
function charge(plan: Plan, lien: Lien) {
  const { telephone: _t, email: _e, ...identite } = plan.identite;
  const contenu = { ...copier(plan), identite: copier(identite) };
  return {
    p_code: lien.code,
    p_plan_id: plan.id,
    p_jeton: lien.jeton,
    p_prenom: lien.prenom,
    p_nom_projet: plan.identite.nomProjet.trim(),
    p_contenu: contenu,
    p_progression: progressionParRubrique(plan),
    p_alertes: alertesActives(plan),
    p_rev: plan.rev ?? 0
  };
}

type Reponse = { ok?: boolean; raison?: string; code?: string; rev?: number } | null;

async function envoyer(planId: string): Promise<void> {
  if (enCours.has(planId)) {
    aRelancer.add(planId);
    return;
  }
  const lien = await lireLien(planId);
  if (!lien || estRetire(lien)) return;
  if (!enLigne()) {
    if (!lien.enAttente) await majLien(planId, { enAttente: true });
    return;
  }
  enCours.add(planId);
  const vuAvant = modifications.get(planId) ?? 0;
  try {
    const sb = await withTimeout(clientParticipant());
    let l = lien;
    if (!l.confirme) {
      const { data, error } = await withTimeout(sb.rpc('bp_rejoindre', { p_code: l.code }));
      if (error) throw error;
      const r = data as Reponse;
      if (!r?.ok) {
        await majLien(planId, { refus: r?.raison ?? 'INCONNU', enAttente: false });
        return;
      }
      l = { ...l, confirme: true, code: r.code ?? l.code, sale: true };
      await majLien(planId, { confirme: true, code: l.code, sale: true, refus: null });
    }
    if (!l.sale) {
      if (l.enAttente || l.refus) await majLien(planId, { enAttente: false });
      return;
    }
    const plan = await lirePlan(planId);
    if (!plan) return;
    const { data, error } = await withTimeout(sb.rpc('bp_envoyer', charge(plan, l)));
    if (error) throw error;
    const r = data as Reponse;
    if (r?.ok) {
      const changeEntreTemps = (modifications.get(planId) ?? 0) !== vuAvant;
      await majLien(planId, { envoyeLe: new Date().toISOString(), enAttente: false, refus: null, sale: changeEntreTemps });
    } else {
      await majLien(planId, { refus: r?.raison ?? 'INCONNU', enAttente: false });
    }
  } catch {
    // No network, timeout or server unreachable: kept for the next try.
    await majLien(planId, { enAttente: true }).catch(() => undefined);
  } finally {
    enCours.delete(planId);
    if (aRelancer.delete(planId)) planifier(planId, 0);
  }
}

/** Called after every save of a plan (plan.rev increasing). */
export function signalerModification(plan: Plan): void {
  if (plan.exemple) return;
  modifications.set(plan.id, (modifications.get(plan.id) ?? 0) + 1);
  void (async () => {
    const lien = await lireLien(plan.id);
    // Removed by the trainer: never sent again, no request on each keystroke.
    if (!lien || estRetire(lien)) return;
    await majLien(plan.id, enLigne() ? { sale: true } : { sale: true, enAttente: true }).catch(() => undefined);
    planifier(plan.id, DELAI_ENVOI);
  })();
}

function lireRetraits(): { planId: string; jeton: string }[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_RETRAITS) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function ecrireRetraits(liste: { planId: string; jeton: string }[]): void {
  try {
    if (liste.length) localStorage.setItem(CLE_RETRAITS, JSON.stringify(liste));
    else localStorage.removeItem(CLE_RETRAITS);
  } catch {
    // No storage: the withdrawal is tried again only while the page is open.
  }
}

async function retirerSurServeur(planId: string, jeton: string): Promise<boolean> {
  try {
    const sb = await withTimeout(clientParticipant());
    const { error } = await withTimeout(sb.rpc('bp_retirer', { p_plan_id: planId, p_jeton: jeton }));
    return !error;
  } catch {
    return false;
  }
}

async function rejouerRetraits(): Promise<void> {
  const liste = lireRetraits();
  if (!liste.length || !enLigne()) return;
  const restants: { planId: string; jeton: string }[] = [];
  for (const r of liste) if (!(await retirerSurServeur(r.planId, r.jeton))) restants.push(r);
  ecrireRetraits(restants);
}

/** Sends every plan still waiting (joined and dirty, or join asked offline). */
export async function relancer(): Promise<void> {
  await rejouerRetraits();
  let liens: Lien[] = [];
  try {
    liens = await db.liens.toArray();
  } catch {
    return;
  }
  for (const l of liens) if ((l.sale || !l.confirme) && !estRetire(l)) void envoyer(l.planId);
}

let demarre = false;
/** Listeners of the retries; makes no request while no plan joined the training. */
export function demarrerSuivi(): void {
  if (demarre || typeof window === 'undefined') return;
  demarre = true;
  window.addEventListener('online', () => void relancer());
  window.addEventListener('pageshow', () => void relancer());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void relancer();
  });
  window.addEventListener('offline', () => {
    void db.liens
      .toArray()
      .then((liens) => Promise.all(liens.filter((l) => l.sale || !l.confirme).map((l) => majLien(l.planId, { enAttente: true }))))
      .catch(() => undefined);
  });
  void relancer();
}

export type ResultatRejoindre = { statut: 'ok' } | { statut: 'attente' } | { statut: 'refus'; raison: string };

/** Join the training with this plan. Offline (or server unreachable): the request is kept and done when online. */
export async function rejoindre(planId: string, code: string, prenom: string): Promise<ResultatRejoindre> {
  const propre = code.trim().toUpperCase();
  try {
    localStorage.setItem(CLE_CODE, propre);
  } catch {
    // Not kept for next time.
  }
  const lien: Lien = {
    planId,
    code: propre,
    jeton: nouveauJeton(),
    prenom: prenom.trim().slice(0, 80),
    accord: true,
    confirme: false,
    sale: true,
    envoyeLe: null,
    enAttente: !enLigne(),
    refus: null
  };
  if (enLigne()) {
    try {
      const sb = await withTimeout(clientParticipant());
      const { data, error } = await withTimeout(sb.rpc('bp_rejoindre', { p_code: propre }));
      if (error) throw error;
      const r = data as Reponse;
      if (!r?.ok) return { statut: 'refus', raison: r?.raison ?? 'INCONNU' };
      lien.confirme = true;
      lien.code = r.code ?? propre;
    } catch {
      lien.enAttente = true;
    }
  }
  await db.liens.put(lien);
  notifier();
  if (lien.confirme) void envoyer(planId);
  return lien.confirme ? { statut: 'ok' } : { statut: 'attente' };
}

/** Stop sending: the plan is removed from the server (now, or when the network is back) and the link deleted. */
export async function arreterEnvoi(planId: string): Promise<void> {
  const lien = await lireLien(planId);
  const t = minuteries.get(planId);
  if (t !== undefined) window.clearTimeout(t);
  minuteries.delete(planId);
  await db.liens.delete(planId);
  notifier();
  if (!lien) return;
  if (!(enLigne() && (await retirerSurServeur(planId, lien.jeton)))) ecrireRetraits([...lireRetraits(), { planId, jeton: lien.jeton }]);
}

export function codeMemorise(): string {
  try {
    return localStorage.getItem(CLE_CODE) ?? '';
  } catch {
    return '';
  }
}

const RAISONS: Record<string, string> = {
  SESSION_FERMEE: 'session fermée',
  CODE_INCONNU: 'code inconnu',
  JETON: 'projet lié à un autre téléphone',
  TROP_GROS: 'projet trop gros',
  RETIRE: 'projet retiré par le formateur'
};

export function texteRaison(raison: string): string {
  return RAISONS[raison] ?? 'erreur du serveur';
}

function heure(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Text of the status pill of the Sommaire. */
export function texteStatut(lien: Lien): { texte: string; ton: 'ok' | 'attente' | 'refus' } {
  if (lien.refus) return { texte: `Envoi refusé : ${texteRaison(lien.refus)}`, ton: 'refus' };
  if (lien.enAttente || !lien.confirme) return { texte: 'En attente de réseau', ton: 'attente' };
  if (lien.envoyeLe) return { texte: `Envoyé au formateur à ${heure(lien.envoyeLe)}`, ton: 'ok' };
  return { texte: 'Envoi au formateur en cours', ton: 'attente' };
}

/** Link of a plan, kept up to date (undefined while loading, null when not joined). */
export function useLien(planId: string | undefined): Lien | null | undefined {
  const [lien, setLien] = useState<Lien | null | undefined>(undefined);
  useEffect(() => {
    if (!planId) return;
    let vivant = true;
    const lire = () => {
      void lireLien(planId).then((l) => {
        if (vivant) setLien(l);
      });
    };
    lire();
    abonnes.add(lire);
    return () => {
      vivant = false;
      abonnes.delete(lire);
    };
  }, [planId]);
  return lien;
}
