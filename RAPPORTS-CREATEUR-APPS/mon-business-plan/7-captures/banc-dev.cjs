// Bench NEC-CC-07 (sticky header, locked trainer screen, logos v2, trainer sign-in link), dev server
// port argv[2] (default 3008), Chrome at 412 x 869, DPR 3.5, touch.
// C1 header top 0 after scrolling + module 5 tab bar right under it; C2 focused input visible under
// the header with a keyboard (viewport 500 high); C3 trainer screen refused without the trainer
// session; C4 trainer session with mocked RPC, then NON_AUTORISE; C8 sign-in link and re-read of the
// stored session on visibilitychange.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const path = require('path');
const PORT = process.argv[2] || 3008;
const BASE = `http://localhost:${PORT}/plan`;
const DOSSIER = __dirname;
const CLE = 'sb-ofzmwrzatcztoekrpvkj-auth-token';
const res = [];
const ok = (nom, cond, detail = '') => {
  res.push(!!cond);
  console.log(`${cond ? 'OK ' : 'KO '} ${nom}${detail ? ' : ' + detail : ''}`);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const session = (email, id) =>
  JSON.stringify({ access_token: 'faux', refresh_token: 'faux', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, email, aud: 'authenticated' } });

/** Header measures: top, bottom, fully visible, on top at its center (elementFromPoint). */
async function mesure(page) {
  return page.evaluate(() => {
    const h = document.querySelector('header.bp-entete');
    const r = h.getBoundingClientRect();
    const dessus = (x, y) => {
      const e = document.elementFromPoint(x, y);
      return !!e && h.contains(e);
    };
    const nav = document.querySelector('.bp-onglets');
    const rn = nav ? nav.getBoundingClientRect() : null;
    const surNav = rn ? (() => { const e = document.elementFromPoint(rn.left + rn.width / 2, rn.top + rn.height / 2); return !!e && nav.contains(e); })() : null;
    const imgs = [...h.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), nw: i.naturalWidth, nh: i.naturalHeight, h: Math.round(i.getBoundingClientRect().height) }));
    return {
      iw: innerWidth,
      ih: innerHeight,
      scrollY: Math.round(scrollY),
      max: Math.round(document.documentElement.scrollHeight - innerHeight),
      top: r.top,
      bas: Math.round(r.bottom * 10) / 10,
      visible: r.top === 0 && r.bottom <= innerHeight && dessus(r.left + 30, r.top + r.height / 2) && dessus(r.right - 30, r.top + r.height / 2) && dessus(r.left + r.width / 2, r.top + r.height / 2),
      nav: rn ? { top: Math.round(rn.top * 10) / 10, bas: Math.round(rn.bottom * 10) / 10, dessus: surNav } : null,
      imgs
    };
  });
}

async function basDePage(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await pause(500);
}

