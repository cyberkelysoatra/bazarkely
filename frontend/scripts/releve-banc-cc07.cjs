/* Scenario RELEVE-CC-07 of the bench (scripts/releve-banc.cjs): recette of games A to G in the REAL screens
 * of the production build (vite preview, no /__essai), 412 x 869, device scale factor 3.5. Nothing is
 * injected: domain, work site, relevés, targets, readings and sights are all typed through the screens
 * and the numeric keypad (physical keys, Enter = OK).
 *   1 « Calage A » (games A then A3), 2 « Calage A2 », 3 « Courbes D » (D, D2, cut-off 15),
 *   4 « Défauts C », 5 « Stations B F G » (B, F, G, CSV, PDF, backup round trip, map),
 *   6 airplane mode with a persistent profile (BANC_PROFIL), 7 durations (H08).
 * Run:  $env:BANC_PORT='4107'; $env:BANC_PROFIL='...'; node scripts/releve-banc.cjs cc07
 * Optional: BANC_PARTIE=1,2,5 runs only those parts (parts 3 to 5 create their own relevé). */
'use strict'
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const RACINE = path.resolve(__dirname, '..')
const PARTIES = (process.env.BANC_PARTIE || '1,2,3,4,5,6,7').split(',').map(Number)

// ---------------------------------------------------------------------------------------------
// Values of the PRD section 11 (v0.10)
// ---------------------------------------------------------------------------------------------
const PLAN = { A: [0, 0, 38.11, 'Borne ouest'], B: [47.29, 22.67, 26.83, 'Borne nord'], C: [69.15, -17.32, 21.33, 'Borne sud-est'] }
const LECTURES = {
  'A vers B': { l: [[53.64, -12.1], [53.67, -12.0], [53.62, -12.2]], deca: [53.64, 53.68] },
  'B vers C': { l: [[45.93, -6.9], [45.88, -6.8], [45.92, -6.9]], deca: [45.8, 45.77] },
  'A vers C': { l: [[73.28, -13.1], [73.23, -13.2], [73.19, -13.3]], deca: [73.27, 73.22] },
}
const B = {
  S01: { A: [20.57, 13.6], B: [36.06, -10.3], C: [53.47, -12.9] },
  S02: { A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -12.0] },
  S03: { A: [41.15, 13.6], B: [23.87, -3.9], C: [34.65, -11.9] },
  S04: { A: [46.99, 13.4], B: [30.76, -0.7], C: [26.55, -12.8] },
  S05: { A: [56.58, 13.6], B: [24.03, 4.7], C: [22.64, -8.9] },
  S06: { A: [37.94, 12.8], B: [16.53, -10.1], C: [45.79, -10.6] },
  S07: { A: [25.9, 13.5], B: [34.4, -8.7], C: [47.64, -13.0] },
  S08: { A: [52.04, 13.4], B: [14.94, 2.8], C: [32.1, -8.5] },
}
// X, Y, altitude, écart d'altitude, indice
const ATTENDU_B = {
  S01: [19.993, 0.006, 33.274, 0.01, 1.55],
  S02: [30.006, 5.006, 30.918, 0.013, 1.34],
  S03: [39.998, -0.002, 28.455, 0.041, 1.19],
  S04: [45.0, -8.001, 27.211, 0.014, 1.24],
  S05: [54.993, -0.005, 24.843, 0.055, 1.36],
  S06: [35.0, 11.999, 29.728, 0.049, 1.27],
  S07: [24.998, -3.007, 32.052, 0.03, 1.38],
  S08: [49.988, 7.993, 26.093, 0.05, 1.23],
}
const C = {
  E1: { A: [31.26, 13.3], B: [27.05, -9.4], C: [46.07, -12.0] },
  E2: { A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -9.0] },
  E4: { A: [154.3, 13.6], B: [108.09, 13.3], C: [84.93, 13.2] },
  E5: { A: [31.26, 13.3], B: [25.05, -9.4], C: null },
}
const F = {
  S10: { A: null, B: [13.3, 8.3], C: [32.75, -6.3], D: [20.57, 13.6] },
  S11: { A: null, B: [8.02, -3.6], C: [40.79, -8.5], D: [10.71, 12.9] },
  S12: { A: [57.82, 13.2], B: [13.3, 8.3], C: [32.75, -6.3], D: [20.57, 13.6] },
  S13: { A: [57.82, 13.2], B: [13.3, 8.3], C: [34.75, -6.3], D: [20.57, 13.6] },
}
const ATTENDU_F = {
  S10: [54.993, 11.995, 24.906, 0.033, 1.41],
  S11: [45.001, 14.998, 27.335, 0.026, 1.16],
  S12: [54.996, 11.998, 24.906, 0.033, 1.1],
}
// Points of the plan for games D and D2 (the PRD gives the places; the plan altitudes are free).
const POINTS = [
  ['P1', 30, 0, 30],
  ['P2', 40, 5, 28],
  ['P3', 20, -5, 33.9],
  ['P4', 25, 0, 32],
]

/** Sights from (60 ; 5) towards E (placed at S10), B and C: the station whose rank would be 3 (game F, S14). */
function viseesRang3() {
  const sol = 25.5
  const cible = { E: [54.993, 11.995, 24.906], B: [47.29, 22.67, 26.83], C: [69.15, -17.32, 21.33] }
  const out = { A: null, B: null, C: null, D: null, E: null }
  for (const [l, [x, y, z]] of Object.entries(cible)) {
    const h = Math.hypot(x - 60, y - 5)
    const dz = z - sol
    out[l] = [Math.round(Math.hypot(h, dz) * 100) / 100, Math.round(((Math.atan2(dz, h) * 180) / Math.PI) * 10) / 10]
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------
const fr = (v) => String(v).replace('.', ',')
const propre = (t) => (t || '').replace(/\s+/g, ' ').trim()
const sansEspace = (t) => (t || '').replace(/\s+/g, '')
const nombre = (t) => (t == null ? null : Number(String(t).replace(/\s/g, '').replace('−', '-').replace(/[^\d,.-]/g, '').replace(',', '.')))
const proche = (a, b, tol) => a !== null && !Number.isNaN(a) && Math.abs(a - b) <= tol + 1e-9

/** Opens a number field by its label, types the value on the keyboard, OK. */
async function saisirNombre(zone, page, libelle, valeur) {
  await zone.getByRole('button', { name: libelle, exact: true }).click()
  await page.getByRole('dialog', { name: libelle }).waitFor()
  await page.keyboard.type(fr(valeur), { delay: 5 })
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: libelle }).waitFor({ state: 'detached' })
}

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

async function creerDomaine(page, nom) {
  const premier = page.getByRole('button', { name: '+ Nouveau domaine foncier' }).first()
  if (await premier.isVisible().catch(() => false)) await premier.click()
  else {
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('menuitem', { name: '+ Nouveau domaine foncier' }).click()
  }
  await page.getByLabel('Nom du domaine').fill(nom)
  await page.getByRole('button', { name: 'Créer le domaine' }).click()
  await page.getByRole('heading', { level: 2, name: nom }).waitFor()
}

async function creerChantier(page, domaine, nom) {
  await page.getByRole('button', { name: `Plus d’actions sur ${domaine}`, exact: true }).click()
  await page.getByRole('menuitem', { name: '+ Nouveau chantier' }).click()
  await page.getByLabel('Nom du chantier').fill(nom)
  await page.getByRole('button', { name: 'Créer le chantier' }).click()
  await page.getByRole('heading', { level: 1, name: nom }).waitFor()
  return page.url()
}

/** From the work site page: « + Nouveau relevé », name, create; returns the relevé id (step 1 opens). */
async function creerReleve(page, urlChantier, nom) {
  if (page.url() !== urlChantier) {
    await page.goto(urlChantier)
    await page.getByRole('button', { name: '+ Nouveau relevé' }).waitFor()
  }
  await page.getByRole('button', { name: '+ Nouveau relevé' }).click()
  await page.getByLabel('Nom du relevé').fill(nom)
  await page.getByRole('button', { name: 'Créer le relevé' }).click()
  await page.waitForURL(/\/r\/[^/]+\/bornes$/)
  await page.getByRole('heading', { name: 'Étape 1 : les bornes' }).waitFor()
  return /\/r\/([^/]+)\/bornes$/.exec(page.url())[1]
}

