/**
 * Génération CSV (logique PURE) + déclenchement de téléchargement (effet de bord).
 * Format compatible Excel/LibreOffice FR : séparateur ';', échappement RFC4180,
 * BOM UTF-8 pour les accents.
 */

/** Échappe une valeur de cellule CSV (guillemets si séparateur/retour/quote présent). */
export function escapeCsvCell(value: unknown, separator = ';'): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(separator) || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convertit un tableau d'objets en CSV. Les colonnes sont l'union ordonnée des clés
 * (ou `columns` si fourni). Renvoie l'en-tête + les lignes (sans BOM).
 */
export function toCsv(
  rows: Record<string, unknown>[],
  columns?: string[],
  separator = ';'
): string {
  const cols =
    columns ??
    Array.from(rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()));
  const header = cols.map((c) => escapeCsvCell(c, separator)).join(separator);
  const lines = rows.map((r) => cols.map((c) => escapeCsvCell(r[c], separator)).join(separator));
  return [header, ...lines].join('\r\n');
}

/** Déclenche le téléchargement d'un CSV (ajoute un BOM UTF-8). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/** Déclenche le téléchargement d'un Blob (helper générique). */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
