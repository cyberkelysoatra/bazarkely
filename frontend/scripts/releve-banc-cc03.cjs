/* Scenario RELEVE-CC-03 of the bench (scripts/releve-banc.cjs): screens 2 to 5 at 412 x 869 (C2),
 * airplane mode with and without a persistent profile (C3), look and contrasts (C5), first-visit weight
 * (C7), recalculation of 100 stations on the production build (4.3). */
'use strict'
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const zlib = require('node:zlib')

const RACINE = path.resolve(__dirname, '..')
const MAQUETTE = 'C:\\Users\\ACER\\Downloads\\CRéATEUR Apps\\gestion-terrassement\\maquette-source\\planche'

// ---------------------------------------------------------------------------------------------
// Data injected straight into ReleveTerrainDB (contract schema 1), for the « Reprendre » block and
// the timing of 100 stations. Values of game B (PRD 11).
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
const PLAN = { A: [0, 0, 38.11, 'Borne ouest'], B: [47.29, 22.67, 26.83, 'Borne nord'], C: [69.15, -17.32, 21.33, 'Borne sud-est'] }

function donneesTerrain({ nbStations, nomReleve, nomChantier, nomDomaine, heureDebut }) {
  const t = '2026-11-18T04:00:00.000Z'
  const dom = `banc-dom-${nomReleve}`
  const ch = `banc-ch-${nomReleve}`
  const rel = `banc-rel-${nomReleve}`
  const env = { supprime: false, maj_at: t, apres_reprise: false, envoi: 'a_envoyer', releve_id: rel }
  const bornes = Object.entries(PLAN).map(([l, [x, y, z, nom]], i) => ({
    ...env,
    id: `${rel}-${l}`,
    type: 'borne',
    saisi_at: t,
    donnees: { lettre: l, usage: 1, nom, type: 'principale', ordre: i + 1, rang: 0, plan: { x, y, z }, verifiee: true, station_origine: null, etat: 'active', retiree_le: null },
  }))
  const cles = Object.keys(B)
  const stations = Array.from({ length: nbStations }, (_, i) => {
    const v = B[cles[i % 8]]
    const numero = `S${String(i + 1).padStart(2, '0')}`
    const heure = new Date(Date.parse(heureDebut) + i * 5 * 60000).toISOString()
    return {
      ...env,
      id: `${rel}-${numero}`,
      type: 'station',
      saisi_at: heure,
      donnees: {
        numero,
        heure,
        etat: 'normale',
        note: null,
        sans_visee: null,
        visees: Object.entries(v).map(([l, [d, p]]) => ({ borne_id: `${rel}-${l}`, distance: d, pente: p, pas_visible: false, historique: [] })),
      },
    }
  })
  // One station waiting for a target (« C pas visible »): the red badge of the bottom bar.
  const derniere = {
    ...env,
    id: `${rel}-attente`,
    type: 'station',
    saisi_at: heureDebut,
    donnees: {
      numero: `S${String(nbStations + 1).padStart(2, '0')}`,
      heure: new Date(Date.parse(heureDebut) + nbStations * 5 * 60000).toISOString(),
      etat: 'normale',
      note: null,
      sans_visee: null,
      visees: [
        { borne_id: `${rel}-A`, distance: 31.26, pente: 13.3, pas_visible: false, historique: [] },
        { borne_id: `${rel}-B`, distance: 25.05, pente: -9.4, pas_visible: false, historique: [] },
        { borne_id: `${rel}-C`, distance: null, pente: null, pas_visible: true, historique: [] },
      ],
    },
  }
  const entete = {
    schema: 1,
    nom: nomReleve,
    date: '2026-11-18',
    operateurs: 'Banc',
    hi: 1.5,
    ht: 1.5,
    reglages: {},
    orientation: { cap_lu: null, source: null, declinaison: null },
    cote_c: null,
    calage: { etat: 'saute', le: t },
  }
  return {
    ids: { dom, ch, rel },
    donnees: {
      domaines: [{ id: dom, nom: nomDomaine, proprietaire: 'local', a_moi: true, cree_at: t, maj_at: t, supprime_at: null, envoi: 'a_envoyer' }],
      chantiers: [{ id: ch, domaine_id: dom, nom: nomChantier, cree_at: t, maj_at: t, supprime_at: null, envoi: 'a_envoyer' }],
      releves: [{ id: rel, chantier_id: ch, nom: nomReleve, entete, cree_par: 'local', cree_at: t, maj_at: t, ouvert_at: null, rev: 1, supprime_at: null, envoi: 'a_envoyer', saisie: null, terminer_demande: null, serveur_connu: false }],
      objets: [...bornes, ...stations, derniere],
    },
  }
}