/** Screen 6: place names and, if asked, X, Y, altitude of the plan (xy false: altitude only). */
async function saisirBornes(page, { xy = true, z = true } = {}) {
  for (const [l, [x, y, alt, nom]] of Object.entries(PLAN)) {
    const champ = page.getByRole('textbox', { name: `Nom de l'endroit de ${l}` })
    await champ.fill(nom)
    await champ.press('Tab')
    if (xy) {
      await saisirNombre(page, page, `X de ${l}`, x)
      await saisirNombre(page, page, `Y de ${l}`, y)
    }
    if (z) await saisirNombre(page, page, `Altitude de ${l}`, alt)
  }
  await page.waitForTimeout(300)
}

async function bornesVerifiees(page) {
  await saisirBornes(page)
  await page.getByRole('button', { name: 'Bornes déjà calées : les saisir comme vérifiées et sauter le calage' }).click()
  await page.waitForURL(/\/saisir$/)
  await page.locator('[data-calculer]').waitFor()
}

async function saisirLectures(page) {
  for (const [cote, { l, deca }] of Object.entries(LECTURES)) {
    const carte = page.getByRole('region', { name: `Côté ${cote}` })
    for (let i = 0; i < 3; i++) {
      await saisirNombre(carte, page, `Lecture ${i + 1} : distance`, l[i][0])
      await saisirNombre(carte, page, `Lecture ${i + 1} : pente`, l[i][1])
    }
    await saisirNombre(carte, page, 'Décamètre aller', deca[0])
    await saisirNombre(carte, page, 'Décamètre retour', deca[1])
  }
}

/** Heading typed by hand (« Saisir le cap à la main » when the field is not shown yet). */
async function taperCap(page, valeur) {
  const libelle = 'Cap A vers B lu sur une boussole'
  if (!(await page.getByRole('button', { name: libelle, exact: true }).count())) await page.getByRole('button', { name: 'Saisir le cap à la main' }).click()
  await saisirNombre(page, page, libelle, valeur)
  await page.waitForTimeout(250)
}

/** Waits until the plan altitude of C is stored (a reload right after typing would race the write). */
async function attendreAltitudeC(page, rel, valeur) {
  const fin = Date.now() + 10000
  for (;;) {
    const c = (await lireBase(page, 'objets')).find((o) => o.releve_id === rel && o.type === 'borne' && o.donnees.lettre === 'C' && o.donnees.type === 'principale')
    if (c && c.donnees.plan && c.donnees.plan.z === valeur) return
    if (Date.now() > fin) throw new Error(`Altitude de C ${valeur} non enregistrée`)
    await page.waitForTimeout(100)
  }
}

async function effacerCap(page) {
  await page.getByRole('button', { name: 'Effacer le cap' }).click()
  await page.getByText('Cap non lu.').waitFor()
  await page.waitForTimeout(250)
}

// ---------------- Screen 8
async function taper(page, libelle, v) {
  await page.getByRole('button', { name: libelle, exact: true }).click()
  await page.getByRole('button', { name: 'Virgule', exact: true }).waitFor()
  await page.keyboard.type(fr(v), { delay: 5 })
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Virgule', exact: true }).waitFor({ state: 'detached', timeout: 10000 })
}

/** Types every sight (null = « pas visible »), then « Calculer la station », timing the tap to the result
 *  (H08) and the first digit to the result. Returns { id, h08, station }. */
async function relever(page, mesures, { calculer = true } = {}) {
  await page.locator('[data-calculer]').waitFor()
  const t0 = Date.now()
  for (const [lettre, m] of Object.entries(mesures)) {
    if (m === null) {
      if (await page.getByRole('button', { name: `Borne ${lettre} pas visible`, exact: true }).count()) {
        await page.getByRole('button', { name: `Borne ${lettre} pas visible`, exact: true }).click()
        await page.locator(`[data-ligne="${lettre}"] >> text=Pas visible`).first().waitFor()
      }
      continue
    }
    await taper(page, `Distance vers ${lettre}`, m[0])
    await taper(page, `Pente vers ${lettre}`, m[1])
  }
  if (!calculer) return null
  if (await page.getByRole('alertdialog').count()) throw new Error(`Dialogue inattendu sur ${page.url()} : ${await page.getByRole('alertdialog').textContent()}`)
  const h08 = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const t = performance.now()
        document.querySelector('[data-calculer]').click()
        const f = () => (document.querySelector('[data-resultat-station], [data-etape-controle]') ? resolve(Math.round((performance.now() - t) * 10) / 10) : requestAnimationFrame(f))
        f()
      }),
  )
  await page.locator('[data-resultat-station], [data-etape-controle]').first().waitFor({ timeout: 15000 })
  const m = /\/saisir\/([^/?]+)/.exec(page.url())
  return { id: m ? m[1] : new URL(page.url()).searchParams.get('station'), h08, station: Date.now() - t0 }
}

function lire(page) {
  return page.evaluate(() => {
    const t = (el, s) => el?.querySelector(s)?.textContent ?? null
    const blocs = [...document.querySelectorAll('[data-chiffres]')]
    const tout = blocs[blocs.length - 1]
    const sans = document.querySelector('[data-resultat-sans] [data-chiffres]')
    const tete = document.querySelector('[data-resultat-station]')
    return {
      numero: tete?.getAttribute('data-resultat-station') ?? null,
      couleur: tete?.getAttribute('data-couleur') ?? null,
      x: t(tout, '[data-chiffre=x]'),
      y: t(tout, '[data-chiffre=y]'),
      altitude: t(tout, '[data-chiffre=altitude]'),
      ecartAltitude: t(tout, '[data-chiffre=ecart-altitude]'),
      ecartPosition: t(tout, '[data-chiffre=ecart-position]'),
      indice: t(tout, '[data-chiffre=indice]'),
      altitudes: t(tout, '[data-chiffre=altitudes]'),
      action: document.querySelector('[data-action-nommee]')?.textContent ?? null,
      sans: sans ? { x: t(sans, '[data-chiffre=x]'), y: t(sans, '[data-chiffre=y]'), altitude: t(sans, '[data-chiffre=altitude]') } : null,
      retraits: [...document.querySelectorAll('[data-retrait]')].map((li) => li.textContent),
      pied: [...document.querySelectorAll('[data-pied-station] button')].map((b) => b.textContent),
    }
  })
}

async function allerSaisir(page, idReleve) {
  const suivante = page.locator('[data-suivante]')
  if (await suivante.isVisible().catch(() => false)) await suivante.click()
  else await page.goto(page.url().replace(/\/releve\/.*$/, `/releve/r/${idReleve}/saisir`))
  await page.waitForURL(/\/saisir$/)
  await page.locator('[data-calculer]').waitFor()
}

async function ouvrir(page, banc, chemin, attente) {
  await page.goto(banc.url(`/releve${chemin}`))
  await page.locator(attente).first().waitFor({ timeout: 15000 })
}

// ---------------- Screen 12 and map
async function ouvrirResultats(page, banc, id) {
  await page.goto(banc.url(`/releve/r/${id}/resultats`))
  await page.getByRole('heading', { level: 1, name: 'Étape 4 : résultats' }).waitFor()
}

async function ajouterPoint(page, [nom, x, y, z]) {
  await page.getByRole('button', { name: 'Ajouter un point du plan' }).click()
  await page.getByRole('textbox', { name: 'Nom du point' }).fill(nom)
  await saisirNombre(page, page, 'X (m)', x)
  await saisirNombre(page, page, 'Y (m)', y)
  await saisirNombre(page, page, 'Altitude du plan (m)', z)
  await page.getByRole('button', { name: 'Enregistrer le point' }).click()
  await page.locator(`#points-plan tr[data-point-plan="${nom}"]`).waitFor()
}

async function reglerCoupure(page, valeur) {
  await page.getByRole('button', { name: 'Modifier les seuils' }).click()
  const feuille = page.getByRole('dialog', { name: 'Réglages des seuils' })
  await feuille.waitFor()
  await feuille.getByRole('button', { name: /Coupure des triangles/ }).click()
  await page.keyboard.type(String(valeur))
  await page.keyboard.press('Enter')
  await feuille.getByRole('button', { name: 'Enregistrer les seuils' }).click()
  const conf = page.getByRole('alertdialog')
  await conf.waitFor()
  const texte = await conf.innerText()
  await conf.getByRole('button', { name: 'Continuer' }).click()
  await feuille.waitFor({ state: 'detached' })
  await page.getByText(new RegExp(`coupure ${valeur} m\\)`)).waitFor()
  return texte
}

