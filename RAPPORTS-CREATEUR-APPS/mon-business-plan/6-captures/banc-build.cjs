// Bench NEC-CC-06 on the production build (vite preview, port argv[2], default 4187) with its service
// worker. C4: airplane mode, header and logos render; with a stored list (fake session, mocked users
// row while online) the switcher still opens offline, its chunk coming from the precache.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const path = require('path');
const PORT = process.argv[2] || 4187;
const BASE = `http://localhost:${PORT}/plan`;
const DOSSIER = __dirname;
const res = [];
const ok = (nom, cond, detail = '') => {
  res.push(!!cond);
  console.log(`${cond ? 'OK ' : 'KO '} ${nom}${detail ? ' : ' + detail : ''}`);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const opts = { viewport: { width: 412, height: 869 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR' };

async function enteteHorsLigne(page, nom, fichier) {
  await page.waitForSelector('header.bp-entete');
  await page.waitForFunction(() => [...document.querySelectorAll('header.bp-entete img')].every((i) => i.complete), null, { timeout: 10000 });
  await pause(500);
  const m = await page.evaluate(() => ({
    online: navigator.onLine,
    iw: innerWidth,
    sw: document.documentElement.scrollWidth,
    h: Math.round(document.querySelector('header.bp-entete').getBoundingClientRect().height * 10) / 10,
    imgs: [...document.querySelectorAll('header.bp-entete img')].map((i) => ({ alt: i.alt, nw: i.naturalWidth, h: Math.round(i.getBoundingClientRect().height), vis: getComputedStyle(i).visibility })),
    bouton: !!document.querySelector('button[data-bp-logo]')
  }));
  ok(`C4 hors ligne, en-tête et 2 logos de 44 px : ${nom}`, !m.online && m.imgs.length === 2 && m.imgs.every((i) => i.nw > 0 && i.h === 44 && i.vis === 'visible') && m.sw === 412 && m.iw === 412, JSON.stringify(m));
  if (fichier) await page.screenshot({ path: path.join(DOSSIER, fichier) });
  return m;
}

(async () => {
  const nav = await chromium.launch({ channel: 'chrome', headless: true });

  // ---------- Participant (no session) ----------
  const ctx = await nav.newContext(opts);
  const supa = [];
  ctx.on('request', (r) => /supabase\.co/.test(r.url()) && supa.push(r.url()));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto(BASE + '/');
  ok('innerWidth 412, DPR 3,5', await page.evaluate(() => innerWidth === 412 && devicePixelRatio === 3.5));
  await page.waitForSelector('text=Prêt pour le mode avion', { timeout: 120000 });
  const liste = await page.evaluate(async () => (await (await caches.match('/plan/precache.json')).json()));
  ok('précache : logos et fichier du commutateur', ['/plan/logos/nec-logo-v1.png', '/plan/logos/blossom-blanc-v1.png'].every((f) => liste.files.includes(f)) && liste.files.some((f) => /\/Commutateur-/.test(f)), `${liste.files.length} fichiers, version ${liste.version}`);
  await ctx.setOffline(true);
  await page.reload();
  const a = await enteteHorsLigne(page, 'Accueil (participant)', 'c4-horsligne-accueil.png');
  ok('C4 participant : logo B-lossom reste une image', !a.bouton);
  await page.goto(BASE + '/p/exemple');
  await enteteHorsLigne(page, 'Sommaire exemple (participant)', 'c4-horsligne-sommaire.png');
  await page.goto(BASE + '/p/exemple/m5');
  await enteteHorsLigne(page, 'Module 5 exemple (participant)');
  ok('C4 participant : 0 requête Supabase', supa.length === 0, supa.join(' '));
  ok('aucune erreur de page (participant)', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();

  // ---------- Signed-in account: list stored online, switcher offline ----------
  const ctx2 = await nav.newContext(opts);
  await ctx2.addInitScript(() => {
    localStorage.setItem(
      'sb-ofzmwrzatcztoekrpvkj-auth-token',
      JSON.stringify({ access_token: 'faux', refresh_token: 'faux', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u-banc', email: 'joelsoatra@gmail.com', aud: 'authenticated' } })
    );
  });
  let lectures = 0;
  await ctx2.route('**/rest/v1/users**', (route) => {
    lectures++;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin', preferences: { modules: ['bazarkely', 'gestion-eau'], moduleOrder: ['gestion-eau', 'bazarkely', 'construction'] } }) });
  });
  const p2 = await ctx2.newPage();
  const erreurs2 = [];
  p2.on('pageerror', (e) => erreurs2.push(String(e)));
  const chargesCommutateur = [];
  p2.on('request', (r) => /\/Commutateur-/.test(r.url()) && chargesCommutateur.push(r.url()));
  await p2.goto(BASE + '/');
  await p2.waitForSelector('text=Prêt pour le mode avion', { timeout: 120000 });
  await p2.waitForSelector('button[data-bp-logo]', { timeout: 15000 });
  const garde = await p2.evaluate(() => localStorage.getItem('nec.modules'));
  ok('en ligne : liste lue et gardée sous nec.modules', lectures > 0 && /u-banc/.test(garde || ''), garde);
  ok('fichier du commutateur pas chargé avant le premier toucher', chargesCommutateur.length === 0);
  await ctx2.setOffline(true);
  const avant = lectures;
  await p2.reload();
  const b = await enteteHorsLigne(p2, 'Accueil (compte, mode avion)');
  ok('C4 mode avion : logo B-lossom = bouton (liste gardée)', b.bouton);
  await p2.locator('button[data-bp-logo]').tap();
  await p2.waitForSelector('[data-bp-tuile]', { timeout: 10000 }).catch(() => undefined);
  const tuiles = await p2.$$eval('[data-bp-tuile]', (t) => t.map((x) => x.getAttribute('data-bp-tuile')));
  ok('C4 mode avion : la feuille s’ouvre avec les 6 modules gardés', tuiles.length === 6, JSON.stringify(tuiles));
  ok('C4 fichier du commutateur servi hors ligne (précache)', chargesCommutateur.length >= 1, chargesCommutateur[0]);
  ok('C4 aucune lecture users hors ligne', lectures === avant);
  await p2.screenshot({ path: path.join(DOSSIER, 'c4-horsligne-feuille.png') });
  ok('aucune erreur de page (compte)', erreurs2.length === 0, erreurs2.join(' | '));

  console.log(`\n${res.filter(Boolean).length}/${res.length} OK`);
  await nav.close();
})();
