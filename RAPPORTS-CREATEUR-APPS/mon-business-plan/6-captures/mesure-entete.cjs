// NEC-CC-06: header height on 5 screens at 412 px, DPR 3.5 (argv[2] = port, argv[3] = label).
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const path = require('path');
const BASE = `http://localhost:${process.argv[2] || 3007}/plan`;
const nom = process.argv[3] || 'avant';
(async () => {
  const nav = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await nav.newContext({ viewport: { width: 412, height: 869 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const out = {};
  const mesurer = async (cle) => {
    await page.waitForSelector('header.bp-entete');
    await page.waitForTimeout(600);
    out[cle] = await page.evaluate(() => ({ iw: innerWidth, dpr: devicePixelRatio, h: Math.round(document.querySelector('header.bp-entete').getBoundingClientRect().height * 10) / 10 }));
    await page.screenshot({ path: path.join(__dirname, `${nom}-${cle}.png`), clip: { x: 0, y: 0, width: 412, height: 200 } });
  };
  await page.goto(BASE + '/');
  await page.waitForSelector('text=Mes projets', { timeout: 120000 });
  await mesurer('accueil');
  await page.goto(BASE + '/p/exemple');
  await mesurer('sommaire');
  await page.goto(BASE + '/p/exemple/m5');
  await mesurer('m5');
  await page.goto(BASE + '/p/exemple/exporter');
  await mesurer('exporter');
  console.log(JSON.stringify(out));
  await nav.close();
})();
