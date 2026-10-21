// Pure helpers of the channel administration: code suggestion from a name, reading a list of
// phone numbers (CSV file or pasted column). The numbers are only counted here; they leave the
// device once, to pudi_admin_importer_liste, and are never stored or logged.
import { normaliserTelephone } from './regles';

/** "Réunion PIC3 du 20/10" → "reunion-pic3-du-20-10" (lowercase, no accents, hyphens, 24 max). */
export function suggererCode(nom: string): string {
  return (nom ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/g, '');
}

/** Splits one CSV line on `sep`, honouring double quotes. */
function cellules(ligne: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let guillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (guillemets) {
      if (c === '"' && ligne[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') guillemets = false;
      else cur += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase().trim();
}

/**
 * Numbers of a CSV text: column `numero` (any case, accents ignored) when the first line is a
 * header, else the first column. Separator `;` or `,` (the one of the first line), BOM tolerated,
 * other columns ignored. A first line without any digit counts as a header and is skipped.
 */
export function lireCsvNumeros(texte: string): string[] {
  const lignes = (texte ?? '').replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (!lignes.length) return [];
  const premiere = lignes[0];
  const sep = premiere.includes(';') ? ';' : premiere.includes(',') ? ',' : premiere.includes('\t') ? '\t' : ';';
  const entete = cellules(premiere, sep).map(sansAccents);
  let col = entete.findIndex((c) => c === 'numero' || c === 'numeros');
  let debut = 0;
  if (col >= 0) debut = 1;
  else {
    col = 0;
    if (!/\d/.test(premiere)) debut = 1;
  }
  return lignes
    .slice(debut)
    .map((l) => cellules(l, sep)[col] ?? '')
    .filter((n) => n !== '');
}

/** Pasted box: one number per line (an Excel column pastes as one value per line). */
export function lireCollage(texte: string): string[] {
  return (texte ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .map((l) => l.split('\t')[0].trim())
    .filter((l) => l !== '');
}

export interface Apercu {
  total: number;
  invalides: number;
  valides: number;
  /** Distinct valid numbers once normalised (duplicates of the file are counted once by the server). */
  distincts: number;
}

/** Local preview with the server normalisation rules (pudi_normaliser_numero mirror). */
export function apercuNumeros(numeros: readonly string[]): Apercu {
  const normalises = numeros.map((n) => normaliserTelephone(n));
  const valides = normalises.filter((n): n is string => n !== null);
  return {
    total: numeros.length,
    invalides: numeros.length - valides.length,
    valides: valides.length,
    distincts: new Set(valides).size
  };
}