const tableauPlan = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('#points-plan tr[data-point-plan]')].map((tr) => [
        tr.getAttribute('data-point-plan'),
        { releve: tr.querySelector('[data-cellule="releve"]').innerText.trim(), ecart: tr.querySelector('[data-cellule="ecart"]').innerText.trim() },
      ]),
    ),
  )

/** Crossings of the line Y = 0 by the contours 25, 30, 35 drawn on the map (path in metres, Y flipped). */
async function croisementsY0(page, banc, id) {
  await page.goto(banc.url(`/releve/r/${id}/carte`))
  await page.locator('svg[data-echelle]').waitFor()
  await page.waitForTimeout(300)
  return page.evaluate(() => {
    const out = {}
    for (const alt of [25, 30, 35]) {
      const p = document.querySelector(`path[data-altitude="${alt}"]`)
      const xs = []
      for (const s of (p?.getAttribute('d') || '').match(/M[^M]+/g) || []) {
        const [x1, y1, x2, y2] = s.match(/-?\d+(\.\d+)?/g).map(Number)
        if ((y1 <= 0 && y2 >= 0) || (y1 >= 0 && y2 <= 0)) xs.push(y1 === y2 ? x1 : Math.round((x1 + ((0 - y1) * (x2 - x1)) / (y2 - y1)) * 1000) / 1000)
      }
      out[alt] = xs
    }
    return out
  })
}

async function telecharger(page, cle) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator(`button[data-export="${cle}"]`).click()])
  return { nom: d.suggestedFilename(), contenu: fs.readFileSync(await d.path()) }
}

async function attendreAvis(page, motif, delai = 8000) {
  const fin = Date.now() + delai
  for (;;) {
    const t = (await page.locator('[role="status"], [role="alert"]').allInnerTexts()).join(' | ')
    if (motif.test(t)) return t
    if (Date.now() > fin) throw new Error(`Avis attendu ${motif} ; vu : ${t}`)
    await new Promise((r) => setTimeout(r, 150))
  }
}

