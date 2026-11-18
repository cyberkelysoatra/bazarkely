/* Scenario RELEVE-CC-05 of the bench (scripts/releve-banc.cjs): screens 8 « Saisir », 9 « Station rouge »,
 * 10 « Borne éphémère » at 412 x 869 on the production build. Only the targets are injected (vérifiées,
 * calibration skipped): every sight of games B, C, F and G is TYPED on the keypad of screen 8.
 *   C1 game B, C2 game C, C3 game F, C4 game G, C5 D21 (4 targets), C6 H08 speed, C8 captures. */
'use strict'
const fs = require('node:fs')
const path = require('node:path')

const RACINE = path.resolve(__dirname, '..')
const MAQUETTE = 'C:\\Users\\ACER\\Downloads\\CRéATEUR Apps\\gestion-terrassement\\maquette-source\\planche'
const T = '2026-11-18T04:00:00.000Z'
const PLAN = { A: [0, 0, 38.11, 'Borne ouest'], B: [47.29, 22.67, 26.83, 'Borne nord'], C: [69.15, -17.32, 21.33, 'Borne sud-est'] }

// ---------------------------------------------------------------------------------------------
// Games of the PRD section 11 (sights typed) and expected values
// ---------------------------------------------------------------------------------------------
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

function terrain(nomReleve) {
  const slug = nomReleve.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const dom = 'banc5-dom'
  const ch = 'banc5-ch'
  const rel = `banc5-${slug}`
  const env = { supprime: false, maj_at: T, apres_reprise: false, envoi: 'a_envoyer', releve_id: rel }
  const bornes = Object.entries(PLAN).map(([l, [x, y, z, nom]], i) => ({
    ...env,
    id: `${rel}-${l}`,
    type: 'borne',
    saisi_at: T,
    donnees: { lettre: l, usage: 1, nom, type: 'principale', ordre: i + 1, rang: 0, plan: { x, y, z }, verifiee: true, station_origine: null, etat: 'active', retiree_le: null },
  }))
  const journal = { ...env, id: `${rel}-J1`, type: 'journal', saisi_at: T, donnees: { action: 'calage_saute', detail: {}, le: T } }
  const entete = { schema: 1, nom: nomReleve, date: '2026-11-18', operateurs: 'Banc', hi: 1.5, ht: 1.5, reglages: {}, orientation: { cap_lu: null, source: null, declinaison: null }, cote_c: null, calage: { etat: 'saute', le: T } }
  return {
    id: rel,
    donnees: {
      domaines: [{ id: dom, nom: 'Essai', proprietaire: 'local', a_moi: true, cree_at: T, maj_at: T, supprime_at: null, envoi: 'a_envoyer' }],
      chantiers: [{ id: ch, domaine_id: dom, nom: 'Jeux du PRD', cree_at: T, maj_at: T, supprime_at: null, envoi: 'a_envoyer' }],
      releves: [{ id: rel, chantier_id: ch, nom: nomReleve, entete, cree_par: 'local', cree_at: T, maj_at: T, ouvert_at: null, rev: 1, supprime_at: null, envoi: 'a_envoyer', saisie: null, terminer_demande: null, serveur_connu: false }],
      objets: [...bornes, journal],
    },
  }
}

// ---------------------------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------------------------
const texteNombre = (v) => String(v).replace('.', ',')
const nombre = (t) => (t == null ? null : Number(String(t).replace(/\s/g, '').replace('−', '-').replace(/[^\d,.-]/g, '').replace(',', '.')))
const proche = (a, b, tol) => a !== null && Math.abs(a - b) <= tol + 1e-9

async function taper(page, libelle, v) {
  await page.getByRole('button', { name: libelle, exact: true }).click()
  const virgule = page.getByRole('button', { name: 'Virgule', exact: true })
  await virgule.waitFor()
  await page.keyboard.type(texteNombre(v), { delay: 5 })
  await page.keyboard.press('Enter')
}

