/* Scenario RELEVE-CC-09 of the bench (scripts/releve-banc.cjs): the input lock, production build
 * (vite preview), 412 x 869, device scale factor 3.5. Session fabricated (never a real token) and server
 * MOCKED (every rt_* call answered by this script, nothing reaches Supabase).
 *   1 Screen 14: relevé « Accès nord » held by R since 18/11 07:42, last data 09:12; the owner sees
 *     « Reprendre la saisie », then the dialog with the warning of 6.10.
 *   2 Take-over confirmed: the late stations S04 to S07 of R arrive; screen 15: « arrivé après reprise »
 *     on the stations list, on a station (screen 9) and as a yellow ring on the map.
 *   3 Screen 13: « Terminer » in airplane mode: « Fin de saisie enregistrée : elle partira au retour du
 *     réseau »; network back: rt_saisie_terminer last, « Saisie libre ».
 *   4 Module switcher of the header logo.
 * Run:  $env:BANC_PORT='4109'; node scripts/releve-banc.cjs cc09 */
'use strict'
const path = require('node:path')
const { chromium } = require('@playwright/test')
const { VUE } = require('./releve-banc.cjs')

const RACINE = path.resolve(__dirname, '..')
const SUPABASE = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
const CLE_SESSION = 'sb-ofzmwrzatcztoekrpvkj-auth-token'
const COMPTE = '00000000-0000-0000-0000-0000000000c9'
const COMPTE_R = '00000000-0000-0000-0000-0000000000a2'
const D = 'd0000000-0000-4000-8000-0000000000c9'
const C = 'c0000000-0000-4000-8000-0000000000c9'
const RID = 'a0000000-0000-4000-8000-0000000000c9'
const DEPUIS = '2026-11-18T04:42:00.000Z'
const DERNIERE = '2026-11-18T06:12:00.000Z'

