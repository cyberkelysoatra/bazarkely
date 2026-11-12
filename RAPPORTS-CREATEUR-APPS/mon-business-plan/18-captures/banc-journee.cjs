// NEC-CC-18 bench: "Ma journée" timeline, day gauge, end-of-step celebration, at 412 px.
// Usage: node banc-journee.cjs [base URL] [suffix] [offline: 1|0]
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const SUFFIXE = process.argv[3] || 'local';
const HORS_LIGNE = process.argv[4] === '1';
const D = __dirname;

async function remplirIdentite(page) {
  await page.getByLabel('Nom et prénom').fill('Rasoa Test');
  await page.getByLabel('Nom du projet').fill('BANC JOURNEE');
  await page.getByText('Agriculture', { exact: true }).click();
  await page.getByLabel('Lieu').fill('Hell-Ville');
  await page.getByLabel('Mon projet en une phrase').fill('Je vends des jus aux hôtels.');
  await page.getByText("C'est une idée", { exact: true }).click();
  await page.getByLabel('Porteurs du projet et rôles').fill('Moi');
  await page.getByLabel("Ce que j'attends de ces deux jours").fill('Un plan solide');
}

async function contexte(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, ...opts });
  await ctx.addInitScript(() => {
    window.__vibrations = [];
    navigator.vibrate = (x) => (window.__vibrations.push(x), true);
  });
  return ctx;
}

