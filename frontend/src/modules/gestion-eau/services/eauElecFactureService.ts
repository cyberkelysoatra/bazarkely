/**
 * Factures RTB Énergie (ELEC-CC-03). Brouillons : préparés et recalculés hors ligne
 * (calcul `utils/elecFacture.ts`, écriture Dexie `_dirty`, envoi au retour du réseau,
 * identifiants stables par clé : un rejeu ne crée jamais de doublon). Émettre, re-dater,
 * soumettre, avis, clôture, envoi et effacement de l'essai : fonctions serveur seulement
 * (réseau exigé), puis relecture serveur des factures du cycle.
 */
import { eauDb } from '../db/gestionEauDb';
import { deleteLocal, pullTable, pushTable } from './eauSync';
import { supabase, withTimeout } from '../../../lib/supabase';
import { newId, nowIso } from '../utils/id';
import { eauIsOnline } from '../utils/online';
import {
  preparerFacturesCycle,
  type FactureAvecLignes,
  type PreparationCycle,
} from '../utils/elecFacture';
import type {
  ElecClientLocal,
  ElecCompteurLocal,
  ElecFactureLigneLocal,
  ElecFactureLocal,
  ElecReglagesLocal,
  ElecReleveLocal,
  ElecValidationLocal,
} from '../types/gestionEau';

const RPC_TIMEOUT_MS = 10000;

// ───────────────────────────── Lecture locale ─────────────────────────────
export interface DonneesFactures {
  factures: ElecFactureLocal[];
  lignes: Map<string, ElecFactureLigneLocal[]>;
  avis: Map<string, ElecValidationLocal[]>;
}

export async function lireFactures(): Promise<DonneesFactures> {
  const [factures, lignes, avis] = await Promise.all([
    eauDb.eau_elec_factures.toArray() as Promise<ElecFactureLocal[]>,
    eauDb.eau_elec_facture_lignes.toArray() as Promise<ElecFactureLigneLocal[]>,
    eauDb.eau_elec_validations.toArray() as Promise<ElecValidationLocal[]>,
  ]);
  const parFacture = <T extends { facture_id: string }>(list: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of list) {
      const l = m.get(x.facture_id);
      if (l) l.push(x);
      else m.set(x.facture_id, [x]);
    }
    return m;
  };
  return { factures, lignes: parFacture(lignes), avis: parFacture(avis) };
}

export function avecLignes(d: DonneesFactures): FactureAvecLignes[] {
  return d.factures.map((facture) => ({ facture, lignes: d.lignes.get(facture.id) ?? [] }));
}

/** Tire factures, lignes et avis du serveur (après une fonction serveur). */
export async function relireFacturesServeur(): Promise<void> {
  if (!eauIsOnline()) return;
  await pullTable('eau_elec_factures');
  await pullTable('eau_elec_facture_lignes');
  await pullTable('eau_elec_validations');
  await pullTable('eau_elec_reglages');
}

// ───────────────────────────── Brouillons (hors ligne) ─────────────────────────────
/** Identifiant stable d'un brouillon : le même d'un appareil à l'autre pour la même clé. */
export function idBrouillon(cycle: string, cle: string, prisPar: Set<string>): string {
  const id = `fac-${cycle}-${cle}`;
  return prisPar.has(id) ? newId() : id;
}

export interface ResultatPreparation extends PreparationCycle {
  crees: number;
  recalcules: number;
  supprimes: number;
}

/**
 * Crée ou recalcule les brouillons du cycle (idempotent : une facture par clé). Écrit en
 * local d'abord ; en ligne, envoie les factures puis leurs lignes (clé étrangère).
 */
