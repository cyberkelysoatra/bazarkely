/**
 * receiptImage — pré-traitement LÉGER d'une photo de ticket avant OCR.
 *
 * Objectif : accélérer et fiabiliser Tesseract (Phase 1) sans rien stocker.
 *  - downscale à ~1500 px max sur le plus grand côté (l'OCR n'a pas besoin de plus),
 *  - conversion en niveaux de gris + léger renforcement de contraste.
 *
 * L'image est traitée EN MÉMOIRE (Canvas) puis le Blob source est libéré par l'appelant.
 * Aucune image n'est persistée (ni en base, ni en Dexie).
 */

const MAX_DIMENSION = 1500;

/**
 * Charge un fichier image en HTMLImageElement (via Object URL, révoqué après chargement).
 */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Pré-traite une image de ticket : downscale + niveaux de gris + contraste.
 * @returns Blob JPEG prêt pour l'OCR (qualité 0.9). En cas d'échec Canvas, renvoie le Blob source.
 */
export async function preprocessReceiptImage(file: Blob): Promise<Blob> {
  try {
    const img = await loadImage(file);
    const { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Niveaux de gris + léger renforcement de contraste autour de 128.
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imageData.data;
    const contrast = 1.15;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let v = (gray - 128) * contrast + 128;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    return blob || file;
  } catch {
    // Pré-traitement non bloquant : en cas d'erreur, l'OCR utilisera l'image d'origine.
    return file;
  }
}
