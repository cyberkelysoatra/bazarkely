/**
 * Génération d'images QR (export JPEG) + page d'étiquettes imprimable.
 * Utilise la lib gratuite `qrcode`. Export en JPEG (exigence Phase 3 — pas de PDF pour les QR).
 */
import QRCode from 'qrcode';

export interface QrLabel {
  /** Contenu encodé (URL de scan). */
  text: string;
  /** Titre de l'étiquette (ex. nom du compteur). */
  titre: string;
  /** Sous-titre (ex. emplacement du QR, ou code). */
  sousTitre?: string;
}

const JPEG_OPTS = {
  type: 'image/jpeg' as const,
  margin: 2,
  width: 512,
  // Fond blanc + modules noirs → contraste maximal pour impression / scan.
  color: { dark: '#000000', light: '#ffffff' },
  errorCorrectionLevel: 'M' as const,
};

/** Retourne une data URL JPEG du QR encodant `text`. */
export async function qrToJpegDataUrl(text: string, width = 512): Promise<string> {
  return QRCode.toDataURL(text, { ...JPEG_OPTS, width });
}

/** Déclenche le téléchargement d'un QR au format JPEG. */
export async function downloadQrJpeg(text: string, filename: string): Promise<void> {
  const dataUrl = await qrToJpegDataUrl(text);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Nettoie un libellé pour en faire un nom de fichier sûr. */
export function safeFileName(raw: string): string {
  return (raw || 'qr')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // retire les diacritiques combinants
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60) || 'qr';
}

/**
 * Ouvre une page HTML imprimable contenant la grille d'étiquettes (QR + libellés).
 * Chaque QR est rendu en data URL puis injecté ; la page lance l'impression auto.
 */
export async function printQrLabels(labels: QrLabel[], titrePage = 'Étiquettes QR — AHUVI Eau'): Promise<void> {
  if (labels.length === 0) return;
  const withImages = await Promise.all(
    labels.map(async (l) => ({ ...l, dataUrl: await qrToJpegDataUrl(l.text, 320) }))
  );

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Impossible d’ouvrir la fenêtre d’impression (popups bloqués ?)');
  }

  const cells = withImages
    .map(
      (l) => `
      <div class="label">
        <img src="${l.dataUrl}" alt="QR ${escapeHtml(l.titre)}" />
        <div class="titre">${escapeHtml(l.titre)}</div>
        ${l.sousTitre ? `<div class="sous">${escapeHtml(l.sousTitre)}</div>` : ''}
      </div>`
    )
    .join('');

  win.document.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<title>${escapeHtml(titrePage)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Poppins', system-ui, sans-serif; margin: 16px; color: #1f2937; }
  h1 { font-size: 16px; color: #364E30; margin: 0 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .label { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; text-align: center; page-break-inside: avoid; }
  .label img { width: 100%; max-width: 200px; height: auto; }
  .titre { font-weight: 600; font-size: 13px; margin-top: 6px; }
  .sous { font-size: 11px; color: #6b7280; margin-top: 2px; word-break: break-word; }
  @media print { body { margin: 8mm; } .no-print { display: none; } }
</style></head>
<body>
  <h1>${escapeHtml(titrePage)}</h1>
  <div class="grid">${cells}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body></html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
