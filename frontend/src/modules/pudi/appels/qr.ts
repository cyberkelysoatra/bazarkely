// QR code of a channel link: PNG 1024 px wide, generated in the browser with the existing
// `qrcode` dependency (dynamic import: own chunk). Quiet zone around the code, channel name and
// link printed under it (see libelleQr).
export const lienCanal = (code: string) => `https://1sakely.org/pudi/?c=${code}`;
export const nomFichierQr = (code: string) => `QR_PUDi_${code}.png`;

/**
 * Line printed under the QR code: the channel NAME, never the channel type word. A WhatsApp
 * group reads `Groupe « Opérateurs nosybe »` (the type word is removed from the start of the
 * name, then « Groupe » is put in front); any other type (affiche, reunion, autre) shows its
 * name alone. The type stays visible in the admin list.
 */
export function libelleQr(nom: string, type: string): string {
  const n = nom.trim().replace(/\s+/g, ' ');
  if (type !== 'groupe_whatsapp') return n;
  const reste = n.replace(/^(?:groupe\s+)?whats\s?app\b[\s,:.-]*/i, '').replace(/^groupe(?:\s+|$)/i, '').trim();
  return reste ? `Groupe ${reste}` : 'Groupe';
}

function lignesTexte(ctx: CanvasRenderingContext2D, texte: string, largeur: number): string[] {
  const mots = texte.split(/\s+/);
  const lignes: string[] = [];
  let cur = '';
  for (const m of mots) {
    const essai = cur ? `${cur} ${m}` : m;
    if (ctx.measureText(essai).width > largeur && cur) {
      lignes.push(cur);
      cur = m;
    } else cur = essai;
  }
  if (cur) lignes.push(cur);
  return lignes.slice(0, 3);
}

export async function genererQrPng(code: string, nom: string, type: string): Promise<Blob> {
  const QR = (await import('qrcode')).default;
  const L = 1024;
  const qr = document.createElement('canvas');
  // margin = quiet zone of 4 modules (QR specification)
  await QR.toCanvas(qr, lienCanal(code), { width: L, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#0B2A8C', light: '#FFFFFF' } });
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = 'bold 44px Arial, Helvetica, sans-serif';
  const titre = lignesTexte(ctx, libelleQr(nom, type), L - 120);
  const hauteur = L + titre.length * 56 + 110;
  c.width = L;
  c.height = hauteur;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, L, hauteur);
  ctx.drawImage(qr, 0, 0, L, L);
  ctx.fillStyle = '#0B2A8C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 44px Arial, Helvetica, sans-serif';
  titre.forEach((t, i) => ctx.fillText(t, L / 2, L + 30 + i * 56));
  ctx.fillStyle = '#2F3547';
  ctx.font = '34px Arial, Helvetica, sans-serif';
  ctx.fillText(lienCanal(code), L / 2, L + titre.length * 56 + 60);
  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
}
