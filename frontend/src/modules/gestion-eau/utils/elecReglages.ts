/**
 * Contrôles PURS des réglages RTB Énergie (ELEC-CC-02) et forme du numéro de facture.
 * Aucune valeur d'identité ni bancaire n'est connue du code : seuls les formats le sont.
 */

/** NIF, STAT : chiffres seulement, espaces tolérés. Vide = accepté (champ facultatif). */
export function chiffresValides(v: string): boolean {
  const s = v.replace(/\s+/g, '');
  return s === '' || /^\d+$/.test(s);
}

/** Longueur d'un IBAN de Madagascar (MG + 2 chiffres de contrôle + 23 caractères). */
export const IBAN_MG_LONGUEUR = 27;

/** IBAN au format MG, espaces tolérés, longueur vérifiée. Vide = accepté. */
export function ibanValide(v: string): boolean {
  const s = v.replace(/\s+/g, '').toUpperCase();
  if (s === '') return true;
  return /^MG\d{2}[0-9A-Z]+$/.test(s) && s.length === IBAN_MG_LONGUEUR;
}

/** BIC : 8 ou 11 caractères (4 lettres banque, 2 lettres pays, 2 de lieu, 3 facultatifs). Vide = accepté. */
export function bicValide(v: string): boolean {
  const s = v.replace(/\s+/g, '').toUpperCase();
  if (s === '') return true;
  return /^[A-Z]{6}[0-9A-Z]{2}([0-9A-Z]{3})?$/.test(s);
}

export function emailValide(v: string): boolean {
  const s = v.trim();
  return s === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Groupe un IBAN par 4 caractères pour l'affichage. */
export function formaterIban(v: string): string {
  return v.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
}

/** Numéro officiel `FAC-AAAA-MM-NNN` (MM = mois de consommation facturé). */
export function numeroFacture(annee: number, mois: number, numero: number): string {
  return `FAC-${annee}-${String(mois).padStart(2, '0')}-${String(numero).padStart(3, '0')}`;
}

export interface ErreursReglages {
  [champ: string]: string;
}

/** Contrôle complet du formulaire (valeurs saisies sous forme de texte). */
export function controlerReglages(f: Record<string, string>): ErreursReglages {
  const e: ErreursReglages = {};
  if (!chiffresValides(f.nif ?? '')) e.nif = 'Le NIF ne contient que des chiffres';
  if (!chiffresValides(f.stat ?? '')) e.stat = 'Le STAT ne contient que des chiffres';
  if (!ibanValide(f.iban ?? '')) e.iban = `IBAN invalide : MG suivi de ${IBAN_MG_LONGUEUR - 2} caractères`;
  if (!bicValide(f.bic ?? '')) e.bic = 'BIC invalide : 8 ou 11 caractères';
  if (!emailValide(f.email ?? '')) e.email = 'Adresse e-mail invalide';
  const positif = (k: string, libelle: string, entier = false) => {
    const raw = (f[k] ?? '').trim().replace(',', '.');
    const n = Number(raw);
    if (raw === '' || !Number.isFinite(n) || n < 0 || (entier && !Number.isInteger(n))) {
      e[k] = `${libelle} : nombre positif attendu`;
    }
  };
  positif('tarif_kwh', 'Tarif');
  positif('forfait_ht', 'Forfait');
  positif('echeance_jours', 'Échéance', true);
  positif('numero_annee', 'Année', true);
  positif('numero_prochain', 'Prochain numéro', true);
  const tva = Number((f.tva_pct ?? '').trim().replace(',', '.'));
  if ((f.tva_pct ?? '').trim() === '' || !Number.isFinite(tva) || tva < 0 || tva > 100) {
    e.tva_pct = 'TVA entre 0 et 100 %';
  }
  if ((f.puissance_kwc ?? '').trim() !== '') {
    const p = Number(f.puissance_kwc.trim().replace(',', '.'));
    if (!Number.isFinite(p) || p < 0) e.puissance_kwc = 'Puissance : nombre positif attendu';
  }
  return e;
}
