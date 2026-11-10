// Bench NEC-CC-07 on the production build (vite preview, port argv[2], default 4188) with its service
// worker. C5: airplane mode, header stays at the top while scrolling, logos v2 shown from the
// precache; trainer screen without session still redirected offline.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const path = require('path');
const PORT = process.argv[2] || 4188;
const BASE = `http://localhost:${PORT}/plan`;
const DOSSIER = __dirname;
const res = [];
const ok = (nom, cond, detail = '') => {
  res.push(!!cond);
  console.log(`${cond ? 'OK ' : 'KO '} ${nom}${detail ? ' : ' + detail : ''}`);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const opts = { viewport: { width: 412, height: 869 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR' };

async function verifier(page, nom, fichier) {
  await page.waitForSelector('header.bp-entete');
  await page.waitForFunction(() => [...document.querySelectorAll('header.bp-entete img')].every((i) => i.complete), null, { timeout: 10000 });
  await pause(500);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await pause(500);
  const m = await page.evaluate(() => {
    const h = document.querySelector('header.bp-entete');
    const r = h.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      online: navigator.onLine,
      iw: innerWidth,
      scrollY: Math.round(scrollY),
      top: r.top,
      dessus: !!e && h.contains(e),
      imgs: [...h.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), nh: i.naturalHeight, h: Math.round(i.getBoundingClientRect().height), vis: getComputedStyle(i).visibility }))
    };
  });
  ok(`C5 hors ligne : en-tête en haut après défilement, logos v2 affichés : ${nom}`, !m.online && m.iw === 412 && m.top === 0 && m.dessus && m.imgs.length === 2 && m.imgs.every((i) => /-v2\.png$/.test(i.src) && i.nh === 160 && i.h === 44 && i.vis === 'visible'), JSON.stringify(m));
  if (fichier) await page.screenshot({ path: path.join(DOSSIER, fichier) });
}

(async () => {
  const nav = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await nav.newContext(opts);
  const supa = [];
  ctx.on('request', (r) => /supabase\.co/.test(r.url()) && supa.push(r.url()));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto(BASE + '/');
  ok('innerWidth 412, DPR 3,5', await page.evaluate(() => innerWidth === 412 && devicePixelRatio === 3.5));
  await page.waitForSelector('text=Prêt pour le mode avion', { timeout: 120000 });
  const liste = await page.evaluate(async () => await (await caches.match('/plan/precache.json')).json());
  ok('précache : logos v2 de l\'en-tête et logos du PDF', ['/plan/logos/nec-logo-v2.png', '/plan/logos/blossom-blanc-v2.png', '/plan/logos/nec-logo-v1.png', '/plan/logos/blossom-couleur-v1.png'].every((f) => liste.files.includes(f)), `${liste.files.length} fichiers, version ${liste.version}`);
  await ctx.setOffline(true);
  await page.reload();
  await verifier(page, 'Accueil', 'c5-horsligne-accueil.png');
  await page.goto(BASE + '/p/exemple');
  await verifier(page, 'Sommaire exemple', 'c5-horsligne-sommaire-bas.png');
  await page.goto(BASE + '/p/exemple/m5');
  await verifier(page, 'Module 5 exemple', 'c5-horsligne-m5-bas.png');
  await page.goto(BASE + '/p/exemple/m3');
  await verifier(page, 'Module 3 exemple');
  await page.goto(BASE + '/formateur');
  await page.waitForSelector('text=Mes projets', { timeout: 30000 });
  ok('C3 hors ligne, sans session : /formateur renvoie sur /plan/', new URL(page.url()).pathname === '/plan/', page.url());
  await page.goto(BASE + '/a-propos');
  await page.waitForSelector('.bp-lien-connexion');
  ok('C8 hors ligne : lien « Connexion formateur » sur À propos', true);
  ok('0 requête Supabase', supa.length === 0, supa.join(' '));
  ok('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
  console.log(`\n${res.filter(Boolean).length}/${res.length} OK`);
  await nav.close();
})();
