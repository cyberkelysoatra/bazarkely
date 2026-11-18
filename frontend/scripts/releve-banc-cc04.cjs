/* Scenario RELEVE-CC-04 of the bench (scripts/releve-banc.cjs): screens 6 « Bornes » and 7 « Calage » at
 * 412 x 869 on the production build. C1: game A typed in the real screens (names, plan of the targets,
 * 9 readings, 6 tape values, heading 74,4 by hand), every expected value read on screen. C5: letter,
 * place name and limits refused. C6: « saisir comme vérifiées ». C8: width, no horizontal scroll,
 * captures next to the MODELE B pictures, contrasts. */
'use strict'
const fs = require('node:fs')
const path = require('node:path')

const RACINE = path.resolve(__dirname, '..')
const MAQUETTE = 'C:\\Users\\ACER\\Downloads\\CRéATEUR Apps\\gestion-terrassement\\maquette-source\\planche'

const T = '2026-11-18T04:00:00.000Z'
const PLAN = { A: [0, 0, 38.11, 'Borne ouest'], B: [47.29, 22.67, 26.83, 'Borne nord'], C: [69.15, -17.32, 21.33, 'Borne sud-est'] }
const LECTURES = {
  'A vers B': { l: [[53.64, -12.1], [53.67, -12.0], [53.62, -12.2]], deca: [53.64, 53.68] },
  'B vers C': { l: [[45.93, -6.9], [45.88, -6.8], [45.92, -6.9]], deca: [45.8, 45.77] },
  'A vers C': { l: [[73.28, -13.1], [73.23, -13.2], [73.19, -13.3]], deca: [73.27, 73.22] },
}