// ---------------------------------------------------------------------------------------------
async function executer(banc) {
  const res = { tableNumeros: [], jeux: {}, avion: {}, durees: { h08: [] }, captures: [], erreurs: [] }
  const lignes = (jeu) => (res.jeux[jeu] = res.jeux[jeu] || [])
  /** One line of the report: expected, read, ok. */
  const noter = (jeu, cle, attendu, lu, ok) => {
    lignes(jeu).push({ cle, attendu, lu: typeof lu === 'string' ? propre(lu) : lu, ok: !!ok })
    if (!ok) res.erreurs.push(`${jeu} ${cle} : attendu ${JSON.stringify(attendu)}, lu ${JSON.stringify(lu)}`)
  }
  const contient = (jeu, cle, lu, attendu) => noter(jeu, cle, attendu, lu, sansEspace(lu).includes(sansEspace(attendu)))
  const capture = async (page, nom) => {
    res.captures.push(path.basename(await banc.capturer(page, nom)))
  }
  const station = (jeu, n, lu, attendu, couleur = 'vert') => {
    const [x, y, z, ea, ind] = attendu
    const v = { x: nombre(lu.x), y: nombre(lu.y), altitude: nombre(lu.altitude), ecartAltitude: nombre(lu.ecartAltitude), indice: nombre(lu.indice), couleur: lu.couleur }
    const ok = proche(v.x, x, 0.01) && proche(v.y, y, 0.01) && proche(v.altitude, z, 0.01) && (ea === undefined || proche(v.ecartAltitude, ea, 0.01)) && (ind === undefined || proche(v.indice, ind, 0.01)) && lu.couleur === couleur
    noter(jeu, n, { x, y, altitude: z, ecartAltitude: ea, indice: ind, couleur }, { ...v, numero: lu.numero }, ok)
  }

  const { page, contexte } = await banc.ouvrir()
  page.setDefaultTimeout(20000)
  const requetes = []
  page.on('request', (r) => requetes.push(r.url()))
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[console]', m.text().slice(0, 300))
  })

  // Durations 7a: open the app to the first input (cold, first visit then warm reload)
  const tOuverture = Date.now()
  await page.goto(banc.url('/releve/'), { waitUntil: 'commit' })
  await page.getByRole('button', { name: '+ Nouveau domaine foncier' }).first().waitFor()
  res.durees.ouvertureAccueilPremiereVisiteMs = Date.now() - tOuverture
  await banc.attendreHorsLigne(page, 120000)
  await creerDomaine(page, 'Recette A à G')
  const urlChantier = await creerChantier(page, 'Recette A à G', 'Premier chantier')
  await capture(page, '0-chantier')

  const ids = {}

  // ============================================================== 1 « Calage A »: games A and A3
  if (PARTIES.includes(1)) {
    const rel = await creerReleve(page, urlChantier, 'Calage A')
    ids.calageA = rel
    await saisirBornes(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture(page, '1-calage-a-bornes')
    await page.getByRole('button', { name: 'Étape suivante : caler les bornes' }).click()
    await page.getByRole('heading', { name: 'Étape 2 : caler les bornes' }).waitFor()
    await saisirLectures(page)
    await page.getByRole('button', { name: 'Lire la boussole' }).click()
    await page.getByText('Pas de boussole sur ce téléphone : saisissez le cap lu sur une boussole.').waitFor({ timeout: 8000 })
    await taperCap(page, 74.4)
    await page.locator('[data-resultat]').waitFor()

    const txt = async (sel) => propre(await page.locator(sel).first().innerText())
    const carte = async (cote) => propre(await page.getByRole('region', { name: `Côté ${cote}` }).getByLabel(`Résultat du côté ${cote}`).innerText())
    const lireA = async (jeu) => {
      for (const [cote, d, ecart, biais, den, coul] of [
        ['A vers B', '52,468', '+0,016', '−0,017', '−11,245', 'VERT'],
        ['B vers C', '45,457', '−0,124', '+0,125', '−5,489', 'ORANGE'],
        ['A vers C', '71,310', '+0,011', '−0,012', '−16,723', 'VERT'],
      ]) {
        const c = await carte(cote)
        contient(jeu, `${cote} distance retenue`, c, `Distance retenue${d} m`)
        contient(jeu, `${cote} écart décamètre et appareil`, c, `Écart décamètre et appareil${ecart} m`)
        contient(jeu, `${cote} biais`, c, `Biais de l'appareil${biais} m`)
        contient(jeu, `${cote} dénivelé`, c, `Dénivelé${den} m`)
        contient(jeu, `${cote} couleur`, await txt(`[data-cote="${cote}"]`), `${cote}${coul}`)
      }
      contient(jeu, 'fermeture de la boucle', await txt('[data-boucle]'), 'Boucle des dénivelés : −0,011 m VERT')
    }
    await lireA('A')
    contient('A', 'borne A', await txt('[data-borne-placee="A"]'), 'A 0,000 0,000 38,110')
    contient('A', 'borne B', await txt('[data-borne-placee="B"]'), 'B 47,312 22,681 26,865')
    contient('A', 'borne C', await txt('[data-borne-placee="C"]'), 'C 69,217 −17,150 21,382')
    contient('A', 'écart au plan B', await txt('[data-controle-ligne="positionB"]'), 'Position de B 0,025 m VERT')
    contient('A', 'écart au plan C', await txt('[data-controle-ligne="positionC"]'), 'Position de C 0,182 m ORANGE')
    contient('A', "écart d'altitude B", await txt('[data-controle-ligne="altitudeB"]'), 'Altitude de B +0,035 m VERT')
    contient('A', "écart d'altitude C", await txt('[data-controle-ligne="altitudeC"]'), 'Altitude de C +0,052 m VERT')
    contient('A', 'cap corrigé', await txt('[data-cap]'), 'Cap lu 74,4° ; déclinaison 10° ; cap corrigé 64,4°')
    contient('A', 'écart de cap', await txt('[data-controle-ligne="cap"]'), 'Cap A vers B (plan 64,4°) écart 0,0° VERT')
    contient('A', 'couleur du calage', propre(await page.locator('[data-resultat] h3').locator('..').innerText()), 'Résultat du calage ORANGE')
    const modeMsg = await page.getByText("L'appareil semble afficher une distance horizontale").count()
    noter('A', 'pas de message sur le mode d’affichage', 'absent', modeMsg ? 'présent' : 'absent', modeMsg === 0)
    await page.locator('[data-resultat]').scrollIntoViewIfNeeded()
    await capture(page, '1-calage-a-resultat')
    await page.locator('[data-controle]').scrollIntoViewIfNeeded()
    await capture(page, '1-calage-a-controle')
    await page.getByRole('button', { name: 'Étape suivante : valider le calage et relever' }).click()
    await page.waitForURL(/\/saisir$/)
    noter('A', 'calage orange validé, Saisir ouvert', '/saisir', new URL(page.url()).pathname.replace(/^.*\//, '/'), true)

    // A3 (1): heading 254,4
    await page.goto(banc.url(`/releve/r/${rel}/calage`))
    await page.locator('[data-resultat]').waitFor()
    await taperCap(page, 254.4)
    contient('A3', 'cap 254,4 corrigé', await txt('[data-cap]'), 'Cap lu 254,4° ; déclinaison 10° ; cap corrigé 244,4°')
    contient('A3', 'cap 254,4 : écart de cap', await txt('[data-controle-ligne="cap"]'), 'écart 180,0° ROUGE')
    contient('A3', 'cap 254,4 : message', await txt('[data-controle]'), 'Le plan et le terrain ne concordent pas')
    contient('A3', 'cap 254,4 : positions identiques (B)', await txt('[data-borne-placee="B"]'), 'B 47,312 22,681 26,865')
    contient('A3', 'cap 254,4 : positions identiques (C)', await txt('[data-borne-placee="C"]'), 'C 69,217 −17,150 21,382')
    contient('A3', 'cap 254,4 : calage rouge', propre(await page.locator('[data-resultat] h3').locator('..').innerText()), 'Résultat du calage ROUGE')
    await page.locator('[data-controle]').scrollIntoViewIfNeeded()
    await capture(page, '1-a3-cap-inverse')
    await page.getByRole('button', { name: 'Étape suivante : valider le calage et relever' }).click()
    const dlg = page.getByRole('alertdialog')
    await dlg.waitFor()
    contient('A3', 'cap 254,4 : dialogue avant validation', await dlg.innerText(), 'Le plan et le terrain ne concordent pas : vérifier la borne A ou B ou le plan')
    await capture(page, '1-a3-dialogue-rouge')
    await dlg.getByRole('button', { name: 'Refaire' }).click()
    // A3 (2): heading back to 74,4, plan altitude of C 22,33
    await taperCap(page, 74.4)
    await page.goto(banc.url(`/releve/r/${rel}/bornes`))
    await page.getByRole('heading', { name: 'Étape 1 : les bornes' }).waitFor()
    await saisirNombre(page, page, 'Altitude de C', 22.33)
    await attendreAltitudeC(page, rel, 22.33)
    await page.goto(banc.url(`/releve/r/${rel}/calage`))
    await page.locator('[data-controle]').waitFor()
    contient('A3', 'altitude du plan de C 22,33 : écart', await txt('[data-controle-ligne="altitudeC"]'), 'Altitude de C −0,948 m ROUGE')
    contient('A3', 'altitude du plan de C 22,33 : calage rouge', propre(await page.locator('[data-resultat] h3').locator('..').innerText()), 'Résultat du calage ROUGE')
    contient('A3', 'altitude du plan de C 22,33 : altitude calculée de C inchangée', await txt('[data-borne-placee="C"]'), 'C 69,217 −17,150 21,382')
    contient('A3', 'altitude du plan de C 22,33 : altitude calculée de B inchangée', await txt('[data-borne-placee="B"]'), 'B 47,312 22,681 26,865')
    await page.locator('[data-controle]').scrollIntoViewIfNeeded()
    await capture(page, '1-a3-altitude-c')
    // A3 (3): plan altitude of C back to 21,33, heading cleared
    await page.goto(banc.url(`/releve/r/${rel}/bornes`))
    await page.getByRole('heading', { name: 'Étape 1 : les bornes' }).waitFor()
    await saisirNombre(page, page, 'Altitude de C', 21.33)
    await attendreAltitudeC(page, rel, 21.33)
    await page.goto(banc.url(`/releve/r/${rel}/calage`))
    await page.locator('[data-resultat]').waitFor()
    await effacerCap(page)
    contient('A3', 'sans cap : mention « cap non contrôlé » (alerte de la carte Contrôle)', await page.locator('[data-controle] > p').allInnerTexts().then((x) => x.join(' | ')), 'cap non contrôlé')
    contient('A3', 'sans cap : calage orange (inchangé)', propre(await page.locator('[data-resultat] h3').locator('..').innerText()), 'Résultat du calage ORANGE')
    await page.locator('[data-controle]').scrollIntoViewIfNeeded()
    await capture(page, '1-a3-sans-cap')
    // Back to game A (heading 74,4) so the relevé stays as the PRD describes it.
    await taperCap(page, 74.4)
  }

  // ============================================================== 2 « Calage A2 »
  if (PARTIES.includes(2)) {
    const rel = await creerReleve(page, urlChantier, 'Calage A2')
    ids.calageA2 = rel
    await saisirBornes(page, { xy: false })
    await page.getByRole('button', { name: 'Étape suivante : caler les bornes' }).click()
    await page.getByRole('heading', { name: 'Étape 2 : caler les bornes' }).waitFor()
    await saisirLectures(page)
    const question = page.getByRole('heading', { name: 'C est-il à gauche ou à droite en regardant de A vers B ?' })
    await question.waitFor()
    noter('A2', 'question du côté de C posée (jamais de côté par défaut)', 'posée', 'posée', true)
    await page.getByRole('button', { name: 'À droite' }).click()
    await taperCap(page, 74.4)
    await page.locator('[data-resultat]').waitFor()
    const txt = async (sel) => propre(await page.locator(sel).first().innerText())
    const xy = async (l) => {
      const t = (await txt(`[data-borne-placee="${l}"]`)).split(' ')
      return { x: nombre(t[1]), y: nombre(t[2]) }
    }
    let b = await xy('B')
    let c = await xy('C')
    noter('A2', 'avec cap : B', { x: 47.317, y: 22.671 }, b, proche(b.x, 47.317, 0.01) && proche(b.y, 22.671, 0.01))
    noter('A2', 'avec cap : C', { x: 69.213, y: -17.165 }, c, proche(c.x, 69.213, 0.01) && proche(c.y, -17.165, 0.01))
    noter('A2', 'avec cap : C au sud de la droite A vers B', 'sud', c.y < (22.671 / 47.317) * c.x ? 'sud' : 'nord', c.y < (22.671 / 47.317) * c.x)
    for (const [cote, d, den, coul] of [
      ['A vers B', '52,468', '−11,245', 'VERT'],
      ['B vers C', '45,457', '−5,489', 'ORANGE'],
      ['A vers C', '71,310', '−16,723', 'VERT'],
    ])
      {
      const ligne = await txt(`[data-cote="${cote}"]`)
      contient('A2', `${cote} : couleur et distance identiques au jeu A`, ligne, `${cote}${coul} ${d}`)
      contient('A2', `${cote} : dénivelé identique au jeu A`, ligne, den)
    }
    contient('A2', 'fermeture identique', await txt('[data-boucle]'), '−0,011 m VERT')
    contient('A2', 'avec cap : mention', await txt('[data-resultat]'), 'Nord approximatif')
    await page.locator('[data-resultat]').scrollIntoViewIfNeeded()
    await capture(page, '2-a2-avec-cap')
    await page.goto(banc.url(`/releve/r/${rel}/carte`))
    await page.locator('svg[data-echelle]').waitFor()
    noter('A2', 'avec cap : mention sur la carte', 'Nord approximatif', propre(await page.locator('main').innerText()).includes('Nord approximatif') ? 'Nord approximatif' : 'absente', propre(await page.locator('main').innerText()).includes('Nord approximatif'))
    await capture(page, '2-a2-carte-nord-approximatif')
    await page.goto(banc.url(`/releve/r/${rel}/calage`))
    await page.locator('[data-resultat]').waitFor()
    await effacerCap(page)
    b = await xy('B')
    noter('A2', 'sans cap : B', { x: 52.468, y: 0 }, b, proche(b.x, 52.468, 0.01) && proche(b.y, 0, 0.01))
    contient('A2', 'sans cap : mention', await txt('[data-resultat]'), 'Orientation libre (axe A vers B)')
    await page.locator('[data-resultat]').scrollIntoViewIfNeeded()
    await capture(page, '2-a2-sans-cap')
    await page.goto(banc.url(`/releve/r/${rel}/carte`))
    await page.locator('svg[data-echelle]').waitFor()
    const main = propre(await page.locator('main').innerText())
    noter('A2', 'sans cap : mention sur la carte', 'orientation libre (axe A vers B)', main.toLowerCase().includes('orientation libre (axe a vers b)') ? 'présente' : main.slice(0, 120), main.toLowerCase().includes('orientation libre (axe a vers b)'))
    const fleche = await page.locator('svg g[aria-label="Nord"], svg g[aria-label="Nord approximatif"]').count()
    noter('A2', 'sans cap : pas de flèche du nord', 0, fleche, fleche === 0)
    await capture(page, '2-a2-carte-sans-nord')
  }

  // ============================================================== 3 « Courbes D »: D, D2, cut-off 15
  if (PARTIES.includes(3)) {
    const rel = await creerReleve(page, urlChantier, 'Courbes D')
    ids.courbesD = rel
    await bornesVerifiees(page)
    for (const [n, m] of Object.entries(B)) {
      await relever(page, m)
      station('D (stations B)', n, await lire(page), ATTENDU_B[n])
      await allerSaisir(page, rel)
    }
    await ouvrirResultats(page, banc, rel)
    for (const p of POINTS) await ajouterPoint(page, p)
    // cut-off 100: game D
    const conf = await reglerCoupure(page, 100)
    noter('D', 'confirmation avant recalcul', 'Tous les résultats seront recalculés. Continuer ?', propre(conf), conf.includes('Tous les résultats seront recalculés. Continuer ?'))
    const resume100 = propre(await page.locator('[data-resume-courbes]').innerText())
    noter('D', '11 points, 17 triangles gardés sur 17', '11 points, 17 triangles gardés sur 17 (coupure 100 m)', resume100, resume100.includes('11 points, 17 triangles gardés sur 17 (coupure 100 m)'))
    let t = await tableauPlan(page)
    for (const [nom, v] of [
      ['P1', 30.872],
      ['P2', 28.483],
      ['P3', 33.257],
    ])
      noter('D', `altitude en ${nom} (${POINTS.find((p) => p[0] === nom).slice(1, 3).join(' ; ')})`, v, t[nom]?.releve, proche(nombre(t[nom]?.releve), v, 0.05))
    await page.locator('#points-plan').scrollIntoViewIfNeeded()
    await capture(page, '3-d-comparaison-100')
    let cr = await croisementsY0(page, banc, rel)
    for (const [alt, x] of [
      [35, 12.86],
      [30, 33.61],
      [25, 54.34],
    ])
      noter('D', `courbe ${alt} sur Y = 0`, x, cr[alt], cr[alt].some((v) => proche(v, x, 0.2)))
    await capture(page, '3-d-carte-100')
    // cut-off 20: game D2
    await ouvrirResultats(page, banc, rel)
    await reglerCoupure(page, 20)
    const resume20 = propre(await page.locator('[data-resume-courbes]').innerText())
    noter('D2', '8 triangles gardés sur 17', '8 triangles gardés sur 17 (coupure 20 m)', resume20, resume20.includes('8 triangles gardés sur 17 (coupure 20 m)'))
    t = await tableauPlan(page)
    noter('D2', 'altitude en P1 (30 ; 0)', 30.872, t.P1?.releve, proche(nombre(t.P1?.releve), 30.872, 0.05))
    noter('D2', 'altitude en P2 (40 ; 5)', 28.483, t.P2?.releve, proche(nombre(t.P2?.releve), 28.483, 0.05))
    noter('D2', 'P3 (20 ; −5)', 'non couvert', t.P3?.releve, t.P3?.releve === 'non couvert')
    await page.locator('#points-plan').scrollIntoViewIfNeeded()
    await capture(page, '3-d2-comparaison-20')
    cr = await croisementsY0(page, banc, rel)
    noter('D2', 'pas de courbe 35 sur Y = 0', [], cr[35], cr[35].length === 0)
    noter('D2', 'courbe 30 sur Y = 0', 33.61, cr[30], cr[30].some((v) => proche(v, 33.61, 0.2)))
    noter('D2', 'courbe 25 sur Y = 0', 54.34, cr[25], cr[25].some((v) => proche(v, 54.34, 0.2)))
    await capture(page, '3-d2-carte-20')
    // cut-off 15: last line of D2
    await ouvrirResultats(page, banc, rel)
    await reglerCoupure(page, 15)
    t = await tableauPlan(page)
    noter('D2 (15 m)', 'altitude en P4 (25 ; 0)', 32.076, t.P4?.releve, proche(nombre(t.P4?.releve), 32.076, 0.05))
    for (const n of ['P1', 'P2', 'P3']) noter('D2 (15 m)', `${n} non couvert`, 'non couvert', t[n]?.releve, t[n]?.releve === 'non couvert')
    await page.locator('#points-plan').scrollIntoViewIfNeeded()
    await capture(page, '3-d2-comparaison-15')
  }

  // ============================================================== 4 « Défauts C »
  if (PARTIES.includes(4)) {
    const rel = await creerReleve(page, urlChantier, 'Défauts C')
    ids.defautsC = rel
    await bornesVerifiees(page)
    let r = await relever(page, C.E1)
    let lu = await lire(page)
    res.tableNumeros.push({ releve: 'Défauts C', prd: 'E1', ecran: lu.numero })
    noter('C', 'E1 couleur', 'rouge', lu.couleur, lu.couleur === 'rouge')
    noter('C', 'E1 X ; Y ; altitude', [29.569, 3.238, 31.072], [lu.x, lu.y, lu.altitude], proche(nombre(lu.x), 29.569, 0.01) && proche(nombre(lu.y), 3.238, 0.01) && proche(nombre(lu.altitude), 31.072, 0.01))
    contient('C', 'E1 altitudes par borne', lu.altitudes, '30,919')
    contient('C', 'E1 altitudes par borne (B)', lu.altitudes, '31,248')
    contient('C', 'E1 altitudes par borne (C)', lu.altitudes, '30,908')
    noter('C', 'E1 écart altitude', 0.339, lu.ecartAltitude, proche(nombre(lu.ecartAltitude), 0.339, 0.01))
    noter('C', 'E1 écart position', 0.676, lu.ecartPosition, proche(nombre(lu.ecartPosition), 0.676, 0.01))
    noter('C', 'E1 visée suspecte B', 'Refaire la visée vers B, Borne nord', lu.action, lu.action === 'Refaire la visée vers B, Borne nord')
    await capture(page, '4-c-e1-rouge')
    await allerSaisir(page, rel)
    r = await relever(page, C.E2)
    lu = await lire(page)
    res.tableNumeros.push({ releve: 'Défauts C', prd: 'E2', ecran: lu.numero })
    noter('C', 'E2 couleur', 'rouge', lu.couleur, lu.couleur === 'rouge')
    noter('C', 'E2 X ; Y ; altitude', [29.797, 5.352, 30.561], [lu.x, lu.y, lu.altitude], proche(nombre(lu.x), 29.797, 0.01) && proche(nombre(lu.y), 5.352, 0.01) && proche(nombre(lu.altitude), 30.561, 0.01))
    contient('C', 'E2 altitudes par borne (C)', lu.altitudes, '28,537')
    noter('C', 'E2 écart altitude', 2.384, lu.ecartAltitude, proche(nombre(lu.ecartAltitude), 2.384, 0.01))
    noter('C', 'E2 écart position', 0.147, lu.ecartPosition, proche(nombre(lu.ecartPosition), 0.147, 0.01))
    noter('C', 'E2 visée suspecte C', 'Refaire la visée vers C, Borne sud-est', lu.action, lu.action === 'Refaire la visée vers C, Borne sud-est')
    await capture(page, '4-c-e2-rouge')
    await allerSaisir(page, rel)
    r = await relever(page, C.E4)
    lu = await lire(page)
    res.tableNumeros.push({ releve: 'Défauts C', prd: 'E4', ecran: lu.numero })
    noter('C', 'E4 couleur', 'orange', lu.couleur, lu.couleur === 'orange')
    noter('C', 'E4 X ; Y ; altitude', [149.994, -0.017, 1.928], [lu.x, lu.y, lu.altitude], proche(nombre(lu.x), 149.994, 0.01) && proche(nombre(lu.y), -0.017, 0.01) && proche(nombre(lu.altitude), 1.928, 0.01))
    noter('C', 'E4 indice', 3.38, lu.indice, proche(nombre(lu.indice), 3.38, 0.01))
    await capture(page, '4-c-e4-orange')
    await ouvrir(page, banc, `/r/${rel}/saisir/${r.id}`, '[data-calculer]')
    const longues = await page.locator('[data-visee-longue]').count()
    noter('C', 'E4 visées de plus de 60 m (orange)', 3, longues, longues === 3)
    await allerSaisir(page, rel)
    r = await relever(page, C.E5)
    lu = await lire(page)
    res.tableNumeros.push({ releve: 'Défauts C', prd: 'E5', ecran: lu.numero })
    noter('C', 'E5 pas de calcul, station en attente', 'incomplete', lu.couleur, lu.couleur === 'incomplete')
    noter('C', 'E5 message', 'Station incomplète : il manque la borne C.', await page.locator('[data-manquantes]').textContent(), (await page.locator('[data-manquantes]').textContent()) === 'Station incomplète : il manque la borne C.')
    noter('C', 'E5 proposition (H11)', 'Ajouter une borne éphémère', await page.locator('[data-ajouter-ephemere]').textContent(), (await page.locator('[data-ajouter-ephemere]').textContent()) === 'Ajouter une borne éphémère')
    const pastille = await page.locator('nav[aria-label="Barre du relevé"] [role=img]').getAttribute('aria-label')
    noter('C', 'E5 pastille D22', '1 station incomplète', pastille, pastille === '1 station incomplète')
    await capture(page, '4-c-e5-incomplete')
  }

  // ============================================================== 5 « Stations B F G »
  if (PARTIES.includes(5)) {
    const rel = await creerReleve(page, urlChantier, 'Stations B F G')
    ids.bfg = rel
    await bornesVerifiees(page)
    const st = {}
    for (const [n, m] of Object.entries(B)) {
      const r = await relever(page, m)
      st[n] = r.id
      res.durees.h08.push({ station: `${n} (B F G)`, calculerAResultatMs: r.h08, premierChiffreAResultatMs: r.station })
      const lu = await lire(page)
      res.tableNumeros.push({ releve: 'Stations B F G', prd: n, ecran: lu.numero })
      station('B', n, lu, ATTENDU_B[n])
      if (n === 'S01') await capture(page, '5-b-s01-vert')
      await allerSaisir(page, rel)
    }

    // F: E4 measured through screen 10, refused as ephemeral target
    await page.locator('[data-lien-ephemeres]').click()
    await page.locator('[data-ajouter]').click()
    await page.locator('[data-suivant]').click()
    await page.getByRole('button', { name: 'Distance vers A', exact: true }).waitFor()
    let r = await relever(page, C.E4)
    const numeroE4 = propre(await page.locator('[data-etape-controle] h3').textContent())
    res.tableNumeros.push({ releve: 'Stations B F G', prd: 'E4 (jeu F)', ecran: numeroE4.replace('Station ', '') })
    noter('F', 'E4 refusée comme borne éphémère', 'refuse', await page.locator('[data-etape-controle]').getAttribute('data-controle'), (await page.locator('[data-etape-controle]').getAttribute('data-controle')) === 'refuse')
    noter('F', 'E4 message (H13 étape 3)', 'Position trop fragile : choisissez un endroit plus au centre des bornes', await page.locator('[data-message-controle]').textContent(), (await page.locator('[data-message-controle]').textContent()) === 'Position trop fragile : choisissez un endroit plus au centre des bornes')
    await capture(page, '5-f-e4-refusee')
    // D from S06
    await ouvrir(page, banc, `/r/${rel}/saisir/${st.S06}?vue=resultat`, '[data-suivante]')
    await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
    await page.locator('[data-etape-controle]').waitFor()
    noter('F', 'S06 acceptée, rang 1', 'accepte 1', `${await page.locator('[data-etape-controle]').getAttribute('data-controle')} ${await page.locator('[data-rang]').getAttribute('data-rang')}`, (await page.locator('[data-rang]').getAttribute('data-rang')) === '1')
    await page.locator('[data-continuer]').click()
    await page.locator('input[data-champ-nom]').fill('Piquet du manguier')
    noter('F', 'D lettre proposée', 'D', await page.locator('input[data-champ-lettre]').inputValue(), (await page.locator('input[data-champ-lettre]').inputValue()) === 'D')
    const posD = await page.locator('[data-position-creation]').textContent()
    noter('F', 'D en (35,000 ; 11,999 ; 29,728)', 'Depuis la station S06 : X 35,000 ; Y 11,999 ; altitude 29,728', posD, posD === 'Depuis la station S06 : X 35,000 ; Y 11,999 ; altitude 29,728')
    await capture(page, '5-f-d-creation')
    await page.locator('[data-creer]').click()
    await page.locator('[data-calculer]').waitFor()
    // S10 to S13
    for (const n of ['S10', 'S11', 'S12', 'S13']) {
      r = await relever(page, F[n])
      st[n] = r.id
      res.durees.h08.push({ station: `${n} (B F G)`, calculerAResultatMs: r.h08, premierChiffreAResultatMs: r.station })
      const lu = await lire(page)
      res.tableNumeros.push({ releve: 'Stations B F G', prd: n, ecran: lu.numero })
      if (n === 'S13') {
        noter('F', 'S13 rouge', 'rouge', lu.couleur, lu.couleur === 'rouge')
        noter('F', 'S13 calcul à 4', [54.964, 13.194, 24.926], [lu.x, lu.y, lu.altitude], proche(nombre(lu.x), 54.964, 0.01) && proche(nombre(lu.y), 13.194, 0.01) && proche(nombre(lu.altitude), 24.926, 0.01))
        noter('F', 'S13 visée suspecte C', 'Refaire la visée vers C, Borne sud-est', lu.action, lu.action === 'Refaire la visée vers C, Borne sud-est')
        noter('F', 'S13 retraits', 'sans C : 0,003 m | sans A : 0,953 m | sans B : 0,186 m | sans D : 0,966 m', lu.retraits.join(' | '), lu.retraits.join(' | ') === 'sans C : 0,003 m | sans A : 0,953 m | sans B : 0,186 m | sans D : 0,966 m')
        await capture(page, '5-f-s13-rouge')
        await page.locator('[data-garder-sans]').click()
        await page.locator('[data-etat-station="gardee"]').waitFor()
        const l2 = await lire(page)
        noter('F', 'S13 résultat gardé sans C', [54.996, 12.002, 24.904], l2.sans, !!l2.sans && proche(nombre(l2.sans.x), 54.996, 0.01) && proche(nombre(l2.sans.y), 12.002, 0.01) && proche(nombre(l2.sans.altitude), 24.904, 0.01))
        await capture(page, '5-f-s13-garde-sans-c')
        continue
      }
      station('F', n, lu, ATTENDU_F[n])
      if (n === 'S10') noter('F', 'pas de proposition H15 après S10', 0, await page.locator('[data-proposition-h15]').count(), (await page.locator('[data-proposition-h15]').count()) === 0)
      if (n === 'S11') {
        const h15 = page.locator('[data-proposition-h15]')
        await h15.waitFor()
        const texte = propre(await h15.textContent())
        noter('F', 'proposition H15 après S11', 'Ajouter une borne éphémère pour cette zone ?', texte, texte.includes('Ajouter une borne éphémère pour cette zone ?'))
        await capture(page, '5-f-h15')
        await h15.getByRole('button', { name: 'Non', exact: true }).click()
        await h15.waitFor({ state: 'detached' })
      }
      await allerSaisir(page, rel)
    }
    // S14: E from S10 (rank 2), a station sighting E refused (rank 3), then E withdrawn
    await ouvrir(page, banc, `/r/${rel}/saisir/${st.S10}?vue=resultat`, '[data-suivante]')
    await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
    await page.locator('[data-continuer]').click()
    await page.locator('input[data-champ-nom]').fill('Piquet du talus')
    const rangE = await page.locator('[data-rang-creation]').getAttribute('data-rang-creation')
    noter('F', 'S14 : borne E créée depuis S10, rang 2', 'E 2', `${await page.locator('input[data-champ-lettre]').inputValue()} ${rangE}`, rangE === '2')
    await page.locator('[data-creer]').click()
    await page.locator('[data-calculer]').waitFor()
    await ouvrir(page, banc, `/r/${rel}/ephemere`, '[data-ajouter]')
    await page.locator('[data-ajouter]').click()
    await page.locator('[data-suivant]').click()
    await page.getByRole('button', { name: 'Distance vers E', exact: true }).waitFor()
    await relever(page, viseesRang3())
    const msgRang = propre(await page.locator('[data-etape-controle]').innerText())
    const numeroS14 = propre(await page.locator('[data-etape-controle] h3').textContent()).replace('Station ', '')
    res.tableNumeros.push({ releve: 'Stations B F G', prd: 'S14 (station visant E de rang 2)', ecran: numeroS14 })
    noter('F', 'S14 : borne depuis une station visant E (rang 3) refusée', 'trop de reports, précision insuffisante', msgRang.slice(0, 160), /trop de reports, précision insuffisante/i.test(msgRang) && !(await page.locator('[data-continuer]').count()))
    await capture(page, '5-f-s14-rang-3-refuse')
    await ouvrir(page, banc, `/r/${rel}/ephemere`, '[data-liste-actives]')
    await page.locator('[data-borne-ephemere="E"]').getByRole('button', { name: 'Retirer', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer', exact: true }).click()
    await page.locator('[data-borne-retiree="E1"]').waitFor()
    const actives = await page.locator('[data-borne-ephemere]').evaluateAll((e) => e.map((x) => x.getAttribute('data-borne-ephemere')).join(''))
    noter('F', 'E retirée, D seule active', 'D', actives, actives === 'D')

    // G
    await ouvrir(page, banc, `/r/${rel}/saisir/${st.S01}?vue=resultat`, '[data-suivante]')
    await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
    await page.locator('[data-continuer]').click()
    await page.locator('input[data-champ-nom]').waitFor()
    const proposee = await page.locator('[data-lettre-proposee]').getAttribute('data-lettre-proposee')
    noter('G', 'prochain panneau libre (A, B, C, D actives)', 'E', proposee, proposee === 'E')
    await page.locator('input[data-champ-lettre]').fill('B')
    await page.locator('input[data-champ-nom]').fill('Angle sud du parking')
    await page.locator('[data-creer]').click()
    const refus = await page.locator('[data-erreur-lettre]').textContent()
    noter('G', 'doublon B refusé', 'La lettre B est déjà portée par Borne nord', refus, refus === 'La lettre B est déjà portée par Borne nord')
    await capture(page, '5-g-doublon-b')
    await ouvrir(page, banc, `/r/${rel}/ephemere`, '[data-liste-actives]')
    await page.locator('[data-borne-ephemere="D"]').getByRole('button', { name: 'Retirer', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer', exact: true }).click()
    await page.locator('[data-borne-retiree="D1"]').waitFor()
    await ouvrir(page, banc, `/r/${rel}/saisir/${st.S01}?vue=resultat`, '[data-suivante]')
    await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
    await page.locator('[data-continuer]').click()
    await page.locator('input[data-champ-nom]').fill('Angle sud du parking')
    const d2 = {
      lettre: await page.locator('input[data-champ-lettre]').inputValue(),
      rang: await page.locator('[data-rang-creation]').getAttribute('data-rang-creation'),
      position: await page.locator('[data-position-creation]').textContent(),
    }
    noter('G', 'réemploi : lettre D, rang 1', 'D 1', `${d2.lettre} ${d2.rang}`, d2.lettre === 'D' && d2.rang === '1')
    noter('G', 'réemploi : position', 'Depuis la station S01 : X 19,993 ; Y 0,006 ; altitude 33,274', d2.position, d2.position === 'Depuis la station S01 : X 19,993 ; Y 0,006 ; altitude 33,274')
    await page.locator('[data-creer]').click()
    await page.locator('[data-calculer]').waitFor()
    await page.waitForTimeout(200)
    const lignesD = await page.locator('[data-ligne="D"]').evaluateAll((e) => e.map((x) => ({ usage: x.getAttribute('data-usage'), nom: x.querySelector('[data-nom-ligne]')?.textContent })))
    noter('G', 'écran Station : une seule ligne D, usage 2, « Angle sud du parking »', [{ usage: '2', nom: 'Angle sud du parking' }], lignesD, lignesD.length === 1 && lignesD[0].usage === '2' && lignesD[0].nom === 'Angle sud du parking')
    await capture(page, '5-g-ligne-d2')
    for (const n of ['S10', 'S11', 'S12', 'S13']) {
      await ouvrir(page, banc, `/r/${rel}/saisir/${st[n]}?vue=resultat`, '[data-resultat-station]')
      const l = await lire(page)
      const att = n === 'S13' ? [54.964, 13.194, 24.926] : ATTENDU_F[n]
      await ouvrir(page, banc, `/r/${rel}/saisir/${st[n]}`, '[data-calculer]')
      const vers = await page.locator('section[data-ligne="D"]').evaluateAll((e) => e.map((x) => x.getAttribute('aria-label')))
      noter('G', `${n} garde son résultat et renvoie à D (1)`, { x: att[0], y: att[1], altitude: att[2], visee: 'Visée vers D (1), Piquet du manguier, retirée' }, { x: l.x, y: l.y, altitude: l.altitude, visees: vers }, proche(nombre(l.x), att[0], 0.01) && proche(nombre(l.y), att[1], 0.01) && proche(nombre(l.altitude), att[2], 0.01) && vers.includes('Visée vers D (1), Piquet du manguier, retirée'))
    }

    // Exports: CSV, PDF, backup round trip
    await ouvrirResultats(page, banc, rel)
    const csv = await telecharger(page, 'csv')
    const texteCsv = csv.contenu.toString('utf8')
    const lc = texteCsv.replace(/^﻿/, '').split('\r\n')
    fs.writeFileSync(path.join(banc.sortie, csv.nom), csv.contenu)
    const ligneD1 = lc.find((l) => l.startsWith('D (1);')) || ''
    const ligneD2 = lc.find((l) => l.startsWith('D (2);')) || ''
    noter('G', 'CSV : D (1)', 'D (1);Piquet du manguier;borne éphémère;1;retirée', ligneD1.split(';').slice(0, 5).join(';'), ligneD1.startsWith('D (1);Piquet du manguier;borne éphémère;1;retirée'))
    noter('G', 'CSV : D (2)', 'D (2);Angle sud du parking;borne éphémère;1;active', ligneD2.split(';').slice(0, 5).join(';'), ligneD2.startsWith('D (2);Angle sud du parking;borne éphémère;1;active'))
    const s10 = (lc.find((l) => l.startsWith('S10;')) || '').split(';')
    noter('G', 'CSV : S10 renvoie à D (1)', 'B, C, D (1)', s10[12], s10[12] === 'B, C, D (1)')
    noter('G', 'CSV : BOM, virgule décimale, aucun tiret long ni point médian', true, csv.contenu[0] === 0xef && /^\d+,\d{3}$/.test(s10[5] || '') && !/[—–·]/.test(texteCsv), csv.contenu[0] === 0xef && /^\d+,\d{3}$/.test(s10[5] || '') && !/[—–·]/.test(texteCsv))
    res.csvExtrait = lc.slice(0, 4).concat(lc.filter((l) => /^(D \(|S1[0-4];)/.test(l)))
    const pdf = await telecharger(page, 'pdf')
    fs.writeFileSync(path.join(banc.sortie, pdf.nom), pdf.contenu)
    noter('G', 'PDF du plan', '%PDF-, Releve_Stations-B-F-G_<date>.pdf', `${pdf.nom} (${pdf.contenu.length} octets)`, pdf.contenu.slice(0, 5).toString() === '%PDF-' && /^Releve_Stations-B-F-G_\d{4}-\d{2}-\d{2}\.pdf$/.test(pdf.nom) && pdf.contenu.length > 5000)
    const sauv = await telecharger(page, 'json')
    const fSauv = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'banc-cc07-')), sauv.nom)
    fs.writeFileSync(fSauv, sauv.contenu)
    await page.goto(urlChantier)
    await page.getByRole('heading', { level: 1, name: 'Premier chantier' }).waitFor()
    const [selecteur] = await Promise.all([
      page.waitForEvent('filechooser'),
      (async () => {
        await page.getByRole('button', { name: 'Plus d’actions sur le chantier Premier chantier', exact: true }).click()
        await page.getByRole('menuitem', { name: 'Ouvrir une sauvegarde ici' }).click()
      })(),
    ])
    await selecteur.setFiles(fSauv)
    const choix = page.getByRole('alertdialog')
    await choix.waitFor()
    await capture(page, '5-sauvegarde-garder-les-deux')
    await choix.getByRole('button', { name: 'Garder les deux', exact: true }).click()
    await attendreAvis(page, /Sauvegarde ouverte/)
    const releves = (await lireBase(page, 'releves')).filter((x) => !x.supprime_at)
    const copie = releves.find((x) => x.id !== rel && x.nom.startsWith('Stations B F G'))
    noter('G', 'sauvegarde rouverte « Garder les deux »', 'Stations B F G (2)', copie?.nom, !!copie)
    if (copie) {
      await ouvrirResultats(page, banc, copie.id)
      const csvCopie = (await telecharger(page, 'csv')).contenu.toString('utf8')
      noter('G', 'mêmes résultats après réimportation (CSV identique)', `${lc.length} lignes identiques`, csvCopie === texteCsv ? 'identique' : 'différent', csvCopie === texteCsv)
    }

    // Screen 11
    await page.goto(banc.url(`/releve/r/${rel}/carte`))
    await page.locator('svg[data-echelle]').waitFor()
    await page.waitForTimeout(400)
    const carte = await page.evaluate(() => {
      const bornes = [...document.querySelectorAll('svg g[data-borne]')].map((g) => ({ label: g.getAttribute('aria-label'), trait: g.querySelector('path')?.getAttribute('stroke') }))
      const stations = document.querySelectorAll('svg g[data-station]').length
      const courbes = [...document.querySelectorAll('path[data-altitude]')].map((p) => Number(p.getAttribute('data-altitude')))
      const intervalle = document.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.trim() ?? null
      return { bornes, stations, courbes, intervalle }
    })
    res.carte = carte
    const d1 = carte.bornes.find((b) => /D \(1\)/.test(b.label))
    const d2c = carte.bornes.find((b) => /D \(2\)/.test(b.label))
    noter('G', 'carte : bornes A, B, C dessinées', 3, carte.bornes.filter((b) => /^Borne [ABC],/.test(b.label)).length, carte.bornes.filter((b) => /^Borne [ABC],/.test(b.label)).length === 3)
    noter('G', 'carte : D (1) grise (retirée)', '#8A8A82', d1 ? `${d1.label} ${d1.trait}` : 'absente', !!d1 && d1.trait === '#8A8A82' && /retirée/.test(d1.label))
    noter('G', 'carte : D (2) active', '#000000', d2c ? `${d2c.label} ${d2c.trait}` : 'absente', !!d2c && d2c.trait === '#000000')
    noter('G', 'carte : stations dessinées', '≥ 13', carte.stations, carte.stations >= 13)
    const pas1 = carte.courbes.length > 2 && carte.courbes.every((a, i, t) => i === 0 || Math.abs(a - t[i - 1]) === 1 || a !== t[i - 1])
    noter('G', 'carte : courbes à 1 m', '1 m', `${carte.intervalle} ; ${carte.courbes.join(' ')}`, carte.intervalle === '1 m' && pas1 && carte.courbes.every((a) => Number.isInteger(a)))
    await capture(page, '5-carte')
  }

  // ============================================================== 7 durations (H08 on 10 stations)
  if (PARTIES.includes(7)) {
    const h = res.durees.h08.map((x) => x.calculerAResultatMs)
    const tri = [...h].sort((a, b) => a - b)
    res.durees.h08Resume = tri.length ? { n: tri.length, mediane: tri.length % 2 ? tri[(tri.length - 1) / 2] : (tri[tri.length / 2 - 1] + tri[tri.length / 2]) / 2, pire: tri[tri.length - 1] } : null
    const stations = res.durees.h08.map((x) => x.premierChiffreAResultatMs).sort((a, b) => a - b)
    res.durees.stationPremierChiffreAResultat = stations.length ? { mediane: stations[Math.floor(stations.length / 2)], pire: stations[stations.length - 1], note: 'saisie automatique de 6 valeurs au pavé, délai de frappe 5 ms par touche' } : null
    if (res.durees.h08Resume && !(res.durees.h08Resume.pire < 1000)) res.erreurs.push(`H08 ${JSON.stringify(res.durees.h08Resume)}`)
    // Warm open (the phone already has everything): app to the first input field of Saisir
    if (ids.bfg) {
      const tt = []
      for (let i = 0; i < 5; i++) {
        const t0 = Date.now()
        await page.goto(banc.url(`/releve/r/${ids.bfg}/saisir`), { waitUntil: 'commit' })
        await page.getByRole('button', { name: 'Distance vers A', exact: true }).waitFor()
        tt.push(Date.now() - t0)
      }
      tt.sort((a, b) => a - b)
      res.durees.ouvertureSaisirMs = { mesures: tt, mediane: tt[2], pire: tt[4] }
    }
  }
  await contexte.close()
  void requetes

  // ============================================================== 6 airplane mode, persistent profile
  if (PARTIES.includes(6)) {
    const profil = process.env.BANC_PROFIL || fs.mkdtempSync(path.join(os.tmpdir(), 'releve-profil-cc07-'))
    res.avion.profil = profil
    let o = await banc.ouvrir({ profil })
    o.page.setDefaultTimeout(20000)
    await o.page.goto(banc.url('/releve/'))
    await banc.attendreHorsLigne(o.page, 120000)
    res.avion.visiteEnLigne = true
    await o.contexte.setOffline(true)
    res.avion.navigateurHorsLigne = await o.page.evaluate(() => navigator.onLine === false)
    await o.page.reload()
    await o.page.getByRole('heading', { level: 1, name: 'Relevé terrain' }).waitFor()
    await creerDomaine(o.page, 'Domaine avion')
    const urlCh = await creerChantier(o.page, 'Domaine avion', 'Chantier avion')
    const rel = await creerReleve(o.page, urlCh, 'Hors réseau')
    await bornesVerifiees(o.page)
    const avant = {}
    for (const n of ['S01', 'S02', 'S03']) {
      await relever(o.page, B[n])
      const lu = await lire(o.page)
      avant[n] = { x: lu.x, y: lu.y, altitude: lu.altitude, couleur: lu.couleur }
      station('Mode avion', `${n} saisie hors réseau`, lu, ATTENDU_B[n])
      await allerSaisir(o.page, rel)
    }
    await relever(o.page, C.E5)
    await capture(o.page, '6-avion-incomplete')
    await o.fermer()
    o = await banc.ouvrir({ profil })
    o.page.setDefaultTimeout(20000)
    await o.contexte.setOffline(true)
    await o.page.goto(banc.url(`/releve/`))
    await o.page.getByRole('heading', { level: 2, name: 'Domaine avion' }).waitFor()
    noter('Mode avion', 'navigateur relancé hors réseau : domaine et chantier là', 'Domaine avion, Chantier avion', 'présents', true)
    await capture(o.page, '6-avion-rouvert-accueil')
    for (const n of ['S01', 'S02', 'S03']) {
      await o.page.goto(banc.url(`/releve/r/${rel}/saisir`))
      await o.page.locator('[data-calculer]').waitFor()
      const ids2 = (await lireBase(o.page, 'objets')).filter((x) => x.releve_id === rel && x.type === 'station' && x.donnees.numero === n)
      await o.page.goto(banc.url(`/releve/r/${rel}/saisir/${ids2[0].id}?vue=resultat`))
      await o.page.locator('[data-resultat-station]').waitFor()
      const lu = await lire(o.page)
      noter('Mode avion', `${n} retrouvée après relance (H02)`, avant[n], { x: lu.x, y: lu.y, altitude: lu.altitude, couleur: lu.couleur }, lu.x === avant[n].x && lu.y === avant[n].y && lu.altitude === avant[n].altitude && lu.couleur === 'vert')
    }
    await o.page.goto(banc.url(`/releve/r/${rel}/saisir`))
    await o.page.locator('[data-calculer]').waitFor()
    const pastille = await o.page.locator('nav[aria-label="Barre du relevé"] [role=img]').getAttribute('aria-label').catch(() => null)
    noter('Mode avion', 'station incomplète : pastille (D22)', '1 station incomplète', pastille, pastille === '1 station incomplète')
    await capture(o.page, '6-avion-rouvert-pastille')
    await o.fermer()
  }

  res.ids = ids
  res.bilan = Object.fromEntries(Object.entries(res.jeux).map(([j, l]) => [j, `${l.filter((x) => x.ok).length}/${l.length}`]))
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-07') }
