// H19: plan with the contour lines (PDF, A4 landscape), drawn with jsPDF loaded on demand (its own
// chunk, imported only by a tap on « Partager », precached by the service worker of /releve/ so it
// works in airplane mode). Helvetica (standard PDF font): relevé name, date, work site, 5 m grid, bornes
// with their letter and place name, numbered points, labelled contour lines, scale, north arrow (except
// « orientation libre »), mentions « altitudes relatives », « nord approximatif »,
// « orientation libre (axe A vers B) » when they apply.
import type JsPdf from 'jspdf'
import { MESSAGES } from '../calcul'
import { dateFr } from '../etat/navigation'
import type { ReleveCalcule } from '../etat/releveCalcule'
import {
  bornesPlacees,
  cadreContenu,
  donneesCourbes,
  libelleBorne,
  longueurEchelle,
  pointEtiquette,
  positionStation,
  teinteStation,
  type Cadre,
} from '../ecrans/carte/modele'
import { baseNomFichier, propre } from './fichiers'

type Rgb = [number, number, number]
const NOIR: Rgb = [0, 0, 0]
const GRIS_TEXTE: Rgb = [63, 63, 58]
const QUADRILLAGE: Rgb = [214, 219, 209]
const COURBE: Rgb = [138, 90, 43]
const COURBE_TEXTE: Rgb = [91, 58, 26]
const CIBLE: Rgb = [250, 204, 21]
const RETIREE: Rgb = [138, 138, 130]
const TEINTES_PDF: Record<string, Rgb> = { vert: [21, 128, 61], orange: [194, 65, 12], rouge: [185, 28, 28], gris: [138, 138, 130] }

const LARGEUR = 297
const HAUTEUR = 210
const MARGE = 12
const CADRE = { x: MARGE, y: 31, l: LARGEUR - 2 * MARGE, h: 152 }
const INTERIEUR = 9

export interface EntreePdf {
  calcule: ReleveCalcule
  nom: string
  /** AAAA-MM-JJ. */
  date: string
  chantier: string
  domaine: string
  operateurs: string
  /** Contour interval (0 = « Sans » on the phone: 1 m on the plan). */
  intervalle: number
  /** Tests only: false keeps the content streams readable. */
  compresser?: boolean
}

/** PDF text: no em dash, en dash, middle dot, true minus sign (not in the standard font). */
export function textePdf(t: string): string {
  return propre(t).replace(/−/g, '-').replace(/[‘’]/g, "'")
}

const virgule = (v: number, d = 0) => v.toFixed(d).replace('.', ',')

export function nomPdf(nom: string, date: string): string {
  return `${baseNomFichier(nom, date)}.pdf`
}

/** Mentions of the plan (H19, 6.3 bis). */
export function mentionsPdf(calcule: ReleveCalcule): string[] {
  const m: string[] = []
  if (calcule.etatCalage !== 'saute' && calcule.calage?.messages.includes(MESSAGES.altitudesRelatives)) m.push(MESSAGES.altitudesRelatives)
  if (calcule.orientation === 'nord_approximatif') m.push(MESSAGES.nordApproximatif)
  if (calcule.orientation === 'libre') m.push(calcule.mentionOrientation ?? MESSAGES.orientationLibre)
  return m
}

class Dessin {
  readonly s: number
  readonly ox: number
  readonly oy: number
  readonly doc: JsPdf
  constructor(doc: JsPdf, c: Cadre) {
    this.doc = doc
    const dx = Math.max(c.xmax - c.xmin, 5)
    const dy = Math.max(c.ymax - c.ymin, 5)
    this.s = Math.min((CADRE.l - 2 * INTERIEUR) / dx, (CADRE.h - 2 * INTERIEUR) / dy)
    // Centred in the frame.
    this.ox = CADRE.x + CADRE.l / 2 - ((c.xmin + c.xmax) / 2) * this.s
    this.oy = CADRE.y + CADRE.h / 2 + ((c.ymin + c.ymax) / 2) * this.s
  }
  px(x: number): number {
    return this.ox + x * this.s
  }
  py(y: number): number {
    return this.oy - y * this.s
  }
  dedans(x: number, y: number): boolean {
    return x >= CADRE.x && x <= CADRE.x + CADRE.l && y >= CADRE.y && y <= CADRE.y + CADRE.h
  }
}