(async () => {
  const nav = await chromium.launch({ channel: 'chrome', headless: true });
  const opts = { viewport: { width: 412, height: 869 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR' };

  // ---------- C1, C2, C8 (part 1): no stored session ----------
  const ctx = await nav.newContext(opts);
  const supa = [];
  ctx.on('request', (r) => /supabase\.co/.test(r.url()) && supa.push(r.url()));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => /WebSocket closed without opened/.test(String(e)) || erreurs.push(String(e)));
  await page.goto(BASE + '/');
  await page.waitForSelector('text=Mes projets', { timeout: 120000 });
  const d = await page.evaluate(() => ({ iw: innerWidth, dpr: devicePixelRatio }));
  ok('banc : innerWidth 412, DPR 3,5', d.iw === 412 && d.dpr === 3.5, JSON.stringify(d));

  // Copy of the example (filled plan: long pages).
  await page.goto(BASE + '/p/exemple');
  await page.getByRole('button', { name: "Copier l'exemple pour m'entraîner" }).click();
  await page.waitForURL(/\/p\/(?!exemple)[^/]+$/);
  const id = page.url().split('/p/')[1].split('/')[0];

  const ecrans = [
    ['accueil', '/', 'Accueil'],
    ['sommaire', `/p/${id}`, 'Sommaire'],
    ['m3', `/p/${id}/m3`, 'Module 3'],
    ['m5', `/p/${id}/m5`, 'Module 5'],
    ['exporter', `/p/${id}/exporter`, 'Exporter'],
    ['apropos', '/a-propos', 'À propos'],
    ['inviter', '/inviter', 'Inviter'],
    ['formation', `/p/${id}/formation`, 'Formation'],
    ['m1', `/p/${id}/m1`, 'Module 1'],
    ['identite', `/p/${id}/identite`, 'Identité']
  ];
  for (const [cle, chemin, nom] of ecrans) {
    await page.goto(BASE + chemin);
    await page.waitForSelector('header.bp-entete');
    await pause(800);
    const haut = await mesure(page);
    if (['accueil', 'sommaire', 'm3', 'm5', 'exporter'].includes(cle)) await page.screenshot({ path: path.join(DOSSIER, `c1-${cle}-haut.png`) });
    await basDePage(page);
    const bas = await mesure(page);
    if (['accueil', 'sommaire', 'm3', 'm5', 'exporter'].includes(cle)) await page.screenshot({ path: path.join(DOSSIER, `c1-${cle}-bas.png`) });
    ok(`C1 ${nom} : en-tête en haut (top 0) et entier après défilement jusqu'en bas`, bas.visible && bas.top === 0 && (bas.max === 0 || bas.scrollY > 0), JSON.stringify({ scrollY: bas.scrollY, max: bas.max, top: bas.top, bas: bas.bas }));
    ok(`C5/C1 ${nom} : logos v2 chargés (160 px de haut), affichés à 44 px`, bas.imgs.length === 2 && bas.imgs.every((i) => /-v2\.png$/.test(i.src) && i.nh === 160 && i.h === 44), JSON.stringify(bas.imgs));
  }

  // Module 5: each tab, the tab bar sits right under the header, never covered.
  await page.goto(`${BASE}/p/${id}/m5`);
  await page.waitForSelector('.bp-onglets');
  await pause(600);
  for (const s of ['5a', '5b', '5c', '5d', '5e', '5f']) {
    await page.locator('.bp-onglets button', { hasText: s }).first().tap();
    await pause(1200);
    const m = await mesure(page);
    const sec = await page.evaluate((s) => Math.round(document.getElementById('s' + s).getBoundingClientRect().top), s);
    ok(`C1 module 5 onglet ${s} : en-tête top 0, barre d'onglets collée dessous et visible, section sous la barre`, m.visible && Math.abs(m.nav.top - m.bas) <= 1 && m.nav.dessus && (sec >= m.nav.bas - 1 || m.scrollY >= m.max - 1), JSON.stringify({ entete: m.bas, nav: m.nav, section: sec, scrollY: m.scrollY, max: m.max }));
    await page.screenshot({ path: path.join(DOSSIER, `c1-m5-onglet-${s}.png`) });
  }
  // Header above the tab bar above the content.
  const z = await page.evaluate(() => ({ entete: getComputedStyle(document.querySelector('header.bp-entete')).zIndex, nav: getComputedStyle(document.querySelector('.bp-onglets')).zIndex }));
  ok('C1 empilement : en-tête 30 au-dessus des onglets 10', z.entete === '30' && z.nav === '10', JSON.stringify(z));

  // ---------- C2: keyboard open (viewport 500 high), input low in module 5 ----------
  await page.setViewportSize({ width: 412, height: 500 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(400);
  const champs = page.locator('#s5f input, #s5f textarea');
  const n = await champs.count();
  for (const [i, nom] of [[n - 1, 'dernier champ de 5f'], [0, 'premier champ de 5f']]) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await pause(300);
    if (i === 0) await page.evaluate(() => window.scrollTo(0, 0));
    await pause(300);
    await champs.nth(i).focus();
    await pause(800);
    const v = await champs.nth(i).evaluate((e) => {
      const r = e.getBoundingClientRect();
      const h = document.querySelector('header.bp-entete').getBoundingClientRect();
      const n = document.querySelector('.bp-onglets').getBoundingClientRect();
      const x = r.left + Math.min(40, r.width / 2);
      const y = r.top + Math.min(20, r.height / 2);
      const p = document.elementFromPoint(x, y);
      return { top: Math.round(r.top), bas: Math.round(r.bottom), entete: Math.round(h.bottom), onglets: Math.round(n.bottom), ih: innerHeight, focus: document.activeElement === e, dessus: p === e || e.contains(p) };
    });
    ok(`C2 clavier ouvert (hauteur 500) : ${nom} visible sous l'en-tête et les onglets`, v.focus && v.top >= v.onglets && v.bas <= v.ih && v.dessus, JSON.stringify(v));
    await page.screenshot({ path: path.join(DOSSIER, `c2-clavier-${i === 0 ? 'premier' : 'dernier'}.png`) });
  }
  // Same in module 1 (no tab bar): input under the header only.
  await page.goto(`${BASE}/p/${id}/m1`);
  await page.waitForSelector('.bp-champ');
  await pause(600);
  const c1 = page.locator('.bp-champ');
  const k = await c1.count();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await pause(300);
  await c1.nth(0).focus();
  await pause(800);
  const v1 = await c1.nth(0).evaluate((e) => ({ top: Math.round(e.getBoundingClientRect().top), entete: Math.round(document.querySelector('header.bp-entete').getBoundingClientRect().bottom) }));
  ok(`C2 module 1 : premier champ (sur ${k}) remonté sous l'en-tête`, v1.top >= v1.entete, JSON.stringify(v1));
  await page.setViewportSize({ width: 412, height: 869 });

  // ---------- C8 part 1: sign-in link on À propos only ----------
  await page.goto(BASE + '/');
  await page.waitForSelector('text=Mes projets');
  ok("C8 Accueil sans session : pas de lien « Connexion formateur », pas de « Suivi formateur »", (await page.locator('.bp-lien-connexion').count()) === 0 && (await page.getByText('Connexion formateur').count()) === 0 && (await page.locator('.bp-lien-formateur').count()) === 0);
  await page.goto(BASE + '/a-propos');
  await page.waitForSelector('.bp-lien-connexion');
  const lien = await page.locator('.bp-lien-connexion').evaluate((a) => {
    const r = a.getBoundingClientRect();
    const tout = [...document.querySelectorAll('main *')];
    return { href: a.getAttribute('href'), texte: a.textContent, target: a.getAttribute('target'), h: Math.round(r.height), w: Math.round(r.width), couleur: getComputedStyle(a).color, ligne: a.nextElementSibling?.textContent, dernier: !tout.some((e) => e.getBoundingClientRect().top > a.parentElement.getBoundingClientRect().bottom) };
  });
  ok('C8 À propos sans session : lien « Connexion formateur » vers https://1sakely.org/, même onglet, 44 px, texte doux, tout en bas, phrase dessous', lien.href === 'https://1sakely.org/' && lien.texte === 'Connexion formateur' && !lien.target && lien.h >= 44 && lien.w >= 44 && lien.couleur === 'rgb(102, 102, 102)' && lien.dernier && lien.ligne === 'Connectez-vous avec Google, puis revenez sur Mon Business Plan par le sélecteur de modules.', JSON.stringify(lien));
  await page.screenshot({ path: path.join(DOSSIER, 'c8-apropos-sans-session.png'), fullPage: true });

  ok('aucune requête Supabase sans session (C1, C2, C8)', supa.length === 0, `${supa.length} ${supa.slice(0, 2).join(' ')}`);

  // ---------- C8 part 2: fake trainer session stored, then visibilitychange, no reload ----------
  await ctx.route('**/rest/v1/users**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin', preferences: { modules: ['bazarkely'] } }) })
  );
  await page.goto(BASE + '/');
  await page.waitForSelector('text=Mes projets');
  await page.evaluate(() => (window.__sansRechargement = 1));
  await page.evaluate(
    ([cle, s]) => {
      localStorage.setItem(cle, s);
      document.dispatchEvent(new Event('visibilitychange'));
    },
    [CLE, session('joelsoatra@gmail.com', 'u-joel')]
  );
  await page.waitForSelector('.bp-lien-formateur', { timeout: 5000 }).catch(() => undefined);
  await page.waitForSelector('button[data-bp-logo]', { timeout: 10000 }).catch(() => undefined);
  const apres = await page.evaluate(() => ({ marque: window.__sansRechargement, lien: !!document.querySelector('.bp-lien-formateur'), bouton: !!document.querySelector('button[data-bp-logo]') }));
  ok('C8 session posée + visibilitychange, sans rechargement : « Suivi formateur » apparaît, B-lossom devient un bouton', apres.marque === 1 && apres.lien && apres.bouton, JSON.stringify(apres));
  await page.screenshot({ path: path.join(DOSSIER, 'c8-accueil-apres-connexion.png') });
  await page.getByText('À propos et confidentialité').tap();
  await page.waitForSelector('.bp-connexion');
  const ap = await page.evaluate(() => ({ marque: window.__sansRechargement, texte: document.querySelector('.bp-connexion').innerText, lien: !!document.querySelector('.bp-lien-connexion') }));
  ok('C8 À propos : « Connecté : joelsoatra@gmail.com » et rien d\'autre', ap.marque === 1 && ap.texte === 'Connecté : joelsoatra@gmail.com' && !ap.lien, JSON.stringify(ap));
  await page.screenshot({ path: path.join(DOSSIER, 'c8-apropos-connecte.png'), fullPage: true });
  // Signing out on the host: the trainer link disappears on return, without reload.
  await page.evaluate((cle) => {
    localStorage.removeItem(cle);
    window.dispatchEvent(new Event('focus'));
  }, CLE);
  await pause(300);
  ok('C8 session retirée + focus : lien de connexion de retour', (await page.locator('.bp-lien-connexion').count()) === 1);
  ok('aucune erreur de page (C1, C2, C8)', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();

  // ---------- C3: no session, then another account ----------
  for (const [nomCas, s] of [['sans session', null], ['autre compte (x@y.z)', session('x@y.z', 'u-autre')]]) {
    const c = await nav.newContext(opts);
    const req = [];
    c.on('request', (r) => /supabase\.co/.test(r.url()) && req.push(r.url()));
    await c.addInitScript(
      ([cle, s]) => {
        if (s) localStorage.setItem(cle, s);
        // Every frame: any trainer content ever added to the page is logged.
        window.__formateurVu = [];
        new MutationObserver(() => {
          const t = document.body ? document.body.innerText : '';
          if (document.querySelector('.bp-suivi, .bp-participant, .bp-rubrique, .bp-reserve, .bp-patience') || /Suivi formateur|Réservé au formateur|participant/.test(t.replace(/Inviter un participant/g, '')))
            window.__formateurVu.push(location.pathname);
        }).observe(document, { childList: true, subtree: true, characterData: true });
      },
      [CLE, s]
    );
    const p = await c.newPage();
    for (const chemin of ['/formateur', '/formateur/abc-123', '/formateur/abc-123/m5']) {
      await p.goto(BASE + chemin);
      await p.waitForSelector('text=Mes projets', { timeout: 60000 });
      await pause(700);
      const r = await p.evaluate(() => ({ chemin: location.pathname, vu: window.__formateurVu, longueur: history.length }));
      ok(`C3 ${nomCas} : ${chemin} renvoie sur /plan/ sans rien afficher du formateur`, r.chemin === '/plan/' && r.vu.length === 0, JSON.stringify(r));
    }
    // Replace: Back does not return to /formateur.
    await p.goto(BASE + '/a-propos');
    await p.waitForSelector('.bp-connexion');
    await p.evaluate(() => {
      history.pushState({}, '', '/plan/formateur');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await p.waitForURL(`${BASE}/`);
    await p.goBack();
    await pause(500);
    ok(`C3 ${nomCas} : redirection sans entrée d'historique (Retour = À propos)`, new URL(p.url()).pathname === '/plan/a-propos', p.url());
    await p.goto(BASE + '/');
    await p.waitForSelector('text=Mes projets');
    ok(`C3 ${nomCas} : lien « Suivi formateur » absent de l'Accueil`, (await p.locator('.bp-lien-formateur').count()) === 0);
    const supaFormateur = req.filter((u) => !/rest\/v1\/users/.test(u));
    ok(`C3 ${nomCas} : 0 requête Supabase du formateur`, supaFormateur.length === 0 && (s ? true : req.length === 0), `${req.length} requête(s) dont users : ${req.filter((u) => /users/.test(u)).length}`);
    await c.close();
  }

  // ---------- C4: trainer session, mocked RPC ----------
  const c4 = await nav.newContext(opts);
  await c4.addInitScript(([cle, s]) => localStorage.setItem(cle, s), [CLE, session('joelsoatra@gmail.com', 'u-joel')]);
  await c4.route('**/rest/v1/users**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin', preferences: {} }) }));
  let refuser = false;
  const refus = (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: 'NON_AUTORISE', details: null, hint: null }) });
  await c4.route('**/rest/v1/rpc/bp_admin_liste', (route) =>
    refuser
      ? refus(route)
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ plan_id: 'p-banc', prenom: 'Banc', nom_projet: 'Projet du banc', progression: { identite: 100 }, alertes: [], maj_at: new Date().toISOString(), vu_at: new Date().toISOString() }]) })
  );
  await c4.route('**/rest/v1/rpc/bp_admin_session', (route) => (refuser ? refus(route) : route.fulfill({ status: 200, contentType: 'application/json', body: 'true' })));
  await c4.route('**/rest/v1/rpc/bp_admin_plan', (route) => refus(route));
  const p4 = await c4.newPage();
  await p4.goto(BASE + '/');
  await p4.waitForSelector('.bp-lien-formateur', { timeout: 60000 });
  ok('C4 session joelsoatra@gmail.com : lien « Suivi formateur » présent', true);
  await p4.locator('.bp-lien-formateur').tap();
  await p4.waitForSelector('.bp-participant', { timeout: 30000 });
  const m4 = await mesure(p4);
  ok("C4 l'écran formateur s'ouvre et liste le participant simulé", new URL(p4.url()).pathname === '/plan/formateur' && (await p4.locator('.bp-participant').count()) === 1, p4.url());
  await basDePage(p4);
  const m4b = await mesure(p4);
  ok('C1 écran formateur : en-tête top 0', m4.visible && m4b.visible, JSON.stringify({ haut: m4.top, bas: m4b.top }));
  await p4.screenshot({ path: path.join(DOSSIER, 'c4-formateur.png') });
  // FormateurPlan with NON_AUTORISE.
  await p4.goto(BASE + '/formateur/p-banc');
  await p4.waitForURL(`${BASE}/`, { timeout: 30000 });
  ok('C4 bp_admin_plan NON_AUTORISE : renvoi sur /plan/', new URL(p4.url()).pathname === '/plan/', p4.url());
  // List with NON_AUTORISE.
  refuser = true;
  await p4.goto(BASE + '/formateur');
  await p4.waitForURL(`${BASE}/`, { timeout: 30000 });
  await pause(500);
  ok('C4 bp_admin_liste NON_AUTORISE : renvoi sur /plan/', new URL(p4.url()).pathname === '/plan/' && (await p4.locator('.bp-reserve').count()) === 0, p4.url());
  await c4.close();

  console.log(`\n${res.filter(Boolean).length}/${res.length} OK`);
  await nav.close();
})();
