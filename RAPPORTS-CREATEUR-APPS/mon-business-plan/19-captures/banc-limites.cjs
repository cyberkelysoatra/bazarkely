// NEC-CC-19 bench: summary page with 6 very long cards (must stay on one page) and a complete plan.
const { chromium } = require('C:/bazarkely-2/frontend/node_modules/@playwright/test');
const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  await page.goto(BASE + '/plan/');
  await page.getByText('Mes projets').first().waitFor({ timeout: 30000 });
  const r = await page.evaluate(async () => {
    const { planExemple } = await import('/src/modules/business-plan/data/exemple/index.ts');
    const { creerPdf } = await import('/src/modules/business-plan/export/pdf.ts');
    const { CARTES, brouillon } = await import('/src/modules/business-plan/ateliers/synthese/brouillons.ts');
    const { POINTS } = await import('/src/modules/business-plan/ateliers/relecture/points.ts');
    const { etapesDuPlan } = await import('/src/modules/business-plan/etat/journee.ts');
    const { copier } = await import('/src/modules/business-plan/etat/vide.ts');
    const { reports } = await import('/src/modules/business-plan/ateliers/mission/regles.ts');
    const { questionsPieges } = await import('/src/modules/business-plan/ateliers/pitch/questions.ts');
    const b64 = async (f) => { const a = new Uint8Array(await f.arrayBuffer()); let s = ''; for (const x of a) s += String.fromCharCode(x); return btoa(s); };
    // 1. Six very long cards written by the participant.
    const long = copier(planExemple()); delete long.exemple; long.identite.nomProjet = 'TEXTES LONGS';
    for (const c of CARTES) long.synthese[c.cle] = (brouillon(long, c.cle) + ' ').repeat(6);
    const f1 = await creerPdf(long, { coordonnees: true });
    // 2. Complete plan: the example with synthesis, peer review, actions and pitch answers filled.
    const comp = copier(planExemple()); delete comp.exemple; comp.identite.nomProjet = 'PLAN COMPLET';
    for (const c of CARTES) comp.synthese[c.cle] = brouillon(comp, c.cle);
    for (const p of POINTS) comp.relecture.points[p.id] = 'oui';
    comp.relecture.questionBinome = 'Pourquoi des bouteilles en verre ?';
    comp.actions = comp.actions.map((a, i) => ({ ...a, action: a.action || `Action ${i + 1}`, quand: a.quand || 'Décembre 2026' }));
    while (comp.actions.length < 3) comp.actions.push({ id: 'a' + comp.actions.length, action: 'Action', quand: 'Décembre 2026' });
    comp.mission.entretiens = [1, 2, 3].map((k) => ({ id: 'en' + k, date: '2026-11-12T10:0' + k + ':00', typeClient: 'Gérant hôtel', aujourdhui: 'Jus importés', paie: 3500, embete: 'Le goût', probleme: 'oui', phrase: 'Je prendrais du local.' }));
    comp.mission.decision = comp.mission.decision || 'continuer';
    for (const x of reports(comp)) comp.mission.reports[x.cle] = 'valide';
    comp.pitch.essais = [{ id: 'e1', date: new Date().toISOString(), mode: 'complet', totalMs: 118000, partiesMs: [20000, 25000, 20000, 25000, 20000] }];
    for (const q of questionsPieges(comp)) comp.pitch.reponses[q.id] = 'Ma réponse préparée.';
    const pas = etapesDuPlan(comp).slice(0, 11).filter((e) => !e.fait).map((e) => `${e.n}:${e.pct}`);
    const f2 = await creerPdf(comp, { coordonnees: false });
    return { pas, long: await b64(f1), complet: await b64(f2) };
  });
  fs.writeFileSync(`${__dirname}/d-textes-longs-local.pdf`, Buffer.from(r.long, 'base64'));
  fs.writeFileSync(`${__dirname}/e-complet-local.pdf`, Buffer.from(r.complet, 'base64'));
  console.log('etapes non faites du plan complet:', r.pas);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