async function attendreFermeturePave(page) {
  await page.getByRole('button', { name: 'Virgule', exact: true }).waitFor({ state: 'detached', timeout: 10000 })
}

/** Types every sight of one station (letters in order), then « Calculer la station ». */
async function relever(page, mesures, { calculer = true } = {}) {
  await page.locator('[data-calculer]').waitFor()
  for (const [lettre, m] of Object.entries(mesures)) {
    if (m === null) {
      await page.getByRole('button', { name: `Borne ${lettre} pas visible`, exact: true }).click()
      await page.locator(`[data-ligne="${lettre}"] >> text=Pas visible`).first().waitFor()
      continue
    }
    await taper(page, `Distance vers ${lettre}`, m[0])
    await attendreFermeturePave(page)
    await taper(page, `Pente vers ${lettre}`, m[1])
    await attendreFermeturePave(page)
  }
  if (!calculer) return null
  if (await page.getByRole('alertdialog').count()) throw new Error(`Dialogue inattendu sur ${page.url()} : ${await page.getByRole('alertdialog').textContent()}`)
  await page.locator('[data-calculer]').click()
  await page.locator('[data-resultat-station], [data-etape-controle]').first().waitFor({ timeout: 15000 })
  const m = /\/saisir\/([^/?]+)/.exec(page.url())
  return m ? m[1] : null
}

/** Figures shown: the last [data-chiffres] block is the result with every sight. */
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

function comparer(lu, attendu, tolIndice = 0.01) {
  const [x, y, z, ea, ind] = attendu
  const v = { x: nombre(lu.x), y: nombre(lu.y), z: nombre(lu.altitude), ea: nombre(lu.ecartAltitude), indice: nombre(lu.indice) }
  const ok = proche(v.x, x, 0.01) && proche(v.y, y, 0.01) && proche(v.z, z, 0.01) && (ea === undefined || proche(v.ea, ea, 0.01)) && (ind === undefined || proche(v.indice, ind, tolIndice))
  return { ok, lu: v, attendu: { x, y, z, ecartAltitude: ea, indice: ind }, couleur: lu.couleur }
}

async function stationSuivante(page, idReleve) {
  await page.goto(page.url().replace(/\/releve\/.*$/, `/releve/r/${idReleve}/saisir`))
  await page.locator('[data-calculer]').waitFor()
}

async function ouvrir(page, banc, chemin, attente) {
  await page.goto(banc.url(`/releve${chemin}`))
  await page.locator(attente).first().waitFor({ timeout: 15000 })
}

async function textesInterdits(page) {
  return page.evaluate(() => {
    const t = document.body.innerText
    return [...new Set((t.match(/[\u2014\u2013\u00B7]/g) || []))]
  })
}