async function nouveauPlan(page) {
  await page.goto(BASE + '/plan/');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  await page.waitForURL(/\/p\//);
  return page.url().match(/\/p\/([^/]+)/)[1];
}

async function preparer(page, ctx) {
  await page.goto(BASE + '/plan/');
  if (HORS_LIGNE) {
    await page.getByText('Prêt pour le mode avion').waitFor({ timeout: 90000 });
    await ctx.setOffline(true);
    await page.reload();
    await page.getByText('Mes projets').waitFor({ timeout: 15000 });
  }
}

const pouls = (p) => p.$$eval('.bp-pouls', (e) => e.map((x) => x.closest('li').dataset.etape));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const r = {};
  const erreurs = [];
  const ctx = await contexte(browser);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erreurs.push(e.message));
  await preparer(page, ctx);
  r.onLine = await page.evaluate(() => navigator.onLine);
  r.innerWidth = await page.evaluate(() => innerWidth);
  r.script = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean).join(' '));

  // Fresh plan: contents page with the timeline.
  const id = await nouveauPlan(page);
  await page.goto(`${BASE}/plan/p/${id}`);
  await page.locator('.bp-journee').waitFor({ timeout: 15000 });
  r.vide = {
    heure: await page.evaluate(() => new Date().toTimeString().slice(0, 5)),
    pouls: await pouls(page),
    courante: await page.locator('.bp-etape-courante').innerText(),
    badge: await page.locator('.bp-badge-ecart').allInnerTexts(),
    restantes: await page.locator('.bp-restantes').innerText(),
    jauge: await page.locator('[aria-label="Ma journée est faite à"]').getAttribute('aria-valuenow'),
    facultatifs: await page.locator('.bp-facultatif').count(),
    defilementHorizontal: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  };
  await page.screenshot({ path: `${D}/sommaire-vide-${SUFFIXE}.png` });

  // Identity: the overlay appears when its last field is filled during the visit.
  await page.goto(`${BASE}/plan/p/${id}/identite`);
  await page.getByLabel('Nom et prénom').waitFor({ timeout: 15000 });
  await remplirIdentite(page);
  await page.getByRole('dialog').waitFor({ timeout: 5000 });
  r.fete1 = await page.getByRole('dialog').innerText();
  await page.getByRole('button', { name: 'Rester ici' }).click();

  // Module 1: field by field, the overlay must appear only after the last one.
  await page.goto(`${BASE}/plan/p/${id}/m1`);
  await page.locator('main textarea').first().waitFor({ timeout: 15000 });
  const champs = page.locator('main textarea, main input:not([type]), main input[type="text"]');
  const n = await champs.count();
  let remplis = 0;
  let apparueApres = null;
  for (let i = 0; i < n; i++) {
    const c = champs.nth(i);
    if (!(await c.isVisible()) || (await c.inputValue()).trim()) continue;
    await c.fill(`Réponse ${i + 1}`);
    remplis++;
    await page.waitForTimeout(80);
    if (await page.getByRole('dialog').count()) {
      apparueApres = remplis;
      break;
    }
  }
  r.m1 = { champsVisibles: n, apparueApresChampRempli: apparueApres };
  await page.getByRole('dialog').waitFor({ timeout: 5000 });
  r.m1.texte = await page.getByRole('dialog').innerText();
  r.m1.focus = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
  r.m1.confettisAuDebut = await page.locator('.bp-confetti').count();
  r.m1.vibrations = await page.evaluate(() => window.__vibrations);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${D}/fin-etape-${SUFFIXE}.png` });
  await page.waitForTimeout(1600);
  r.m1.confettisApres2s = await page.locator('.bp-confetti').count();
  r.m1.fetes = await page.evaluate((id) => localStorage.getItem('nec.fetes.' + id), id);
  await page.keyboard.press('Escape');
  r.m1.fermeParEchap = (await page.getByRole('dialog').count()) === 0;

  // Reload and reopen module 1: never again.
  await page.reload();
  await page.locator('main textarea').first().waitFor({ timeout: 15000 });
  await page.locator('main textarea').first().fill('Réponse modifiée');
  await page.waitForTimeout(1200);
  r.m1.apresRechargement = await page.getByRole('dialog').count();

  // A step finished "before this version" (not recorded): silent, then recorded.
  await page.evaluate((id) => localStorage.removeItem('nec.fetes.' + id), id);
  await page.goto(`${BASE}/plan/p/${id}/m1`);
  await page.locator('main textarea').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  r.ancienPlan = { overlay: await page.getByRole('dialog').count(), noteEnSilence: await page.evaluate((id) => localStorage.getItem('nec.fetes.' + id), id) };

  // Contents page after identity and module 1.
  await page.goto(`${BASE}/plan/p/${id}`);
  await page.locator('.bp-journee').waitFor({ timeout: 15000 });
  r.apres = {
    faits: await page.$$eval('.bp-point', (e) => e.map((x, i) => (x.getAttribute('aria-label').includes(', faite') ? i + 1 : null)).filter(Boolean)),
    pouls: await pouls(page),
    courante: await page.locator('.bp-etape-courante').innerText(),
    badge: await page.locator('.bp-badge-ecart').allInnerTexts(),
    restantes: await page.locator('.bp-restantes').innerText(),
    jauge: await page.locator('[aria-label="Ma journée est faite à"]').getAttribute('aria-valuenow')
  };
  await page.screenshot({ path: `${D}/sommaire-journee-${SUFFIXE}.png` });
  await page.locator('.bp-journee').screenshot({ path: `${D}/frise-badge-${SUFFIXE}.png` });
  await page.locator('[data-etape="9"] a').click();
  await page.waitForURL(/\/synthese$/);
  r.point9 = page.url().replace(BASE, '');

  // Project list: the day gauge.
  await page.goto(BASE + '/plan/');
  await page.locator('.bp-projet').first().waitFor({ timeout: 15000 });
  r.accueil = await page.$$eval('.bp-projet', (els) =>
    els
      .filter((e) => e.innerText.includes('BANC JOURNEE'))
      .map((e) => ({ jauge: e.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), label: e.innerText.includes('Ma journée est faite à') }))
  );
  await page.locator('.bp-projet', { hasText: 'BANC JOURNEE' }).first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${D}/accueil-jauge-${SUFFIXE}.png` });

  // Example plan: no timeline, no celebration.
  await page.goto(BASE + '/plan/p/exemple');
  await page.locator('.bp-rubrique').first().waitFor({ timeout: 15000 });
  r.exemple = { frise: await page.locator('.bp-journee').count() };
  await page.goto(BASE + '/plan/p/exemple/m1');
  await page.waitForTimeout(1200);
  r.exemple.overlay = await page.getByRole('dialog').count();
  r.exemple.fetes = await page.evaluate(() => localStorage.getItem('nec.fetes.exemple'));
  r.erreurs = erreurs;
  await ctx.close();

  // Fixed clocks: 14:10 (pulse on dot 8) and 18:00 (no pulse, no badge).
  r.horloges = {};
  for (const [nom, h] of [['14h10', '2026-11-12T14:10:00'], ['18h00', '2026-11-12T18:00:00']]) {
    const c = await contexte(browser);
    const p = await c.newPage();
    await p.clock.setFixedTime(new Date(h));
    await preparer(p, c);
    const pid = await nouveauPlan(p);
    await p.goto(`${BASE}/plan/p/${pid}`);
    await p.locator('.bp-journee').waitFor({ timeout: 15000 });
    r.horloges[nom] = { pouls: await pouls(p), badge: await p.locator('.bp-badge-ecart').allInnerTexts() };
    if (nom === '14h10') await p.locator('.bp-journee').screenshot({ path: `${D}/frise-14h10-${SUFFIXE}.png` });
    await c.close();
  }

  // Reduced motion: no pulse animation, no confetti, check mark drawn statically.
  const cr = await contexte(browser, { reducedMotion: 'reduce' });
  const pr = await cr.newPage();
  await preparer(pr, cr);
  const rid = await nouveauPlan(pr);
  await pr.goto(`${BASE}/plan/p/${rid}`);
  await pr.locator('.bp-journee').waitFor({ timeout: 15000 });
  r.reduit = { animationPouls: await pr.$$eval('.bp-point-prevu', (e) => e.map((x) => getComputedStyle(x).animationName)) };
  await pr.goto(`${BASE}/plan/p/${rid}/identite`);
  await pr.getByLabel('Nom et prénom').waitFor({ timeout: 15000 });
  await remplirIdentite(pr);
  await pr.getByRole('dialog').waitFor({ timeout: 5000 });
  r.reduit.confettis = await pr.locator('.bp-confetti').count();
  r.reduit.coche = await pr.$eval('.bp-coche-trace', (x) => [getComputedStyle(x).animationName, getComputedStyle(x).strokeDashoffset]);
  await pr.screenshot({ path: `${D}/fin-etape-reduit-${SUFFIXE}.png` });
  await cr.close();

  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
