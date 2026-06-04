/**
 * Centre d'alertes (eau_alertes) — génération + notifications + suivi. Offline-first.
 *
 * Génère des alertes à partir des données métier :
 *   - `anomalie`            : un bilan en anomalie non traité (ref = bilan.id).
 *   - `compteur_non_releve` : compteur actif sans relevé depuis `jours_sans_releve_alerte`
 *                             jours (ref = compteur.id, ré-alerte une fois par jour).
 *   - `bassin_critique`     : taux de remplissage du bassin < `bassin_seuil_critique_pct`
 *                             (ref = clé du jour, une alerte/jour).
 *   - `fuite`               : NRW de la période de facturation élevé + pertes > 0
 *                             (heuristique, ref = clé du mois).
 *
 * Idempotence : on ne recrée pas une alerte (même type + même ref) si une instance
 * NON TRAITÉE existe déjà → la génération est rejouable sans empiler de doublons.
 * Les notifications sur l'appareil réutilisent le `notificationService` partagé
 * (type `eau_alert`) — aucun nouveau mécanisme de push.
 */
import { eauDb } from '../db/gestionEauDb';
import { saveLocal, pullTable } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { getConfig, dimensionsFromConfig } from './eauConfigService';
import { computeNRWForPeriod } from './eauBilanService';
import { tauxRemplissage } from '../utils/bassin';
import { computeAlerteCandidates, MS_PER_DAY } from '../utils/alertes';
import notificationService from '../../../services/notificationService';
import { getCurrentUserIdSync } from './eauAuth';
import type {
  AlerteLocal,
  AlerteType,
  BilanLocal,
  CompteurLocal,
  ReleveCompteurLocal,
  ReleveBassinLocal,
} from '../types/gestionEau';

// La logique PURE de déclenchement vit dans utils/alertes.ts (testable sans Dexie/notif).
export { computeAlerteCandidates } from '../utils/alertes';

/**
 * Génère les alertes manquantes (idempotent) et retourne celles RÉELLEMENT créées.
 * Best-effort : ne jette pas pour cause réseau (écriture locale d'abord).
 */
export async function genererAlertes(): Promise<AlerteLocal[]> {
  const config = await getConfig();

  const [compteurs, relevesCompteur, relevesBassin, bilans, existing] = await Promise.all([
    eauDb.eau_compteurs.toArray() as Promise<CompteurLocal[]>,
    eauDb.eau_releves_compteur.toArray() as Promise<ReleveCompteurLocal[]>,
    eauDb.eau_releves_bassin.toArray() as Promise<ReleveBassinLocal[]>,
    eauDb.eau_bilans.toArray() as Promise<BilanLocal[]>,
    eauDb.eau_alertes.toArray() as Promise<AlerteLocal[]>,
  ]);

  const now = Date.now();

  // Dernier relevé (ms) par compteur
  const dernierReleveParCompteur: Record<string, number | undefined> = {};
  for (const r of relevesCompteur) {
    const ms = new Date(r.timestamp).getTime();
    const prev = dernierReleveParCompteur[r.compteur_id];
    if (prev == null || ms > prev) dernierReleveParCompteur[r.compteur_id] = ms;
  }

  // Taux de remplissage du bassin (dernier relevé de niveau)
  const dim = dimensionsFromConfig(config);
  const dernierBassin = relevesBassin
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  let tauxRemplissagePct: number | null = null;
  if (dim && dernierBassin) {
    const ratio = tauxRemplissage(dernierBassin.volume_m3, dim); // [0,1]
    tauxRemplissagePct = ratio * 100;
  }

  // NRW sur la période de facturation
  const periodeJours = config?.periode_facturation_jours ?? 30;
  const nrwAgg = await computeNRWForPeriod(now - periodeJours * MS_PER_DAY, now);

  const candidates = computeAlerteCandidates({
    now,
    joursSansReleveAlerte: config?.jours_sans_releve_alerte ?? null,
    bassinSeuilCritiquePct: config?.bassin_seuil_critique_pct ?? null,
    tauxRemplissagePct,
    compteursActifs: compteurs.filter((c) => c.actif).map((c) => ({ id: c.id, nom: c.nom })),
    dernierReleveParCompteur,
    bilansAnomalieNonTraitee: bilans
      .filter((b) => b.anomalie && !b.traitee)
      .map((b) => ({ id: b.id, ecart_pct: b.ecart_pct })),
    nrwPct: nrwAgg.nrwPct,
    pertesM3: nrwAgg.pertesM3,
  });

  // Déduplication : une alerte (type+ref) NON TRAITÉE existante bloque la recréation.
  const existingKey = new Set(
    existing.filter((a) => !a.traitee).map((a) => `${a.type}|${a.ref_id}`)
  );

  const created: AlerteLocal[] = [];
  for (const c of candidates) {
    const key = `${c.type}|${c.ref_id}`;
    if (existingKey.has(key)) continue;
    const record: AlerteLocal = {
      id: newId(),
      type: c.type,
      ref_id: c.ref_id,
      message: c.message,
      niveau: c.niveau,
      lu: false,
      traitee: false,
      created_at: nowIso(),
    };
    const saved = await saveLocal('eau_alertes', record);
    created.push(saved);
    existingKey.add(key);
  }

  return created;
}

