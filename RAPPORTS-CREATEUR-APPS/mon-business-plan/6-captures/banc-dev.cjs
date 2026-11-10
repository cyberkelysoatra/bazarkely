// Bench NEC-CC-06 (header MODÈLE B + B-lossom switcher), dev server port argv[2] (default 3007),
// Chrome at 412 px, DPR 3.5, touch. C1 (one row, logos, no scroll, 40 character name), C2 (no session:
// logo not a button, 0 Supabase request), C3 (fake admin session, mocked users row: switcher).
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const path = require('path');
const PORT = process.argv[2] || 3007;
const BASE = `http://localhost:${PORT}/plan`;
const DOSSIER = __dirname;
const NOM40 = 'Boulangerie artisanale Hell-Ville Nosy Be'.slice(0, 40);
const res = [];
const ok = (nom, cond, detail = '') => {
  res.push(!!cond);
  console.log(`${cond ? 'OK ' : 'KO '} ${nom}${detail ? ' : ' + detail : ''}`);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function entete(page, nom, { bouton = false } = {}) {
  await page.waitForSelector('header.bp-entete');
  await pause(700);
  const m = await page.evaluate(() => {
    const h = document.querySelector('header.bp-entete');
    const imgs = [...h.querySelectorAll('img')];
    const titre = h.querySelector('h1');
    const r = (e) => e.getBoundingClientRect();
    const ligne = h.firstElementChild;
    return {
      iw: innerWidth,
      sw: document.documentElement.scrollWidth,
      h: Math.round(r(h).height * 10) / 10,
      imgs: imgs.map((i) => ({ alt: i.alt, nw: i.naturalWidth, h: Math.round(r(i).height), w: Math.round(r(i).width), x: Math.round(r(i).left), droite: Math.round(r(i).right), top: Math.round(r(i).top), vis: getComputedStyle(i).visibility })),
      titre: { top: Math.round(r(titre).top), bas: Math.round(r(titre).bottom), gauche: Math.round(r(titre).left), droite: Math.round(r(titre).right), coupe: titre.scrollWidth > titre.clientWidth + 1, lignes: Math.round(r(titre).height / 27.5) },
      sous: h.querySelector('h1 + p') ? { coupe: h.querySelector('h1 + p').scrollWidth > h.querySelector('h1 + p').clientWidth + 1, texte: h.querySelector('h1 + p').textContent } : null,
      ligneH: Math.round(r(ligne).height),
      enfantsLigne: ligne.children.length,
      bouton: !!h.querySelector('button[data-bp-logo]'),
      separateur: !!h.querySelector('.h-px'),
      bandeauHaut: !!h.querySelector('.bp-logos')
    };
  });
  const [nec, bl] = m.imgs;
  const uneLigne =
    m.imgs.length === 2 &&
    nec.alt === 'Nosy Be Entrepreneurship Camp 2026' &&
    bl.alt === 'B-lossom Center, organisateur' &&
    nec.h === 44 &&
    bl.h === 44 &&
    nec.droite <= m.titre.gauche &&
    bl.x >= m.titre.droite &&
    bl.droite <= 412 - 16 + 4 &&
    nec.x >= 16 &&
    !m.separateur &&
    !m.bandeauHaut &&
    m.imgs.every((i) => i.nw > 0 && i.vis === 'visible');
  ok(`C1 une rangée NEC 44 px | titre | B-lossom 44 px : ${nom}`, uneLigne, JSON.stringify({ h: m.h, imgs: m.imgs, titre: m.titre }));
  ok(`C1 pas de défilement horizontal : ${nom}`, m.sw === m.iw && m.iw === 412, `${m.sw}/${m.iw}`);
  ok(`${bouton ? 'C3' : 'C2'} logo B-lossom ${bouton ? 'est' : "n'est pas"} un bouton : ${nom}`, m.bouton === bouton);
  return m;
}

async function renommer(page, id, nom) {
  await page.goto(`${BASE}/p/${id}/identite`);
  const champ = page.getByLabel('Nom du projet', { exact: true });
  await champ.waitFor();
  await champ.fill(nom);
  await pause(900);
}

(async () => {
  const nav = await chromium.launch({ channel: 'chrome', headless: true });
  const opts = { viewport: { width: 412, height: 869 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR' };

  // ---------- C1 + C2: no stored session ----------
  const ctx = await nav.newContext(opts);
  const supa = [];
  ctx.on('request', (r) => /supabase\.co/.test(r.url()) && supa.push(r.url()));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => /WebSocket closed without opened/.test(String(e)) || erreurs.push(String(e)));
  await page.goto(BASE + '/');
  await page.waitForSelector('text=Mes projets', { timeout: 120000 });
  const d = await page.evaluate(() => ({ iw: innerWidth, dpr: devicePixelRatio, session: localStorage.getItem('sb-ofzmwrzatcztoekrpvkj-auth-token') }));
  ok('banc : innerWidth 412, DPR 3,5, aucune session gardée', d.iw === 412 && d.dpr === 3.5 && d.session === null, JSON.stringify(d));
  const hauteurs = {};
  hauteurs.accueil = (await entete(page, 'Accueil')).h;
  await page.screenshot({ path: path.join(DOSSIER, 'c1-accueil-412.png') });

  // Copy of the example, renamed with 40 characters.
  await page.goto(BASE + '/p/exemple');
  await page.getByRole('button', { name: "Copier l'exemple pour m'entraîner" }).click();
  await page.waitForURL(/\/p\/(?!exemple)[^/]+$/);
  const id = page.url().split('/p/')[1].split('/')[0];
  await renommer(page, id, NOM40);
  ok('nom de projet de 40 caractères', NOM40.length === 40, NOM40);

  await page.goto(`${BASE}/p/${id}`);
  const s = await entete(page, 'Sommaire (nom de 40 caractères)');
  hauteurs.sommaire = s.h;
  ok('C1 titre de 40 caractères tronqué sur une ligne, logos intacts', s.titre.coupe && s.titre.lignes === 1, JSON.stringify(s.titre));
  await page.screenshot({ path: path.join(DOSSIER, 'c1-sommaire-40car-412.png') });

  await page.goto(`${BASE}/p/${id}/m5`);
  const m5 = await entete(page, 'Module 5');
  hauteurs.m5 = m5.h;
  ok('C1 module 5 : nom de 40 caractères du sous-titre tronqué sur une ligne', m5.sous && m5.sous.coupe && m5.sous.texte === NOM40, JSON.stringify(m5.sous));
  await page.screenshot({ path: path.join(DOSSIER, 'c1-m5-412.png') });

  await page.goto(`${BASE}/p/${id}/exporter`);
  hauteurs.exporter = (await entete(page, 'Exporter')).h;
  await page.screenshot({ path: path.join(DOSSIER, 'c1-exporter-412.png') });

  // A few more screens of the plan (no scroll, logos).
  for (const [ch, nom] of [['identite', 'Identité'], ['m1', 'Module 1'], ['m4', 'Module 4'], ['synthese', 'Synthèse']]) {
    await page.goto(`${BASE}/p/${id}/${ch}`);
    await entete(page, nom);
  }
  await page.goto(`${BASE}/p/exemple`);
  hauteurs.sommaireExemple = (await entete(page, 'Sommaire exemple')).h;
  // Tap on the inert logo: nothing happens.
  const avant = page.url();
  await page.locator('header.bp-entete img[alt^="B-lossom"]').tap();
  await pause(500);
  ok("C2 toucher le logo inerte : rien ne s'ouvre", page.url() === avant && (await page.locator('[data-bp-commutateur]').count()) === 0);

  // Plan content for the trainer screen.
  const contenu = await page.evaluate(
    (id) =>
      new Promise((ok, ko) => {
        const r = indexedDB.open('NecBusinessPlanDB');
        r.onsuccess = () => {
          const t = r.result.transaction('plans').objectStore('plans').get(id);
          t.onsuccess = () => ok(t.result);
          t.onerror = () => ko(t.error);
        };
      }),
    id
  );
  ok('C2 aucune requête Supabase sur tout le passage sans session', supa.length === 0, `${supa.length} requête(s) ${supa.slice(0, 3).join(' ')}`);
  ok('aucune erreur de page (sans session)', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();

  // ---------- C3 + trainer screen: fake stored admin session ----------
  const ctx2 = await nav.newContext(opts);
  await ctx2.addInitScript(() => {
    localStorage.setItem(
      'sb-ofzmwrzatcztoekrpvkj-auth-token',
      JSON.stringify({ access_token: 'faux', refresh_token: 'faux', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u-banc', email: 'joelsoatra@gmail.com', aud: 'authenticated' } })
    );
  });
  const lectures = [];
  await ctx2.route('**/rest/v1/users**', (route) => {
    lectures.push(route.request().url());
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin', preferences: { modules: ['bazarkely', 'gestion-eau'], moduleOrder: ['gestion-eau', 'bazarkely', 'construction'] } }) });
  });
  const c = { ...contenu };
  delete c.identite.telephone;
  delete c.identite.email;
  await ctx2.route('**/rest/v1/rpc/bp_admin_plan', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan_id: id, prenom: 'Banc', contenu: c, maj_at: new Date().toISOString() }) })
  );
  const p2 = await ctx2.newPage();
  const erreurs2 = [];
  p2.on('pageerror', (e) => /WebSocket closed without opened/.test(String(e)) || erreurs2.push(String(e)));
  await p2.goto(`${BASE}/formateur/${id}`);
  await p2.waitForSelector('.bp-rubrique', { timeout: 30000 });
  await p2.waitForSelector('button[data-bp-logo]', { timeout: 15000 }).catch(() => undefined);
  const f = await entete(p2, 'écran formateur', { bouton: true });
  hauteurs.formateur = f.h;
  await p2.screenshot({ path: path.join(DOSSIER, 'c1-formateur-412.png') });
  ok('C3 lecture users role, preferences du compte', lectures.some((u) => /select=role%2Cpreferences|select=role,preferences/.test(u) && /id=eq\.u-banc/.test(u)), lectures[0]);
  const logo = p2.locator('button[data-bp-logo]');
  const b = await logo.evaluate((e) => ({ label: e.getAttribute('aria-label'), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }));
  ok('C3 bouton : nom « Ouvrir les autres modules de 1saKELY », cible 44 px', b.label === 'Ouvrir les autres modules de 1saKELY' && b.w >= 44 && b.h >= 44, JSON.stringify(b));
  await logo.focus();
  const focus = await logo.evaluate((e) => getComputedStyle(e).outlineStyle + ' ' + getComputedStyle(e).outlineWidth);
  ok('C3 focus visible au clavier', /^solid [2-9]px/.test(focus), focus);
  await logo.tap();
  await p2.waitForSelector('[data-bp-tuile]', { timeout: 10000 });
  const tuiles = await p2.$$eval('[data-bp-tuile]', (t) => t.map((x) => x.getAttribute('data-bp-tuile')));
  ok('C3 la feuille liste les autres modules (ordre du compte), sans Mon Business Plan', JSON.stringify(tuiles) === JSON.stringify(['gestion-eau', 'bazarkely', 'construction', 'navy-ay', 'pudi', 'validation']), JSON.stringify(tuiles));
  const texte = await p2.locator('[data-bp-commutateur]').innerText();
  ok('C3 aucune entrée « Mon business plan »', !/business plan/i.test(texte), texte.replace(/\n/g, ' / '));
  const larg = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  ok('C3 feuille ouverte : pas de défilement horizontal de la page', larg.sw === larg.iw, JSON.stringify(larg));
  const tu = await p2.$$eval('[data-bp-tuile]', (t) => t.map((x) => { const r = x.getBoundingClientRect(); const s = x.lastElementChild; return { g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.height), texte: s.scrollWidth <= s.clientWidth + 1 || s.getBoundingClientRect().right <= 412 }; }));
  ok('C3 6 tuiles visibles en entier, cibles de 44 px au moins', tu.length === 6 && tu.every((t) => t.g >= 0 && t.d <= 412 && t.h >= 44), JSON.stringify(tu));
  const grille = await p2.$eval('[data-bp-tuiles]', (e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
  ok('C3 rangée des tuiles sans défilement', grille.sw <= grille.cw, JSON.stringify(grille));
  await p2.screenshot({ path: path.join(DOSSIER, 'c3-feuille-412.png') });
  // Back closes it.
  await p2.goBack();
  await pause(400);
  ok('C3 Retour ferme la feuille (on reste sur la page)', (await p2.locator('[data-bp-commutateur]').count()) === 0 && p2.url().includes(`/formateur/${id}`));
  // Escape closes it.
  await logo.tap();
  await p2.waitForSelector('[data-bp-tuile]');
  await p2.keyboard.press('Escape');
  await pause(300);
  ok('C3 Échap ferme la feuille', (await p2.locator('[data-bp-commutateur]').count()) === 0);
  // Gestion Eau: full page navigation.
  await logo.tap();
  await p2.waitForSelector('[data-bp-tuile="gestion-eau"]');
  await Promise.all([p2.waitForURL(`http://localhost:${PORT}/gestion-eau`, { timeout: 60000, waitUntil: 'commit' }), p2.locator('[data-bp-tuile="gestion-eau"]').tap()]);
  ok('C3 toucher « Gestion Eau » ouvre /gestion-eau en pleine page', new URL(p2.url()).pathname === '/gestion-eau', p2.url());
  const gardee = await p2.evaluate(() => localStorage.getItem('nec.modules'));
  ok('C3 liste gardée sous nec.modules', /"uid":"u-banc"/.test(gardee || '') && /gestion-eau/.test(gardee || ''), gardee);

  // Account with Mon Business Plan only (no other module): logo stays an image.
  const ctx3 = await nav.newContext(opts);
  await ctx3.addInitScript(() => {
    localStorage.setItem('sb-ofzmwrzatcztoekrpvkj-auth-token', JSON.stringify({ access_token: 'faux', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u-seul', email: 'x@y.z' } }));
  });
  await ctx3.route('**/rest/v1/users**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  const p3 = await ctx3.newPage();
  await p3.goto(BASE + '/');
  await p3.waitForSelector('text=Mes projets', { timeout: 60000 });
  await pause(1500);
  ok('session sans ligne users connue : logo reste une image', (await p3.locator('button[data-bp-logo]').count()) === 0);
  await ctx3.close();

  ok('aucune erreur de page (session)', erreurs2.length === 0, erreurs2.join(' | '));
  console.log('HAUTEURS ' + JSON.stringify(hauteurs));
  console.log(`\n${res.filter(Boolean).length}/${res.length} OK`);
  await nav.close();
})();
