/* Scenario RELEVE-CC-06 of the bench (scripts/releve-banc.cjs): screens 11 « Carte » and 12 « Résultats »
 * and the exports on the PRODUCTION build at 412 x 869. Games of the PRD loaded through the real menu
 * « Ouvrir une sauvegarde ici » (files written from etat/jeux.ts with esbuild).
 *   C1 game D, C2 game D2 (cut-off 20 then 15 by the settings card), C3 CSV of game G, C4 backup round
 *   trip of game F, C5 PDF and the jsPDF chunk, C6 100 stations timing, pinch, ?zones=ephemere,
 *   C7 settings and interval, C8 captures, width, #points-plan.
 * Run:  $env:BANC_PORT='4103'; $env:BANC_SORTIE='...\captures-cc-06'; node scripts/releve-banc.cjs cc06 */
'use strict'
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const RACINE = path.resolve(__dirname, '..')
const MAQUETTE = 'C:\\Users\\ACER\\Downloads\\CRéATEUR Apps\\gestion-terrassement\\maquette-source'
const T = '2026-11-18T04:00:00.000Z'

/** Games of the PRD from the source (etat/jeux.ts has type imports only). */
function jeux() {
  const esbuild = require('esbuild')
  const out = esbuild.buildSync({ entryPoints: [path.join(RACINE, 'src/modules/releve-terrain/etat/jeux.ts')], bundle: true, format: 'cjs', platform: 'node', write: false })
  const m = { exports: {} }
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require)
  return m.exports
}

/** 100 stations on a smooth terrain, sights computed exactly from the 3 bornes of the PRD (hi = ht). */
function jeuCent(J) {
  const base = J.jeuB()
  const bornes = base.objets.filter((o) => o.type === 'borne')
  const pos = Object.fromEntries(bornes.map((b) => [b.id, b.donnees.plan]))
  const sol = (x, y) => 36 - 0.2 * x + 0.06 * y + 1.2 * Math.sin(x / 9) * Math.cos(y / 11)
  const stations = []
  let n = 0
  for (let j = 0; j < 10; j++)
    for (let i = 0; i < 10; i++) {
      n++
      const x = 8 + i * 5.6 + (j % 2) * 1.7
      const y = -12 + j * 3.4
      const z = sol(x, y)
      const numero = `S${String(n).padStart(2, '0')}`
      const heure = new Date(Date.parse('2026-11-18T05:00:00.000Z') + n * 60000).toISOString()
      stations.push({
        id: `C${n}`,
        type: 'station',
        saisi_at: heure,
        donnees: {
          numero,
          heure,
          etat: 'normale',
          note: null,
          sans_visee: null,
          visees: bornes.map((b) => {
            const p = pos[b.id]
            const h = Math.hypot(p.x - x, p.y - y)
            const dz = p.z - z
            return { borne_id: b.id, distance: Math.round(Math.hypot(h, dz) * 1000) / 1000, pente: Math.round(((Math.atan2(dz, h) * 180) / Math.PI) * 1e4) / 1e4, pas_visible: false, historique: [] }
          }),
        },
      })
    }
  return {
    ...base,
    releve: { ...base.releve, id: 'cent-stations', nom: 'Cent stations', entete: { ...base.releve.entete, nom: 'Cent stations', reglages: { coupure: 15 } } },
    objets: [...base.objets.filter((o) => o.type !== 'station'), ...stations],
  }
}

const POINTS_PLAN = 'nom;x;y;altitude\r\nP1;30;0;30\r\nP2;40;5;28\r\nP3;20;-5;33,9\r\nP4;25;0;32\r\nmauvaise ligne;1;2\r\n'

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------
const lireBase = (page, table) =>
  page.evaluate(
    (t) =>
      new Promise((ok, ko) => {
        const req = indexedDB.open('ReleveTerrainDB')
        req.onerror = () => ko(req.error)
        req.onsuccess = () => {
          const db = req.result
          const r = db.transaction(t).objectStore(t).getAll()
          r.onsuccess = () => {
            db.close()
            ok(r.result)
          }
          r.onerror = () => ko(r.error)
        }
      }),
    table,
  )

