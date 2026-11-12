// NEC-CC-21 bench (NEC-170), the participant's phone on the dev server (412 px, headless Chrome).
// Usage: node banc-telephone.cjs [base URL] ; writes ids.json then a line per change of the pre-test
// cards to telephone.log. Control files in this folder: `debloquer` (plan APP back online),
// `fin` (stop). Plan PAPIER: joined, waits for the trainer's paper pre-test then its correction.
// Plan APP: joined, then cut from Supabase, pre-test validated in the app (3/15), back online on `debloquer`.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const D = __dirname;
const LOG = `${D}/telephone.log`;
const log = (t) => {
  const l = `${new Date().toISOString().slice(11, 19)} ${t}`;
  fs.appendFileSync(LOG, l + '\n');
  console.log(l);
};
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function creerEtRejoindre(page, nomProjet, prenom) {
  return page.evaluate(
    async ([nomProjet, prenom]) => {
      const { planVide } = await import('/src/modules/business-plan/etat/vide.ts');
      const { creerPlan } = await import('/src/modules/business-plan/db/plans.ts');
      const { rejoindre } = await import('/src/modules/business-plan/sync/index.ts');
      const p = planVide();
      p.identite.nomPrenom = prenom;
      p.identite.nomProjet = nomProjet;
      delete p.id;
      const cree = await creerPlan(p);
      const r = await rejoindre(cree.id, 'NEC2026', prenom);
      return { id: cree.id, r };
    },
    [nomProjet, prenom]
  );
}

const carte = (page) =>
  page
    .locator('.bp-carte-pretest')
    .innerText()
    .then((t) => t.replace(/\s+/g, ' ').trim())
    .catch(() => '(pas de carte)');

(async () => {
  fs.writeFileSync(LOG, '');
  for (const f of ['debloquer', 'fin']) if (fs.existsSync(`${D}/${f}`)) fs.unlinkSync(`${D}/${f}`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const erreurs = [];
  const p1 = await ctx.newPage();
  p1.on('pageerror', (e) => erreurs.push(e.message));
  await p1.goto(BASE + '/plan/');
  await p1.getByText('Mes projets').first().waitFor({ timeout: 60000 });
  const papier = await creerEtRejoindre(p1, 'TEST-CC21 PAPIER', 'TEST-CC21 Papier');
  const app = await creerEtRejoindre(p1, 'TEST-CC21 APP', 'TEST-CC21 App');
  fs.writeFileSync(`${D}/ids.json`, JSON.stringify({ papier, app }, null, 1));
  log(`plans ${JSON.stringify({ papier, app })}`);
  await attendre(4000);

  // Plan APP: Supabase cut for this page only, pre-test validated in the app (3/15).
  const p2 = await ctx.newPage();
  p2.on('pageerror', (e) => erreurs.push(e.message));
  let coupe = true;
  await p2.route(/supabase\.co/, (route) => (coupe ? route.abort('internetdisconnected') : route.continue()));
  await p2.goto(BASE + '/plan/');
  await p2.getByText('Mes projets').first().waitFor({ timeout: 60000 });
  await p2.evaluate(async (id) => {
    const { lirePlan, enregistrerPlan } = await import('/src/modules/business-plan/db/plans.ts');
    const p = await lirePlan(id);
    const reponses = { 1: 'c', 2: 'b', 3: 'b' };
    for (let n = 4; n <= 15; n++) reponses[n] = 'jnsp';
    p.pretest = { reponses, auto: [1, 1, 1, 1, 1, 1], valideLe: new Date().toISOString(), source: 'app' };
    await enregistrerPlan(p);
  }, app.id);
  await p2.goto(`${BASE}/plan/p/${app.id}`);
  await p1.goto(`${BASE}/plan/p/${papier.id}`);
  log(`innerWidth ${await p1.evaluate(() => innerWidth)} defilementH ${await p1.evaluate(() => document.documentElement.scrollWidth > innerWidth)}`);

  let c1 = '';
  let c2 = '';
  let debloque = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 40 * 60 * 1000 && !fs.existsSync(`${D}/fin`)) {
    const n1 = await carte(p1);
    const n2 = await carte(p2);
    if (n1 !== c1) {
      c1 = n1;
      log(`PAPIER carte : ${n1}`);
      await p1.screenshot({ path: `${D}/telephone-papier-${Date.now()}.png` });
    }
    if (n2 !== c2) {
      c2 = n2;
      log(`APP carte : ${n2}`);
    }
    if (!debloque && fs.existsSync(`${D}/debloquer`)) {
      debloque = true;
      coupe = false;
      // Plan APP back online: sent to the server (the trainer then sees "Fait dans l'app").
      await p2.evaluate(async (id) => {
        const { lirePlan } = await import('/src/modules/business-plan/db/plans.ts');
        const { signalerModification } = await import('/src/modules/business-plan/sync/index.ts');
        signalerModification(await lirePlan(id));
      }, app.id);
      log('APP remis en ligne et renvoyé');
      await p2.screenshot({ path: `${D}/telephone-app-remis-en-ligne.png` });
    }
    await attendre(2000);
  }
  await p1.screenshot({ path: `${D}/telephone-papier-fin.png` });
  await p2.screenshot({ path: `${D}/telephone-app-fin.png` });
  log(`APP pretest final ${await p2.evaluate(async (id) => {
    const { lirePlan } = await import('/src/modules/business-plan/db/plans.ts');
    return JSON.stringify((await lirePlan(id)).pretest);
  }, app.id)}`);
  log(`erreurs ${JSON.stringify(erreurs)}`);
  await browser.close();
})().catch((e) => {
  log('ECHEC ' + e.message);
  process.exit(1);
});
