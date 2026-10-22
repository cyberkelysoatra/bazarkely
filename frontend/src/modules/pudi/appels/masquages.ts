// PUDI-CC-09: active maskings of the signed-in account (plain fetch with the stored session, like
// pudi_etat: no supabase-js on the home page). Nothing is kept on the device.
import { jetonLocal, rpcFetch } from './api';

export interface MonMasquage {
  /** Reference « M-XXXXXX ». */
  id: string;
  at: string;
  /** WhatsApp number of the manager whose line caused the masking, when he has one (261341234567). */
  whatsapp: string | null;
  /** Claims deadline = freeze of the lists. */
  gel_listes_at: string;
}

/** Empty when signed out. Throws on a network or server error (the caller keeps its last answer). */
export async function lireMesMasquages(): Promise<MonMasquage[]> {
  const jeton = jetonLocal();
  if (!jeton) return [];
  const r = await rpcFetch('pudi_mes_masquages', jeton);
  if (!r.ok) throw new Error(`pudi_mes_masquages ${r.status}`);
  const liste = (await r.json()) as unknown;
  return Array.isArray(liste) ? (liste as MonMasquage[]) : [];
}

/** First display of the notice: the server keeps the date (vu_at). */
export async function marquerMasquagesVus(): Promise<void> {
  const jeton = jetonLocal();
  if (!jeton) return;
  await rpcFetch('pudi_masquages_vus', jeton);
}