async function releveParNom(page, nom) {
  const rs = (await lireBase(page, 'releves')).filter((r) => !r.supprime_at && r.nom === nom)
  return rs[0] || null
}

async function importer(page, nomChantier, fichier, choix) {
  const [selecteur] = await Promise.all([
    page.waitForEvent('filechooser'),
    (async () => {
      await page.getByRole('button', { name: `Plus d’actions sur le chantier ${nomChantier}`, exact: true }).click()
      await page.getByRole('menuitem', { name: 'Ouvrir une sauvegarde ici' }).click()
    })(),
  ])
  await selecteur.setFiles(fichier)
  if (choix) {
    const d = page.getByRole('alertdialog')
    await d.waitFor()
    await d.getByRole('button', { name: choix, exact: true }).click()
  }
}

const avis = (page) => page.locator('[role="status"], [role="alert"]').allInnerTexts()

async function attendreAvis(page, motif, delai = 8000) {
  const fin = Date.now() + delai
  for (;;) {
    const t = (await avis(page)).join(' | ')
    if (motif.test(t)) return t
    if (Date.now() > fin) {
      await page.screenshot({ path: path.join(os.tmpdir(), 'banc-cc06-echec.png') }).catch(() => undefined)
      throw new Error(`Avis attendu ${motif} ; vu : ${t}`)
    }
    await new Promise((r) => setTimeout(r, 150))
  }
}

async function ouvrirResultats(page, id) {
  await page.goto(page.url().replace(/\/releve\/.*$/, `/releve/r/${id}/resultats`))
  await page.getByRole('heading', { level: 1, name: 'Étape 4 : résultats' }).waitFor()
}

async function importerPointsPlan(page, fichier) {
  await page.locator('input[data-import-points]').setInputFiles(fichier)
  await page.getByText(/points? du plan importés?/).first().waitFor()
}

/** Table of the comparison card: { nom: { plan, releve, ecart, rouge } }. */
const tableauPlan = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('#points-plan tr[data-point-plan]')].map((tr) => {
        const releve = tr.querySelector('[data-cellule="releve"]').innerText.trim()
        const ecart = tr.querySelector('[data-cellule="ecart"]')
        return [tr.getAttribute('data-point-plan'), { releve, ecart: ecart.innerText.trim(), rouge: !!ecart.querySelector('.bg-rougeFond') }]
      }),
    ),
  )

const nombreFr = (t) => Number(String(t).replace('\u2212', '-').replace(',', '.'))

async function telecharger(page, cle) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator(`button[data-export="${cle}"]`).click()])
  const f = await d.path()
  return { nom: d.suggestedFilename(), contenu: fs.readFileSync(f) }
}

/** Sets the cut-off through the settings card (keypad with the physical keyboard) and confirms. */
async function reglerCoupure(page, valeur) {
  await page.getByRole('button', { name: 'Modifier les seuils' }).click()
  const feuille = page.getByRole('dialog', { name: 'Réglages des seuils' })
  await feuille.waitFor()
  await feuille.getByRole('button', { name: /Coupure des triangles/ }).click()
  await page.keyboard.press('Control+A').catch(() => undefined)
  for (let i = 0; i < 6; i++) await page.keyboard.press('Backspace')
  await page.keyboard.type(String(valeur))
  await page.keyboard.press('Enter')
  await feuille.getByRole('button', { name: 'Enregistrer les seuils' }).click()
  const conf = page.getByRole('alertdialog')
  await conf.waitFor()
  const texte = await conf.innerText()
  await conf.getByRole('button', { name: 'Continuer' }).click()
  await feuille.waitFor({ state: 'detached' })
  return texte
}