export async function preparerCycle(
  cycle: string,
  clients: ElecClientLocal[],
  compteurs: ElecCompteurLocal[],
  releves: Map<string, ElecReleveLocal[]>,
  reglages: ElecReglagesLocal
): Promise<ResultatPreparation> {
  const donnees = await lireFactures();
  const prep = preparerFacturesCycle(cycle, clients, compteurs, releves, avecLignes(donnees), reglages);
  const pris = new Set(donnees.factures.map((f) => f.id));
  const now = nowIso();
  let crees = 0;
  let recalcules = 0;
  let supprimes = 0;

  for (const p of prep.factures) {
    const ancien = p.brouillon;
    const id = ancien?.id ?? idBrouillon(cycle, p.cle, pris);
    pris.add(id);
    const facture: ElecFactureLocal = {
      ...(ancien ?? {}),
      id,
      client_id: p.client.id,
      bien: p.bien,
      cycle,
      statut: 'brouillon',
      essai: false,
      numero: null,
      numero_seq: null,
      // Une période corrigée à la main sur le brouillon est gardée.
      periode_debut: ancien?.periode_debut ?? p.periodeDebut,
      periode_fin: ancien?.periode_fin ?? p.periodeFin,
      date_emission: null,
      date_echeance: null,
      tarif_kwh: reglages.tarif_kwh,
      forfait_ht: reglages.forfait_ht,
      tva_pct: reglages.tva_pct,
      total_kwh: p.totaux.totalKwh,
      montant_energie: p.totaux.montantEnergie,
      montant_ht: p.totaux.montantHt,
      montant_tva: p.totaux.montantTva,
      montant_ttc: p.totaux.montantTtc,
      client_snapshot: null,
      emetteur_snapshot: null,
      validation_date_limite: null,
      date_envoi: null,
      en_attente_releve: p.attente.length > 0,
      motif_attente: p.attente.length > 0 ? p.attente.join(' ; ') : null,
      note_interne: ancien?.note_interne ?? null,
      cle_regroupement: p.cle,
      created_at: ancien?.created_at ?? now,
      updated_at: now,
      _dirty: true,
    };
    await eauDb.eau_elec_factures.put(facture);
    if (ancien) recalcules++;
    else crees++;

    const anciennes = donnees.lignes.get(id) ?? [];
    const nouvellesIds = new Set<string>();
    for (const l of p.lignes) {
      const lid = `${id}:${l.compteur.id}`;
      nouvellesIds.add(lid);
      const prec = anciennes.find((a) => a.id === lid);
      await eauDb.eau_elec_facture_lignes.put({
        id: lid,
        facture_id: id,
        compteur_id: l.compteur.id,
        code_compteur: l.compteur.code,
        index_debut: l.indexDebut,
        date_index_debut: l.dateIndexDebut,
        index_fin: l.indexFin,
        date_index_fin: l.dateIndexFin,
        releve_fin_id: l.releveFinId,
        kwh: l.kwh,
        montant: l.montant,
        ordre: l.ordre,
        created_at: prec?.created_at ?? now,
        updated_at: now,
        _dirty: true,
      });
    }
    for (const a of anciennes) {
      if (!nouvellesIds.has(a.id)) await deleteLocal('eau_elec_facture_lignes', a.id);
    }
  }
  for (const b of prep.brouillonsObsoletes) {
    await deleteLocal('eau_elec_factures', b.id);
    supprimes++;
  }
  if (eauIsOnline()) await envoyerBrouillons();
  return { ...prep, crees, recalcules, supprimes };
}

/** Envoie les brouillons en attente : factures d'abord, puis lignes. */
export async function envoyerBrouillons(): Promise<void> {
  await pushTable('eau_elec_factures');
  await pushTable('eau_elec_facture_lignes');
}

/** Période corrigée à la main (brouillon seulement). */
export async function modifierPeriode(id: string, debut: string, fin: string): Promise<void> {
  const f = (await eauDb.eau_elec_factures.get(id)) as ElecFactureLocal | undefined;
  if (!f || f.statut !== 'brouillon') return;
  await eauDb.eau_elec_factures.put({ ...f, periode_debut: debut, periode_fin: fin, updated_at: nowIso(), _dirty: true });
  if (eauIsOnline()) await envoyerBrouillons();
}

/** Supprime un brouillon (et ses lignes, en cascade côté serveur). */
export async function supprimerBrouillon(id: string): Promise<void> {
  const f = (await eauDb.eau_elec_factures.get(id)) as ElecFactureLocal | undefined;
  if (!f || f.statut !== 'brouillon') return;
  const lignes = await eauDb.eau_elec_facture_lignes.where('facture_id').equals(id).toArray();
  await eauDb.eau_elec_facture_lignes.bulkDelete(lignes.map((l) => l.id));
  await deleteLocal('eau_elec_factures', id);
}

// ───────────────────────────── Fonctions serveur ─────────────────────────────
export class ErreurServeur extends Error {}

const MESSAGES: Array<[RegExp, string]> = [
  [/en attente de releve/i, 'Facture en attente de relevé : elle ne peut pas être émise.'],
  [/sans ligne/i, 'Facture sans ligne : rien à émettre.'],
  [/Date limite passee/i, 'La date limite ne peut pas être dans le passé.'],
  [/remarque exige un texte/i, 'Écrivez votre remarque.'],
  [/non soumise a validation/i, 'Cette facture n’est pas soumise à validation.'],
  [/Date d.envoi future/i, 'La date d’envoi ne peut pas être dans le futur.'],
  [/Date d.envoi avant/i, 'La date d’envoi est antérieure à l’émission.'],
  [/envoi impossible/i, 'Envoi impossible : la facture doit être validée (ou émise, avec confirmation).'],
  [/re-datation impossible/i, 'Re-datation impossible : facture envoyée ou brouillon.'],
  [/envoyee/i, 'Facture envoyée : elle ne se modifie plus.'],
  [/reservee|reserve|permission denied/i, 'Action réservée à un autre rôle.'],
  [/non brouillon/i, 'Cette facture n’est plus un brouillon.'],
  [/anterieure au compteur/i, 'Année de consommation antérieure au compteur de numéros.'],
];

function messageLisible(msg: string): string {
  for (const [re, txt] of MESSAGES) if (re.test(msg)) return txt;
  return 'Le serveur a refusé l’opération. Réessayez.';
}