function texte(doc: JsPdf, t: string, x: number, y: number, taille: number, opts: { gras?: boolean; couleur?: Rgb; align?: 'left' | 'center' | 'right' } = {}) {
  doc.setFont('helvetica', opts.gras ? 'bold' : 'normal')
  doc.setFontSize(taille)
  doc.setTextColor(...(opts.couleur ?? NOIR))
  doc.text(textePdf(t), x, y, { align: opts.align ?? 'left' })
}

/** Segment clipped to the frame (Liang-Barsky), null when outside. */
function couper(x1: number, y1: number, x2: number, y2: number): [number, number, number, number] | null {
  const xmin = CADRE.x
  const xmax = CADRE.x + CADRE.l
  const ymin = CADRE.y
  const ymax = CADRE.y + CADRE.h
  let t0 = 0
  let t1 = 1
  const dx = x2 - x1
  const dy = y2 - y1
  const p = [-dx, dx, -dy, dy]
  const q = [x1 - xmin, xmax - x1, y1 - ymin, ymax - y1]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null
      continue
    }
    const r = q[i] / p[i]
    if (p[i] < 0) {
      if (r > t1) return null
      if (r > t0) t0 = r
    } else {
      if (r < t0) return null
      if (r < t1) t1 = r
    }
  }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy]
}

function trait(doc: JsPdf, x1: number, y1: number, x2: number, y2: number) {
  const c = couper(x1, y1, x2, y2)
  if (c) doc.line(c[0], c[1], c[2], c[3])
}

