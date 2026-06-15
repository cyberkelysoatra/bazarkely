/**
 * Import du répertoire téléphone (Contact Picker API) → lot d'invitations WhatsApp (ÉVO 3).
 *
 * Logique PURE et testable du mapping des contacts bruts renvoyés par
 * `navigator.contacts.select(['name','tel','email'], { multiple: true })` vers des lignes
 * d'invitation exploitables. Aucun I/O, aucun accès `navigator`/`window` ici (la détection
 * de support et l'ouverture du sélecteur restent dans le composant, sur geste utilisateur).
 *
 * Réutilise `normalizeWhatsappNumber` du service d'invitation (lecture seule) uniquement
 * pour DÉTECTER si un contact a un numéro exploitable. Le numéro affiché/édité reste la
 * valeur brute lisible du répertoire ; la normalisation finale est faite par
 * `createWhatsappInvitation` au moment de la création.
 */
import { normalizeWhatsappNumber } from '../services/eauInvitationService';

/** Contact brut renvoyé par la Contact Picker API (champs tableaux, tous optionnels). */
export interface RawWebContact {
  name?: string[];
  tel?: string[];
  email?: string[];
}

/** Ligne d'invitation issue d'un contact (éditable avant création du lot). */
export interface ImportedContact {
  /** Identifiant stable de la ligne (clé React) — survit aux suppressions au milieu du lot. */
  _id: string;
  nom: string;
  /** Numéro brut, lisible et éditable (normalisé à la création par le service). */
  phone: string;
  email: string | null;
}

/** Compteur monotone → garantit l'unicité du `_id` même si `crypto.randomUUID` est absent
 *  ou renvoie une valeur constante (ex. environnement de test mocké). */
let rowCounter = 0;

/** Identifiant stable et unique pour une ligne importée (clé React). */
function newRowId(): string {
  rowCounter += 1;
  const c = typeof crypto !== 'undefined' ? (crypto as any) : undefined;
  const rand = c?.randomUUID ? c.randomUUID() : Math.random().toString(36).slice(2);
  return `row-${rowCounter}-${rand}`;
}

export interface ContactImportResult {
  contacts: ImportedContact[];
  /** Nombre de contacts écartés faute de numéro exploitable. */
  ignored: number;
}

/**
 * Mappe les contacts bruts en lignes d'invitation, en écartant ceux sans numéro
 * exploitable (et en les comptant). Tolère `null`/`undefined` (annulation) → lot vide.
 */
export function mapImportedContacts(raw: RawWebContact[] | null | undefined): ContactImportResult {
  let ignored = 0;
  const contacts: ImportedContact[] = [];
  for (const c of raw ?? []) {
    const phone = (c?.tel?.[0] ?? '').trim();
    // Pas de chiffre exploitable → contact ignoré (mais compté).
    if (!normalizeWhatsappNumber(phone)) {
      ignored++;
      continue;
    }
    contacts.push({
      _id: newRowId(),
      nom: (c?.name?.[0] ?? '').trim(),
      phone,
      email: (c?.email?.[0] ?? '').trim() || null,
    });
  }
  return { contacts, ignored };
}
