/**
 * Photo compression on the phone before upload (phase 1A): long side ≈ 1600 px,
 * JPEG quality ≈ 0.7. Keeps identity documents readable while staying light on a
 * slow mobile connection.
 */
export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.7;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}

/** Target size keeping the ratio, long side capped at `max`. */
export function scaledSize(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= max || long === 0) return { width, height };
  const k = max / long;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

export async function compressPhoto(file: Blob): Promise<Blob> {
  // createImageBitmap applies the EXIF orientation of phone photos when supported.
  let source: CanvasImageSource;
  let w: number;
  let h: number;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    source = bmp;
    w = bmp.width;
    h = bmp.height;
  } catch {
    const img = await loadImage(file);
    source = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  const size = scaledSize(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);
  if ('close' in source && typeof (source as ImageBitmap).close === 'function') (source as ImageBitmap).close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('Compression impossible');
  return blob;
}
