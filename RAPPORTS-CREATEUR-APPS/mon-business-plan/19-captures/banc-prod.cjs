// NEC-CC-19 production check: version in "À propos", then plan (a) restored from its backup file and its
// PDF made in airplane mode (context offline), at 412 px.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const fs = require('fs');
const BASE = 'https://1sakely.org';
const D = __dirname;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const r = {};
  await page.goto(BASE + '/plan/');
  await page.getByText('Mes projets').first().waitFor({ timeout: 30000 });
  r.innerWidth = await page.evaluate(() => innerWidth);
  r.version = (await page.content()).match(/Version 3\.\d+\.\d+/)?.[0] ?? null;
  if (!r.version) {
    await page.goto(BASE + '/plan/a-propos').catch(() => {});
    await page.waitForTimeout(3000);
    r.version = (await page.content()).match(/Version 3\.\d+\.\d+/)?.[0] ?? null;
    await page.goto(BASE + '/plan/');
    await page.getByText('Mes projets').first().waitFor({ timeout: 30000 });
  }
  await page.getByText('Prêt pour le mode avion').waitFor({ timeout: 120000 });
  await page.locator('.bp-restaurer input[type="file"]').setInputFiles(`${D}/plan-a-sauvegarde.json`);
  await page.waitForTimeout(2500);
  r.apresRestauration = page.url();
  await ctx.setOffline(true);
  r.onLine = await page.evaluate(() => navigator.onLine);
  // Reload offline: the app must come from the service worker cache.
  await page.goto(BASE + '/plan/');
  await page.getByText('JUS DES ECOLES').first().click();
  await page.waitForURL(/\/p\//, { timeout: 15000 });
  const id = page.url().match(/\/p\/([^/]+)/)[1];
  await page.goto(`${BASE}/plan/p/${id}/exporter`);
  await page.locator('.bp-telecharger-pdf').waitFor({ timeout: 15000 });
  r.explication = await page.locator('.bp-pdf-explication').innerText();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('.bp-telecharger-pdf').click()]);
  await dl.saveAs(`${D}/a-partiel-prod-hors-ligne.pdf`);
  r.pdf = { fichier: dl.suggestedFilename(), octets: fs.statSync(`${D}/a-partiel-prod-hors-ligne.pdf`).size };
  await page.screenshot({ path: `${D}/exporter-prod-hors-ligne.png`, fullPage: true });
  r.defilementHorizontal = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  r.erreurs = erreurs;
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
