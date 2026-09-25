/**
 * Printable QR card of a partner (phase 1A): NAVY ay logo, partner type, name, QR
 * code of https://1sakely.org/navy/p/<id> and, for a driver, the licence plate in
 * big letters. The SAME canvas is shown on screen and downloaded as PNG.
 * Charter: yellow #E9B824, charcoal #2E2E2E, text on yellow always charcoal.
 */
import QRCode from 'qrcode';
import type { PartnerKind } from '../types/partner';

export const NAVY_PUBLIC_ORIGIN = 'https://1sakely.org';
export const partnerPublicUrl = (partnerId: string) => `${NAVY_PUBLIC_ORIGIN}/navy/p/${partnerId}`;

const YELLOW = '#E9B824';
const CHARCOAL = '#2E2E2E';
const W = 1080;
const PAD = 72;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Largest font size (≤ max) for which `text` fits in `width`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: string, max: number, width: number): number {
  let size = max;
  while (size > 24) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= width) break;
    size -= 4;
  }
  return size;
}

export interface QrCardInput {
  partnerId: string;
  kind: PartnerKind;
  name: string;
  plate?: string | null;
}

export async function renderQrCard({ partnerId, kind, name, plate }: QrCardInput): Promise<HTMLCanvasElement> {
  const url = partnerPublicUrl(partnerId);
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, {
    width: 680,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: CHARCOAL, light: '#FFFFFF' },
  });

  const logo = await loadImage('/navy-ay/NAVYay_long_couleur.svg');
  const showPlate = kind === 'chauffeur' && !!plate;
  const H = 2000; // cropped to the content at the end

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, W, 28);

  let y = 90;
  if (logo && logo.width > 0) {
    const ratio = logo.width / logo.height;
    const lw = Math.min(W - 2 * PAD, ratio * 150);
    const lh = lw / ratio;
    ctx.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + 40;
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `800 110px ${FONT}`;
    const t1 = 'NAVY';
    const t2 = ' ay';
    const w1 = ctx.measureText(t1).width;
    const w2 = ctx.measureText(t2).width;
    const x0 = (W - w1 - w2) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = CHARCOAL;
    ctx.fillText(t1, x0, y);
    ctx.fillStyle = YELLOW;
    ctx.fillText(t2, x0 + w1, y);
    y += 150;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = CHARCOAL;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(kind === 'epicier' ? 'ÉPICERIE PARTENAIRE' : 'CHAUFFEUR PARTENAIRE', W / 2, y);
  y += 70;

  const nameSize = fitFont(ctx, name, '800', 76, W - 2 * PAD);
  ctx.font = `800 ${nameSize}px ${FONT}`;
  ctx.fillText(name, W / 2, y);
  y += nameSize + 50;

  if (showPlate) {
    const plateText = plate!.toUpperCase();
    const boxH = 160;
    ctx.fillStyle = CHARCOAL;
    const r = 28;
    const bx = PAD;
    const bw = W - 2 * PAD;
    ctx.beginPath();
    ctx.moveTo(bx + r, y);
    ctx.arcTo(bx + bw, y, bx + bw, y + boxH, r);
    ctx.arcTo(bx + bw, y + boxH, bx, y + boxH, r);
    ctx.arcTo(bx, y + boxH, bx, y, r);
    ctx.arcTo(bx, y, bx + bw, y, r);
    ctx.closePath();
    ctx.fill();
    const ps = fitFont(ctx, plateText, '800', 120, bw - 60);
    ctx.font = `800 ${ps}px ${FONT}`;
    ctx.fillStyle = YELLOW;
    ctx.textBaseline = 'middle';
    ctx.fillText(plateText, W / 2, y + boxH / 2 + 4);
    ctx.textBaseline = 'top';
    y += boxH + 50;
  }

  ctx.drawImage(qr, (W - qr.width) / 2, y);
  y += qr.height + 30;

  ctx.fillStyle = CHARCOAL;
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText('Scannez pour vérifier ce partenaire', W / 2, y);
  y += 52;
  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = '#555555';
  ctx.fillText(url.replace('https://', ''), W / 2, y);

  // Crop to the content, then close with the bottom yellow band.
  const finalH = Math.ceil(y + 30 + 70);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = finalH;
  const octx = out.getContext('2d')!;
  octx.drawImage(canvas, 0, 0, W, finalH, 0, 0, W, finalH);
  octx.fillStyle = YELLOW;
  octx.fillRect(0, finalH - 28, W, 28);
  return out;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}
