/* Scenario RELEVE-CC-08 of the bench (scripts/releve-banc.cjs): account and sending, production build
 * (vite preview), 412 x 869, device scale factor 3.5.
 *   1 First opening with network and no session: screen 1 « Connectez-vous » (no call to Supabase).
 *   2 With a session (fabricated, never a real token) and a MOCKED server (every rt_* call answered by
 *     this script, nothing reaches Supabase): domain, work site and relevé typed in the screens, targets
 *     « vérifiées », everything sent (« Tout est envoyé »); airplane mode, S01 to S03 of game B typed:
 *     « 3 saisies en attente d'envoi »; network back: sent without a gesture, « Tout est envoyé ».
 * Run:  $env:BANC_PORT='4108'; node scripts/releve-banc.cjs cc08 */
'use strict'
const path = require('node:path')
const { chromium } = require('@playwright/test')
const { VUE } = require('./releve-banc.cjs')

const RACINE = path.resolve(__dirname, '..')
const SUPABASE = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
const CLE_SESSION = 'sb-ofzmwrzatcztoekrpvkj-auth-token'
const COMPTE = '00000000-0000-0000-0000-0000000000c8'

const PLAN = { A: [0, 0, 38.11, 'Borne ouest'], B: [47.29, 22.67, 26.83, 'Borne nord'], C: [69.15, -17.32, 21.33, 'Borne sud-est'] }
const B = {
  S01: { A: [20.57, 13.6], B: [36.06, -10.3], C: [53.47, -12.9] },
  S02: { A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -12.0] },
  S03: { A: [41.15, 13.6], B: [23.87, -3.9], C: [34.65, -11.9] },
}
const fr = (v) => String(v).replace('.', ',')
const propre = (t) => (t || '').replace(/\s+/g, ' ').trim()

async function saisirNombre(zone, page, libelle, valeur) {
  await zone.getByRole('button', { name: libelle, exact: true }).click()
  await page.getByRole('dialog', { name: libelle }).waitFor()
  await page.keyboard.type(fr(valeur), { delay: 5 })
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: libelle }).waitFor({ state: 'detached' })
}

async function taper(page, libelle, v) {
  await page.getByRole('button', { name: libelle, exact: true }).click()
  await page.getByRole('button', { name: 'Virgule', exact: true }).waitFor()
  await page.keyboard.type(fr(v), { delay: 5 })
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Virgule', exact: true }).waitFor({ state: 'detached', timeout: 10000 })
}

async function station(page, mesures) {
  await page.locator('[data-calculer]').waitFor()
  for (const [lettre, m] of Object.entries(mesures)) {
    await taper(page, `Distance vers ${lettre}`, m[0])
    await taper(page, `Pente vers ${lettre}`, m[1])
  }
  await page.locator('[data-calculer]').click()
  await page.locator('[data-resultat-station]').first().waitFor({ timeout: 15000 })
  const numero = await page.locator('[data-resultat-station]').first().getAttribute('data-resultat-station')
  const suivante = page.locator('[data-suivante]')
  if (await suivante.isVisible().catch(() => false)) await suivante.click()
  return numero
}

async function texteBandeau(page) {
  return propre(await page.locator('[data-bandeau]').first().textContent())
}

async function attendreBandeau(page, attendu, delai = 20000) {
  const fin = Date.now() + delai
  for (;;) {
    const t = await texteBandeau(page).catch(() => '')
    if (t === attendu) return t
    if (Date.now() > fin) throw new Error(`Bandeau « ${t} » au lieu de « ${attendu} »`)
    await page.waitForTimeout(200)
  }
}

