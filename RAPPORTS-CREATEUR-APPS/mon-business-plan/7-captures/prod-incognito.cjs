// C6: production, fresh browser without any session (= private window): /plan/formateur lands on /plan/.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 412, height: 869 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true });
  const supa = [];
  ctx.on('request', (r) => /supabase\.co/.test(r.url()) && supa.push(r.url()));
  await ctx.addInitScript(() => {
    window.__vu = [];
    new MutationObserver(() => { if (document.querySelector('.bp-suivi, .bp-participant, .bp-patience') || /Suivi formateur/.test(document.body ? document.body.innerText : '')) window.__vu.push(location.pathname); }).observe(document, { childList: true, subtree: true });
  });
  const p = await ctx.newPage();
  await p.goto('https://1sakely.org/plan/formateur');
  await p.waitForSelector('text=Mes projets', { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const r = await p.evaluate(() => ({ chemin: location.pathname, vu: window.__vu, version: document.documentElement.dataset.version, lien: !!document.querySelector('.bp-lien-formateur') }));
  console.log(JSON.stringify({ ...r, supabase: supa.length }));
  await p.screenshot({ path: __dirname + '/c6-prod-sans-session.png' });
  await b.close();
})();