/** Builds the PDF; returns the file ready to share or download. */
export async function creerPdfReleve(e: EntreePdf): Promise<File> {
  const JsPDF = (await import('jspdf')).default
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: e.compresser !== false })
  const { calcule } = e
  const nom = e.nom.trim() || 'Relevé sans nom'
  doc.setProperties({ title: textePdf(`Relevé de terrain : ${nom}`), subject: textePdf(`${e.chantier}, ${e.domaine}`), creator: 'Relevé terrain, 1saKELY' })

  // ---- head
  texte(doc, nom, MARGE, 17, 17, { gras: true })
  const lieu = [e.chantier, e.domaine].filter(Boolean).join(', ')
  const infos = [`Date : ${dateFr(e.date)}`, lieu ? `Chantier : ${lieu}` : '', e.operateurs.trim() ? `Opérateurs : ${e.operateurs.trim()}` : ''].filter(Boolean).join('     ')
  texte(doc, infos, MARGE, 25, 10, { couleur: GRIS_TEXTE })
  const intervalle = e.intervalle > 0 ? e.intervalle : 1
  texte(doc, `Courbes de niveau tous les ${virgule(intervalle, intervalle < 1 ? 1 : 0)} m, cotées tous les 5 m`, LARGEUR - MARGE, 25, 10, { couleur: GRIS_TEXTE, align: 'right' })

  doc.setDrawColor(...NOIR)
  doc.setLineWidth(0.6)
  doc.rect(CADRE.x, CADRE.y, CADRE.l, CADRE.h)

  const cadre = cadreContenu(calcule)
  if (!cadre) {
    texte(doc, 'Aucun point placé : faites le calage puis saisissez des stations.', CADRE.x + CADRE.l / 2, CADRE.y + CADRE.h / 2, 12, { align: 'center' })
  } else {
    const d = new Dessin(doc, cadre)
    const origine = calcule.principales.a?.position ?? bornesPlacees(calcule)[0]?.position ?? { x: 0, y: 0 }

    // ---- 5 m grid (one line out of k when lines would be closer than 2 mm)
    let pas = 5
    while (pas * d.s < 2) pas *= 2
    doc.setDrawColor(...QUADRILLAGE)
    doc.setLineWidth(0.15)
    const xMin = (CADRE.x - d.ox) / d.s
    const xMax = (CADRE.x + CADRE.l - d.ox) / d.s
    const yMax = (d.oy - CADRE.y) / d.s
    const yMin = (d.oy - CADRE.y - CADRE.h) / d.s
    for (let k = Math.ceil((xMin - origine.x) / pas); origine.x + k * pas <= xMax; k++) {
      const x = d.px(origine.x + k * pas)
      doc.line(x, CADRE.y, x, CADRE.y + CADRE.h)
    }
    for (let k = Math.ceil((yMin - origine.y) / pas); origine.y + k * pas <= yMax; k++) {
      const y = d.py(origine.y + k * pas)
      doc.line(CADRE.x, y, CADRE.x + CADRE.l, y)
    }

    // ---- contour lines (covered zone only), every 5 m thicker and labelled
    const { courbes } = donneesCourbes(calcule.pointsCourbes, calcule.reglages.coupure, intervalle)
    doc.setDrawColor(...COURBE)
    for (const c of courbes) {
      doc.setLineWidth(c.majeure ? 0.55 : 0.25)
      for (const [[x1, y1], [x2, y2]] of c.segments) trait(doc, d.px(x1), d.py(y1), d.px(x2), d.py(y2))
    }
    const aucuneMajeure = !courbes.some((c) => c.majeure)
    courbes.forEach((c, i) => {
      if (!c.majeure && !(aucuneMajeure && i % 2 === 0)) return
      const p = pointEtiquette(c)
      if (!p) return
      const x = d.px(p[0])
      const y = d.py(p[1])
      if (!d.dedans(x, y)) return
      const t = virgule(c.altitude, Number.isInteger(c.altitude) ? 0 : 1)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      const l = doc.getTextWidth(t) + 1.6
      doc.setFillColor(255, 255, 255)
      doc.rect(x - l / 2, y - 2, l, 3.2, 'F')
      texte(doc, t, x, y + 0.8, 7.5, { gras: true, couleur: COURBE_TEXTE, align: 'center' })
    })

    // ---- stations: dot of their colour, number
    for (const s of calcule.stations) {
      const p = positionStation(s)
      if (!p) continue
      const x = d.px(p.x)
      const y = d.py(p.y)
      if (!d.dedans(x, y)) continue
      doc.setFillColor(...TEINTES_PDF[teinteStation(s)])
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.3)
      doc.circle(x, y, 1.1, 'FD')
      texte(doc, s.numero, x + 1.6, y - 1.2, 7, { gras: true, couleur: s.donnees.etat === 'ecartee' ? RETIREE : NOIR })
    }

    // ---- bornes: filled triangle (principal), hollow (ephemeral), grey when withdrawn; letter and place name
    for (const b of bornesPlacees(calcule)) {
      const x = d.px(b.position.x)
      const y = d.py(b.position.y)
      if (!d.dedans(x, y)) continue
      const couleur = b.active ? NOIR : RETIREE
      const r = 2.4
      doc.setDrawColor(...couleur)
      doc.setLineWidth(0.5)
      if (b.donnees.type === 'principale') {
        doc.setFillColor(...couleur)
        doc.triangle(x, y - r, x + r * 0.95, y + r * 0.6, x - r * 0.95, y + r * 0.6, 'FD')
      } else {
        doc.triangle(x, y - r, x + r * 0.95, y + r * 0.6, x - r * 0.95, y + r * 0.6, 'S')
      }
      const lettre = libelleBorne(b.donnees)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const l = Math.max(doc.getTextWidth(lettre) + 2, 4.6)
      doc.setFillColor(...(b.active ? CIBLE : ([233, 234, 230] as Rgb)))
      doc.setDrawColor(...couleur)
      doc.setLineWidth(0.35)
      doc.rect(x + 3, y - 2.6, l, 4.6, 'FD')
      texte(doc, lettre, x + 3 + l / 2, y + 0.75, 9, { gras: true, couleur: NOIR, align: 'center' })
      const nomEndroit = b.donnees.nom.trim() + (b.active ? '' : ', retirée')
      if (nomEndroit) texte(doc, nomEndroit, x + 3 + l + 1.2, y + 0.75, 7.5, { couleur: b.active ? NOIR : RETIREE })
    }

    // ---- scale bar (bottom left, inside the frame)
    const lgM = longueurEchelle(d.s * 3.78) // 3.78 px per mm: same rule as the screen
    const lgMm = lgM * d.s
    const ex = CADRE.x + 5
    const ey = CADRE.y + CADRE.h - 5
    doc.setFillColor(255, 255, 255)
    doc.rect(ex - 2, ey - 6.5, lgMm + 4, 9, 'F')
    doc.setDrawColor(...NOIR)
    doc.setLineWidth(0.8)
    doc.line(ex, ey, ex + lgMm, ey)
    doc.setLineWidth(0.4)
    doc.line(ex, ey - 1.5, ex, ey + 1)
    doc.line(ex + lgMm, ey - 1.5, ex + lgMm, ey + 1)
    texte(doc, `${virgule(lgM, lgM < 1 ? 1 : 0)} m`, ex, ey - 2.3, 8, { gras: true })

    // ---- north arrow (not with « orientation libre »)
    if (calcule.orientation && calcule.orientation !== 'libre') {
      const nx = CADRE.x + CADRE.l - 9
      const ny = CADRE.y + 6
      doc.setFillColor(255, 255, 255)
      doc.rect(nx - 6, ny - 3, 12, calcule.orientation === 'nord_approximatif' ? 22 : 17, 'F')
      doc.setFillColor(...NOIR)
      doc.setDrawColor(...NOIR)
      doc.triangle(nx, ny, nx + 3, ny + 8, nx - 3, ny + 8, 'F')
      texte(doc, 'N', nx, ny + 12.5, 9, { gras: true, align: 'center' })
      if (calcule.orientation === 'nord_approximatif') texte(doc, 'approx.', nx, ny + 16.5, 6.5, { align: 'center', couleur: GRIS_TEXTE })
    }
  }

  // ---- legend and mentions (under the frame)
  const yl = CADRE.y + CADRE.h + 7
  doc.setDrawColor(...NOIR)
  doc.setFillColor(...NOIR)
  doc.setLineWidth(0.4)
  doc.triangle(MARGE + 1.8, yl - 3, MARGE + 3.6, yl, MARGE, yl, 'FD')
  texte(doc, 'borne principale', MARGE + 5, yl, 8.5)
  doc.triangle(MARGE + 32, yl - 3, MARGE + 33.8, yl, MARGE + 30.2, yl, 'S')
  texte(doc, 'borne éphémère', MARGE + 35.5, yl, 8.5)
  let lx = MARGE + 62
  for (const [mot, c] of [
    ['station verte', TEINTES_PDF.vert],
    ['orange', TEINTES_PDF.orange],
    ['rouge', TEINTES_PDF.rouge],
    ['écartée', TEINTES_PDF.gris],
  ] as [string, Rgb][]) {
    doc.setFillColor(...c)
    doc.circle(lx + 1, yl - 1.1, 1.1, 'F')
    texte(doc, mot, lx + 3, yl, 8.5)
    doc.setFontSize(8.5)
    lx += doc.getTextWidth(textePdf(mot)) + 7
  }
  doc.setDrawColor(...COURBE)
  doc.setLineWidth(0.55)
  doc.line(lx, yl - 1.1, lx + 6, yl - 1.1)
  texte(doc, 'courbe de niveau, cote en m', lx + 8, yl, 8.5)

  const mentions = mentionsPdf(calcule)
  if (mentions.length) texte(doc, mentions.join(' ; '), LARGEUR - MARGE, yl, 9, { gras: true, align: 'right' })
  texte(doc, 'Relevé terrain, 1saKELY. Coordonnées locales en mètres, origine à la borne A.', MARGE, HAUTEUR - 8, 7.5, { couleur: GRIS_TEXTE })

  const blob = doc.output('blob')
  return new File([blob], nomPdf(nom, e.date), { type: 'application/pdf' })
}
