// Maps server error codes (PUDI_<CODE>) to French messages and to the form field they belong to.
import { fr } from '../i18n/fr';

export type ChampFormulaire = 'fokontany' | 'profil' | 'telephone' | 'resident' | 'choix' | 'general';

export interface ErreurAffichee {
  code: string;
  message: string;
  champ: ChampFormulaire;
}

const CHAMPS: Record<string, ChampFormulaire> = {
  RESIDENCE: 'resident',
  PROFIL: 'profil',
  FOKONTANY: 'fokontany',
  PRIORITES: 'choix',
  URGENTS: 'choix',
  MANQUANT: 'choix',
  NUMERO_INVALIDE: 'telephone',
  NUMERO_DEJA_UTILISE: 'telephone'
};

/** Extracts the PUDi code from an error (message 'PUDI_X', returned {erreur: 'PUDI_X'}, or a code). */
export function extraireCode(e: unknown): string | null {
  const texte =
    typeof e === 'string'
      ? e
      : e && typeof e === 'object'
        ? String((e as { erreur?: unknown }).erreur ?? (e as { message?: unknown }).message ?? '')
        : '';
  const m = /PUDI_([A-Z_]+)/.exec(texte);
  if (m) return m[1];
  if (texte === 'RESEAU' || /timeout|Failed to fetch|NetworkError|network/i.test(texte)) return 'RESEAU';
  return null;
}

export function messageErreur(e: unknown): ErreurAffichee {
  const code = extraireCode(e) ?? 'AUTRE';
  const messages = fr.erreurs as Record<string, string>;
  const message = messages[code] ?? fr.erreurs.AUTRE;
  return { code: messages[code] ? code : 'AUTRE', message, champ: CHAMPS[code] ?? 'general' };
}