const PLAN = { A: [0, 0, 38.11, 'Borne ouest', 1], B: [47.29, 22.67, 26.83, 'Borne nord', 2], C: [69.15, -17.32, 21.33, 'Borne sud-est', 3] }
const MESURES = {
  S01: { A: [20.57, 13.6], B: [36.06, -10.3], C: [53.47, -12.9] },
  S02: { A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -12.0] },
  S03: { A: [41.15, 13.6], B: [23.87, -3.9], C: [34.65, -11.9] },
}
const propre = (t) => (t || '').replace(/\s+/g, ' ').trim()
const id = (prefixe, n) => `${prefixe}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const ENTETE = {
  schema: 1,
  nom: 'Accès nord',
  date: '2026-11-18',
  operateurs: 'R',
  hi: 1.5,
  ht: 1.5,
  reglages: {},
  orientation: { cap_lu: null, source: null, declinaison: null },
  cote_c: null,
  calage: { etat: 'saute', le: DEPUIS },
}

function bornes() {
  return Object.entries(PLAN).map(([lettre, [x, y, z, nom, ordre]], i) => ({
    id: id('b', i + 1),
    type: 'borne',
    donnees: { lettre, usage: 1, nom, type: 'principale', ordre, rang: 0, plan: { x, y, z }, verifiee: true, station_origine: null, etat: 'active', retiree_le: null },
    supprime: false,
    auteur: COMPTE_R,
    saisi_at: DEPUIS,
    recu_at: DEPUIS,
    apres_reprise: false,
  }))
}

function station(n, numero, mesures, heure, apresReprise) {
  const ids = { A: id('b', 1), B: id('b', 2), C: id('b', 3) }
  return {
    id: id('e', n),
    type: 'station',
    donnees: {
      numero,
      heure,
      visees: Object.entries(mesures).map(([l, [distance, pente]]) => ({ borne_id: ids[l], distance, pente, pas_visible: false, historique: [] })),
      etat: 'normale',
      note: null,
      sans_visee: null,
    },
    supprime: false,
    auteur: COMPTE_R,
    saisi_at: heure,
    recu_at: heure,
    apres_reprise: apresReprise,
  }
}

/** Mocked server: one owner account (this phone), R holding the relevé on another phone. */
function serveurSimule() {
  const etat = {
    appels: [],
    appareil: null,
    detenteur: { user_id: COMPTE_R, nom: 'R', appareil: 'appareil-r', appareil_libelle: 'Android', depuis: DEPUIS, moi: false },
    reprise_at: null,
    derniere: DERNIERE,
    objets: [
      ...bornes(),
      station(1, 'S01', MESURES.S01, '2026-11-18T05:10:00.000Z', false),
      station(2, 'S02', MESURES.S02, '2026-11-18T05:40:00.000Z', false),
      station(3, 'S03', MESURES.S03, DERNIERE, false),
    ],
  }
  const resume = () => ({
    id: RID,
    chantier_id: C,
    nom: 'Accès nord',
    entete: ENTETE,
    cree_par: COMPTE_R,
    cree_par_nom: 'R',
    cree_at: DEPUIS,
    maj_at: etat.derniere,
    saisie: etat.detenteur,
    reprise_at: etat.reprise_at,
    derniere_donnee_at: etat.derniere,
    nb_stations: etat.objets.filter((o) => o.type === 'station').length,
  })
  const repondre = (fn, a) => {
    switch (fn) {
      case 'rt_ouvrir':
        etat.appareil = a.p_appareil
        return { ok: true, user_id: COMPTE, nom: 'Propriétaire banc' }
      case 'rt_mes_terrains':
        return [{ id: D, nom: 'Domaine A', a_moi: true, proprietaire_nom: 'Propriétaire banc', chantiers: [{ id: C, nom: 'Premier chantier', droit: 'proprietaire', releves: [resume()] }] }]
      case 'rt_releve_lire':
        return { ...resume(), droit: 'proprietaire', objets: etat.objets }
      case 'rt_saisie_reprendre': {
        // R's phone came back afterwards with S04 to S07, typed without network: marked by the server.
        etat.reprise_at = new Date().toISOString()
        etat.detenteur = { user_id: COMPTE, nom: 'Propriétaire banc', appareil: a.p_appareil, appareil_libelle: 'banc', depuis: etat.reprise_at, moi: true }
        const t = Date.now()
        const tard = [
          station(4, 'S04', MESURES.S01, new Date(t - 4 * 3600e3).toISOString(), true),
          station(5, 'S05', MESURES.S02, new Date(t - 3 * 3600e3).toISOString(), true),
          station(6, 'S06', MESURES.S03, new Date(t - 2 * 3600e3).toISOString(), true),
          station(7, 'S07', MESURES.S01, new Date(t - 1 * 3600e3).toISOString(), true),
        ]
        etat.objets.push(...tard)
        etat.derniere = new Date().toISOString()
        return { ok: true, reprise: true }
      }
      case 'rt_envoyer':
        return { ok: true, recus: (a.p_objets || []).length, apres_reprise: false, reprise_at: null }
      case 'rt_saisie_terminer':
        etat.detenteur = null
        return { ok: true }
      default:
        return { ok: true }
    }
  }
  return { etat, repondre }
}

async function executer(banc) {
  const res = { parties: {} }
  const navigateur = await chromium.launch({ headless: true })
  const options = { viewport: VUE, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Indian/Antananarivo', serviceWorkers: 'block' }
  try {
    const contexte = await navigateur.newContext(options)
    const simule = serveurSimule()
    await contexte.route(`${SUPABASE}/**`, async (r) => {
      const url = new URL(r.request().url())
      const m = /\/rest\/v1\/rpc\/([a-z_]+)/.exec(url.pathname)
      if (!m) {
        // The account row read by the module switcher (role, preferences).
        if (url.pathname.endsWith('/rest/v1/users')) {
          simule.etat.appels.push('users')
          return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ role: 'admin', preferences: { modules: ['bazarkely', 'releve'] } }) })
        }
        return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      }
      const args = JSON.parse(r.request().postData() || '{}')
      simule.etat.appels.push(m[1])
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(simule.repondre(m[1], args)) })
    })
    const expire = Math.floor(Date.now() / 1000) + 7 * 24 * 3600
    await contexte.addInitScript(
      ([cle, valeur]) => {
        if (!localStorage.getItem(cle)) localStorage.setItem(cle, valeur)
      },
      [
        CLE_SESSION,
        JSON.stringify({
          access_token: 'jeton-fabrique-par-le-banc',
          refresh_token: 'faux',
          token_type: 'bearer',
          expires_in: 604800,
          expires_at: expire,
          user: { id: COMPTE, aud: 'authenticated', role: 'authenticated', email: 'banc@exemple.invalid', user_metadata: { full_name: 'Propriétaire banc' }, app_metadata: { provider: 'email' } },
        }),
      ],
    )
    const page = await contexte.newPage()
    const erreurs = []
    page.on('pageerror', (e) => erreurs.push(e.message))

    // ---------------------------------------------------------------- 1. screen 14 and the dialog
    await page.goto(banc.url('/releve/'))
    await page.getByText('Accès nord').first().waitFor({ timeout: 30000 }).catch(() => undefined)
    // The engine has read the server (rt_mes_terrains, rt_releve_lire): open the input state of the relevé.
    for (let i = 0; i < 60 && !simule.etat.appels.includes('rt_releve_lire'); i++) await page.waitForTimeout(250)
    await page.goto(banc.url(`/releve/r/${RID}/saisir`))
    await page.locator('[data-ecran="releve-lecture"]').waitFor({ timeout: 20000 })
    const p1 = {
      url: new URL(page.url()).pathname,
      bandeau: propre(await page.locator('[data-bandeau]').first().textContent()),
      carte: propre(await page.locator('[data-ecran="releve-lecture"]').textContent()),
      barre: propre(await page.getByRole('navigation', { name: 'Barre du relevé' }).textContent()),
      defilement: await page.evaluate(() => document.documentElement.scrollWidth),
    }
    p1.capture = await banc.capturer(page, '01-ecran-14-tenu-ailleurs')
    await page.getByRole('button', { name: 'Reprendre la saisie' }).click()
    const dialogue = page.getByRole('alertdialog')
    await dialogue.waitFor()
    p1.dialogue = propre(await dialogue.textContent())
    p1.captureDialogue = await banc.capturer(page, '02-ecran-14-avertissement')
    res.parties['1'] = p1

    // ---------------------------------------------------------------- 2. take-over, screen 15
    await dialogue.getByRole('button', { name: 'Oui, reprendre la saisie' }).click()
    await page.waitForURL(/\/saisir$/, { timeout: 20000 })
    await page.locator('[data-tardives]').waitFor({ timeout: 20000 })
    const p2 = {
      bandeau: propre(await page.locator('[data-bandeau]').first().textContent()),
      tardives: propre(await page.locator('[data-tardives]').textContent()),
      pastilles: await page.locator('[data-tardives] [data-apres-reprise]').count(),
      appels: simule.etat.appels.filter((a) => a.startsWith('rt_saisie')),
    }
    await page.locator('[data-tardives]').scrollIntoViewIfNeeded()
    p2.capture = await banc.capturer(page, '03-ecran-15-arrivees-apres-reprise')
    await page.locator('[data-tardive="S05"]').click()
    await page.locator('[data-resultat-station="S05"]').waitFor({ timeout: 15000 })
    p2.station = propre(await page.locator('[data-resultat-station="S05"]').textContent())
    p2.captureStation = await banc.capturer(page, '04-station-arrivee-apres-reprise')
    await page.goto(banc.url(`/releve/r/${RID}/carte`))
    await page.locator('svg [data-station]').first().waitFor({ timeout: 15000 })
    p2.anneaux = await page.locator('svg circle[data-apres-reprise]').count()
    p2.captureCarte = await banc.capturer(page, '05-carte-anneaux-jaunes')
    res.parties['2'] = p2

    // ---------------------------------------------------------------- 3. screen 13
    // Through /saisie (redirects to Saisir while held): its chunk is loaded before the network goes (the
    // bench blocks the service worker that precaches it in real use).
    await page.goto(banc.url(`/releve/r/${RID}/saisie`))
    await page.waitForURL(/\/saisir$/, { timeout: 15000 })
    await page.locator('[data-bandeau="tenue"]').waitFor({ timeout: 15000 })
    await contexte.setOffline(true)
    const appelsAvant = simule.etat.appels.length
    await page.locator('[data-bandeau]').getByRole('button', { name: 'Terminer' }).click()
    await page.locator('[data-ecran="fin-saisie"]').waitFor({ timeout: 15000 })
    const p3 = {
      url: new URL(page.url()).pathname,
      bandeau: propre(await page.locator('[data-bandeau]').first().textContent()),
      carte: propre(await page.locator('[data-ecran="fin-saisie"]').textContent()),
      appelsHorsLigne: simule.etat.appels.length - appelsAvant,
    }
    p3.capture = await banc.capturer(page, '06-ecran-13-fin-en-attente')
    const avantRetour = simule.etat.appels.length
    await contexte.setOffline(false)
    await page.locator('[data-bandeau="libre"]').waitFor({ timeout: 30000 })
    p3.apresRetour = propre(await page.locator('[data-bandeau]').first().textContent())
    p3.appelsRetour = simule.etat.appels.slice(avantRetour).filter((a) => a !== 'users')
    p3.terminerEnDernier = p3.appelsRetour.lastIndexOf('rt_saisie_terminer') > p3.appelsRetour.lastIndexOf('rt_envoyer')
    p3.captureLibre = await banc.capturer(page, '07-saisie-libre')
    res.parties['3'] = p3

    // ---------------------------------------------------------------- 4. module switcher
    await page.locator('[data-rt-logo]').click()
    await page.locator('[data-rt-commutateur]').waitFor({ timeout: 10000 })
    res.parties['4'] = {
      tuiles: await page.locator('[data-rt-tuile]').evaluateAll((l) => l.map((e) => e.getAttribute('data-rt-tuile'))),
      capture: await banc.capturer(page, '08-commutateur'),
    }
    res.erreurs = erreurs
    await contexte.close()
  } finally {
    await navigateur.close()
  }
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-09') }