// ---------------------------------------------------------------------------------------------
async function executer(banc) {
  const res = { c1: {}, c2: {}, c3: {}, c4: {}, c5: {}, c6: {}, c8: { mesures: {}, captures: [] }, contrastes: {}, verrouEcran: null, erreurs: [] }
  const echec = (m) => res.erreurs.push(m)
  const contrastes = []
  const { page, fermer } = await banc.ouvrir()
  page.setDefaultTimeout(20000)
  const ecran = async (nom) => {
    // Top of the screen, except when a dialog or the keypad is open.
    if (!(await page.locator('[role=alertdialog], [role=dialog]').count())) await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(150)
    const m = await banc.mesurer(page)
    res.c8.mesures[nom] = m
    if (m.largeur !== 412 || m.defilement > 412) echec(`C8 ${nom} : ${JSON.stringify(m)}`)
    const interdits = await textesInterdits(page)
    if (interdits.length) echec(`C8 ${nom} : signes interdits ${interdits.join(' ')}`)
    for (const c of await banc.contrastes(page)) contrastes.push({ ...c, ecran: nom })
    res.c8.captures.push(path.basename(await banc.capturer(page, nom)))
  }

  await page.goto(banc.url('/releve/'), { waitUntil: 'load' })
  await page.waitForTimeout(800)
  const fbg = terrain('Stations B F G')
  const dc = terrain('Défauts C')
  await banc.injecter(page, fbg.donnees)
  await banc.injecter(page, dc.donnees)

  // ================= C1: game B, S01 to S08 typed
  const ids = {}
  await ouvrir(page, banc, `/r/${fbg.id}/saisir`, '[data-calculer]')
  await ecran('8-saisir-vide')
  res.verrouEcran = await page.evaluate(() => document.documentElement.dataset.verrouEcran ?? null)
  for (const [n, mesures] of Object.entries(B)) {
    if (n === 'S02') {
      await relever(page, mesures, { calculer: false })
      await page.evaluate(() => window.scrollTo(0, 0))
      await ecran('8-saisir-rempli')
      await page.locator('[data-calculer]').click()
      await page.locator('[data-resultat-station]').waitFor()
      ids[n] = /\/saisir\/([^/?]+)/.exec(page.url())[1]
    } else {
      ids[n] = await relever(page, mesures)
    }
    const lu = await lire(page)
    const c = comparer(lu, ATTENDU_B[n])
    res.c1[n] = { ...c, numeroAffiche: lu.numero }
    if (!c.ok || lu.couleur !== 'vert' || lu.numero !== n) echec(`C1 ${n} : ${JSON.stringify(res.c1[n])}`)
    if (n === 'S01') await ecran('8-resultat-vert')
    await stationSuivante(page, fbg.id)
  }

  // ================= C2: game C (« Défauts C »)
  await ouvrir(page, banc, `/r/${dc.id}/saisir`, '[data-calculer]')
  ids.E1 = await relever(page, C.E1)
  let lu = await lire(page)
  res.c2.E1 = { couleur: lu.couleur, action: lu.action, x: lu.x, y: lu.y, altitude: lu.altitude, altitudes: lu.altitudes, numero: lu.numero }
  if (!(lu.couleur === 'rouge' && lu.action === 'Refaire la visée vers B, Borne nord' && proche(nombre(lu.x), 29.569, 0.01) && proche(nombre(lu.y), 3.238, 0.01) && proche(nombre(lu.altitude), 31.072, 0.01))) echec(`C2 E1 ${JSON.stringify(res.c2.E1)}`)
  await ecran('9-station-rouge-e1')
  // H09 in the interface: « Refaire la visée vers B » opens the keypad on B; the new value asks for confirmation.
  await page.locator('[data-refaire]').click()
  await page.getByRole('button', { name: 'Virgule', exact: true }).waitFor()
  res.c2.refaireLigne = await page.evaluate(() => document.querySelector('[data-ligne="B"]')?.className.includes('bg-champActif') ?? false)
  await page.keyboard.type('25,05')
  await page.keyboard.press('Enter')
  const dialogue = page.getByRole('alertdialog')
  await dialogue.waitFor()
  res.c2.confirmationRemplacement = await dialogue.textContent()
  await ecran('8-confirmation-remplacement')
  if (!res.c2.confirmationRemplacement.includes("Remplacer la visée vers B (27,05 m ; −9,4°) ? L'ancienne valeur reste dans l'historique.")) echec(`C7 dialogue ${res.c2.confirmationRemplacement}`)
  await dialogue.getByRole('button', { name: 'Annuler' }).click()
  res.c2.valeurGardee = await page.locator('[data-ligne="B"]').getByRole('button', { name: 'Distance vers B', exact: true }).textContent()

  await stationSuivante(page, dc.id)
  ids.E2 = await relever(page, C.E2)
  lu = await lire(page)
  res.c2.E2 = { couleur: lu.couleur, action: lu.action, numero: lu.numero }
  if (!(lu.couleur === 'rouge' && lu.action === 'Refaire la visée vers C, Borne sud-est')) echec(`C2 E2 ${JSON.stringify(res.c2.E2)}`)

  await stationSuivante(page, dc.id)
  ids.E4 = await relever(page, C.E4)
  lu = await lire(page)
  res.c2.E4 = { couleur: lu.couleur, indice: lu.indice, action: lu.action, numero: lu.numero }
  if (!(lu.couleur === 'orange' && proche(nombre(lu.indice), 3.38, 0.01))) echec(`C2 E4 ${JSON.stringify(res.c2.E4)}`)
  await ecran('9-station-orange-e4')
  await ouvrir(page, banc, `/r/${dc.id}/saisir/${ids.E4}`, '[data-calculer]')
  res.c2.E4.viseesLonguesOrange = await page.locator('[data-visee-longue]').evaluateAll((els) => els.map((e) => e.getAttribute('data-visee-longue') + ' ' + getComputedStyle(e).color))
  if (res.c2.E4.viseesLonguesOrange.length !== 3) echec(`C2 E4 visées longues ${JSON.stringify(res.c2.E4.viseesLonguesOrange)}`)
  await ecran('8-visees-longues-e4')

  await stationSuivante(page, dc.id)
  ids.E5 = await relever(page, C.E5)
  res.c2.E5 = {
    numero: (await lire(page)).numero,
    couleur: (await lire(page)).couleur,
    manquantes: await page.locator('[data-manquantes]').textContent(),
    proposition: await page.locator('[data-ajouter-ephemere]').textContent(),
    pastille: await page.locator('nav[aria-label="Barre du relevé"] [role=img]').evaluate((e) => ({ texte: e.textContent, libelle: e.getAttribute('aria-label') })),
  }
  if (!(res.c2.E5.couleur === 'incomplete' && res.c2.E5.manquantes === 'Station incomplète : il manque la borne C.' && res.c2.E5.proposition === 'Ajouter une borne éphémère' && res.c2.E5.pastille.texte === '1' && res.c2.E5.pastille.libelle === '1 station incomplète')) echec(`C2 E5 ${JSON.stringify(res.c2.E5)}`)
  await ecran('8-station-incomplete-e5')
  await ouvrir(page, banc, `/r/${dc.id}/saisir`, '[data-calculer]')
  res.c2.ligneIncompletes = await page.locator('[data-incompletes]').textContent()
  await ouvrir(page, banc, `/r/${dc.id}/saisir/${ids.E5}?vue=resultat`, '[data-manquantes]')
  await page.getByRole('button', { name: 'Supprimer la station', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.locator('[data-calculer]').waitFor()
  await page.waitForTimeout(300)
  res.c2.E5.apresSuppression = { pastilles: await page.locator('nav[aria-label="Barre du relevé"] [role=img]').count(), url: page.url().replace(/^.*\/releve/, '') }
  if (res.c2.E5.apresSuppression.pastilles !== 0) echec(`C2 E5 suppression ${JSON.stringify(res.c2.E5.apresSuppression)}`)

  // ================= C3: game F in « Stations B F G »
  // E4 measured as S09 through screen 10 (steps 1, 2), refused at step 3.
  await ouvrir(page, banc, `/r/${fbg.id}/saisir`, '[data-calculer]')
  await page.locator('[data-lien-ephemeres]').click()
  await page.locator('[data-ajouter]').waitFor()
  await ecran('10-liste-vide')
  await page.locator('[data-ajouter]').click()
  await page.locator('[data-conseil]').waitFor()
  res.c3.conseil = await page.locator('[data-conseil]').textContent()
  await ecran('10-etape1-conseil')
  await page.locator('[data-suivant]').click()
  await page.getByRole('button', { name: 'Distance vers A', exact: true }).waitFor()
  await ecran('10-etape2-mesure')
  await relever(page, C.E4)
  res.c3.S09 = {
    controle: await page.locator('[data-etape-controle]').getAttribute('data-controle'),
    message: await page.locator('[data-message-controle]').textContent(),
    numero: await page.locator('[data-etape-controle] h3').textContent(),
  }
  ids.S09 = new URL(page.url()).searchParams.get('station')
  if (!(res.c3.S09.controle === 'refuse' && res.c3.S09.message === 'Position trop fragile : choisissez un endroit plus au centre des bornes' && res.c3.S09.numero === 'Station S09')) echec(`C3 S09 ${JSON.stringify(res.c3.S09)}`)
  await ecran('10-etape3-refus')

  // S06 becomes D « Piquet du manguier » (straight to steps 3 and 4).
  await ouvrir(page, banc, `/r/${fbg.id}/saisir/${ids.S06}?vue=resultat`, '[data-suivante]')
  await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
  await page.locator('[data-etape-controle]').waitFor()
  res.c3.S06 = { controle: await page.locator('[data-etape-controle]').getAttribute('data-controle'), rang: await page.locator('[data-rang]').getAttribute('data-rang') }
  await ecran('10-etape3-accepte')
  await page.locator('[data-continuer]').click()
  await page.locator('input[data-champ-nom]').waitFor()
  res.c3.D = {
    lettre: await page.locator('input[data-champ-lettre]').inputValue(),
    rang: await page.locator('[data-rang-creation]').getAttribute('data-rang-creation'),
    position: await page.locator('[data-position-creation]').textContent(),
  }
  await page.locator('input[data-champ-nom]').fill('')
  await page.locator('[data-creer]').click()
  res.c3.nomVide = await page.getByText("Le nom de l'endroit est obligatoire").textContent().catch(() => null)
  await page.locator('input[data-champ-nom]').fill('Piquet du manguier')
  await ecran('10-etape4-creation')
  await page.locator('[data-creer]').click()
  await page.locator('[data-calculer]').waitFor()
  if (!(res.c3.S06.controle === 'accepte' && res.c3.S06.rang === '1' && res.c3.D.lettre === 'D' && res.c3.D.rang === '1' && res.c3.D.position === 'Depuis la station S06 : X 35,000 ; Y 11,999 ; altitude 29,728' && res.c3.nomVide)) echec(`C3 D ${JSON.stringify(res.c3)}`)

  // C5 (D21): 4 active targets on 412 x 869, « Calculer la station » inside the viewport without scrolling.
  await page.waitForTimeout(300)
  res.c5 = await page.evaluate(() => {
    const b = document.querySelector('[data-calculer]').getBoundingClientRect()
    const barre = document.querySelector('nav[aria-label="Barre du relevé"]').getBoundingClientRect()
    // The band right under the header (not the notice « Borne D créée »).
    const bandeau = document.querySelector('header').nextElementSibling
    const texte = bandeau.querySelector('span:not([aria-hidden])') || bandeau
    const range = document.createRange()
    range.selectNodeContents(texte)
    return {
      lignes: document.querySelectorAll('[data-ligne]').length,
      lettres: [...document.querySelectorAll('[data-ligne]')].map((e) => e.getAttribute('data-ligne')).join(''),
      scrollY: window.scrollY,
      hauteurPage: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      bouton: { haut: Math.round(b.top), bas: Math.round(b.bottom), hauteur: Math.round(b.height) },
      barre: { haut: Math.round(barre.top), bas: Math.round(barre.bottom) },
      bandeau: { hauteur: Math.round(bandeau.getBoundingClientRect().height), lignesTexte: range.getClientRects().length, texte: bandeau.textContent },
    }
  })
  if (!(res.c5.lignes === 4 && res.c5.scrollY === 0 && res.c5.bouton.haut >= 0 && res.c5.bouton.bas <= res.c5.barre.haut && res.c5.barre.bas <= res.c5.innerHeight && res.c5.bandeau.lignesTexte === 1)) echec(`C5 ${JSON.stringify(res.c5)}`)
  await ecran('8-quatre-bornes-d21')

  // S10 to S13
  for (const n of ['S10', 'S11', 'S12', 'S13']) {
    ids[n] = await relever(page, F[n])
    lu = await lire(page)
    if (n === 'S13') {
      res.c3.S13 = { couleur: lu.couleur, action: lu.action, x: lu.x, y: lu.y, altitude: lu.altitude, retraits: lu.retraits, pied: lu.pied, sans: lu.sans }
      const r = lu.retraits.join(' | ')
      if (!(lu.couleur === 'rouge' && lu.action === 'Refaire la visée vers C, Borne sud-est' && r === 'sans C : 0,003 m | sans A : 0,953 m | sans B : 0,186 m | sans D : 0,966 m' && lu.pied.includes('Garder ce résultat sans C'))) echec(`C3 S13 ${JSON.stringify(res.c3.S13)}`)
      await ecran('9-station-rouge-s13-quatre')
      await page.locator('[data-garder-sans]').click()
      await page.locator('[data-etat-station="gardee"]').waitFor()
      lu = await lire(page)
      res.c3.S13.retenuSansC = lu.sans
      if (!(proche(nombre(lu.sans.x), 54.996, 0.01) && proche(nombre(lu.sans.y), 12.002, 0.01) && proche(nombre(lu.sans.altitude), 24.904, 0.01))) echec(`C3 S13 sans C ${JSON.stringify(lu.sans)}`)
      await ecran('9-s13-garde-sans-c')
      continue
    }
    const c = comparer(lu, ATTENDU_F[n])
    res.c3[n] = { ...c, numeroAffiche: lu.numero }
    if (!c.ok || lu.couleur !== 'vert' || lu.numero !== n) echec(`C3 ${n} ${JSON.stringify(res.c3[n])}`)
    if (n === 'S11') {
      const h15 = page.locator('[data-proposition-h15]')
      await h15.waitFor()
      res.c3.h15 = await h15.textContent()
      await ecran('8-proposition-h15')
      await h15.getByRole('button', { name: 'Non', exact: true }).click()
      await h15.waitFor({ state: 'detached' })
      res.c3.h15Ferme = true
    }
    if (n === 'S10') {
      res.c3.h15ApresS10 = await page.locator('[data-proposition-h15]').count()
    }
    await stationSuivante(page, fbg.id)
  }
  if (!res.c3.h15 || !res.c3.h15.includes('Ajouter une borne éphémère pour cette zone ?') || res.c3.h15ApresS10 !== 0) echec(`C3 H15 ${res.c3.h15} / après S10 ${res.c3.h15ApresS10}`)

  // S14: E « Piquet du talus » from S10, rank 2, then withdrawn.
  await ouvrir(page, banc, `/r/${fbg.id}/saisir/${ids.S10}?vue=resultat`, '[data-suivante]')
  await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
  await page.locator('[data-continuer]').click()
  await page.locator('input[data-champ-nom]').fill('Piquet du talus')
  res.c3.E = { lettre: await page.locator('input[data-champ-lettre]').inputValue(), rang: await page.locator('[data-rang-creation]').getAttribute('data-rang-creation') }
  await page.locator('[data-creer]').click()
  await page.locator('[data-calculer]').waitFor()
  res.c3.E.lignes = await page.locator('[data-ligne]').evaluateAll((e) => e.map((x) => x.getAttribute('data-ligne')).join(''))
  await ouvrir(page, banc, `/r/${fbg.id}/ephemere`, '[data-liste-actives]')
  await ecran('10-liste-actives')
  await page.locator('[data-borne-ephemere="E"]').getByRole('button', { name: 'Retirer', exact: true }).click()
  res.c3.E.confirmation = await page.getByRole('alertdialog').textContent()
  await ecran('10-retrait-confirmation')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer', exact: true }).click()
  await page.locator('[data-borne-retiree="E1"]').waitFor()
  res.c3.E.retiree = true
  res.c3.E.actives = await page.locator('[data-borne-ephemere]').evaluateAll((e) => e.map((x) => x.getAttribute('data-borne-ephemere')).join(''))
  if (!(res.c3.E.lettre === 'E' && res.c3.E.rang === '2' && res.c3.E.lignes === 'ABCDE' && res.c3.E.actives === 'D')) echec(`C3 E ${JSON.stringify(res.c3.E)}`)

  // ================= C4: game G
  await ouvrir(page, banc, `/r/${fbg.id}/saisir/${ids.S01}?vue=resultat`, '[data-suivante]')
  await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
  await page.locator('[data-continuer]').click()
  await page.locator('input[data-champ-nom]').waitFor()
  res.c4.proposee = await page.locator('[data-lettre-proposee]').getAttribute('data-lettre-proposee')
  await page.locator('input[data-champ-lettre]').fill('B')
  await page.locator('input[data-champ-nom]').fill('Angle sud du parking')
  await page.locator('[data-creer]').click()
  res.c4.refusB = await page.locator('[data-erreur-lettre]').textContent()
  await ecran('10-lettre-b-refusee')
  if (!(res.c4.proposee === 'E' && res.c4.refusB === 'La lettre B est déjà portée par Borne nord')) echec(`C4 B ${JSON.stringify(res.c4)}`)
  // Retirer D
  await ouvrir(page, banc, `/r/${fbg.id}/ephemere`, '[data-liste-actives]')
  await page.locator('[data-borne-ephemere="D"]').getByRole('button', { name: 'Retirer', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer', exact: true }).click()
  await page.locator('[data-borne-retiree="D1"]').waitFor()
  // New target from S01
  await ouvrir(page, banc, `/r/${fbg.id}/saisir/${ids.S01}?vue=resultat`, '[data-suivante]')
  await page.getByRole('button', { name: 'Faire de cette station une borne éphémère', exact: true }).click()
  res.c4.controleS01 = await page.locator('[data-message-controle]').textContent()
  await page.locator('[data-continuer]').click()
  await page.locator('input[data-champ-nom]').fill('Angle sud du parking')
  res.c4.D2 = {
    lettre: await page.locator('input[data-champ-lettre]').inputValue(),
    rang: await page.locator('[data-rang-creation]').getAttribute('data-rang-creation'),
    position: await page.locator('[data-position-creation]').textContent(),
  }
  await page.locator('[data-creer]').click()
  await page.locator('[data-calculer]').waitFor()
  await page.waitForTimeout(200)
  res.c4.lignes = await page.locator('[data-ligne]').evaluateAll((e) => e.map((x) => ({ lettre: x.getAttribute('data-ligne'), usage: x.getAttribute('data-usage'), nom: x.querySelector('[data-nom-ligne]').textContent })))
  await ecran('8-ligne-d2-angle-sud')
  const lignesD = res.c4.lignes.filter((l) => l.lettre === 'D')
  if (!(res.c4.D2.lettre === 'D' && res.c4.D2.rang === '1' && res.c4.D2.position === 'Depuis la station S01 : X 19,993 ; Y 0,006 ; altitude 33,274' && lignesD.length === 1 && lignesD[0].usage === '2' && lignesD[0].nom === 'Angle sud du parking')) echec(`C4 D2 ${JSON.stringify(res.c4)}`)
  // S10 to S13 keep their results and refer to D (1)
  res.c4.stations = {}
  for (const n of ['S10', 'S11', 'S12', 'S13']) {
    await ouvrir(page, banc, `/r/${fbg.id}/saisir/${ids[n]}?vue=resultat`, '[data-resultat-station]')
    const l = await lire(page)
    const avant = n === 'S13' ? res.c3.S13 : { x: res.c3[n].lu.x, y: res.c3[n].lu.y, altitude: res.c3[n].lu.z }
    const pareil = n === 'S13' ? l.x === avant.x && l.y === avant.y && l.altitude === avant.altitude && l.sans.x === res.c3.S13.retenuSansC.x : proche(nombre(l.x), avant.x, 0.0005) && proche(nombre(l.y), avant.y, 0.0005) && proche(nombre(l.altitude), avant.altitude, 0.0005)
    await ouvrir(page, banc, `/r/${fbg.id}/saisir/${ids[n]}`, '[data-calculer]')
    const lignes = await page.locator('section[data-ligne="D"]').evaluateAll((e) => e.map((x) => x.getAttribute('aria-label')))
    res.c4.stations[n] = { pareil, x: l.x, y: l.y, altitude: l.altitude, lignesD: lignes }
    if (!pareil || !lignes.includes('Visée vers D (1), Piquet du manguier, retirée')) echec(`C4 ${n} ${JSON.stringify(res.c4.stations[n])}`)
  }
  await ecran('8-s13-renvoie-d1')

  // ================= C6: H08 speed, tap on « Calculer la station » to the result displayed, 10 runs
  const temps = []
  for (let i = 0; i < 10; i++) {
    await ouvrir(page, banc, `/r/${fbg.id}/saisir/${ids.S12}`, '[data-calculer]')
    await page.waitForTimeout(200)
    temps.push(
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            const t0 = performance.now()
            document.querySelector('[data-calculer]').click()
            const f = () => (document.querySelector('[data-resultat-station]') ? resolve(Math.round((performance.now() - t0) * 10) / 10) : requestAnimationFrame(f))
            f()
          }),
      ),
    )
  }
  const tri = [...temps].sort((a, b) => a - b)
  res.c6 = { temps, mediane: (tri[4] + tri[5]) / 2, max: tri[9] }
  if (!(res.c6.mediane < 300)) echec(`C6 ${JSON.stringify(res.c6)}`)

  await fermer()

  // ================= C8: side by side with the MODELE B picture (screen 8)
  if (fs.existsSync(path.join(MAQUETTE, 'B-Station.dc.html'))) {
    const ctx = await banc.navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3.5 })
    const p = await ctx.newPage()
    await p.goto('file:///' + path.join(MAQUETTE, 'B-Station.dc.html').replace(/\\/g, '/'))
    await p.waitForTimeout(1500)
    const maquette = await banc.capturer(p, 'modele-b-station')
    await p.setViewportSize({ width: 1500, height: 900 })
    const img = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')
    const fig = (titre, f, l) => `<figure style="margin:0"><figcaption>${titre}</figcaption><img src="${img(f)}" style="width:${l}px;border:1px solid #000"></figure>`
    await p.setContent(
      `<body style="margin:0;background:#888;display:flex;gap:20px;padding:16px;font:600 17px Arial">${fig('MODÈLE B (maquette)', maquette, 390)}${fig('Écran 8, 412 px', path.join(banc.sortie, '8-saisir-rempli.png'), 412)}${fig('Écran 9, 412 px', path.join(banc.sortie, '9-station-rouge-e1.png'), 412)}${fig('Écran 10, 412 px', path.join(banc.sortie, '10-etape1-conseil.png'), 412)}</body>`,
    )
    await p.waitForTimeout(300)
    await p.screenshot({ path: path.join(banc.sortie, 'c8-cote-a-cote.png'), fullPage: true })
    res.c8.captures.push('c8-cote-a-cote.png')
    await ctx.close()
  }

  const paires = new Map()
  for (const c of contrastes) {
    const k = `${c.couleur} sur ${c.fond}`
    const p = paires.get(k)
    if (!p || c.ratio < p.ratio) paires.set(k, { paire: k, ratio: c.ratio, exemple: c.texte, ecran: c.ecran })
  }
  res.contrastes.paires = [...paires.values()].sort((a, b) => a.ratio - b.ratio)
  res.contrastes.minimum = res.contrastes.paires.length ? res.contrastes.paires[0].ratio : null
  if (res.contrastes.minimum !== null && res.contrastes.minimum < 4.5) echec(`contraste ${JSON.stringify(res.contrastes.paires[0])}`)
  res.ids = ids
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-05') }
