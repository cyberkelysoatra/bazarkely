/* Bench of the "Relevé terrain" light entry (/releve/), for every screen phase (RELEVE-CC-03 to CC-07).
 *
 * Serves the PRODUCTION build (`npm run build` first) with `vite preview --port <BANC_PORT> --strictPort`
 * and drives Chromium (Playwright) at 412 x 869, device scale factor 3.5 (Android phone).
 *
 *   node scripts/releve-banc.cjs [scenario]        scenario = scripts/releve-banc-<scenario>.cjs (default cc03)
 *
 * Environment:
 *   BANC_PORT    port of vite preview (default 4173; parallel sessions: 4101, 4102, 4103)
 *   BANC_SORTIE  folder of the captures (default: the scenario's own folder)
 *   BANC_PROFIL  folder of a persistent browser profile (launchPersistentContext): a browser closed and
 *                reopened keeps IndexedDB and the service worker
 *
 * A scenario file exports `async function (banc) { ... return resultats }`; `banc` gives:
 *   banc.url(chemin)            'http://localhost:<port>' + chemin
 *   banc.ouvrir({ profil })     new browser context at phone size ({ contexte, page, fermer() });
 *                               with `profil` (a folder): persistent context
 *   banc.capturer(page, nom)    PNG into BANC_SORTIE (nom.png), returns the path
 *   banc.mesurer(page)          { largeur: innerWidth, defilement: scrollWidth }
 *   banc.attendreHorsLigne(page) waits until every file of /releve/precache.json is in the cache
 *   banc.injecter(page, donnees) writes rows straight into ReleveTerrainDB ({ domaines, chantiers, releves, objets })
 *   banc.contrastes(page)       every visible text with its colour, background and contrast ratio
 *   banc.arreterServeur() / banc.demarrerServeur()  stops / restarts vite preview (true airplane mode)
 *   banc.sortie, banc.port, banc.navigateur (chromium)
 */