/** Émet une notification sur l'appareil pour chaque nouvelle alerte (best-effort). */
export async function notifyAlertes(alertes: AlerteLocal[]): Promise<void> {
  if (alertes.length === 0) return;
  if (!notificationService.isPermissionGranted()) return;
  const userId = getCurrentUserIdSync() ?? '';
  for (const a of alertes) {
    try {
      await notificationService.showNotification({
        type: 'eau_alert',
        title: titreForType(a.type),
        body: a.message ?? 'Nouvelle alerte eau',
        priority: a.niveau === 'critique' ? 'high' : 'normal',
        userId,
        tag: `eau-${a.type}`,
        clickAction: '/gestion-eau/alertes',
        data: { alerteId: a.id, type: a.type },
      });
    } catch {
      /* best-effort */
    }
  }
}

/** Génère PUIS notifie en une étape (usage standard depuis l'UI admin). */
export async function genererEtNotifier(): Promise<AlerteLocal[]> {
  const created = await genererAlertes();
  await notifyAlertes(created);
  return created;
}

function titreForType(t: AlerteType | null): string {
  switch (t) {
    case 'anomalie':
      return '⚠️ Anomalie de bilan';
    case 'fuite':
      return '🚱 Fuite suspectée';
    case 'compteur_non_releve':
      return '⏰ Compteur non relevé';
    case 'bassin_critique':
      return '🔴 Bassin critique';
    default:
      return 'Alerte eau';
  }
}

/** Liste des alertes, plus récentes d'abord (option : non traitées seulement). */
export async function listAlertes(opts?: { nonTraiteesOnly?: boolean }): Promise<AlerteLocal[]> {
  let all = (await eauDb.eau_alertes.toArray()) as AlerteLocal[];
  if (opts?.nonTraiteesOnly) all = all.filter((a) => !a.traitee);
  return all.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
}

export async function countUnread(): Promise<number> {
  const all = (await eauDb.eau_alertes.toArray()) as AlerteLocal[];
  return all.filter((a) => !a.lu && !a.traitee).length;
}

export async function markAlerteLue(id: string, lu = true): Promise<AlerteLocal | null> {
  const a = (await eauDb.eau_alertes.get(id)) as AlerteLocal | undefined;
  if (!a) return null;
  return saveLocal('eau_alertes', { ...a, lu });
}

export async function markAlerteTraitee(id: string): Promise<AlerteLocal | null> {
  const a = (await eauDb.eau_alertes.get(id)) as AlerteLocal | undefined;
  if (!a) return null;
  return saveLocal('eau_alertes', { ...a, traitee: true, lu: true });
}

/** Marque toutes les alertes affichées comme lues (best-effort). */
export async function markAllLues(): Promise<void> {
  const all = (await eauDb.eau_alertes.toArray()) as AlerteLocal[];
  await Promise.all(all.filter((a) => !a.lu).map((a) => saveLocal('eau_alertes', { ...a, lu: true })));
}

export async function refreshAlertes(online: boolean): Promise<AlerteLocal[]> {
  if (online) await pullTable('eau_alertes');
  return listAlertes();
}
