// PUDI-CC-09: notice to the person whose vote was masked automatically (a more recent vote of the
// same person was kept), and the two ways to claim: e-mail to the GIHTNB (always) and WhatsApp to
// the manager whose line caused the masking (only when the server gives his number).
import { fr } from '../i18n/fr';

export const EMAIL_GIHTNB = 'info.gihtnb@gmail.com';

const MADA_OFFSET_MS = 3 * 3600 * 1000;

/** "mardi 27/10/2026 à 18 h" (Madagascar time). */
export function dateGel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + MADA_OFFSET_MS);
  const jj = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const heure = m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  return `${fr.temps.jours[d.getUTCDay()]} ${jj}/${mm}/${d.getUTCFullYear()} à ${heure}`;
}

/** Claims stay open until the freeze of the lists (server time, corrected with the offset). */
export function reclamationsOuvertes(gelIso: string, maintenantMs: number): boolean {
  const gel = Date.parse(gelIso);
  return !Number.isFinite(gel) || maintenantMs < gel;
}

/** mailto: to the GIHTNB with the reference and the Gmail address of the session (never a phone number). */
export function lienCourrielMasquage(reference: string, email: string): string {
  const sujet = `Réclamation PUDi, masquage ${reference}`;
  const corps = `Bonjour, mon vote a été masqué (référence ${reference}). Il s'agit d'une erreur : ... Adresse Gmail de mon compte de vote : ${email}. Merci.`;
  return `mailto:${EMAIL_GIHTNB}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
}

/** wa.me link to the manager (number already normalised by the server: 261341234567). */
export function lienWhatsAppMasquage(numero: string, reference: string): string {
  const texte = `Bonjour, mon vote PUDi a été masqué (référence ${reference}) à cause de la liste du groupe. Pouvez-vous vérifier la ligne ? Merci.`;
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texte)}`;
}

/** Ids of the restorations not seen yet on this device: the most recent restored maskings beyond `dejaVus`. */
export function retablissementsNouveaux(liste: { id: string; retabli_at: string | null }[], dejaVus: number): Set<string> {
  const retablis = liste
    .filter((m) => m.retabli_at)
    .sort((a, b) => Date.parse(b.retabli_at!) - Date.parse(a.retabli_at!));
  return new Set(retablis.slice(0, Math.max(0, retablis.length - dejaVus)).map((m) => m.id));
}