/** Mocked server: answers every rt_* call like the real one would for a single account and phone. */
function serveurSimule() {
  const etat = { appels: [], domaines: new Map(), chantiers: new Map(), releves: new Map(), objets: new Map() }
  const repondre = (fn, a) => {
    switch (fn) {
      case 'rt_ouvrir':
        return { ok: true, user_id: COMPTE, nom: 'Banc CC08' }
      case 'rt_domaine_enregistrer':
        etat.domaines.set(a.p_id, a.p_nom)
        return { ok: true, id: a.p_id }
      case 'rt_chantier_enregistrer':
        etat.chantiers.set(a.p_id, { domaine: a.p_domaine, nom: a.p_nom })
        return { ok: true, id: a.p_id }
      case 'rt_releve_creer':
        etat.releves.set(a.p_id, { chantier: a.p_chantier, nom: a.p_nom, entete: a.p_entete, appareil: a.p_appareil })
        return { ok: true }
      case 'rt_envoyer': {
        for (const o of a.p_objets || []) etat.objets.set(o.id, { ...o, releve: a.p_releve })
        if (a.p_entete) etat.releves.get(a.p_releve).entete = a.p_entete
        return { ok: true, recus: (a.p_objets || []).length, apres_reprise: false, reprise_at: null }
      }
      case 'rt_mes_terrains':
        return [...etat.domaines].map(([id, nom]) => ({
          id,
          nom,
          a_moi: true,
          proprietaire_nom: 'Banc CC08',
          chantiers: [...etat.chantiers]
            .filter(([, c]) => c.domaine === id)
            .map(([cid, c]) => ({
              id: cid,
              nom: c.nom,
              droit: 'proprietaire',
              releves: [...etat.releves]
                .filter(([, r]) => r.chantier === cid)
                .map(([rid, r]) => ({
                  id: rid,
                  chantier_id: cid,
                  nom: r.nom,
                  entete: r.entete,
                  cree_par: COMPTE,
                  cree_par_nom: 'Banc CC08',
                  cree_at: new Date().toISOString(),
                  maj_at: new Date().toISOString(),
                  saisie: { user_id: COMPTE, nom: 'Banc CC08', appareil: r.appareil, appareil_libelle: 'banc', depuis: new Date().toISOString(), moi: true },
                  derniere_donnee_at: null,
                  nb_stations: [...etat.objets.values()].filter((o) => o.releve === rid && o.type === 'station').length,
                })),
            })),
        }))
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
    // ---------------------------------------------------------------- 1. screen 1
    {
      const contexte = await navigateur.newContext(options)
      const appelsSupabase = []
      await contexte.route(`${SUPABASE}/**`, (r) => {
        appelsSupabase.push(r.request().url())
        return r.abort()
      })
      const page = await contexte.newPage()
      await page.goto(banc.url('/releve/'))
      await page.getByRole('heading', { name: 'Connectez-vous' }).waitFor({ timeout: 15000 })
      const p1 = {
        url: new URL(page.url()).pathname + new URL(page.url()).search,
        google: await page.getByRole('button', { name: 'Continuer avec Google' }).isVisible(),
        email: await page.getByRole('button', { name: 'Se connecter par e-mail' }).isVisible(),
        texte: propre(await page.locator('main').textContent()),
        defilement: await page.evaluate(() => document.documentElement.scrollWidth),
        capture: await banc.capturer(page, '01-ecran-1-connexion'),
      }
      await page.getByRole('button', { name: 'Se connecter par e-mail' }).click()
      p1.formulaireEmail = await page.getByLabel('E-mail').isVisible()
      p1.capture2 = await banc.capturer(page, '02-ecran-1-email')
      p1.appelsSupabase = appelsSupabase.length
      res.parties['1'] = p1
      await contexte.close()
    }

    // ---------------------------------------------------------------- 2. sending
    {
      const contexte = await navigateur.newContext(options)
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
            user: { id: COMPTE, aud: 'authenticated', role: 'authenticated', email: 'banc@exemple.invalid', user_metadata: { full_name: 'Banc CC08' }, app_metadata: { provider: 'email' } },
          }),
        ],
      )
      const page = await contexte.newPage()
      page.on('pageerror', (e) => console.error('[page] erreur', e.message))
      await page.goto(banc.url('/releve/'))
      await page.getByRole('button', { name: '+ Nouveau domaine foncier' }).first().click()
      await page.getByLabel('Nom du domaine').fill('Domaine CC08')
      await page.getByRole('button', { name: 'Créer le domaine' }).click()
      await page.getByRole('heading', { level: 2, name: 'Domaine CC08' }).waitFor()
      await page.getByRole('button', { name: 'Plus d’actions sur Domaine CC08', exact: true }).click()
      await page.getByRole('menuitem', { name: '+ Nouveau chantier' }).click()
      await page.getByLabel('Nom du chantier').fill('Chantier CC08')
      await page.getByRole('button', { name: 'Créer le chantier' }).click()
      await page.getByRole('heading', { level: 1, name: 'Chantier CC08' }).waitFor()
      await page.getByRole('button', { name: '+ Nouveau relevé' }).click()
      await page.getByLabel('Nom du relevé').fill('Releve CC08')
      await page.getByRole('button', { name: 'Créer le relevé' }).click()
      await page.waitForURL(/\/r\/[^/]+\/bornes$/)
      const releveId = /\/r\/([^/]+)\/bornes$/.exec(page.url())[1]
      for (const [l, [x, y, alt, nom]] of Object.entries(PLAN)) {
        const champ = page.getByRole('textbox', { name: `Nom de l'endroit de ${l}` })
        await champ.fill(nom)
        await champ.press('Tab')
        await saisirNombre(page, page, `X de ${l}`, x)
        await saisirNombre(page, page, `Y de ${l}`, y)
        await saisirNombre(page, page, `Altitude de ${l}`, alt)
      }
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: 'Bornes déjà calées : les saisir comme vérifiées et sauter le calage' }).click()
      await page.waitForURL(/\/saisir$/)
      // Everything sent by the engine (2 s after the last write).
      const p2 = { releveId }
      p2.avant = await attendreBandeau(page, 'Tout est envoyé', 30000)
      p2.capture0 = await banc.capturer(page, '03-releve-envoye')
      // Airplane mode, S01 to S03 of game B.
      await contexte.setOffline(true)
      p2.appelsAvantHorsLigne = simule.etat.appels.length
      p2.stations = []
      for (const [, mesures] of Object.entries(B)) p2.stations.push(await station(page, mesures))
      await page.waitForTimeout(2600)
      p2.horsLigne = await attendreBandeau(page, "3 saisies en attente d'envoi", 10000)
      await page.evaluate(() => window.scrollTo(0, 0))
      p2.capture1 = await banc.capturer(page, '04-hors-ligne-3-en-attente')
      p2.appelsPendantHorsLigne = simule.etat.appels.length - p2.appelsAvantHorsLigne
      // Network back: sent without a gesture.
      await contexte.setOffline(false)
      p2.apres = await attendreBandeau(page, 'Tout est envoyé', 30000)
      await page.evaluate(() => window.scrollTo(0, 0))
      p2.capture2 = await banc.capturer(page, '05-en-ligne-tout-envoye')
      const stationsServeur = [...simule.etat.objets.values()].filter((o) => o.releve === releveId && o.type === 'station')
      p2.stationsRecues = stationsServeur.map((o) => o.donnees.numero).sort()
      p2.ordreAppels = [...new Set(simule.etat.appels)]
      p2.defilement = await page.evaluate(() => document.documentElement.scrollWidth)
      // Work site list: author's name instead of « ce téléphone » once the server returned it.
      await page.goto(banc.url('/releve/'))
      await page.getByRole('link', { name: /Chantier CC08/ }).click()
      await page.locator('[data-auteur]').first().waitFor()
      p2.auteur = propre(await page.locator('[data-auteur]').first().textContent())
      p2.capture3 = await banc.capturer(page, '06-chantier-auteur')
      res.parties['2'] = p2
      await contexte.close()
    }
  } finally {
    await navigateur.close()
  }
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-08') }