/** A fresh relevé as creerReleve() writes it: bornes A, B, C without name nor plan. */
function releveVide(nom, { plan = false, noms = false } = {}) {
  const rel = `banc4-${nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const dom = `${rel}-dom`
  const ch = `${rel}-ch`
  const env = { supprime: false, saisi_at: T, maj_at: T, apres_reprise: false, envoi: 'a_envoyer', releve_id: rel }
  const bornes = Object.entries(PLAN).map(([l, [x, y, z, n]], i) => ({
    ...env,
    id: `${rel}-${l}`,
    type: 'borne',
    donnees: { lettre: l, usage: 1, nom: noms ? n : '', type: 'principale', ordre: i + 1, rang: 0, plan: plan ? { x, y, z } : null, verifiee: false, station_origine: null, etat: 'active', retiree_le: null },
  }))
  const entete = {
    schema: 1,
    nom,
    date: '2026-11-18',
    operateurs: 'Banc',
    hi: 1.5,
    ht: 1.5,
    reglages: {},
    orientation: { cap_lu: null, source: null, declinaison: null },
    cote_c: null,
    calage: { etat: 'a_faire', le: null },
  }
  return {
    id: rel,
    donnees: {
      domaines: [{ id: dom, nom: 'Domaine A', proprietaire: 'local', a_moi: true, cree_at: T, maj_at: T, supprime_at: null, envoi: 'a_envoyer' }],
      chantiers: [{ id: ch, domaine_id: dom, nom: 'Premier chantier', cree_at: T, maj_at: T, supprime_at: null, envoi: 'a_envoyer' }],
      releves: [{ id: rel, chantier_id: ch, nom, entete, cree_par: 'local', cree_at: T, maj_at: T, ouvert_at: null, rev: 1, supprime_at: null, envoi: 'a_envoyer', saisie: null, terminer_demande: null, serveur_connu: false }],
      objets: bornes,
    },
  }
}

const fr = (v) => String(v).replace('.', ',')

/** Opens a number field by its label, types the value on the keyboard, OK. */
async function saisirNombre(zone, page, libelle, valeur) {
  await zone.getByRole('button', { name: libelle, exact: true }).click()
  await page.getByRole('dialog', { name: libelle }).waitFor()
  await page.keyboard.type(fr(valeur))
  await page.keyboard.press('Enter')
  await page.getByRole('dialog', { name: libelle }).waitFor({ state: 'detached' })
}

const propre = (t) => (t || '').replace(/\s+/g, ' ').trim()

async function executer(banc) {
  const res = { c1: { lu: {}, attendu: {}, ecarts: [] }, c5: {}, c6: {}, c8: { mesures: {} }, contrastes: {}, erreurs: [] }
  const contrastes = []
  const mesurer = async (page, nom) => {
    const m = await banc.mesurer(page)
    res.c8.mesures[nom] = m
    if (m.largeur !== 412 || m.defilement > 412) res.erreurs.push(`C8 ${nom} : ${JSON.stringify(m)}`)
  }
  const noter = async (page, ecran) => {
    for (const c of await banc.contrastes(page)) contrastes.push({ ecran, ...c })
  }
  const verifier = (cle, lu, attendu) => {
    res.c1.lu[cle] = lu
    res.c1.attendu[cle] = attendu
    const sans = (t) => (t || '').replace(/\s+/g, '')
    if (!sans(lu).includes(sans(attendu))) res.c1.ecarts.push({ cle, lu: propre(lu), attendu })
  }

  // ---------------- C1: game A typed in the screens
  {
    const { page } = await banc.ouvrir()
    await page.goto(banc.url('/releve/'), { waitUntil: 'load' })
    await page.getByText('Commencez par créer votre domaine foncier').waitFor()
    const r = releveVide('Calage A')
    await banc.injecter(page, r.donnees)
    await page.goto(banc.url(`/releve/r/${r.id}/bornes`))
    await page.getByRole('heading', { name: 'Étape 1 : les bornes' }).waitFor()
    await mesurer(page, '6-bornes-vide')
    await banc.capturer(page, '6-bornes-vide')
    // Names first: « Étape suivante » refuses blank names
    await page.getByRole('button', { name: 'Étape suivante : caler les bornes' }).click()
    res.c5.nomVideEtapeSuivante = await page.getByText("Donnez le nom de l'endroit.").first().isVisible()
    for (const [l, [x, y, z, nom]] of Object.entries(PLAN)) {
      const champ = page.getByRole('textbox', { name: `Nom de l'endroit de ${l}` })
      await champ.fill(nom)
      await champ.press('Tab')
      await saisirNombre(page, page, `X de ${l}`, x)
      await saisirNombre(page, page, `Y de ${l}`, y)
      await saisirNombre(page, page, `Altitude de ${l}`, z)
    }
    await page.waitForTimeout(300)
    await page.evaluate(() => window.scrollTo(0, 0))
    await mesurer(page, '6-bornes-rempli')
    await banc.capturer(page, '6-bornes-rempli')
    await noter(page, '6-bornes')
    await page.screenshot({ path: path.join(banc.sortie, '6-bornes-page-entiere.png'), fullPage: true })

    // C5: letter carried by another target, blank place name
    await page.getByRole('button', { name: 'Lettre A : changer la lettre' }).click()
    const feuille = page.getByRole('dialog', { name: 'Lettre de la borne A' })
    await feuille.getByRole('button', { name: 'B', exact: true }).click()
    res.c5.lettre = propre(await feuille.getByRole('alert').textContent())
    await banc.capturer(page, '6-lettre-refusee')
    await page.keyboard.press('Escape')
    const nomA = page.getByRole('textbox', { name: "Nom de l'endroit de A" })
    await nomA.fill('')
    await nomA.press('Tab')
    res.c5.nomVide = await page.getByText("Donnez le nom de l'endroit.").first().isVisible()
    res.c5.nomGarde = await nomA.inputValue()

    await page.getByRole('button', { name: 'Étape suivante : caler les bornes' }).click()
    await page.getByRole('heading', { name: 'Étape 2 : caler les bornes' }).waitFor()
    await mesurer(page, '7-calage-vide')
    await banc.capturer(page, '7-calage-vide')
    res.veille = await page.evaluate(() => 'wakeLock' in navigator)

    // C5: limits of a reading
    {
      const carte = page.getByRole('region', { name: 'Côté A vers B' })
      await carte.getByRole('button', { name: 'Lecture 1 : distance', exact: true }).click()
      await page.keyboard.type('0')
      await page.keyboard.press('Enter')
      res.c5.distance0 = await page.getByText('Distance entre 0 et 1 000 m.').isVisible()
      await page.keyboard.type('1200')
      await page.keyboard.press('Enter')
      res.c5.distance1200 = await page.getByText('Distance entre 0 et 1 000 m.').isVisible()
      await banc.capturer(page, '7-distance-refusee')
      await page.keyboard.press('Escape')
      await carte.getByRole('button', { name: 'Lecture 1 : pente', exact: true }).click()
      await page.keyboard.type('95')
      await page.keyboard.press('Enter')
      res.c5.pente95 = await page.getByText('Pente entre −90° et +90°.').isVisible()
      await page.keyboard.press('Escape')
    }

    const t0 = Date.now()
    for (const [cote, { l, deca }] of Object.entries(LECTURES)) {
      const carte = page.getByRole('region', { name: `Côté ${cote}` })
      for (let i = 0; i < 3; i++) {
        await saisirNombre(carte, page, `Lecture ${i + 1} : distance`, l[i][0])
        await saisirNombre(carte, page, `Lecture ${i + 1} : pente`, l[i][1])
      }
      await saisirNombre(carte, page, 'Décamètre aller', deca[0])
      await saisirNombre(carte, page, 'Décamètre retour', deca[1])
    }
    // Heading typed by hand (Chromium of the bench sends no compass event)
    await page.getByRole('button', { name: 'Lire la boussole' }).click()
    await page.getByText('Pas de boussole sur ce téléphone : saisissez le cap lu sur une boussole.').waitFor({ timeout: 6000 })
    res.sansBoussole = true
    await saisirNombre(page, page, 'Cap A vers B lu sur une boussole', 74.4)
    res.dureeSaisieCalageS = Math.round((Date.now() - t0) / 1000)
    await page.locator('[data-resultat]').waitFor()

    // Read every expected value of game A
    const txt = async (sel) => propre(await page.locator(sel).first().innerText())
    const carte = async (cote) => propre(await page.getByRole('region', { name: `Côté ${cote}` }).getByLabel(`Résultat du côté ${cote}`).innerText())
    verifier('AB distance', await carte('A vers B'), 'Distance retenue52,468 m')
    verifier('AB dénivelé', await carte('A vers B'), 'Dénivelé−11,245 m')
    verifier('AB écart', await carte('A vers B'), 'Écart décamètre et appareil+0,016 m')
    verifier('AB biais', await carte('A vers B'), "Biais de l'appareil−0,017 m")
    verifier('BC distance', await carte('B vers C'), 'Distance retenue45,457 m')
    verifier('BC dénivelé', await carte('B vers C'), 'Dénivelé−5,489 m')
    verifier('BC écart', await carte('B vers C'), 'Écart décamètre et appareil−0,124 m')
    verifier('BC biais', await carte('B vers C'), "Biais de l'appareil+0,125 m")
    verifier('AC distance', await carte('A vers C'), 'Distance retenue71,310 m')
    verifier('AC dénivelé', await carte('A vers C'), 'Dénivelé−16,723 m')
    verifier('AC écart', await carte('A vers C'), 'Écart décamètre et appareil+0,011 m')
    verifier('AC biais', await carte('A vers C'), "Biais de l'appareil−0,012 m")
    verifier('AB couleur', await txt('[data-cote="A vers B"]'), 'A vers BVERT 52,468 +0,016 −11,245')
    verifier('BC couleur', await txt('[data-cote="B vers C"]'), 'B vers CORANGE 45,457 −0,124 −5,489')
    verifier('AC couleur', await txt('[data-cote="A vers C"]'), 'A vers CVERT 71,310 +0,011 −16,723')
    verifier('boucle', await txt('[data-boucle]'), 'Boucle des dénivelés : −0,011 m VERT')
    verifier('A', await txt('[data-borne-placee="A"]'), 'A 0,000 0,000 38,110')
    verifier('B', await txt('[data-borne-placee="B"]'), 'B 47,312 22,681 26,865')
    verifier('C', await txt('[data-borne-placee="C"]'), 'C 69,217 −17,150 21,382')
    verifier('position B', await txt('[data-controle-ligne="positionB"]'), 'Position de B 0,025 m VERT')
    verifier('position C', await txt('[data-controle-ligne="positionC"]'), 'Position de C 0,182 m ORANGE')
    verifier('altitude B', await txt('[data-controle-ligne="altitudeB"]'), 'Altitude de B +0,035 m VERT')
    verifier('altitude C', await txt('[data-controle-ligne="altitudeC"]'), 'Altitude de C +0,052 m VERT')
    verifier('cap', await txt('[data-controle-ligne="cap"]'), 'Cap A vers B (plan 64,4°) écart 0,0° VERT')
    verifier('cap corrigé', await txt('[data-cap]'), 'Cap lu 74,4° ; déclinaison 10° ; cap corrigé 64,4°')
    verifier('calage', propre(await page.locator('[data-resultat] h3').locator('..').innerText()), 'Résultat du calage ORANGE')
    verifier('orientation', await txt('[data-resultat]'), 'Orienté par le plan')
    res.c1.messageModeAffichage = await page.getByText("L'appareil semble afficher une distance horizontale").count()
    if (res.c1.messageModeAffichage !== 0) res.c1.ecarts.push({ cle: 'mode', lu: 'message présent', attendu: 'aucun message' })

    await mesurer(page, '7-calage-rempli')
    await page.locator('[data-resultat]').scrollIntoViewIfNeeded()
    await banc.capturer(page, '7-calage-resultat')
    await noter(page, '7-resultat')
    await page.locator('[data-resultat]').screenshot({ path: path.join(banc.sortie, '7-carte-resultat.png') })
    await page.locator('[data-controle]').screenshot({ path: path.join(banc.sortie, '7-carte-controle.png') })
    await page.getByRole('region', { name: 'Côté B vers C' }).screenshot({ path: path.join(banc.sortie, '7-carte-cote-bc.png') })
    await page.getByRole('region', { name: 'Cap A vers B' }).screenshot({ path: path.join(banc.sortie, '7-carte-cap.png') })
    await page.evaluate(() => window.scrollTo(0, 0))
    await banc.capturer(page, '7-calage-haut')
    await noter(page, '7-haut')
    await page.screenshot({ path: path.join(banc.sortie, '7-calage-page-entiere.png'), fullPage: true })

    // Orange: validated, opens Saisir
    await page.getByRole('button', { name: 'Étape suivante : valider le calage et relever' }).click()
    await page.waitForURL(/\/saisir$/)
    res.c1.apresValidation = new URL(page.url()).pathname
    res.c1.etatCalage = await page.evaluate(
      (id) =>
        new Promise((ok) => {
          const q = indexedDB.open('ReleveTerrainDB')
          q.onsuccess = () => {
            const g = q.result.transaction('releves').objectStore('releves').get(id)
            g.onsuccess = () => ok(g.result.entete.calage.etat)
          }
        }),
      r.id,
    )
  }

  // ---------------- C6: targets already calibrated
  {
    const { page } = await banc.ouvrir()
    await page.goto(banc.url('/releve/'), { waitUntil: 'load' })
    await page.getByText('Commencez par créer votre domaine foncier').waitFor()
    const r = releveVide('Bornes verifiees', { plan: true, noms: true })
    await banc.injecter(page, r.donnees)
    await page.goto(banc.url(`/releve/r/${r.id}/bornes`))
    await page.getByRole('heading', { name: 'Étape 1 : les bornes' }).waitFor()
    await page.getByRole('button', { name: 'Bornes déjà calées : les saisir comme vérifiées et sauter le calage' }).click()
    await page.waitForURL(/\/saisir$/)
    res.c6.url = new URL(page.url()).pathname
    await page.getByText('Cet écran arrive dans la prochaine mise à jour.').waitFor()
    res.c6.saisirOuvert = await page.getByText('Cet écran arrive dans la prochaine mise à jour.').isVisible()
    res.c6.etat = await page.evaluate(
      (id) =>
        new Promise((ok) => {
          const q = indexedDB.open('ReleveTerrainDB')
          q.onsuccess = () => {
            const tx = q.result.transaction(['releves', 'objets'])
            const g = tx.objectStore('releves').get(id)
            const o = tx.objectStore('objets').getAll()
            tx.oncomplete = () =>
              ok({
                calage: g.result.entete.calage.etat,
                verifiees: o.result.filter((x) => x.releve_id === id && x.type === 'borne' && x.donnees.verifiee).length,
                journal: o.result.filter((x) => x.releve_id === id && x.type === 'journal').map((x) => x.donnees.action),
              })
          }
        }),
      r.id,
    )
    await banc.capturer(page, '6-saute-saisir')
    await page.goto(banc.url(`/releve/r/${r.id}/bornes`))
    await page.getByText('Étape 2 sautée').waitFor()
    res.c6.bandeEtapes = propre(await page.getByRole('button', { name: /Étape 1 sur 4/ }).textContent())
    await page.getByRole('button', { name: /Étape 1 sur 4/ }).click()
    res.c6.etape2 = propre(await page.getByRole('navigation', { name: 'Étapes du relevé' }).getByRole('link', { name: /Calage/ }).textContent())
    await mesurer(page, '6-saute')
    await banc.capturer(page, '6-saute-bornes')
    await page.goto(banc.url(`/releve/r/${r.id}/calage`))
    await page.getByText('Étape 2 sautée').waitFor()
    await banc.capturer(page, '7-saute')
  }

  // ---------------- C8: next to the MODELE B pictures
  {
    const ctx = await banc.navigateur.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto('file:///' + path.join(MAQUETTE, 'B-Station.dc.html').replace(/\\/g, '/'))
    await page.waitForTimeout(1500)
    const maquette = await banc.capturer(page, 'modele-b-station')
    await page.setViewportSize({ width: 1340, height: 900 })
    const img = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')
    const fig = (titre, f, l) => `<figure style="margin:0"><figcaption>${titre}</figcaption><img src="${img(f)}" style="width:${l}px;border:1px solid #000"></figure>`
    await page.setContent(
      `<body style="margin:0;background:#888;display:flex;gap:20px;padding:16px;font:600 18px Arial">${fig('MODÈLE B (maquette, saisir)', maquette, 390)}${fig('Écran 6 Bornes (412 px)', path.join(banc.sortie, '6-bornes-rempli.png'), 412)}${fig('Écran 7 Calage (412 px)', path.join(banc.sortie, '7-calage-resultat.png'), 412)}</body>`,
    )
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(banc.sortie, 'c8-cote-a-cote.png'), fullPage: true })
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
  if (res.contrastes.minimum !== null && res.contrastes.minimum < 4.5) res.erreurs.push(`contraste ${JSON.stringify(res.contrastes.paires[0])}`)
  if (res.c1.ecarts.length) res.erreurs.push(`C1 : ${res.c1.ecarts.length} valeur(s) différente(s)`)
  return res
}

module.exports = { executer, sortieParDefaut: path.join(RACINE, '..', 'RAPPORTS-CREATEUR-APPS', 'releve-terrain', 'captures-cc-04') }
