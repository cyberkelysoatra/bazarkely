// Publication of a draft followed by the WhatsApp follow-up message (VC-38, VALIDCLIENT-CC-13 gaps 3 and 4).
// One flow for the client detail and the questionnaire page. Nothing is decided on the client side:
// the server (vc_admin_publier) publishes and sets the previous version to « Disponible »; the screen
// only re-reads it after a success. The message is built only once the server said yes.
import { adresseWhatsApp, messageSuite } from './regles';

export interface Destinataire {
  nomCourt: string;
  civilite: string;
  nom: string;
  /** WhatsApp number as stored (any format); empty or null when missing. */
  numero: string | null | undefined;
  type?: string | null;
}

export type IssuePublication =
  | { ok: true; message: string | null; adresse: string | null }
  | { ok: false; code: string | null; reseau: boolean };

/**
 * Publishes `id` with `publier`, then (success only) re-reads with `relire` and builds the follow-up:
 * `message` when a recipient is given, `adresse` (wa.me) when that recipient has a number.
 * Failure or network error: no re-read, no message, nothing changed on the screen.
 */
export async function publierPuisSuite(p: {
  id: string;
  publier: (id: string) => Promise<{ ok: boolean; code?: string }>;
  relire?: () => void;
  destinataire: Destinataire | null;
}): Promise<IssuePublication> {
  let r: { ok: boolean; code?: string };
  try {
    r = await p.publier(p.id);
  } catch {
    return { ok: false, code: null, reseau: true };
  }
  if (!r?.ok) return { ok: false, code: r?.code ?? null, reseau: false };
  p.relire?.();
  const d = p.destinataire;
  if (!d) return { ok: true, message: null, adresse: null };
  const message = messageSuite({ nomCourt: d.nomCourt, civilite: d.civilite, nom: d.nom, type: d.type });
  const chiffres = (d.numero ?? '').replace(/\D/g, '');
  return { ok: true, message, adresse: chiffres ? adresseWhatsApp(chiffres, message) : null };
}