async function appelRpc<T>(nom: string, params: Record<string, unknown>): Promise<T> {
  if (!eauIsOnline()) throw new ErreurServeur('Disponible avec le réseau.');
  const { data, error } = (await withTimeout(
    (supabase.rpc as any)(nom, params),
    RPC_TIMEOUT_MS,
    `eau:rpc:${nom}`
  )) as { data: T; error: { message?: string } | null };
  if (error) {
    console.warn(`⚠️ [eauFactures] ${nom} refusé :`, error.message);
    throw new ErreurServeur(messageLisible(error.message ?? ''));
  }
  return data;
}

/** Envoie d'abord les brouillons en attente (la fonction travaille sur la version serveur). */
async function avantRpc(): Promise<void> {
  await envoyerBrouillons();
}

export async function emettreFacture(id: string): Promise<string> {
  await avantRpc();
  try {
    return await appelRpc<string>('eau_elec_emettre_facture', { p_id: id });
  } finally {
    await relireFacturesServeur();
  }
}

export async function emettreCycle(cycle: string): Promise<Array<{ id: string; numero: string }>> {
  await avantRpc();
  try {
    return (await appelRpc<Array<{ id: string; numero: string }>>('eau_elec_emettre_cycle', { p_cycle: cycle })) ?? [];
  } finally {
    await relireFacturesServeur();
  }
}

/** Re-datation : les lignes recalculées (relevé corrigé) remplacent celles de la facture. */
export async function redaterFacture(
  id: string,
  lignes: Array<Pick<ElecFactureLigneLocal, 'id' | 'compteur_id' | 'code_compteur' | 'index_debut' | 'date_index_debut' | 'index_fin' | 'date_index_fin' | 'releve_fin_id' | 'ordre'>> | null
): Promise<string> {
  try {
    const avant = await eauDb.eau_elec_facture_lignes.where('facture_id').equals(id).toArray();
    const jour = await appelRpc<string>('eau_elec_redater_facture', { p_id: id, p_lignes: lignes });
    // Les lignes remplacées disparaissent du serveur : on les retire aussi d'ici.
    if (lignes) {
      const gardees = new Set(lignes.map((l) => l.id));
      await eauDb.eau_elec_facture_lignes.bulkDelete(avant.map((l) => l.id).filter((x) => !gardees.has(x)));
    }
    await eauDb.eau_elec_validations.where('facture_id').equals(id).delete();
    return jour;
  } finally {
    await relireFacturesServeur();
  }
}

export async function soumettreCycle(cycle: string, dateLimite: string): Promise<number> {
  try {
    return await appelRpc<number>('eau_elec_soumettre_cycle', { p_cycle: cycle, p_date_limite: dateLimite });
  } finally {
    await relireFacturesServeur();
  }
}

export async function donnerAvis(factureId: string, avis: 'bon' | 'remarque', texte: string | null): Promise<void> {
  try {
    await appelRpc<void>('eau_elec_donner_avis', { p_facture: factureId, p_avis: avis, p_texte: texte });
  } finally {
    await relireFacturesServeur();
  }
}

export async function repondreRemarque(validationId: string, reponse: string): Promise<void> {
  try {
    await appelRpc<void>('eau_elec_repondre_remarque', { p_validation: validationId, p_reponse: reponse });
  } finally {
    await relireFacturesServeur();
  }
}

export interface ResultatCloture {
  validees: number;
  bloquees: Array<{ id: string; numero: string | null; raison: 'remarque' | 'attente' }>;
}

export async function cloreValidation(cycle: string): Promise<ResultatCloture> {
  try {
    return await appelRpc<ResultatCloture>('eau_elec_clore_validation', { p_cycle: cycle });
  } finally {
    await relireFacturesServeur();
  }
}

export async function marquerEnvoyee(id: string, date: string, sansValidation: boolean): Promise<void> {
  try {
    await appelRpc<void>('eau_elec_marquer_envoyee', { p_id: id, p_date: date, p_sans_validation: sansValidation });
  } finally {
    await relireFacturesServeur();
  }
}

export interface ResultatEffacement {
  effacees: string[];
  compteur_remis: boolean;
  prochain_essai: number;
}

export async function effacerEssai(cycle: string): Promise<ResultatEffacement> {
  try {
    const r = await appelRpc<ResultatEffacement>('eau_elec_effacer_essai', { p_cycle: cycle });
    // Supprimées sur le serveur : retirées d'ici tout de suite (pas d'attente de la réconciliation).
    const ids = r?.effacees ?? [];
    if (ids.length > 0) {
      const lignes = await eauDb.eau_elec_facture_lignes.where('facture_id').anyOf(ids).toArray();
      await eauDb.eau_elec_facture_lignes.bulkDelete(lignes.map((l) => l.id));
      await eauDb.eau_elec_validations.where('facture_id').anyOf(ids).delete();
      await eauDb.eau_elec_factures.bulkDelete(ids);
    }
    return r;
  } finally {
    await relireFacturesServeur();
  }
}
