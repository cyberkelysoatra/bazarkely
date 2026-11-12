// NEC-CC-19 bench: the evening PDF of 3 plans, generated from the export screen at 412 px.
// Usage: node banc-pdf.cjs [base URL] [suffix] [offline: 1|0]
// Plans (a) and (c) are created in the app's own storage (IndexedDB) from the page, then exported
// through the real "Télécharger le PDF" button; (b) is the read-only example JUS'NOSY.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const SUFFIXE = process.argv[3] || 'local';
const HORS_LIGNE = process.argv[4] === '1';
const D = __dirname;

async function creer(page, sorte) {
  // Dev server: modules by source path; production build: through the app's own storage is not
  // importable, so plans are built from the backup file format and restored by the real screen.
  return page.evaluate(async (sorte) => {
    const { planVide } = await import('/src/modules/business-plan/etat/vide.ts');
    const { planExemple } = await import('/src/modules/business-plan/data/exemple/index.ts');
    const { creerPlan } = await import('/src/modules/business-plan/db/plans.ts');
    const p = planVide();
    if (sorte === 'a') {
      Object.assign(p.identite, {
        nomPrenom: 'Rasoa Hanta', nomProjet: 'JUS DES ECOLES', telephone: '0340000000', email: 'rasoa@exemple.mg',
        secteur: 'agriculture', lieu: 'Hell-Ville', unePhrase: 'Des jus frais et sains pour les élèves de Hell-Ville.',
        avancement: 'idee', porteurs: 'Rasoa, porteuse du projet', attentes: 'Un plan clair à présenter au jury.'
      });
      p.m1.consequences = 'Caries, enfants fatigués l\u2019après-midi.';
      p.m1.probleme = 'Les élèves boivent des sodas sucrés à la récréation.';
      p.m1.causes = 'Aucun jus local vendu près des écoles.';
      p.m1.client.qui = 'Les parents d\u2019élèves des écoles de Hell-Ville';
      p.m1.client.ou = 'Hell-Ville, devant les 4 écoles primaires';
      p.m1.client.combien = 'Environ 1 200 familles';
    } else {
      const ex = planExemple();
      p.identite = { ...ex.identite, nomProjet: 'MODULES 1 A 3' };
      p.m1 = ex.m1;
      p.m2 = ex.m2;
      p.m3 = ex.m3;
      p.uniteVente = ex.uniteVente;
    }
    delete p.id;
    const cree = await creerPlan(p);
    return cree.id;
  }, sorte);
}

async function telechargerPdf(page, nom) {
  await page.locator('.bp-telecharger-pdf').waitFor({ timeout: 15000 });
  const explication = await page.locator('.bp-pdf-explication').innerText();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('.bp-telecharger-pdf').click()]);
  const chemin = `${D}/${nom}.pdf`;
  await dl.saveAs(chemin);
  return { explication, octets: fs.statSync(chemin).size, fichier: dl.suggestedFilename() };
}

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

  if (HORS_LIGNE) {
    // Production build: plan (a) restored from a backup file, then the PDF made in airplane mode.
    await page.getByText('Prêt pour le mode avion').waitFor({ timeout: 90000 });
    await page.getByRole('button', { name: /Restaurer une sauvegarde/ }).click().catch(() => {});
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(`${D}/plan-a-sauvegarde.json`);
    await page.waitForURL(/\/p\//, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const id = await page.evaluate(async () => {
      const bases = await indexedDB.databases();
      return bases.map((b) => b.name).join(',');
    });
    r.bases = id;
    await ctx.setOffline(true);
    r.onLine = await page.evaluate(() => navigator.onLine);
    const url = page.url();
    const m = url.match(/\/p\/([^/]+)/);
    r.url = url;
    if (m) {
      await page.goto(`${BASE}/plan/p/${m[1]}/exporter`);
      r.a = await telechargerPdf(page, `a-partiel-${SUFFIXE}`);
    }
    await page.screenshot({ path: `${D}/exporter-${SUFFIXE}.png`, fullPage: true });
  } else {
    const idA = await creer(page, 'a');
    await page.goto(`${BASE}/plan/p/${idA}/exporter`);
    r.a = await telechargerPdf(page, `a-partiel-${SUFFIXE}`);
    await page.screenshot({ path: `${D}/exporter-${SUFFIXE}.png`, fullPage: true });
    // Backup file of (a) kept for the airplane-mode check on the production build.
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.bp-sauvegarder').click()]);
    await dl.saveAs(`${D}/plan-a-sauvegarde.json`);
    await page.goto(`${BASE}/plan/p/exemple/exporter`);
    r.b = await telechargerPdf(page, `b-jusnosy-${SUFFIXE}`);
    const idC = await creer(page, 'c');
    await page.goto(`${BASE}/plan/p/${idC}/exporter`);
    r.c = await telechargerPdf(page, `c-modules-1-3-${SUFFIXE}`);
  }
  r.defilementHorizontal = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  r.erreurs = erreurs;
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
