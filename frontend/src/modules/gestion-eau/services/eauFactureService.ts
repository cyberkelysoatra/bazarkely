/**
 * Facturation (eau_factures) — offline-first.
 * Génère une facture par compteur actif sur une période, numérotée via la séquence
 * eau_config.numero_facture_seq (incrémentée de façon idempotente). Montants en MGA.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { getConfig, saveConfig } from './eauConfigService';
import { listCompteursActifs, listCompteurs } from './eauCompteurService';
import { computeLigneFacture, formatNumeroFacture, filterByCompteurIds, type ReleveLite } from '../utils/facture';
import { fmtDate } from '../utils/format';
import { toCsv } from '../utils/csv';
import type {
  FactureLocal,
  FactureStatut,
  ReleveCompteurLocal,
  CompteurLocal,
  BilanLocal,
} from '../types/gestionEau';

/** Aperçu (lecture seule) d'une ligne de facturation candidate. */
export interface FacturePreview {
  compteur: CompteurLocal;
  indexDebut: number | null;
  indexFin: number | null;
  conso: number | null;
  montant: number | null;
  /** true si une facture existe déjà pour ce compteur sur cette période exacte. */
  dejaFacture: boolean;
  /** Raison de non-facturation (null si facturable). */
  skipRaison: string | null;
}

async function relevesDuCompteur(compteurId: string): Promise<ReleveLite[]> {
  const releves = (await eauDb.eau_releves_compteur
    .where('compteur_id')
    .equals(compteurId)
    .toArray()) as ReleveCompteurLocal[];
  return releves.map((r) => ({ index: r.index, timestamp: r.timestamp, rupture_index: r.rupture_index }));
}

/** A-t-on déjà une facture pour ce compteur sur cette période exacte ? */
async function factureExistante(
  compteurId: string,
  periodeStartIso: string,
  periodeEndIso: string
): Promise<boolean> {
  const all = (await eauDb.eau_factures.where('compteur_id').equals(compteurId).toArray()) as FactureLocal[];
  return all.some((f) => f.periode_start === periodeStartIso && f.periode_end === periodeEndIso);
}

/**
 * Aperçu lecture seule des factures qui seraient générées pour la période.
 * Ne crée rien. Skip si pas de tarif, pas de relevé, ou déjà facturé.
 */
export async function previewFactures(periodeStartIso: string, periodeEndIso: string): Promise<FacturePreview[]> {
  const config = await getConfig();
  const tarif = config?.tarif_m3 ?? 0;
  const compteurs = await listCompteursActifs();
  const startMs = new Date(periodeStartIso).getTime();
  const endMs = new Date(periodeEndIso).getTime();

  const previews: FacturePreview[] = [];
  for (const c of compteurs) {
    const releves = await relevesDuCompteur(c.id);
    const ligne = computeLigneFacture(releves, startMs, endMs, tarif);
    const dejaFacture = await factureExistante(c.id, periodeStartIso, periodeEndIso);

    let skipRaison: string | null = null;
    if (dejaFacture) skipRaison = 'Déjà facturé sur cette période';
    else if (!ligne) skipRaison = 'Aucun relevé exploitable sur la période';

    previews.push({
      compteur: c,
      indexDebut: ligne?.indexDebut ?? null,
      indexFin: ligne?.indexFin ?? null,
      conso: ligne?.conso ?? null,
      montant: ligne?.montant ?? null,
      dejaFacture,
      skipRaison,
    });
  }
  return previews;
}

/**
 * Génère et persiste les factures pour la période (uniquement les compteurs facturables
 * non encore facturés). Numérotation séquentielle via eau_config. Retourne les factures créées.
 */
export async function genererFactures(
  periodeStartIso: string,
  periodeEndIso: string,
  opts?: { dateEcheanceIso?: string }
): Promise<FactureLocal[]> {
  const config = await getConfig();
  if (!config) return [];
  const tarif = config.tarif_m3 ?? 0;
  const devise = config.devise || 'MGA';
  const startMs = new Date(periodeStartIso).getTime();
  const endMs = new Date(periodeEndIso).getTime();

  // Échéance par défaut : fin de période + 15 jours
  const echeanceIso = opts?.dateEcheanceIso ?? new Date(endMs + 15 * 24 * 3600 * 1000).toISOString();

  const compteurs = await listCompteursActifs();
  let seq = config.numero_facture_seq ?? 0;
  const created: FactureLocal[] = [];

  for (const c of compteurs) {
    if (await factureExistante(c.id, periodeStartIso, periodeEndIso)) continue;
    const releves = await relevesDuCompteur(c.id);
    const ligne = computeLigneFacture(releves, startMs, endMs, tarif);
    if (!ligne) continue; // pas de relevé exploitable → pas de facture erronée

    seq += 1;
    const facture: FactureLocal = {
      id: newId(),
      numero: formatNumeroFacture(seq),
      compteur_id: c.id,
      periode_start: periodeStartIso,
      periode_end: periodeEndIso,
      index_debut: ligne.indexDebut,
      index_fin: ligne.indexFin,
      conso_m3: ligne.conso,
      tarif,
      montant: ligne.montant,
      devise,
      statut: 'impaye',
      date_echeance: echeanceIso,
      paye_at: null,
      relance_count: 0,
      generated_at: nowIso(),
    };
    created.push(await saveLocal('eau_factures', facture));
  }

  // Persiste la nouvelle valeur de séquence (idempotent : ne régénère pas les factures existantes).
  if (created.length > 0) {
    await saveConfig({ numero_facture_seq: seq });
    void import('./eauAuditService')
      .then((m) =>
        m.logAudit({
          action: 'factures_generees',
          entite: 'eau_factures',
          details: { nb: created.length, periode_start: periodeStartIso, periode_end: periodeEndIso },
        })
      )
      .catch(() => {});
  }
  return created;
}

