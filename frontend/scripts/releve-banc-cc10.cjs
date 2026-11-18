/* Scenario RELEVE-CC-10 of the bench (scripts/releve-banc.cjs): sharing, production build (vite preview),
 * 412 x 869, device scale factor 3.5. Session fabricated (never a real token) and server MOCKED (every rt_*
 * call answered by this script, nothing reaches Supabase; the invitation token is a fake).
 *   1 Home: « Mes terrains » then « Partagés avec moi » (Domaine B: one work site « relever »; Domaine C:
 *     whole domain « consulter »).
 *   2 Screen 16: Domaine A, « Deuxième chantier » ticked, « Relever », « Préparer le message WhatsApp »:
 *     the phone's share menu receives the exact text; « Message préparé » shown.
 *   3 Screen 17: account R (whole domain « relever », Premier chantier « consulter », the line of 6.8),
 *     account C, one pending invitation; « Changer le droit » asks for confirmation.
 *   4 Screen 18 in a context WITHOUT session: preview, then a used link.
 * Run:  $env:BANC_PORT='4110'; node scripts/releve-banc.cjs cc10 */
'use strict'
const path = require('node:path')
const { chromium } = require('@playwright/test')
const { VUE } = require('./releve-banc.cjs')

const RACINE = path.resolve(__dirname, '..')
const SUPABASE = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
const CLE_SESSION = 'sb-ofzmwrzatcztoekrpvkj-auth-token'
const COMPTE = '00000000-0000-0000-0000-0000000000d1'
const DA = 'd0000000-0000-4000-8000-0000000000a1'
const DB = 'd0000000-0000-4000-8000-0000000000b1'
const DC = 'd0000000-0000-4000-8000-0000000000c1'
const CA1 = 'c0000000-0000-4000-8000-0000000000a1'
const CA2 = 'c0000000-0000-4000-8000-0000000000a2'
const CA3 = 'c0000000-0000-4000-8000-0000000000a3'
const CB1 = 'c0000000-0000-4000-8000-0000000000b1'
const CC1 = 'c0000000-0000-4000-8000-0000000000c1'
const JETON = 'f'.repeat(64)
const propre = (t) => (t || '').replace(/\s+/g, ' ').trim()

function serveurSimule() {
  const etat = { appels: [], invitations: [] }
  const ch = (id, nom, droit) => ({ id, nom, droit, releves: [] })
  const repondre = (fn, a) => {
    switch (fn) {
      case 'rt_ouvrir':
        return { ok: true, user_id: COMPTE, nom: 'Joël banc' }
      case 'rt_mes_terrains':
        return [
          { id: DA, nom: 'Domaine A', a_moi: true, proprietaire_nom: 'Joël banc', domaine_entier: null, nb_partages: 2, chantiers: [ch(CA1, 'Premier chantier', 'proprietaire'), ch(CA2, 'Deuxième chantier', 'proprietaire'), ch(CA3, 'Parking', 'proprietaire')] },
          { id: DB, nom: 'Domaine B', a_moi: false, proprietaire_nom: 'Rado', domaine_entier: null, chantiers: [ch(CB1, 'Chantier du bas', 'relever')] },
          { id: DC, nom: 'Domaine C', a_moi: false, proprietaire_nom: 'Mamy', domaine_entier: 'consulter', chantiers: [ch(CC1, 'Villa 4', 'consulter')] },
        ]
      case 'rt_invitation_creer':
        etat.invitations.push(a)
        return { ok: true, invitation_id: 'i0000000-0000-4000-8000-000000000001', jeton: JETON }
      case 'rt_acces':
        return {
          partages: [
            { id: 'p1', invite_id: 'r', invite_nom: 'Rado', chantier_id: null, chantier_nom: null, droit: 'relever', depuis: '2026-11-18T07:00:00Z' },
            { id: 'p2', invite_id: 'r', invite_nom: 'Rado', chantier_id: CA1, chantier_nom: 'Premier chantier', droit: 'consulter', depuis: '2026-11-18T07:05:00Z' },
            { id: 'p3', invite_id: 'c', invite_nom: 'Mamy', chantier_id: null, chantier_nom: null, droit: 'consulter', depuis: '2026-11-18T07:10:00Z' },
          ],
          invitations: [{ id: 'i1', droit: 'relever', domaine_entier: false, chantiers: ['Parking'], cree_at: '2026-11-18T07:05:00Z' }],
        }
      case 'rt_invitation_apercu':
        return a.p_jeton === JETON
          ? { valide: true, proprietaire_nom: 'Joël banc', domaine_nom: 'Domaine A', domaine_entier: false, droit: 'relever', chantiers: ['Deuxième chantier'] }
          : { valide: false, plus_valable: true }
      default:
        return { ok: true }
    }
  }
  return { etat, repondre }
}

async function router(contexte, simule) {
  await contexte.route(`${SUPABASE}/**`, async (r) => {
    const url = new URL(r.request().url())
    const m = /\/rest\/v1\/rpc\/([a-z_]+)/.exec(url.pathname)
    if (!m) {
      if (url.pathname.endsWith('/rest/v1/users')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'user', preferences: { modules: ['releve'] } }) })
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }
    const args = JSON.parse(r.request().postData() || '{}')
    simule.etat.appels.push(m[1])
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(simule.repondre(m[1], args)) })
  })
}