// ---------------------------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------------------------
async function creerDomaine(page, nom) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menuitem', { name: '+ Nouveau domaine foncier' }).click()
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
}

async function texteVisible(page, texte) {
  return page
    .getByText(texte, { exact: true })
    .first()
    .isVisible()
    .catch(() => false)
}

const gz = (f) => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length

async function executer(banc) {
  const res = { mesures: {}, c2: {}, c3: {}, c5: {}, c7: {}, perf: {}, erreurs: [] }
  const garder = (nom, m) => {
    res.c2[nom] = m
    if (m.largeur !== 412 || m.defilement > 412) res.erreurs.push(`C2 ${nom} : ${JSON.stringify(m)}`)
  }
  const contrastes = []
  const noterContrastes = async (page, ecran) => {
    for (const c of await banc.contrastes(page)) contrastes.push({ ecran, ...c })
  }

  // ---------------- C2, C5, C7: screens 2 to 5 (first visit, online)
  {
    const { page, contexte, fermer } = await banc.ouvrir()
    const requetes = []
    page.on('response', (r) => requetes.push(r.url()))
    await page.goto(banc.url('/releve/'), { waitUntil: 'load' })
    await page.getByText('Commencez par créer votre domaine foncier').waitFor()
    const pagesChargees = [...new Map(requetes.filter((u) => u.startsWith(banc.url('/'))).map((u) => [new URL(u).pathname, u])).values()]
    await banc.attendreHorsLigne(page)
    // C7: weight of the first visit (page, code, styles) without fonts, gzip level 9 of the files served.
    const fichier = (u) => {
      const p = new URL(u).pathname
      return path.join(RACINE, 'dist', p.endsWith('/') ? p + 'index.html' : p)
    }
    const premiers = pagesChargees.filter((u) => !/\.woff2$/.test(u) && !/sw\.js/.test(u) && fs.existsSync(fichier(u)))
    res.c7.premiereVisite = premiers.map((u) => ({ fichier: new URL(u).pathname, gzip: gz(fichier(u)) }))
    res.c7.totalSansPolicesGzip = res.c7.premiereVisite.reduce((s, x) => s + x.gzip, 0)
    const precache = JSON.parse(fs.readFileSync(path.join(RACINE, 'dist', 'releve', 'precache.json'), 'utf8')).files
    res.c7.polices = precache.filter((f) => f.endsWith('.woff2')).map((f) => ({ fichier: f, octets: fs.statSync(path.join(RACINE, 'dist', f)).size }))
    res.c7.totalPolices = res.c7.polices.reduce((s, x) => s + x.octets, 0)
    res.c7.precacheTotalGzip = precache
      .map((f) => (f.endsWith('/') ? f + 'index.html' : f))
      .map((f) => path.join(RACINE, 'dist', f))
      .filter((f) => fs.existsSync(f))
      .reduce((s, f) => s + (f.endsWith('.woff2') || f.endsWith('.png') ? fs.statSync(f).size : gz(f)), 0)
    res.c7.policesChargees = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`))

    garder('2-accueil-vide', await banc.mesurer(page))
    await banc.capturer(page, '2-accueil-vide')
    await noterContrastes(page, '2-accueil-vide')
    // Blank name refused
    await page.getByRole('button', { name: '+ Nouveau domaine foncier' }).first().click()
    await page.getByRole('button', { name: 'Créer le domaine' }).click()
    res.nomVide = await texteVisible(page, 'Donnez un nom.')
    await banc.capturer(page, '2b-nom-vide-refuse')
    await page.keyboard.press('Escape')

    // Data: a real relevé with stations (« Reprendre » block), then the UI path
    const terrain = donneesTerrain({ nbStations: 12, nomReleve: 'Plates-formes 1 à 3', nomChantier: 'Premier chantier', nomDomaine: 'Domaine A', heureDebut: '2026-11-18T07:10:00.000Z' })
    await banc.injecter(page, terrain.donnees)
    await page.goto(banc.url(`/releve/r/${terrain.ids.rel}/saisir`))
    await page.getByText('Cet écran arrive dans la prochaine mise à jour.').waitFor()
    res.badge = await page.getByRole('img', { name: '1 station incomplète' }).isVisible()
    garder('6-a-12-cadre-releve', await banc.mesurer(page))
    await banc.capturer(page, '6-a-12-cadre-releve-provisoire')
    await noterContrastes(page, 'cadre-releve')
    await page.getByRole('button', { name: /Étape 3 sur 4/ }).click()
    await banc.capturer(page, '6-a-12-etapes-depliees')
    await page.getByRole('link', { name: 'Mes terrains' }).click()
    await page.getByText('Reprendre : saisir S14').waitFor()
    await creerChantier(page, 'Domaine A', 'Deuxième chantier')
    await page.getByRole('link', { name: 'Mes terrains' }).click()
    await creerDomaine(page, 'Domaine D')
    await creerChantier(page, 'Domaine D', 'Lot unique')
    await page.getByRole('link', { name: 'Mes terrains' }).click()
    await page.getByText('Reprendre : saisir S14').waitFor()
    garder('2-accueil', await banc.mesurer(page))
    await banc.capturer(page, '2-accueil')
    await noterContrastes(page, '2-accueil')
    // C5: computed look
    res.c5.style = await page.evaluate(() => {
      const h = getComputedStyle(document.querySelector('header'))
      const titre = getComputedStyle(document.querySelector('header h1'))
      const bouton = [...document.querySelectorAll('a,button')].find((e) => /Reprendre :/.test(e.textContent))
      const bande = bouton ? getComputedStyle(bouton.lastElementChild) : null
      const cadre = bouton ? getComputedStyle(bouton) : null
      return {
        fondEnTete: h.backgroundColor,
        policeTitre: titre.fontFamily,
        graisseTitre: titre.fontWeight,
        tailleTitre: titre.fontSize,
        bandeReprendre: bande && bande.backgroundColor,
        cadreReprendre: cadre && `${cadre.borderTopWidth} ${cadre.borderTopColor}`,
        fondPage: getComputedStyle(document.body).backgroundColor,
        chiffres: getComputedStyle(document.body).fontVariantNumeric,
      }
    })

    // Screen 3: menu ⋯ of a domain, of a work site, deletion confirmation
    await page.getByRole('button', { name: 'Plus d’actions sur Domaine A', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Supprimer le domaine' }).waitFor()
    garder('3-menu-domaine', await banc.mesurer(page))
    await banc.capturer(page, '3-menu-domaine')
    await noterContrastes(page, '3-menu-domaine')
    await page.getByRole('menuitem', { name: 'Supprimer le domaine' }).click()
    await page.getByRole('alertdialog').waitFor()
    res.confirmation = await page.getByRole('alertdialog').innerText()
    await banc.capturer(page, '3-confirmation-suppression')
    await noterContrastes(page, '3-confirmation')
    await page.getByRole('button', { name: 'Annuler' }).click()
    await page.getByRole('button', { name: 'Plus d’actions sur Premier chantier', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Renommer le chantier' }).waitFor()
    res.menuChantier = await page.getByRole('menuitem').allInnerTexts()
    await banc.capturer(page, '3-menu-chantier')
    await page.keyboard.press('Escape')

    // Screen 5: top menu, help, version
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Aide : le principe de mesure' }).waitFor()
    res.menuHaut = await page.getByRole('menuitem').allInnerTexts()
    garder('5-menu-haut', await banc.mesurer(page))
    await banc.capturer(page, '5-menu-haut')
    await noterContrastes(page, '5-menu-haut')
    await page.getByRole('menuitem', { name: 'Aide : le principe de mesure' }).click()
    await page.getByText('Le principe de mesure').waitFor()
    await banc.capturer(page, '5-aide-principe')
    await noterContrastes(page, '5-aide')
    await page.getByRole('button', { name: 'Fermer' }).click()
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('menuitem', { name: "Version de l'outil" }).click()
    await page.getByText('Prêt pour le mode avion').waitFor()
    res.version = await page.getByRole('dialog').innerText()
    await banc.capturer(page, '5-version')
    await page.getByRole('button', { name: 'Fermer' }).click()

    // Screen 4: work site, new relevé sheet, keypad, menu of a relevé
    await page.getByRole('link', { name: /Premier chantier/ }).click()
    await page.getByRole('heading', { level: 1, name: 'Premier chantier' }).waitFor()
    garder('4-chantier', await banc.mesurer(page))
    await banc.capturer(page, '4-chantier')
    await noterContrastes(page, '4-chantier')
    await page.getByRole('button', { name: '+ Nouveau relevé' }).click()
    await page.getByLabel('Nom du relevé').fill('Accès nord')
    await page.getByLabel('Opérateurs').fill('R et P')
    garder('4-nouveau-releve', await banc.mesurer(page))
    await banc.capturer(page, '4-nouveau-releve')
    await noterContrastes(page, '4-nouveau-releve')
    // Keypad: out of limits refused with the message, then 1,55
    await page.getByRole('button', { name: "Hauteur de l'appareil" }).click()
    for (const k of ['9', 'Virgule', '5']) await page.getByRole('button', { name: k, exact: true }).click()
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    res.paveRefus = await texteVisible(page, 'Hauteur refusée : elle doit être supérieure à 0 et au plus 5 m.')
    await banc.capturer(page, '4-pave-refus')
    await page.getByRole('button', { name: 'Effacer' }).click()
    await page.getByRole('button', { name: 'Effacer' }).click()
    await page.getByRole('button', { name: 'Effacer' }).click()
    await page.keyboard.type('1,55')
    await page.keyboard.press('Enter')
    res.hauteurSaisie = await page.getByRole('button', { name: "Hauteur de l'appareil" }).innerText()
    // Minus key toggles in one touch (value refused: negative height)
    await page.getByRole('button', { name: 'Hauteur des cibles' }).click()
    await page.getByRole('button', { name: 'Changer le signe' }).click()
    res.signe = await page.locator('[role="dialog"] [aria-live="polite"]').innerText()
    await page.getByRole('button', { name: 'Annuler' }).click()
    await page.getByRole('button', { name: 'Créer le relevé' }).click()
    await page.getByText('Cet écran arrive dans la prochaine mise à jour.').waitFor()
    res.apresCreation = new URL(page.url()).pathname
    await page.goBack()
    await page.getByRole('heading', { level: 1, name: 'Premier chantier' }).waitFor()
    await page.getByText('Accès nord', { exact: true }).waitFor()
    res.ligneReleve = await page.getByRole('link', { name: /Accès nord/ }).innerText()
    await page.getByRole('button', { name: 'Plus d’actions sur Accès nord', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Dupliquer' }).waitFor()
    await banc.capturer(page, '4-menu-releve')
    await page.getByRole('menuitem', { name: 'Dupliquer' }).click()
    await page.getByText('Accès nord (copie)', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Plus d’actions sur Accès nord (copie)', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Supprimer le relevé' }).click()
    await banc.capturer(page, '4-confirmation-relevé')
    await page.getByRole('button', { name: 'Supprimer le relevé' }).click()
    await page.getByText('Accès nord (copie)', { exact: true }).waitFor({ state: 'detached' })
    garder('4-chantier-final', await banc.mesurer(page))
    await banc.capturer(page, '4-chantier-final')

    // Recalculation of 100 stations on the production build (performance entry « releve-calcul »)
    const grand = donneesTerrain({ nbStations: 100, nomReleve: 'Cent stations', nomChantier: 'Chantier perf', nomDomaine: 'Domaine perf', heureDebut: '2026-11-18T06:00:00.000Z' })
    await banc.injecter(page, grand.donnees)
    const durees = []
    for (let i = 0; i < 5; i++) {
      await page.goto(banc.url(`/releve/r/${grand.ids.rel}/saisir`))
      await page.getByText('Cet écran arrive dans la prochaine mise à jour.').waitFor()
      const d = await page.evaluate(() => performance.getEntriesByName('releve-calcul').map((e) => ({ duree: e.duration, objets: e.detail && e.detail.objets })))
      durees.push(...d.filter((x) => x.objets >= 100).map((x) => x.duree))
    }
    durees.sort((a, b) => a - b)
    res.perf = { mesures: durees.length, mediane: durees[Math.floor(durees.length / 2)], max: durees[durees.length - 1] }
    if (!(res.perf.max < 200)) res.erreurs.push(`perf : ${JSON.stringify(res.perf)}`)
    await fermer()
    void contexte
  }

  // ---------------- First visit after the host: no false « Nouvelle version disponible » (host worker of scope /)
  {
    const { page, fermer } = await banc.ouvrir()
    await page.goto(banc.url('/'))
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, undefined, { timeout: 30000 }).catch(() => undefined)
    res.hoteControle = await page.evaluate(() => (navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null))
    await page.goto(banc.url('/releve/'))
    await banc.attendreHorsLigne(page)
    await page.waitForTimeout(1500)
    res.fausseNouvelleVersion = await texteVisible(page, 'Nouvelle version disponible : toucher pour mettre à jour')
    if (res.fausseNouvelleVersion) res.erreurs.push('bannière Nouvelle version affichée à la première visite')
    await fermer()
  }

  // ---------------- C3: airplane mode in an ordinary context (setOffline)
  {
    const { page, contexte, fermer } = await banc.ouvrir()
    await page.goto(banc.url('/releve/'))
    await banc.attendreHorsLigne(page)
    await contexte.setOffline(true)
    await page.reload()
    await page.getByRole('heading', { level: 1, name: 'Relevé terrain' }).waitFor()
    res.c3.ouvreHorsLigne = true
    await creerDomaine(page, 'Domaine avion')
    await creerChantier(page, 'Domaine avion', 'Chantier avion')
    await page.reload()
    await page.getByRole('heading', { level: 1, name: 'Chantier avion' }).waitFor()
    await page.goto(banc.url('/releve/'))
    res.c3.apresRechargement = (await texteVisible(page, 'Domaine avion')) && (await texteVisible(page, 'Chantier avion'))
    res.c3.horsLigne = await page.evaluate(() => navigator.onLine === false)
    await banc.capturer(page, 'c3-hors-ligne')
    await fermer()
  }

  // ---------------- C3: persistent profile, browser closed and reopened, server stopped (true airplane mode)
  {
    const profil = process.env.BANC_PROFIL || fs.mkdtempSync(path.join(os.tmpdir(), 'releve-profil-'))
    res.c3.profil = profil
    let o = await banc.ouvrir({ profil })
    await o.page.goto(banc.url('/releve/'))
    await banc.attendreHorsLigne(o.page)
    await o.fermer()
    await banc.arreterServeur()
    o = await banc.ouvrir({ profil })
    await o.contexte.setOffline(true)
    await o.page.goto(banc.url('/releve/'))
    await o.page.getByRole('heading', { level: 1, name: 'Relevé terrain' }).waitFor()
    await creerDomaine(o.page, 'Domaine profil')
    await creerChantier(o.page, 'Domaine profil', 'Chantier profil')
    await o.fermer()
    o = await banc.ouvrir({ profil })
    await o.contexte.setOffline(true)
    await o.page.goto(banc.url('/releve/'))
    await o.page.getByRole('heading', { level: 2, name: 'Domaine profil' }).waitFor()
    res.c3.profilApresFermeture = (await texteVisible(o.page, 'Domaine profil')) && (await texteVisible(o.page, 'Chantier profil'))
    res.c3.serveurArrete = true
    await banc.capturer(o.page, 'c3-profil-rouvert-hors-ligne')
    await o.fermer()
    await banc.demarrerServeur()
  }

  // ---------------- C5: side by side with the MODELE B picture
  if (fs.existsSync(path.join(MAQUETTE, 'B-Accueil.dc.html'))) {
    // Desktop context: the mockup page has no viewport tag (a mobile context would lay it out at 980 px).
    await banc.ouvrir().then((o) => o.fermer())
    const ctx = await banc.navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3.5 })
    const page = await ctx.newPage()
    const fermer = () => ctx.close()
    await page.goto('file:///' + path.join(MAQUETTE, 'B-Accueil.dc.html').replace(/\\/g, '/'))
    await page.waitForTimeout(1500)
    const maquette = await banc.capturer(page, 'modele-b-accueil')
    await page.setViewportSize({ width: 1000, height: 900 })
    const img = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')
    await page.setContent(
      `<body style="margin:0;background:#888;display:flex;gap:24px;padding:16px;font:600 18px Arial"><figure style="margin:0"><figcaption>MODÈLE B (maquette)</figcaption><img src="${img(maquette)}" style="width:390px;border:1px solid #000"></figure><figure style="margin:0"><figcaption>Relevé terrain (production, 412 px)</figcaption><img src="${img(path.join(banc.sortie, '2-accueil.png'))}" style="width:412px;border:1px solid #000"></figure></body>`,
    )
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(banc.sortie, 'c5-cote-a-cote-accueil.png'), fullPage: true })
    await fermer()
  }

  // Contrasts: every pair measured, the lowest first
  const paires = new Map()
  for (const c of contrastes) {
    const k = `${c.couleur} sur ${c.fond}`
    const p = paires.get(k)
    if (!p || c.ratio < p.ratio) paires.set(k, { paire: k, ratio: c.ratio, exemple: c.texte, ecran: c.ecran, taille: c.taille })
  }
  res.c5.paires = [...paires.values()].sort((a, b) => a.ratio - b.ratio)
  res.c5.minimum = res.c5.paires.length ? res.c5.paires[0].ratio : null
  if (res.c5.minimum !== null && res.c5.minimum < 4.5) res.erreurs.push(`C5 contraste ${JSON.stringify(res.c5.paires[0])}`)
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-03') }
