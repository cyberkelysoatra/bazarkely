// PUDI-CC-11: pure rules of JOEL's role preview (« Voir comme ») and of the results on return.
// The preview is a display layer only: the server rights never change.
import type { EtatConsultation } from '../appels/api';
import type { MonMasquage } from '../appels/masquages';

export const EMAIL_JOEL = 'joelsoatra@gmail.com';

export type Apercu =
  | { role: 'votant'; masque: boolean; voteFictif: boolean }
  | { role: 'responsable'; canal: string; nom: string };

/** Only JOEL gets the preview: administrator on the server AND signed in with his address. */
export function peutApercu(etat: EtatConsultation | null, email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === EMAIL_JOEL && (etat === null || etat.est_admin);
}

/** State the screens see: a voter who has not voted yet, or a group manager without admin rights. */
export function etatEffectif(etat: EtatConsultation | null, apercu: Apercu | null): EtatConsultation | null {
  if (!etat || !apercu) return etat;
  if (apercu.role === 'votant') return { ...etat, a_vote: apercu.voteFictif, est_admin: false, est_responsable: false };
  return { ...etat, est_admin: false, est_responsable: true };
}

/** Fake masking shown by « Voir aussi : vote masqué » (links shown but disabled). */
export const REFERENCE_APERCU = 'M-APERCU';
/** Freeze of the lists (pudi_settings.gel_listes_at), Tuesday 27/10/2026 18:00 Madagascar. */
export const GEL_LISTES_APERCU = '2026-10-27T18:00:00+03:00';
export function masquageApercu(gelListesAt: string = GEL_LISTES_APERCU): MonMasquage {
  return { id: REFERENCE_APERCU, at: new Date().toISOString(), whatsapp: '261340000000', gel_listes_at: gelListesAt };
}

/**
 * Results on return: a signed-in person who already voted (vote not masked) and opens the home
 * address in a new visit goes to « Résultats ». Anything unknown keeps the home page.
 */
export function doitAllerAuxResultats(p: {
  /** The visit started at the home address and nothing was navigated since. */
  entreeAccueil: boolean;
  etat: EtatConsultation | null;
  masquagesLus: boolean;
  nbMasquages: number;
  apercu: boolean;
}): boolean {
  const { etat } = p;
  if (!p.entreeAccueil || p.apercu || !etat) return false;
  if (!etat.connecte || !etat.a_vote || etat.clos) return false;
  return p.masquagesLus && p.nbMasquages === 0;
}

export type EtapeParcours = 'visite' | 'fiche' | 'choix_commence' | 'choix_complet' | 'envoyer' | 'connecte' | 'vote';
export const ETAPES_PARCOURS: EtapeParcours[] = ['visite', 'fiche', 'choix_commence', 'choix_complet', 'envoyer', 'connecte', 'vote'];

/** Steps reached by a draft of the choice. */
export function etapesDuChoix(nbPriorites: number): EtapeParcours[] {
  if (nbPriorites >= 3) return ['choix_commence', 'choix_complet'];
  if (nbPriorites >= 1) return ['choix_commence'];
  return [];
}

/** Funnel line: count and share of the visits (rounded, 0 when there is no visit). */
export function pctVisites(n: number, visites: number): number {
  return visites > 0 ? Math.round((100 * n) / visites) : 0;
}