// ---------------------------------------------------------------------------------------------
async function executer(banc) {
  const res = { c1: {}, c2: {}, c3: {}, c4: {}, c5: {}, c6: {}, c7: {}, c8: {}, contrastesMin: null, erreurs: [] }
  const verifier = (crit, nom, ok, detail) => {
    res[crit][nom] = detail === undefined ? ok : { ok, detail }
    if (!ok) res.erreurs.push(`${crit} ${nom} : ${JSON.stringify(detail)}`)
  }
  const J = jeux()
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-cc06-'))
  const ecrire = (nom, contenu) => {
    const f = path.join(dossier, nom)
    fs.writeFileSync(f, typeof contenu === 'string' ? contenu : JSON.stringify(contenu))
    return f
  }
  const fichiers = {
    D: ecrire('Courbes-D.releve.json', J.jeuD()),
    D2: ecrire('Courbes-D2.releve.json', J.jeuD2()),
    F: ecrire('Stations-F.releve.json', J.jeuF()),
    G: ecrire('Lettres-G.releve.json', J.jeuG()),
    cent: ecrire('Cent.releve.json', jeuCent(J)),
    faux: ecrire('faux.releve.json', '{"format":"autre"}'),
    pasJson: ecrire('pas-json.json', 'ceci n est pas une sauvegarde'),
    points: ecrire('points-plan.txt', POINTS_PLAN),
  }
  const contrastes = []
  const noterContrastes = async (page, ecran) => {
    for (const c of await banc.contrastes(page)) contrastes.push({ ecran, ...c })
  }
  const largeur = async (page, nom) => {
    const m = await banc.mesurer(page)
    verifier('c8', `largeur-${nom}`, m.largeur === 412 && m.defilement <= 412, m)
  }

  // jsPDF chunk: the code file holding jsPDF, and the precache list.
  const dossierCode = path.join(RACINE, 'dist', 'assets', 'releve', 'c')
  const chunkPdf = fs.readdirSync(dossierCode).filter((f) => f.endsWith('.js') && /jsPDF|addImage|getTextWidth/.test(fs.readFileSync(path.join(dossierCode, f), 'utf8')))
  const precache = JSON.parse(fs.readFileSync(path.join(RACINE, 'dist', 'releve', 'precache.json'), 'utf8')).files
  res.c5.chunksPdf = chunkPdf
  verifier('c5', 'chunkDansPrecache', chunkPdf.length > 0 && chunkPdf.every((f) => precache.includes(`/assets/releve/c/${f}`)), chunkPdf)
  const pageIndex = fs.readFileSync(path.join(RACINE, 'dist', 'releve', 'index.html'), 'utf8')
  verifier('c5', 'pasDansLaPage', chunkPdf.every((f) => !pageIndex.includes(f)), null)

  const { page, contexte } = await banc.ouvrir()
  await contexte.grantPermissions([]).catch(() => undefined)
  const requetes = []
  page.on('request', (r) => requetes.push(r.url()))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text().slice(0, 300))
  })
  const d = { id: 'banc06-dom', nom: 'Domaine A', proprietaire: 'local', a_moi: true, cree_at: T, maj_at: T, supprime_at: null, envoi: 'a_envoyer' }
  const c = { id: 'banc06-ch', domaine_id: d.id, nom: 'Premier chantier', cree_at: T, maj_at: T, supprime_at: null, envoi: 'a_envoyer' }
  await page.goto(banc.url('/releve/'), { waitUntil: 'load' })
  await page.getByText('Commencez par créer votre domaine foncier').waitFor()
  await banc.injecter(page, { domaines: [d], chantiers: [c] })
  const urlChantier = banc.url(`/releve/c/${c.id}`)
  await page.goto(urlChantier)
  await page.getByRole('heading', { level: 1, name: c.nom }).waitFor()

  // ------------------------------------------------------------------ C1 game D
  await importer(page, c.nom, fichiers.D)
  await attendreAvis(page, /Sauvegarde ouverte : « Courbes D »/)
  const relD = await releveParNom(page, 'Courbes D')
  await ouvrirResultats(page, relD.id)
  verifier('c1', 'resumeCourbes', /11 points, 17 triangles gardés sur 17 \(coupure 100 m\)/.test(await page.locator('[data-resume-courbes]').innerText()), await page.locator('[data-resume-courbes]').innerText())
  await importerPointsPlan(page, fichiers.points)
  verifier('c1', 'ligneFausseListee', await page.getByText(/Ligne 6 « mauvaise ligne;1;2 » : il faut 4 valeurs/).isVisible(), null)
  const tD = await tableauPlan(page)
  res.c1.tableau = tD
  for (const [nom, v] of [
    ['P1', 30.872],
    ['P2', 28.483],
    ['P3', 33.257],
  ])
    verifier('c1', nom, Math.abs(nombreFr(tD[nom]?.releve) - v) <= 0.05, tD[nom])
  verifier('c1', 'P1rouge', tD.P1.rouge === true && tD.P2.rouge === false, null)
  await page.locator('#points-plan').scrollIntoViewIfNeeded()
  await banc.capturer(page, '12-c1-comparaison-jeu-D')
  // Contours on the map of game D (1 m): the paths of 35, 30, 25 drawn.
  await page.goto(banc.url(`/releve/r/${relD.id}/carte`))
  await page.locator('svg[data-echelle]').waitFor()
  const altitudes = await page.evaluate(() => [...document.querySelectorAll('path[data-altitude]')].map((p) => Number(p.getAttribute('data-altitude'))))
  verifier('c1', 'courbesCarte', [25, 30, 35].every((a) => altitudes.includes(a)), altitudes)
  await banc.capturer(page, '11-c1-carte-jeu-D')

  // ------------------------------------------------------------------ C2 game D2, then cut-off 15 (C7)
  await page.goto(urlChantier)
  await importer(page, c.nom, fichiers.D2)
  await attendreAvis(page, /Courbes D2/)
  const relD2 = await releveParNom(page, 'Courbes D2')
  await ouvrirResultats(page, relD2.id)
  verifier('c2', 'huitTriangles', /8 triangles gardés sur 17 \(coupure 20 m\)/.test(await page.locator('[data-resume-courbes]').innerText()), await page.locator('[data-resume-courbes]').innerText())
  await importerPointsPlan(page, fichiers.points)
  const t20 = await tableauPlan(page)
  res.c2.coupure20 = t20
  verifier('c2', 'P1-20', Math.abs(nombreFr(t20.P1.releve) - 30.872) <= 0.05, t20.P1)
  verifier('c2', 'P2-20', Math.abs(nombreFr(t20.P2.releve) - 28.483) <= 0.05, t20.P2)
  verifier('c2', 'P3-20-non-couvert', t20.P3.releve === 'non couvert', t20.P3)
  await page.goto(banc.url(`/releve/r/${relD2.id}/carte`))
  await page.locator('svg[data-echelle]').waitFor()
  const segments35 = await page.evaluate(() => {
    const p = document.querySelector('path[data-altitude="35"]')
    if (!p) return []
    // Crossings of Y = 0 by the segments of the 35 line (path in metres, Y flipped).
    const d = p.getAttribute('d').match(/M[^M]+/g) || []
    return d
      .map((s) => s.match(/-?\d+(\.\d+)?/g).map(Number))
      .filter(([, y1, , y2]) => (y1 <= 0 && y2 >= 0) || (y1 >= 0 && y2 <= 0))
  })
  verifier('c2', 'pasDeCourbe35SurY0', segments35.length === 0, segments35)
  await ouvrirResultats(page, relD2.id)
  const avant = await releveParNom(page, 'Courbes D2')
  const texteConfirmation = await reglerCoupure(page, 15)
  verifier('c7', 'confirmation', texteConfirmation.includes('Tous les résultats seront recalculés. Continuer ?'), texteConfirmation)
  await page.getByText(/coupure 15 m\)/).waitFor()
  const t15 = await tableauPlan(page)
  res.c2.coupure15 = t15
  verifier('c2', 'P4-15', Math.abs(nombreFr(t15.P4.releve) - 32.076) <= 0.05, t15.P4)
  verifier('c2', 'P1P2P3-15-non-couverts', ['P1', 'P2', 'P3'].every((n) => t15[n].releve === 'non couvert'), t15)
  const apres = await releveParNom(page, 'Courbes D2')
  const journal = (await lireBase(page, 'objets')).filter((o) => o.releve_id === relD2.id && o.type === 'journal' && o.donnees.action === 'reglages_modifies')
  verifier('c7', 'coupureEcrite', apres.entete.reglages.coupure === 15 && apres.rev > avant.rev, { reglages: apres.entete.reglages.coupure, rev: [avant.rev, apres.rev] })
  verifier('c7', 'journal', journal.length === 1 && journal[0].donnees.detail.avant.coupure === 20 && journal[0].donnees.detail.apres.coupure === 15, journal.map((j) => j.donnees))
  // Interval: phone preference only.
  const revAvantIntervalle = apres.rev
  await page.getByRole('radio', { name: '2 m' }).first().click()
  await page.waitForTimeout(300)
  const cles = await lireBase(page, 'cles')
  const apresIntervalle = await releveParNom(page, 'Courbes D2')
  verifier('c7', 'intervalleCle', cles.some((k) => k.cle === 'vue_intervalle' && k.valeur === 2), cles.filter((k) => k.cle === 'vue_intervalle'))
  verifier('c7', 'intervalleSansEcritureReleve', apresIntervalle.rev === revAvantIntervalle && apresIntervalle.maj_at === apres.maj_at && !('vue_intervalle' in apresIntervalle.entete), { rev: apresIntervalle.rev })
  await page.getByRole('radio', { name: '1 m' }).first().click()

  // ------------------------------------------------------------------ C3 CSV of game G
  await page.goto(urlChantier)
  await importer(page, c.nom, fichiers.G)
  await attendreAvis(page, /Sauvegarde ouverte/)
  const relG = (await lireBase(page, 'releves')).filter((r) => !r.supprime_at && r.nom.startsWith('Stations B F G')).sort((a, b) => b.maj_at.localeCompare(a.maj_at))[0]
  await ouvrirResultats(page, relG.id)
  const csv = await telecharger(page, 'csv')
  const texteCsv = csv.contenu.toString('utf8')
  const lignes = texteCsv.replace(/^\uFEFF/, '').split('\r\n')
  res.c3.nom = csv.nom
  res.c3.extrait = lignes.slice(0, 7)
  verifier('c3', 'bom', csv.contenu[0] === 0xef && csv.contenu[1] === 0xbb && csv.contenu[2] === 0xbf, null)
  verifier('c3', 'entete', lignes[0] === 'Point;Endroit;Type;Rang;État;X;Y;Altitude;Couleur;Écart altitude;Écart position;Indice géométrie;Bornes visées;Heure;Note', lignes[0])
  verifier('c3', 'D1', lignes.some((l) => l.startsWith('D (1);Piquet du manguier;borne éphémère;1;retirée')), null)
  verifier('c3', 'D2', lignes.some((l) => l.startsWith('D (2);Angle sud du parking;borne éphémère;1;active')), null)
  const s10 = (lignes.find((l) => l.startsWith('S10;')) || '').split(';')
  verifier('c3', 'S10', s10[12] === 'B, C, D (1)', s10)
  verifier('c3', 'virgule', /^\d+,\d{3}$/.test(s10[5] || ''), s10[5])
  verifier('c3', 'sansTiretLong', !/[\u2014\u2013\u00b7]/.test(texteCsv), null)
  fs.writeFileSync(path.join(banc.sortie, csv.nom), csv.contenu)

  // ------------------------------------------------------------------ C5 PDF (jsPDF loaded on the tap only)
  const avantPdf = requetes.filter((u) => chunkPdf.some((f) => u.includes(f)))
  verifier('c5', 'pasChargeAvantLeToucher', avantPdf.length === 0, avantPdf)
  const pdf = await telecharger(page, 'pdf')
  const apresPdf = requetes.filter((u) => chunkPdf.some((f) => u.includes(f)))
  verifier('c5', 'chargeAuToucher', apresPdf.length > 0, apresPdf)
  verifier('c5', 'pdf', pdf.contenu.length > 5000 && pdf.contenu.slice(0, 5).toString() === '%PDF-' && /^Releve_Stations-B-F-G.*_\d{4}-\d{2}-\d{2}\.pdf$/.test(pdf.nom), { nom: pdf.nom, octets: pdf.contenu.length })
  fs.writeFileSync(path.join(banc.sortie, pdf.nom), pdf.contenu)

  // ------------------------------------------------------------------ C4 backup round trip, game F
  await page.goto(urlChantier)
  await importer(page, c.nom, fichiers.F, 'Garder les deux')
  await attendreAvis(page, /Sauvegarde ouverte/)
  const relF = (await lireBase(page, 'releves')).filter((r) => !r.supprime_at && r.nom.startsWith('Stations B F G')).sort((a, b) => b.maj_at.localeCompare(a.maj_at))[0]
  await ouvrirResultats(page, relF.id)
  const sauv = await telecharger(page, 'json')
  const fSauv = path.join(dossier, sauv.nom)
  fs.writeFileSync(fSauv, sauv.contenu)
  res.c4.nom = sauv.nom
  verifier('c4', 'nomFichier', /^Releve_Stations-B-F-G.*_\d{4}-\d{2}-\d{2}\.releve\.json$/.test(sauv.nom), sauv.nom)
  const csvF = (await telecharger(page, 'csv')).contenu.toString('utf8')
  await page.goto(urlChantier)
  await importer(page, c.nom, fSauv, 'Garder les deux')
  await attendreAvis(page, /Sauvegarde ouverte/)
  const tous = (await lireBase(page, 'releves')).filter((r) => !r.supprime_at)
  const copie = tous.filter((r) => r.id !== relF.id && r.nom.startsWith(relF.nom)).sort((a, b) => b.maj_at.localeCompare(a.maj_at))[0]
  const objets = await lireBase(page, 'objets')
  const oF = objets.filter((o) => o.releve_id === relF.id && !o.supprime)
  const oC = objets.filter((o) => o.releve_id === copie.id && !o.supprime)
  const idsF = new Set(oF.map((o) => o.id))
  verifier('c4', 'idsDifferents', copie.id !== relF.id && oC.length === oF.length && oC.every((o) => !idsF.has(o.id)), { copie: copie.nom, objets: [oF.length, oC.length] })
  verifier('c4', 'pasDeBorneEnPlus', oC.filter((o) => o.type === 'borne').length === oF.filter((o) => o.type === 'borne').length, null)
  await ouvrirResultats(page, copie.id)
  const csvCopie = (await telecharger(page, 'csv')).contenu.toString('utf8')
  verifier('c4', 'memeCalcul', csvCopie === csvF, { lignes: csvF.split('\r\n').length })
  // « Remplacer »: ids of the file kept.
  await page.goto(urlChantier)
  await importer(page, c.nom, fSauv, 'Remplacer')
  await attendreAvis(page, /Sauvegarde ouverte/)
  const objets2 = await lireBase(page, 'objets')
  const ids2 = new Set(objets2.filter((o) => o.releve_id === relF.id && !o.supprime).map((o) => o.id))
  verifier('c4', 'remplacerGardeLesIds', ids2.size === idsF.size && [...idsF].every((i) => ids2.has(i)), { avant: idsF.size, apres: ids2.size })
  // Wrong files refused.
  for (const [nom, f] of [
    ['faux', fichiers.faux],
    ['pasJson', fichiers.pasJson],
  ]) {
    await importer(page, c.nom, f)
    const t = await attendreAvis(page, /Ce fichier n'est pas une sauvegarde de relevé\./)
    verifier('c4', `refus-${nom}`, true, t)
  }
  await banc.capturer(page, '12-c4-fichier-refuse')

  // ------------------------------------------------------------------ C6 100 stations, pinch, zones
  await importer(page, c.nom, fichiers.cent)
  await attendreAvis(page, /Cent stations/)
  const relCent = await releveParNom(page, 'Cent stations')
  const temps = []
  for (let k = 0; k < 5; k++) {
    await page.goto(banc.url(`/releve/r/${relCent.id}/carte`))
    await page.locator('svg[data-echelle] g[data-station]').nth(99).waitFor()
    await page.waitForTimeout(300)
    const m = await page.evaluate(() => performance.getEntriesByName('releve-carte').map((e) => ({ duree: e.duration, ...e.detail })))
    temps.push(...m)
  }
  const avecCourbes = temps.filter((m) => m.stations === 100)
  res.c6.mesures = avecCourbes.map((m) => Math.round(m.duree * 10) / 10)
  res.c6.courbes = avecCourbes[0]?.courbes
  const nbStations = await page.locator('svg[data-echelle] g[data-station]').count()
  verifier('c6', 'centStations', nbStations === 100, nbStations)
  verifier('c6', 'moinsDe100ms', avecCourbes.length > 0 && Math.max(...avecCourbes.map((m) => m.duree)) < 100, res.c6.mesures)
  verifier('c6', 'courbesDessinees', (avecCourbes[0]?.courbes ?? 0) > 5, avecCourbes[0])
  await banc.capturer(page, '11-c6-carte-100-stations')
  // Interval change timing (contours recomputed).
  await page.getByRole('radio', { name: '0,5 m' }).click()
  await page.waitForTimeout(400)
  const changement = await page.evaluate(() => performance.getEntriesByName('releve-carte').slice(-1)[0]?.duration)
  res.c6.changementIntervalle05 = Math.round(changement * 10) / 10
  verifier('c6', 'changementIntervalleMoinsDe100ms', changement < 100, changement)
  await page.getByRole('radio', { name: '1 m' }).click()
  // Two-pointer pinch (synthetic pointer events on the map).
  const pince = await page.evaluate(async () => {
    const svg = document.querySelector('svg[data-echelle]')
    const r = svg.getBoundingClientRect()
    const avant = Number(svg.getAttribute('data-echelle'))
    const ev = (type, id, x, y) => svg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x, clientY: r.top + y, bubbles: true, isPrimary: id === 11, button: 0 }))
    const pause = () => new Promise((ok) => requestAnimationFrame(() => ok()))
    ev('pointerdown', 11, 160, 200)
    ev('pointerdown', 12, 220, 200)
    await pause()
    for (let k = 1; k <= 6; k++) {
      ev('pointermove', 11, 160 - k * 10, 200)
      ev('pointermove', 12, 220 + k * 10, 200)
      await pause()
    }
    ev('pointerup', 11, 100, 200)
    ev('pointerup', 12, 280, 200)
    await pause()
    return { avant, apres: Number(svg.getAttribute('data-echelle')) }
  })
  res.c6.pince = pince
  verifier('c6', 'pinceChangeEchelle', pince.apres > pince.avant * 2.5, pince)
  await banc.capturer(page, '11-c6-apres-pince')
  await page.getByRole('button', { name: 'Recentrer' }).click()
  const recentre = Number(await page.locator('svg[data-echelle]').getAttribute('data-echelle'))
  verifier('c6', 'recentrer', Math.abs(recentre - pince.avant) < 1e-3, { recentre, avant: pince.avant })
  // Tap on a station opens Saisir with its id.
  await page.locator('svg g[data-station]').nth(44).dispatchEvent('pointerdown', { pointerId: 21, pointerType: 'touch', bubbles: true, isPrimary: true })
  await page.locator('svg g[data-station]').nth(44).dispatchEvent('pointerup', { pointerId: 21, pointerType: 'touch', bubbles: true, isPrimary: true })
  await page.waitForURL(/\/saisir\/C45$/, { timeout: 5000 }).catch(() => undefined)
  verifier('c6', 'toucherStationOuvreSaisir', /\/r\/cent-stations\/saisir\/C45$/.test(page.url()), page.url())
  // ?zones=ephemere
  await page.goto(banc.url(`/releve/r/${relF.id}/carte`))
  await page.locator('svg[data-echelle]').waitFor()
  const zonesNormal = await page.evaluate(() => document.querySelector('svg[data-echelle] g path').getAttribute('d').length)
  await banc.capturer(page, '11-carte-jeu-F')
  await page.goto(banc.url(`/releve/r/${relF.id}/carte?zones=ephemere`))
  await page.getByText('Évitez les zones grises pour planter la borne éphémère.').waitFor()
  const zonesEph = await page.evaluate(() => document.querySelector('svg[data-echelle] g path').getAttribute('d').length)
  verifier('c6', 'banniereEphemere', true, null)
  verifier('c6', 'zonesDifferentes', zonesEph !== zonesNormal && zonesEph > 0, { zonesNormal, zonesEph })
  await banc.capturer(page, '11-c6-zones-ephemere')
  await largeur(page, 'carte-ephemere')

  // ------------------------------------------------------------------ C8 captures, width, #points-plan, contrasts
  await page.goto(banc.url(`/releve/r/${relF.id}/carte`))
  await page.locator('svg[data-echelle]').waitFor()
  await page.waitForTimeout(300)
  await largeur(page, 'carte')
  await banc.capturer(page, '11-carte')
  await noterContrastes(page, 'carte')
  await page.mouse.wheel(0, 700)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await banc.capturer(page, '11-carte-bas')
  await noterContrastes(page, 'carte-bas')
  await ouvrirResultats(page, relD.id)
  await largeur(page, 'resultats')
  await banc.capturer(page, '12-resultats-haut')
  await noterContrastes(page, 'resultats-haut')
  for (const [i, id] of ['#points-plan', '[aria-labelledby="rt-titre-export"]', '[aria-labelledby="rt-titre-reglages"]'].entries()) {
    await page.locator(id).scrollIntoViewIfNeeded()
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'start' }), id)
    await banc.capturer(page, `12-resultats-${i + 1}`)
    await noterContrastes(page, `resultats-${i + 1}`)
  }
  await page.getByRole('button', { name: 'Modifier les seuils' }).click()
  await page.getByRole('dialog', { name: 'Réglages des seuils' }).waitFor()
  await banc.capturer(page, '12-reglages-feuille')
  await noterContrastes(page, 'reglages-feuille')
  await largeur(page, 'reglages-feuille')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Modifier le point P1' }).click()
  await page.getByRole('dialog', { name: 'Point P1' }).waitFor()
  await banc.capturer(page, '12-point-plan-feuille')
  await page.keyboard.press('Escape')
  // #points-plan from screen 6.
  await page.goto(banc.url(`/releve/r/${relD.id}/resultats#points-plan`))
  await page.locator('#points-plan').waitFor()
  await page.waitForTimeout(400)
  const ancre = await page.evaluate(() => ({ haut: Math.round(document.getElementById('points-plan').getBoundingClientRect().top), defile: Math.round(window.scrollY) }))
  verifier('c8', 'ancrePointsPlan', ancre.defile > 100 && ancre.haut >= 0 && ancre.haut < 60, ancre)
  await banc.capturer(page, '12-ancre-points-plan')

  // Mockups (v0.5 structure) at the same size, for the side by side.
  for (const m of ['Carte', 'Exports']) {
    const p2 = await contexte.newPage()
    await p2.goto('file:///' + path.join(MAQUETTE, `${m}.dc.html`).replace(/\\/g, '/'))
    await p2.waitForTimeout(500)
    await banc.capturer(p2, `maquette-${m}`)
    await p2.close()
  }

  const min = contrastes.reduce((a, x) => (!a || x.ratio < a.ratio ? x : a), null)
  res.contrastesMin = min
  res.contrastesSous45 = contrastes.filter((x) => x.ratio < 4.5)
  if (res.contrastesSous45.length) res.erreurs.push(`contrastes < 4,5 : ${JSON.stringify(res.contrastesSous45.slice(0, 5))}`)
  res.requetesPage = [...new Set(requetes.filter((u) => u.includes('/assets/releve/')).map((u) => new URL(u).pathname))]
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-06') }