async function executer(banc) {
  const res = { parties: {} }
  const navigateur = await chromium.launch({ headless: true })
  const options = { viewport: VUE, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Indian/Antananarivo', serviceWorkers: 'block' }
  try {
    const contexte = await navigateur.newContext(options)
    const simule = serveurSimule()
    await router(contexte, simule)
    const expire = Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    await contexte.addInitScript(
      ([cle, valeur]) => {
        if (!localStorage.getItem(cle)) localStorage.setItem(cle, valeur)
        // The phone's share menu: records the text instead of opening it.
        navigator.share = async (d) => {
          window.__partage = d.text
        }
      },
      [
        CLE_SESSION,
        JSON.stringify({
          access_token: 'jeton-fabrique-par-le-banc',
          refresh_token: 'faux',
          token_type: 'bearer',
          expires_in: 604800,
          expires_at: expire,
          user: { id: COMPTE, aud: 'authenticated', role: 'authenticated', email: 'banc@exemple.invalid', user_metadata: { full_name: 'Joël banc' }, app_metadata: { provider: 'email' } },
        }),
      ],
    )
    const page = await contexte.newPage()
    const erreurs = []
    page.on('pageerror', (e) => erreurs.push(e.message))

    // ---------------------------------------------------------------- 1. home
    await page.goto(banc.url('/releve/'))
    await page.locator('#partages').waitFor({ timeout: 30000 })
    await page.locator('#partages').scrollIntoViewIfNeeded()
    res.parties['1'] = {
      partages: propre(await page.locator('#partages').textContent()),
      pastilles: await page.locator('#partages [data-droit]').evaluateAll((l) => l.map((e) => e.getAttribute('data-droit'))),
      boutonsPoints: await page.locator('#partages button').count(),
      defilement: await page.evaluate(() => document.documentElement.scrollWidth),
      capture: await banc.capturer(page, '01-accueil-partages-avec-moi'),
    }

    // ---------------------------------------------------------------- 2. screen 16
    await page.goto(banc.url(`/releve/d/${DA}/partager?chantier=${CA2}`))
    await page.getByRole('heading', { name: 'Partager' }).waitFor({ timeout: 20000 })
    const p2 = { captureAvant: await banc.capturer(page, '02-ecran-16-partager') }
    await page.getByRole('button', { name: 'Préparer le message WhatsApp' }).click()
    await page.locator('[data-message]').waitFor({ timeout: 20000 })
    p2.partage = await page.evaluate(() => window.__partage)
    p2.message = await page.locator('[data-message]').textContent()
    p2.appel = simule.etat.invitations[0]
    p2.tirets = /[—–·]/.test(p2.partage || '')
    p2.jetonStocke = await page.evaluate(async (j) => {
      const dansLocal = Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes(j))
      const bases = (await indexedDB.databases()).map((b) => b.name)
      return { dansLocal, bases }
    }, JETON)
    await page.locator('[data-message]').scrollIntoViewIfNeeded()
    p2.defilement = await page.evaluate(() => document.documentElement.scrollWidth)
    p2.capture = await banc.capturer(page, '03-ecran-16-message-prepare')
    res.parties['2'] = p2

    // ---------------------------------------------------------------- 3. screen 17
    await page.goto(banc.url(`/releve/d/${DA}/acces`))
    await page.locator('section[aria-label="Compte de Rado"]').waitFor({ timeout: 20000 })
    const p3 = {
      comptes: propre(await page.locator('main').textContent()),
      precisions: await page.locator('[data-precision]').allTextContents(),
      defilement: await page.evaluate(() => document.documentElement.scrollWidth),
      capture: await banc.capturer(page, '04-ecran-17-qui-a-acces'),
    }
    await page.locator('section[aria-label="Invitation en attente"]').scrollIntoViewIfNeeded()
    p3.captureBas = await banc.capturer(page, '05-ecran-17-invitation-en-attente')
    await page.locator('[data-partage="p1"]').getByRole('button', { name: 'Changer le droit' }).click()
    const dialogue = page.getByRole('alertdialog')
    await dialogue.waitFor()
    p3.confirmation = propre(await dialogue.textContent())
    p3.captureConfirmation = await banc.capturer(page, '06-ecran-17-changer-le-droit')
    res.parties['3'] = p3
    res.erreurs = erreurs
    await contexte.close()

    // ---------------------------------------------------------------- 4. screen 18 without session
    const sans = await navigateur.newContext(options)
    const simule2 = serveurSimule()
    await router(sans, simule2)
    const page2 = await sans.newPage()
    page2.on('pageerror', (e) => erreurs.push(e.message))
    await page2.goto(banc.url(`/releve/i/${JETON}`))
    await page2.locator('dl').waitFor({ timeout: 20000 })
    const p4 = {
      url: new URL(page2.url()).pathname,
      carte: propre(await page2.locator('dl').textContent()),
      bouton: propre(await page2.getByRole('button', { name: 'Se connecter et accepter' }).textContent()),
      appels: simule2.etat.appels,
      defilement: await page2.evaluate(() => document.documentElement.scrollWidth),
      capture: await banc.capturer(page2, '07-ecran-18-invitation'),
    }
    await page2.goto(banc.url(`/releve/i/${'0'.repeat(64)}`))
    await page2.getByRole('alert').waitFor({ timeout: 20000 })
    p4.plusValable = propre(await page2.getByRole('alert').textContent())
    p4.capturePlusValable = await banc.capturer(page2, '08-ecran-18-plus-valable')
    await page2.goto(banc.url(`/releve/i/${JETON}`))
    await page2.getByRole('button', { name: 'Se connecter et accepter' }).click()
    await page2.waitForURL(/\/releve\/connexion/, { timeout: 15000 })
    p4.apresClic = new URL(page2.url()).pathname + new URL(page2.url()).search
    p4.jetonGarde = await page2.evaluate(() => localStorage.getItem('releve_invitation_attente') !== null)
    res.parties['4'] = p4
    await sans.close()
  } finally {
    await navigateur.close()
  }
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-10') }