'use strict'
const { spawn, execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require('@playwright/test')

const RACINE = path.resolve(__dirname, '..')
const PORT = Number(process.env.BANC_PORT || 4173)
const VUE = { width: 412, height: 869 }

function attendre(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function repond(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/releve/', timeout: 1500 }, (res) => {
      res.resume()
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

let serveur = null

async function demarrerServeur() {
  if (!fs.existsSync(path.join(RACINE, 'dist', 'releve', 'index.html'))) throw new Error('dist/releve absent : lancer `npm run build` avant le banc')
  if (await repond(PORT)) throw new Error(`Port ${PORT} déjà pris : choisir BANC_PORT`)
  const vite = path.join(RACINE, 'node_modules', 'vite', 'bin', 'vite.js')
  serveur = spawn(process.execPath, [vite, 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: RACINE, stdio: ['ignore', 'pipe', 'pipe'] })
  serveur.stdout.on('data', () => undefined)
  serveur.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`))
  for (let i = 0; i < 60; i++) {
    if (await repond(PORT)) return
    await attendre(500)
  }
  throw new Error('vite preview ne répond pas')
}

async function arreterServeur() {
  if (!serveur) return
  const pid = serveur.pid
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else serveur.kill('SIGTERM')
  } catch {
    // already stopped
  }
  serveur = null
  for (let i = 0; i < 20 && (await repond(PORT)); i++) await attendre(250)
}

function creerBanc(sortie) {
  fs.mkdirSync(sortie, { recursive: true })
  let navigateur = null
  const contextes = []
  const optionsContexte = { viewport: VUE, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Indian/Antananarivo', serviceWorkers: 'allow' }

  const banc = {
    port: PORT,
    sortie,
    url: (chemin = '/releve/') => `http://127.0.0.1:${PORT}${chemin}`,
    demarrerServeur,
    arreterServeur,
    get navigateur() {
      return navigateur
    },
    async ouvrir({ profil } = {}) {
      let contexte
      if (profil) {
        fs.mkdirSync(profil, { recursive: true })
        contexte = await chromium.launchPersistentContext(profil, { headless: true, ...optionsContexte })
      } else {
        if (!navigateur) navigateur = await chromium.launch({ headless: true })
        contexte = await navigateur.newContext(optionsContexte)
      }
      contextes.push(contexte)
      const page = contexte.pages()[0] || (await contexte.newPage())
      page.on('pageerror', (e) => console.error('[page] erreur', e.message))
      return {
        contexte,
        page,
        fermer: async () => {
          await contexte.close().catch(() => undefined)
        },
      }
    },
    async capturer(page, nom) {
      const f = path.join(sortie, `${nom}.png`)
      await page.screenshot({ path: f, fullPage: false, animations: 'disabled' })
      return f
    },
    mesurer: (page) => page.evaluate(() => ({ largeur: window.innerWidth, defilement: document.documentElement.scrollWidth })),
    async attendreHorsLigne(page, delai = 30000) {
      // A plain polling loop: waitForFunction does not wait for an async predicate.
      const fin = Date.now() + delai
      for (;;) {
        const pret = await page
          .evaluate(async () => {
            if (!('caches' in window) || !navigator.serviceWorker.controller) return false
            const liste = await caches.match('/releve/precache.json')
            if (!liste) return false
            const { files } = await liste.json()
            for (const f of files) if (!(await caches.match(f))) return false
            return true
          })
          .catch(() => false)
        if (pret) return
        if (Date.now() > fin) throw new Error('Le service hors ligne n’a pas fini de tout garder')
        await attendre(500)
      }
    },
    injecter: (page, donnees) =>
      page.evaluate(
        (d) =>
          new Promise((resolve, reject) => {
            const req = indexedDB.open('ReleveTerrainDB')
            req.onerror = () => reject(req.error)
            req.onsuccess = () => {
              const db = req.result
              const noms = ['domaines', 'chantiers', 'releves', 'objets'].filter((n) => d[n] && d[n].length)
              const tx = db.transaction(noms, 'readwrite')
              for (const n of noms) for (const ligne of d[n]) tx.objectStore(n).put(ligne)
              tx.oncomplete = () => {
                db.close()
                resolve(true)
              }
              tx.onerror = () => reject(tx.error)
            }
          }),
        donnees,
      ),
    contrastes: (page) =>
      page.evaluate(() => {
        const rgb = (s) => {
          const m = /rgba?\(([^)]+)\)/.exec(s)
          if (!m) return null
          const p = m[1].split(',').map((x) => parseFloat(x))
          return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
        }
        const sur = (c, f) => ({ r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a), a: 1 })
        const lum = (c) => {
          const v = [c.r, c.g, c.b].map((x) => {
            x /= 255
            return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
          })
          return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
        }
        const hex = (c) => '#' + [c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase()
        const fond = (el) => {
          const pile = []
          for (let e = el; e; e = e.parentElement) {
            const c = rgb(getComputedStyle(e).backgroundColor)
            if (c && c.a > 0) {
              pile.push(c)
              if (c.a >= 1) break
            }
          }
          let f = { r: 255, g: 255, b: 255, a: 1 }
          for (let i = pile.length - 1; i >= 0; i--) f = sur(pile[i], f)
          return f
        }
        const out = []
        const marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let n = marche.nextNode(); n; n = marche.nextNode()) {
          if (!n.textContent.trim()) continue
          const el = n.parentElement
          const r = el.getBoundingClientRect()
          if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue
          const cs = getComputedStyle(el)
          if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue
          // Text inside a dimmed (disabled) control is not required to meet the ratio.
          if (el.closest('[disabled]')) continue
          const f = fond(el)
          const t = sur(rgb(cs.color), f)
          const l1 = lum(t)
          const l2 = lum(f)
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
          out.push({ texte: n.textContent.trim().slice(0, 40), couleur: hex(t), fond: hex(f), ratio: Math.round(ratio * 100) / 100, taille: cs.fontSize, graisse: cs.fontWeight })
        }
        return out
      }),
    async fermerTout() {
      for (const c of contextes) await c.close().catch(() => undefined)
      if (navigateur) await navigateur.close().catch(() => undefined)
      await arreterServeur()
    },
  }
  return banc
}

async function principal() {
  const nom = process.argv[2] || 'cc03'
  const fichier = path.join(__dirname, `releve-banc-${nom}.cjs`)
  if (!fs.existsSync(fichier)) throw new Error(`Scénario introuvable : ${fichier}`)
  const scenario = require(fichier)
  const sortie = path.resolve(process.env.BANC_SORTIE || scenario.sortieParDefaut || path.join(RACINE, 'banc-releve', nom))
  await demarrerServeur()
  const banc = creerBanc(sortie)
  const t0 = Date.now()
  try {
    const resultats = await (scenario.executer || scenario)(banc)
    fs.writeFileSync(path.join(sortie, 'resultats.json'), JSON.stringify(resultats, null, 1))
    console.log(JSON.stringify(resultats, null, 1))
    console.log(`Banc terminé en ${Math.round((Date.now() - t0) / 1000)} s, captures dans ${sortie}`)
  } finally {
    await banc.fermerTout()
  }
}

module.exports = { creerBanc, demarrerServeur, arreterServeur, PORT, VUE }

if (require.main === module) {
  principal().catch(async (e) => {
    console.error(e)
    await arreterServeur()
    process.exit(1)
  })
}
