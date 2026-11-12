// NEC-CC-18: production check at 412 px (fresh context = no old service worker): version, timeline, gauge.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const r = {};
  await page.goto('https://1sakely.org/plan/a-propos');
  await page.locator('.bp-version').waitFor({ timeout: 30000 });
  r.version = await page.locator('.bp-version').innerText();
  r.innerWidth = await page.evaluate(() => innerWidth);
  await page.goto('https://1sakely.org/plan/');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  await page.waitForURL(/\/p\//);
  const id = page.url().match(/\/p\/([^/]+)/)[1];
  await page.goto(`https://1sakely.org/plan/p/${id}`);
  await page.locator('.bp-journee').waitFor({ timeout: 30000 });
  r.heure = await page.evaluate(() => new Date().toTimeString().slice(0, 5));
  r.pouls = await page.$$eval('.bp-pouls', (e) => e.map((x) => x.closest('li').dataset.etape));
  r.badge = await page.locator('.bp-badge-ecart').allInnerTexts();
  r.jauge = await page.locator('[aria-label="Ma journée est faite à"]').getAttribute('aria-valuenow');
  r.facultatifs = await page.locator('.bp-facultatif').count();
  await page.screenshot({ path: `${__dirname}/sommaire-prod.png` });
  // Leave nothing behind on the production phone storage of this throwaway context.
  r.erreurs = erreurs;
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
