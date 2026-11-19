/* Scenario RELEVE-CC-11 of the bench (scripts/releve-banc.cjs): field fixes, production build (vite
 * preview), 412 x 869, device scale factor 3.5. Session fabricated (never a real token), server MOCKED
 * (every rt_* call answered here, nothing reaches Supabase).
 *   1 Brave on Android (user agent of Chrome + navigator.brave), no beforeinstallprompt: home with the
 *     install button, top menu with the entry, sheet « Installer Relevé terrain » with « Ouvrir dans
 *     Chrome »; then Chrome on Android: sheet without the button.
 *   2 Examples in the fields: domain form, work site form, new relevé form, screen Bornes, screen Calage
 *     (cap typed by hand), screen Saisir; contrast of the grey examples measured on the page.
 *   3 Saisir: a station of game B, « Station suivante »: the sending band is visible under the header.
 * Run:  $env:BANC_PORT='4111'; node scripts/releve-banc.cjs cc11 */
'use strict'
const path = require('node:path')
const { chromium } = require('@playwright/test')
const { VUE } = require('./releve-banc.cjs')

const RACINE = path.resolve(__dirname, '..')
const SUPABASE = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
const CLE_SESSION = 'sb-ofzmwrzatcztoekrpvkj-auth-token'
const COMPTE = '00000000-0000-0000-0000-0000000000cb'
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const PLAN = { A: [0, 0, 38.11, 'Borne ouest'], B: [47.29, 22.67, 26.83, 'Borne nord'], C: [69.15, -17.32, 21.33, 'Borne sud-est'] }
const S01 = { A: [20.57, 13.6], B: [36.06, -10.3], C: [53.47, -12.9] }
const fr = (v) => String(v).replace('.', ',')
const propre = (t) => (t || '').replace(/\s+/g, ' ').trim()

async function saisirNombre(page, libelle, valeur) {
  await page.getByRole('button', { name: libelle, exact: true }).click()
  await page.getByRole('dialog', { name: libelle }).waitFor()
  await page.keyboard.type(fr(valeur), { delay: 5 })
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: libelle }).waitFor({ state: 'detached' })
}

function serveurSimule() {
  const etat = { appels: [] }
  const repondre = (fn, a) => {
    switch (fn) {
      case 'rt_ouvrir':
        return { ok: true, user_id: COMPTE, nom: 'Banc CC11' }
      case 'rt_domaine_enregistrer':
      case 'rt_chantier_enregistrer':
        return { ok: true, id: a.p_id }
      case 'rt_envoyer':
        return { ok: true, recus: (a.p_objets || []).length, apres_reprise: false, reprise_at: null }
      case 'rt_mes_terrains':
        return null
      default:
        return { ok: true }
    }
  }
  return { etat, repondre }
}

async function contexteBanc(navigateur, options, { brave }) {
  const contexte = await navigateur.newContext({ ...options, userAgent: UA_ANDROID })
  const simule = serveurSimule()
  await contexte.route(`${SUPABASE}/**`, async (r) => {
    const url = new URL(r.request().url())
    const m = /\/rest\/v1\/rpc\/([a-z_]+)/.exec(url.pathname)
    if (!m) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    const args = JSON.parse(r.request().postData() || '{}')
    simule.etat.appels.push(m[1])
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(simule.repondre(m[1], args)) })
  })
  const expire = Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  await contexte.addInitScript(
    ([cle, valeur, estBrave]) => {
      if (!localStorage.getItem(cle)) localStorage.setItem(cle, valeur)
      if (estBrave) Object.defineProperty(navigator, 'brave', { configurable: true, value: { isBrave: () => Promise.resolve(true) } })
    },
    [
      CLE_SESSION,
      JSON.stringify({
        access_token: 'jeton-fabrique-par-le-banc',
        refresh_token: 'faux',
        token_type: 'bearer',
        expires_in: 604800,
        expires_at: expire,
        user: { id: COMPTE, aud: 'authenticated', role: 'authenticated', email: 'banc@exemple.invalid', user_metadata: { full_name: 'Banc CC11' }, app_metadata: { provider: 'email' } },
      }),
      brave,
    ],
  )
  return { contexte, simule }
}

/** Contrast of the grey examples (fields and keypad display) on the page. */
async function contrastesExemples(banc, page) {
  const tous = await banc.contrastes(page)
  return tous.filter((t) => t.texte.startsWith('ex. '))
}

