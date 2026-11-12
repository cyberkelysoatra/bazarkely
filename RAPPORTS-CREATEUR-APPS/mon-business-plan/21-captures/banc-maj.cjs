// NEC-CC-21 bench (NEC-172): the page switches by itself from build A to build B, without any tap.
// Usage: node banc-maj.cjs [base URL, default http://127.0.0.1:4180] [scenario a|b|c|all]
// The local server (serveur.cjs) serves build A or B, switched by GET /__servir?b=0|1.
// Test delays through localStorage: nec.test.majVerif = 5 s (check), nec.test.majInactif = 8 s (idle).
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const BASE = process.argv[2] || 'http://127.0.0.1:4180';
const QUOI = process.argv[3] || 'all';
const D = __dirname;
const VERIF = 5000;
const INACTIF = 8000;

const servir = (b) => fetch(`${BASE}/__servir?b=${b}`).then((r) => r.text());
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function ouvrir(browser, nom) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(([v, i]) => {
    try {
      localStorage.setItem('nec.test.majVerif', String(v));
      localStorage.setItem('nec.test.majInactif', String(i));
    } catch {}
  }, [VERIF, INACTIF]);
  const page = await ctx.newPage();
  const journal = { nom, erreurs: [], chargements: 0, console: [] };
  page.on('pageerror', (e) => journal.erreurs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') journal.console.push(m.text());
  });
  page.on('load', () => journal.chargements++);
  await page.goto(BASE + '/plan/');
  await page.getByText('Mes projets').first().waitFor({ timeout: 30000 });
  await page.getByText('Prêt pour le mode avion').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
  journal.innerWidth = await page.evaluate(() => innerWidth);
  return { ctx, page, journal };
}

const version = (page) => page.evaluate(() => document.documentElement.dataset.version).catch(() => null);

/** Waits until the page shows version `cible`; returns the delay in ms or null. */
async function attendreVersion(page, cible, max) {
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    if ((await version(page)) === cible) return Date.now() - t0;
    await attendre(500);
  }
  return null;
}

async function nouveauPlan(page, prenom) {
  await page.getByRole('button', { name: /Nouveau projet|Créer|Commencer/ }).first().click();
  await page.waitForURL(/\/p\/[^/]+/, { timeout: 15000 });
  const id = page.url().match(/\/p\/([^/?#]+)/)[1];
  await page.goto(`${BASE}/plan/p/${id}/identite`);
  const champ = page.locator('input[type="text"], input:not([type]), textarea').first();
  await champ.waitFor({ timeout: 15000 });
  return { id, champ };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const out = {};
  const VA = process.env.VA;
  const VB = process.env.VB;

  if (QUOI === 'a' || QUOI === 'all') {
    // (a) page open on A, nobody touches it; B is served; the page switches by itself.
    await servir(0);
    const { ctx, page, journal } = await ouvrir(browser, 'a');
    journal.avant = await version(page);
    await page.evaluate(() => {
      window.__marque = 1;
    });
    await servir(1);
    const t = await attendreVersion(page, VB, 60000);
    journal.apres = await version(page);
    journal.delaiMs = t;
    journal.recharge = (await page.evaluate(() => window.__marque === 1)) === false;
    journal.banniereVisible = await page.locator('.bp-maj').isVisible().catch(() => false);
    await page.screenshot({ path: `${D}/a-apres-bascule.png` });
    // (d) airplane mode after the switch: the plan list and a plan open from the cache.
    await ctx.setOffline(true);
    await page.goto(BASE + '/plan/');
    journal.horsLigneAccueil = await page.getByText('Mes projets').first().isVisible({ timeout: 15000 }).catch(() => false);
    journal.horsLigneVersion = await version(page);
    const { id } = await (async () => {
      await ctx.setOffline(false);
      const r = await nouveauPlan(page, 'TEST-CC21-A');
      return r;
    })();
    await ctx.setOffline(true);
    await page.goto(`${BASE}/plan/p/${id}`);
    await page.waitForTimeout(1500);
    journal.horsLignePlanOuvert = (await page.locator('body').innerText()).includes('Sommaire du cahier');
    journal.horsLigneVersionPlan = await version(page);
    await page.screenshot({ path: `${D}/d-mode-avion-apres-bascule.png` });
    out.a = journal;
    await ctx.close();
  }

  if (QUOI === 'b' || QUOI === 'all') {
    // (b) typing in a field when B arrives: no reload while typing; the text is there after the switch.
    await servir(0);
    const { ctx, page, journal } = await ouvrir(browser, 'b');
    const { champ } = await nouveauPlan(page, 'TEST-CC21-B');
    journal.avant = await version(page);
    await champ.click();
    await page.evaluate(() => {
      window.__marque = 1;
    });
    await servir(1);
    const texte = 'TEST-CC21 saisie longue pendant la mise a jour';
    // 46 characters, one every 1.2 s: about 55 s of typing, far beyond the check (5 s) and idle (8 s) delays.
    let rechargePendant = false;
    for (const c of texte) {
      await page.keyboard.type(c);
      await attendre(1200);
      if ((await page.evaluate(() => window.__marque === 1).catch(() => false)) === false) {
        rechargePendant = true;
        break;
      }
    }
    journal.rechargePendantSaisie = rechargePendant;
    journal.versionPendantSaisie = await version(page);
    journal.attenteSignalee = await page.locator('.bp-maj').isVisible().catch(() => false);
    const t = await attendreVersion(page, VB, 40000);
    journal.delaiApresSaisieMs = t;
    journal.apres = await version(page);
    await page.waitForTimeout(1500);
    const champApres = page.locator('input[type="text"], input:not([type]), textarea').first();
    journal.texteApres = await champApres.inputValue().catch(() => null);
    journal.texteConserve = journal.texteApres === texte;
    await page.screenshot({ path: `${D}/b-saisie-conservee.png` });
    out.b = journal;
    await ctx.close();
  }

  if (QUOI === 'c' || QUOI === 'all') {
    // (c) offline when B is checked: no error, the switch happens after `online`.
    await servir(0);
    const { ctx, page, journal } = await ouvrir(browser, 'c');
    journal.avant = await version(page);
    await ctx.setOffline(true);
    await servir(1);
    await attendre(25000);
    journal.versionHorsLigne = await version(page);
    journal.erreursHorsLigne = [...journal.erreurs];
    await ctx.setOffline(false);
    const t = await attendreVersion(page, VB, 60000);
    journal.delaiApresRetourMs = t;
    journal.apres = await version(page);
    await page.screenshot({ path: `${D}/c-apres-retour-reseau.png` });
    out.c = journal;
    await ctx.close();
  }

  out.VA = VA;
  out.VB = VB;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  await servir(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