export async function listFactures(opts?: { statut?: FactureStatut }): Promise<FactureLocal[]> {
  let all = (await eauDb.eau_factures.toArray()) as FactureLocal[];
  if (opts?.statut) all = all.filter((f) => f.statut === opts.statut);
  return all.sort((a, b) => (b.numero ?? '').localeCompare(a.numero ?? ''));
}

/** Factures d'un ensemble de compteurs (espace client). */
export async function getFacturesForCompteurs(compteurIds: string[]): Promise<FactureLocal[]> {
  if (compteurIds.length === 0) return [];
  const all = (await eauDb.eau_factures.toArray()) as FactureLocal[];
  return filterByCompteurIds(all, compteurIds).sort((a, b) =>
    (b.numero ?? '').localeCompare(a.numero ?? '')
  );
}

export async function getFacture(id: string): Promise<FactureLocal | null> {
  return ((await eauDb.eau_factures.get(id)) as FactureLocal | undefined) ?? null;
}

/** Bascule / fixe le statut payé / impayé (renseigne paye_at). */
export async function setStatutFacture(id: string, statut: FactureStatut): Promise<FactureLocal | null> {
  const f = await getFacture(id);
  if (!f) return null;
  const merged: FactureLocal = {
    ...f,
    statut,
    paye_at: statut === 'paye' ? f.paye_at ?? nowIso() : null,
  };
  return saveLocal('eau_factures', merged);
}

/** Incrémente le compteur de relances d'une facture impayée. */
export async function relancerFacture(id: string): Promise<FactureLocal | null> {
  const f = await getFacture(id);
  if (!f) return null;
  const merged: FactureLocal = { ...f, relance_count: (f.relance_count ?? 0) + 1 };
  return saveLocal('eau_factures', merged);
}

export async function deleteFacture(id: string): Promise<void> {
  await deleteLocal('eau_factures', id);
}

export async function refreshFactures(online: boolean): Promise<FactureLocal[]> {
  if (online) await pullTable('eau_factures');
  return listFactures();
}

/**
 * Export CSV global : relevés compteur + bilans + factures, dans un seul fichier
 * structuré par section (chaque ligne porte une colonne `_table`).
 */
export async function buildExportCsv(): Promise<string> {
  const [factures, releves, bilans, compteurs] = await Promise.all([
    eauDb.eau_factures.toArray() as Promise<FactureLocal[]>,
    eauDb.eau_releves_compteur.toArray() as Promise<ReleveCompteurLocal[]>,
    eauDb.eau_bilans.toArray() as Promise<BilanLocal[]>,
    listCompteurs(),
  ]);
  const nomCompteur = new Map(compteurs.map((c) => [c.id, c.nom]));

  const rows: Record<string, unknown>[] = [];

  for (const f of factures) {
    rows.push({
      _table: 'facture',
      numero: f.numero,
      compteur: f.compteur_id ? nomCompteur.get(f.compteur_id) ?? f.compteur_id : '',
      periode_debut: fmtDate(f.periode_start),
      periode_fin: fmtDate(f.periode_end),
      index_debut: f.index_debut,
      index_fin: f.index_fin,
      conso_m3: f.conso_m3,
      montant: f.montant,
      devise: f.devise,
      statut: f.statut,
      relances: f.relance_count,
    });
  }
  for (const r of releves) {
    rows.push({
      _table: 'releve_compteur',
      compteur: nomCompteur.get(r.compteur_id) ?? r.compteur_id,
      index: r.index,
      date: fmtDate(r.timestamp),
      rupture: r.rupture_index ? 'oui' : '',
      aberrant: r.aberrant_confirme ? 'oui' : '',
    });
  }
  for (const b of bilans) {
    rows.push({
      _table: 'bilan',
      date: fmtDate(b.timestamp),
      entrees_m3: b.entrees_m3,
      conso_m3: b.conso_m3,
      stock_attendu: b.stock_attendu,
      stock_mesure: b.stock_mesure,
      ecart_m3: b.ecart_m3,
      ecart_pct: b.ecart_pct,
      anomalie: b.anomalie ? 'oui' : '',
      traitee: b.traitee ? 'oui' : '',
    });
  }

  const columns = [
    '_table', 'numero', 'compteur', 'periode_debut', 'periode_fin', 'index_debut', 'index_fin',
    'index', 'date', 'conso_m3', 'entrees_m3', 'stock_attendu', 'stock_mesure', 'ecart_m3',
    'ecart_pct', 'montant', 'devise', 'statut', 'relances', 'rupture', 'aberrant', 'anomalie', 'traitee',
  ];
  return toCsv(rows, columns);
}