/** Contrast of the placeholders (pseudo-element, not in the text walk): colour of ::placeholder on the field. */
function contrastePlaceholders(page) {
  return page.evaluate(() => {
    const rgb = (s) => (/rgba?\(([^)]+)\)/.exec(s) || [0, '0,0,0'])[1].split(',').map((x) => parseFloat(x))
    const lum = (c) => {
      const v = c.slice(0, 3).map((x) => {
        x /= 255
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    }
    return Array.from(document.querySelectorAll('input[placeholder^="ex. "]')).map((i) => {
      const p = rgb(getComputedStyle(i, '::placeholder').color)
      const f = rgb(getComputedStyle(i).backgroundColor)
      const l1 = lum(p)
      const l2 = lum(f)
      return { exemple: i.placeholder, couleur: getComputedStyle(i, '::placeholder').color, fond: getComputedStyle(i).backgroundColor, ratio: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100 }
    })
  })
}

async function executer(banc) {
  const res = { parties: {} }
  const navigateur = await chromium.launch({ headless: true })
  const options = { viewport: VUE, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Indian/Antananarivo', serviceWorkers: 'block' }
  const erreurs = []
  try {
    // ---------------------------------------------------------------- 1. installation, Brave then Chrome
    const { contexte, simule } = await contexteBanc(navigateur, options, { brave: true })
    const page = await contexte.newPage()
    page.on('pageerror', (e) => erreurs.push(e.message))
    await page.goto(banc.url('/releve/'))
    await page.getByRole('button', { name: 'Installer sur mon téléphone' }).waitFor({ timeout: 30000 })
    const p1 = { mesure: await banc.mesurer(page), standalone: await page.evaluate(() => matchMedia('(display-mode: standalone)').matches), brave: await page.evaluate(() => 'brave' in navigator) }
    p1.captureAccueil = await banc.capturer(page, '01-accueil-bouton-installer')
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Installer sur mon téléphone' }).waitFor()
    p1.menu = await page.getByRole('menuitem').allTextContents()
    p1.captureMenu = await banc.capturer(page, '02-menu-entree-installer')
    await page.getByRole('menuitem', { name: 'Installer sur mon téléphone' }).click()
    const feuille = page.getByRole('dialog', { name: 'Installer Relevé terrain' })
    await feuille.waitFor()
    p1.navigateurDetecte = await feuille.locator('[data-installation]').getAttribute('data-installation')
    p1.etapes = (await feuille.getByRole('listitem').allTextContents()).map(propre)
    p1.note = propre(await feuille.locator('[data-note-installation]').textContent())
    p1.ouvrirDansChrome = await feuille.getByRole('link', { name: 'Ouvrir dans Chrome' }).getAttribute('href')
    p1.captureFeuilleBrave = await banc.capturer(page, '03-feuille-installer-brave')
    p1.contrastesFeuille = (await banc.contrastes(page)).filter((t) => t.ratio < 4.5)
    await feuille.getByRole('button', { name: 'Fermer' }).click()

    const chrome = await contexteBanc(navigateur, options, { brave: false })
    const pageChrome = await chrome.contexte.newPage()
    pageChrome.on('pageerror', (e) => erreurs.push(e.message))
    await pageChrome.goto(banc.url('/releve/'))
    await pageChrome.getByRole('button', { name: 'Installer sur mon téléphone' }).click()
    const feuilleChrome = pageChrome.getByRole('dialog', { name: 'Installer Relevé terrain' })
    await feuilleChrome.waitFor()
    p1.chrome = {
      navigateurDetecte: await feuilleChrome.locator('[data-installation]').getAttribute('data-installation'),
      etapes: (await feuilleChrome.getByRole('listitem').allTextContents()).map(propre),
      ouvrirDansChrome: await feuilleChrome.getByRole('link', { name: 'Ouvrir dans Chrome' }).count(),
      capture: await banc.capturer(pageChrome, '04-feuille-installer-chrome'),
    }
    await chrome.contexte.close()
    res.parties['1'] = p1

    // ---------------------------------------------------------------- 2. examples in the fields
    const p2 = { mesures: {} }
    await page.getByRole('button', { name: '+ Nouveau domaine foncier' }).last().click()
    await page.getByLabel('Nom du domaine').waitFor()
    p2.domaine = { placeholder: await page.getByLabel('Nom du domaine').getAttribute('placeholder'), aide: propre(await page.locator('[role=dialog] [data-aide]').textContent()) }
    p2.placeholdersDomaine = await contrastePlaceholders(page)
    p2.captureDomaine = await banc.capturer(page, '05-formulaire-domaine')
    await page.getByLabel('Nom du domaine').fill('Domaine CC11')
    await page.getByRole('button', { name: 'Créer le domaine' }).click()
    await page.getByRole('heading', { level: 2, name: 'Domaine CC11' }).waitFor()
    await page.getByRole('button', { name: '+ Nouveau chantier' }).click()
    await page.getByLabel('Nom du chantier').waitFor()
    p2.captureChantier = await banc.capturer(page, '06-formulaire-chantier')
    await page.getByLabel('Nom du chantier').fill('Chantier CC11')
    await page.getByRole('button', { name: 'Créer le chantier' }).click()
    await page.getByRole('heading', { level: 1, name: 'Chantier CC11' }).waitFor()
    await page.getByRole('button', { name: '+ Nouveau relevé' }).click()
    await page.getByLabel('Nom du relevé').waitFor()
    p2.captureReleve = await banc.capturer(page, '07-formulaire-releve')
    await page.getByLabel('Nom du relevé').fill('Releve CC11')
    await page.getByRole('button', { name: 'Créer le relevé' }).click()
    await page.waitForURL(/\/r\/[^/]+\/bornes$/)
    const releveId = /\/r\/([^/]+)\/bornes$/.exec(page.url())[1]
    await page.getByRole('heading', { name: 'Étape 1 : les bornes' }).waitFor()
    p2.mesures.bornes = await banc.mesurer(page)
    p2.captureBornes = await banc.capturer(page, '08-bornes-haut')
    await page.locator('[data-borne="A"]').scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, -120))
    p2.captureBorneA = await banc.capturer(page, '09-bornes-borne-a')
    p2.contrastesBornes = await contrastesExemples(banc, page)
    p2.placeholdersBornes = await contrastePlaceholders(page)
    // Keypad of « X de A »: example in the display.
    await page.getByRole('button', { name: 'X de A', exact: true }).click()
    const pave = page.getByRole('dialog', { name: 'X de A' })
    await pave.waitFor()
    p2.exemplePave = propre(await pave.locator('[data-exemple]').textContent())
    p2.contrastesPave = (await contrastesExemples(banc, page)).filter((t) => t.fond === '#FFF9DB')
    p2.capturePave = await banc.capturer(page, '10-pave-exemple')
    await page.keyboard.press('Escape')
    await pave.waitFor({ state: 'detached' })
    for (const [l, [x, y, alt, nom]] of Object.entries(PLAN)) {
      const champ = page.getByRole('textbox', { name: `Nom de l'endroit de ${l}` })
      await champ.fill(nom)
      await champ.press('Tab')
      await saisirNombre(page, `X de ${l}`, x)
      await saisirNombre(page, `Y de ${l}`, y)
      await saisirNombre(page, `Altitude de ${l}`, alt)
    }
    await page.waitForTimeout(300)
    // Calage, cap typed by hand.
    await page.goto(banc.url(`/releve/r/${releveId}/calage`))
    await page.getByRole('heading', { name: 'Étape 2 : caler les bornes' }).waitFor({ timeout: 20000 })
    const manuel = page.getByRole('button', { name: 'Saisir le cap à la main' })
    if (await manuel.isVisible().catch(() => false)) await manuel.click()
    await page.getByRole('button', { name: /Cap A vers B lu sur une boussole/ }).scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, -160))
    p2.mesures.calage = await banc.mesurer(page)
    p2.captureCalageCap = await banc.capturer(page, '11-calage-cap')
    await page.locator('[data-lecture="1"]').first().scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy(0, -200))
    p2.captureCalageLectures = await banc.capturer(page, '12-calage-lectures')
    p2.contrastesCalage = await contrastesExemples(banc, page)
    // Saisir: targets already set, calage skipped.
    await page.goto(banc.url(`/releve/r/${releveId}/bornes`))
    await page.getByRole('button', { name: 'Bornes déjà calées : les saisir comme vérifiées et sauter le calage' }).click()
    await page.waitForURL(/\/saisir$/)
    await page.locator('[data-calculer]').waitFor()
    p2.mesures.saisir = await banc.mesurer(page)
    p2.captureSaisir = await banc.capturer(page, '13-saisir-station')
    p2.exemplesSaisir = await page.locator('[data-ligne] [data-exemple]').allTextContents()
    res.parties['2'] = p2

    // ---------------------------------------------------------------- 3. band after « Station suivante »
    const p3 = {}
    for (const [lettre, m] of Object.entries(S01)) {
      await saisirNombre(page, `Distance vers ${lettre}`, m[0])
      await saisirNombre(page, `Pente vers ${lettre}`, m[1])
    }
    await page.locator('[data-calculer]').click()
    await page.locator('[data-resultat-station]').first().waitFor({ timeout: 15000 })
    p3.station = await page.locator('[data-resultat-station]').first().getAttribute('data-resultat-station')
    // As on the phone: the page scrolled down to read the figures before touching « Station suivante ».
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    p3.defilementAvant = await page.evaluate(() => window.scrollY)
    await page.locator('[data-suivante]').click()
    await page.locator('[data-calculer]').waitFor()
    await page.waitForTimeout(400)
    p3.defilementApres = await page.evaluate(() => window.scrollY)
    p3.bandeau = await page.evaluate(() => {
      const b = document.querySelector('[data-bandeau]')
      const h = document.querySelector('header')
      const rb = b.getBoundingClientRect()
      const rh = h.getBoundingClientRect()
      return { texte: b.textContent.replace(/\s+/g, ' ').trim(), haut: Math.round(rb.top), bas: Math.round(rb.bottom), basEnTete: Math.round(rh.bottom), visible: rb.top >= rh.bottom - 1 && rb.bottom <= innerHeight }
    })
    p3.capture = await banc.capturer(page, '14-apres-station-suivante-bandeau')
    p3.appels = [...new Set(simule.etat.appels)]
    res.parties['3'] = p3
    res.erreurs = erreurs
    await contexte.close()
  } finally {
    await navigateur.close()
  }
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-11') }
