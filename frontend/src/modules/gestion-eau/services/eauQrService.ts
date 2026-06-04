/**
 * QR des compteurs (eau_qr_compteur) — offline-first.
 *
 * Un compteur peut porter PLUSIEURS QR (un par emplacement physique : entrée, regard,
 * local technique…). Chaque QR a un `code` unique (encodé dans l'image) et un `emplacement`
 * (libellé lisible). Le QR encode `…/gestion-eau/scan?t=c&k=<code>` (cf. utils/scanUrl).
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal, deleteLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { genCode } from '../utils/codes';
import type { QrCompteurLocal } from '../types/gestionEau';

/** Code QR compteur (lisible, peu de risque de collision). */
function genCodeQrCompteur(): string {
  return `CPT-${genCode(4)}-${genCode(4)}`;
}

/** Génère un code QR compteur non encore utilisé localement. */
async function genUniqueQrCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = genCodeQrCompteur();
    const exists = await eauDb.eau_qr_compteur.where('code').equals(code).first();
    if (!exists) return code;
  }
  return genCodeQrCompteur() + genCode(4);
}

/** Liste les QR d'un compteur (du plus ancien au plus récent). */
export async function listQrForCompteur(compteurId: string): Promise<QrCompteurLocal[]> {
  const all = (await eauDb.eau_qr_compteur
    .where('compteur_id')
    .equals(compteurId)
    .toArray()) as QrCompteurLocal[];
  return all
    .filter((q) => q.actif !== false)
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
}

/** Tous les QR compteur (pour la résolution de scan). */
export async function getQrByCode(code: string): Promise<QrCompteurLocal | null> {
  const found = await eauDb.eau_qr_compteur.where('code').equals(code).first();
  return (found as QrCompteurLocal | undefined) ?? null;
}

/** Crée un QR pour un compteur avec un libellé d'emplacement. */
export async function createQrCompteur(
  compteurId: string,
  emplacement: string | null
): Promise<QrCompteurLocal> {
  const record: QrCompteurLocal = {
    id: newId(),
    compteur_id: compteurId,
    emplacement: emplacement && emplacement.trim() ? emplacement.trim() : null,
    code: await genUniqueQrCode(),
    actif: true,
    created_at: nowIso(),
  };
  return saveLocal('eau_qr_compteur', record);
}

/** Met à jour le libellé d'emplacement d'un QR. */
export async function updateQrEmplacement(id: string, emplacement: string | null): Promise<void> {
  const current = (await eauDb.eau_qr_compteur.get(id)) as QrCompteurLocal | undefined;
  if (!current) return;
  await saveLocal('eau_qr_compteur', {
    ...current,
    emplacement: emplacement && emplacement.trim() ? emplacement.trim() : null,
  });
}

export async function deleteQrCompteur(id: string): Promise<void> {
  await deleteLocal('eau_qr_compteur', id);
}

export async function refreshQr(online: boolean): Promise<void> {
  if (online) await pullTable('eau_qr_compteur');
}
