// Bench NEC-CC-09 (sticky « Retour » line with frosted glass), dev server port argv[2] (default 3009),
// Chrome at 412 x 869, DPR 3.5, touch. Also used on the build (argv[3] = 'horsligne': service worker,
// airplane mode, Sommaire and module 5 of the example only).
// C1 at rest transparent, after scrolling stuck right under the header with the glass; C2 module 5
// stack header / Retour / tabs without gap or overlap, each on top; C3 keyboard (viewport 500);
// C4 tapping Retour from rest and from stuck state; C5 airplane mode on the build.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const path = require('path');
const PORT = process.argv[2] || 3009;
const HORS_LIGNE = process.argv[3] === 'horsligne';
const BASE = `http://localhost:${PORT}/plan`;
const DOSSIER = __dirname;
const PRE = HORS_LIGNE ? 'c5-horsligne-' : 'c1-';
const res = [];
const ok = (nom, cond, detail = '') => {
  res.push(!!cond);
  console.log(`${cond ? 'OK ' : 'KO '} ${nom}${detail ? ' : ' + detail : ''}`);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Measures of the header, the Retour line and the module 5 tab bar. */
async function mesure(page) {
  return page.evaluate(() => {
    const arrondi = (v) => Math.round(v * 10) / 10;
    const h = document.querySelector('header.bp-entete');
    const l = document.querySelector('.bp-retour');
    const n = document.querySelector('.bp-onglets');
    const dessus = (el) => {
      const r = el.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!e && el.contains(e);
    };
    const s = l ? getComputedStyle(l) : null;
    const rl = l ? l.getBoundingClientRect() : null;
    const rn = n ? n.getBoundingClientRect() : null;
    return {
      iw: innerWidth,
      ih: innerHeight,
      scrollY: Math.round(scrollY),
      max: Math.round(document.documentElement.scrollHeight - innerHeight),
      entete: { top: h.getBoundingClientRect().top, bas: arrondi(h.getBoundingClientRect().bottom), z: getComputedStyle(h).zIndex },
      retour: l
        ? {
            etat: l.getAttribute('data-barre-retour'),
            top: arrondi(rl.top),
            bas: arrondi(rl.bottom),
            gauche: arrondi(rl.left),
            largeur: arrondi(rl.width),
            colonne: arrondi(l.parentElement.getBoundingClientRect().width),
            fond: s.backgroundColor,
            filtre: s.backdropFilter || s.webkitBackdropFilter,
            ombre: s.boxShadow,
            rayon: s.borderRadius,
            z: s.zIndex,
            dessus: dessus(l),
            lien: l.querySelector('a').getBoundingClientRect().height,
            couleur: getComputedStyle(l.querySelector('a')).color
          }
        : null,
      varRetour: getComputedStyle(document.documentElement).getPropertyValue('--bp-retour').trim(),
      onglets: n ? { top: arrondi(rn.top), bas: arrondi(rn.bottom), dessus: dessus(n), z: getComputedStyle(n).zIndex } : null
    };
  });
}
const transparent = (c) => /rgba\(.*,\s*0\)$/.test(c) || c === 'transparent';

async function basDePage(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await pause(700);
}

async function controler(page, nom, cle) {
  await page.waitForSelector('header.bp-entete');
  await page.waitForSelector('.bp-retour', { timeout: 15000 }).catch(() => undefined);
  await pause(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(600);
  const haut = await mesure(page);
  await page.screenshot({ path: path.join(DOSSIER, `${PRE}${cle}-haut.png`) });
  ok(`C1 ${nom} au repos : ligne Retour « repos », fond transparent`, haut.retour && haut.retour.etat === 'repos' && transparent(haut.retour.fond) && haut.retour.lien >= 44, JSON.stringify(haut.retour && { etat: haut.retour.etat, fond: haut.retour.fond, top: haut.retour.top, entete: haut.entete.bas }));
  await basDePage(page);
  const bas = await mesure(page);
  await page.screenshot({ path: path.join(DOSSIER, `${PRE}${cle}-bas.png`) });
  const r = bas.retour;
  if (bas.max === 0) {
    ok(`C1 ${nom} : la page tient dans l'écran (rien ne défile), ligne au repos juste sous l'en-tête`, r && r.etat === 'repos' && Math.abs(r.top - bas.entete.bas) <= 1, JSON.stringify({ max: bas.max, top: r && r.top, entete: bas.entete.bas }));
    return bas;
  }
  ok(
    `C1 ${nom} en bas : ligne collée sous l'en-tête (1 px), entière, au premier plan, « collee », verre`,
    r && bas.scrollY > 0 && Math.abs(r.top - bas.entete.bas) <= 1 && r.bas <= bas.ih && r.dessus && r.etat === 'collee' && r.filtre && r.filtre !== 'none' && /blur\(16px\)/.test(r.filtre) && r.fond === 'rgba(255, 255, 255, 0.62)' && r.largeur === r.colonne && r.couleur === 'rgb(96, 0, 90)',
    JSON.stringify({ scrollY: bas.scrollY, max: bas.max, entete: bas.entete.bas, retour: r && { top: r.top, bas: r.bas, etat: r.etat, filtre: r.filtre, fond: r.fond, largeur: r.largeur, colonne: r.colonne, ombre: r.ombre, rayon: r.rayon, couleur: r.couleur }, varRetour: bas.varRetour })
  );
  return bas;
}

(async () => {
  const nav = await chromium.launch({ channel: 'chrome', headless: true });
  const opts = { viewport: { width: 412, height: 869 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR' };
  const ctx = await nav.newContext(opts);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => /WebSocket closed without opened/.test(String(e)) || erreurs.push(String(e)));
  await page.goto(BASE + '/');
  const d = await page.evaluate(() => ({ iw: innerWidth, dpr: devicePixelRatio }));
  ok('banc : innerWidth 412, DPR 3,5', d.iw === 412 && d.dpr === 3.5, JSON.stringify(d));

  let id = 'exemple';
  if (HORS_LIGNE) {
    await page.waitForSelector('text=Prêt pour le mode avion', { timeout: 120000 });
    const liste = await page.evaluate(async () => await (await caches.match('/plan/precache.json')).json());
    ok('précache prête', liste.files.length > 0, `${liste.files.length} fichiers, version ${liste.version}`);
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('text=Mes projets', { timeout: 30000 });
    ok('hors ligne', !(await page.evaluate(() => navigator.onLine)));
  } else {
    await page.waitForSelector('text=Mes projets', { timeout: 120000 });
    // Copy of the example (filled plan: long pages).
    await page.goto(BASE + '/p/exemple');
    await page.getByRole('button', { name: "Copier l'exemple pour m'entraîner" }).click();
    await page.waitForURL(/\/p\/(?!exemple)[^/]+$/);
    id = page.url().split('/p/')[1].split('/')[0];
  }

  // Page without Retour line: --bp-retour 0px.
  await page.goto(BASE + '/');
  await page.waitForSelector('text=Mes projets');
  await pause(500);
  const acc = await mesure(page);
  ok('Accueil (sans ligne Retour) : aucune ligne, --bp-retour 0px', !acc.retour && acc.varRetour === '0px', JSON.stringify({ var: acc.varRetour }));

  const ecrans = HORS_LIGNE
    ? [['sommaire', `/p/${id}`, 'Sommaire (exemple)'], ['m5', `/p/${id}/m5`, 'Module 5 (exemple)']]
    : [
        ['sommaire', `/p/${id}`, 'Sommaire'],
        ['m1', `/p/${id}/m1`, 'Module 1'],
        ['m3', `/p/${id}/m3`, 'Module 3'],
        ['m5', `/p/${id}/m5`, 'Module 5'],
        ['exporter', `/p/${id}/exporter`, 'Exporter'],
        ['apropos', '/a-propos', 'À propos'],
        // At 869 px high, À propos fits on the screen (nothing scrolls, nothing to stick): 500 high.
        ['apropos-500', '/a-propos', 'À propos (hauteur 500)', 500]
      ];
  for (const [cle, chemin, nom, hauteur] of ecrans) {
    if (hauteur) await page.setViewportSize({ width: 412, height: hauteur });
    await page.goto(BASE + chemin);
    const m = await controler(page, nom, cle);
    if (cle === 'apropos') console.log(`   (À propos à 869 px : défilement maximal ${m.max} px)`);
    if (hauteur) await page.setViewportSize({ width: 412, height: 869 });
  }

  // Back to a page without Retour line after one with it: reset to 0px.
  await page.locator('.bp-nav a', { hasText: 'Projets' }).tap().catch(async () => page.goto(BASE + '/'));
  await page.waitForSelector('text=Mes projets');
  await pause(500);
  ok('Retour sur l\'Accueil après une page à ligne Retour : --bp-retour remis à 0px', (await mesure(page)).varRetour === '0px');

  // ---------- C1 + C2: module 5, each tab ----------
  await page.goto(`${BASE}/p/${id}/m5`);
  await page.waitForSelector('.bp-onglets');
  await pause(800);
  for (const s of ['5a', '5b', '5c', '5d', '5e', '5f']) {
    await page.locator('.bp-onglets button', { hasText: s }).first().tap();
    await pause(1300);
    const m = await mesure(page);
    const sec = await page.evaluate((s) => Math.round(document.getElementById('s' + s).getBoundingClientRect().top), s);
    const r = m.retour;
    ok(
      `C1/C2 module 5 onglet ${s} : en-tête, ligne Retour (collée, verre) et onglets empilés sans écart ni chevauchement, chacun au premier plan`,
      m.entete.top === 0 && r && Math.abs(r.top - m.entete.bas) <= 1 && r.etat === 'collee' && r.filtre !== 'none' && r.dessus && Math.abs(m.onglets.top - r.bas) <= 1 && m.onglets.dessus && (sec >= m.onglets.bas - 1 || m.scrollY >= m.max - 1),
      JSON.stringify({ entete: m.entete.bas, retour: r && [r.top, r.bas, r.etat], onglets: m.onglets, section: sec, scrollY: m.scrollY, max: m.max, var: m.varRetour })
    );
    await page.screenshot({ path: path.join(DOSSIER, `${PRE}m5-onglet-${s}.png`) });
  }
  const m5 = await mesure(page);
  ok('C2 empilement : en-tête 30, ligne Retour 20, onglets 10', m5.entete.z === '30' && m5.retour.z === '20' && m5.onglets.z === '10', JSON.stringify({ e: m5.entete.z, r: m5.retour.z, o: m5.onglets.z }));

  if (!HORS_LIGNE) {
    // ---------- C3: keyboard open (viewport 500 high), input low in module 5 ----------
    await page.setViewportSize({ width: 412, height: 500 });
    await pause(400);
    const champs = page.locator('#s5f input, #s5f textarea');
    const n = await champs.count();
    for (const [i, nom] of [[n - 1, 'dernier champ de 5f'], [0, 'premier champ de 5f']]) {
      await page.evaluate((i) => window.scrollTo(0, i === 0 ? 0 : document.documentElement.scrollHeight), i);
      await pause(400);
      await champs.nth(i).focus();
      await pause(900);
      const v = await champs.nth(i).evaluate((e) => {
        const r = e.getBoundingClientRect();
        const n = document.querySelector('.bp-onglets').getBoundingClientRect();
        const l = document.querySelector('.bp-retour').getBoundingClientRect();
        const p = document.elementFromPoint(r.left + Math.min(40, r.width / 2), r.top + Math.min(20, r.height / 2));
        return { top: Math.round(r.top), bas: Math.round(r.bottom), retour: Math.round(l.bottom), onglets: Math.round(n.bottom), ih: innerHeight, focus: document.activeElement === e, dessus: p === e || e.contains(p) };
      });
      ok(`C3 clavier ouvert (hauteur 500) : ${nom} visible sous la barre d'onglets`, v.focus && v.top >= v.onglets && v.onglets >= v.retour && v.bas <= v.ih && v.dessus, JSON.stringify(v));
      await page.screenshot({ path: path.join(DOSSIER, `c3-clavier-${i === 0 ? 'premier' : 'dernier'}.png`) });
    }
    await page.setViewportSize({ width: 412, height: 869 });

    // ---------- C4: tapping Retour, from rest and from stuck state ----------
    for (const [chemin, nom] of [[`/p/${id}/m3`, 'module 3'], [`/p/${id}/m5`, 'module 5'], [`/p/${id}/exporter`, 'Exporter'], ['/a-propos', 'À propos']]) {
      for (const etat of ['repos', 'collee']) {
        await page.setViewportSize({ width: 412, height: chemin === '/a-propos' && etat === 'collee' ? 500 : 869 });
        await page.goto(BASE + chemin);
        await page.waitForSelector('.bp-retour a');
        await pause(700);
        if (etat === 'collee') await basDePage(page);
        const avant = await page.evaluate(() => ({ etat: document.querySelector('.bp-retour').getAttribute('data-barre-retour'), href: document.querySelector('.bp-retour a').getAttribute('href') }));
        await page.locator('.bp-retour a').tap();
        await page.waitForURL((u) => new URL(u).pathname === avant.href, { timeout: 10000 }).catch(() => undefined);
        await pause(500);
        const apres = new URL(page.url()).pathname;
        ok(`C4 ${nom}, ligne ${etat} : toucher Retour mène à ${avant.href}`, avant.etat === etat && apres === avant.href, JSON.stringify({ avant, apres }));
      }
    }
  }

  ok('aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
  console.log(`\n${res.filter(Boolean).length}/${res.length} OK`);
  await nav.close();
})();
