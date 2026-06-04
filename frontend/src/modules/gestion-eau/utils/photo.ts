/**
 * Capture/compression d'une photo de relevé (terrain).
 *
 * Stockée en data URL JPEG compressée DIRECTEMENT dans `photo_url` (offline-first :
 * la valeur part en file `_dirty` via le sync habituel, aucun bucket externe requis).
 * Compression agressive (largeur max + qualité) pour rester léger sur réseau instable.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0..1
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.6,
};

/** Charge un fichier image et le réduit en data URL JPEG compressée. */
export async function compressImageFile(file: File, opts?: CompressOptions): Promise<string> {
  const o = { ...DEFAULTS, ...opts };
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const ratio = Math.min(o.maxWidth / width, o.maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl; // repli : data URL brute
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', o.quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}

/** Taille approximative (Ko) d'une data URL — pour informer l'utilisateur. */
export function dataUrlSizeKo(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.round((b64.length * 0.75) / 1024);
}
