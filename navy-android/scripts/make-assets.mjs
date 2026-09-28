// Builds the source images of the NAVY ay icon and splash screen (navy-android/assets/),
// then `npm run assets` turns them into every Android density.
// Source: symbol A (colour) of the NAVY ay logo, on a white background: the yellow disc
// would disappear on the brand yellow #E9B824.
// Usage (from navy-android/): node scripts/make-assets.mjs && npm run assets
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(out, { recursive: true });

// Geometry of logo/A_couleur.svg (viewBox 0 0 1024 1024), arc simplified to an SVG arc.
const SYMBOL = `
  <circle cx="272" cy="637.6" r="120" fill="#E9B824"/>
  <circle cx="752" cy="637.6" r="120" fill="#4A4A4A"/>
  <path d="M292.8 519.4 A220 220 0 0 1 711.4 417.3" fill="none" stroke="#4A4A4A" stroke-width="46" stroke-linecap="round"/>
  <polygon points="648.6,429.5 731.2,519.4 774.3,405.2" fill="#4A4A4A" stroke="#4A4A4A" stroke-width="6" stroke-linejoin="round"/>`;
// Symbol bounding box ~ x 152..872, y 267..758 → centre (512, 512).

function svg(size, scale, { background = null } = {}) {
  const bg = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
    ${bg}
    <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${SYMBOL}</g>
  </svg>`);
}

async function png(buffer, file) {
  await sharp(buffer).png().toFile(join(out, file));
  console.log('wrote', file);
}

// Legacy icon (Android 7): symbol at 80 % on white.
await png(svg(1024, 0.8, { background: '#FFFFFF' }), 'icon-only.png');
// Adaptive icon (Android 8+): the launcher masks the outer third, keep the symbol in the safe zone.
await png(svg(1024, 0.56), 'icon-foreground.png');
await png(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#FFFFFF"/></svg>'), 'icon-background.png');
// Splash: logo with the name below (logo/NAVYay_logo_nom_dessous.png, white background),
// centred on a white 2732 px square.
const splashLogo = await sharp(join(out, 'logo-name-below.png')).resize({ width: 900 }).png().toBuffer();
const splash = sharp({ create: { width: 2732, height: 2732, channels: 4, background: '#FFFFFF' } })
  .composite([{ input: splashLogo, gravity: 'center' }]);
await splash.clone().png().toFile(join(out, 'splash.png'));
await splash.clone().png().toFile(join(out, 'splash-dark.png'));
console.log('wrote splash.png, splash-dark.png');
