// PDF "Mon business plan" (A4), drawn with jsPDF loaded on demand (its own chunk, precached by the
// service worker so it works in airplane mode). Helvetica (standard PDF font, nothing to embed),
// NEC violet titles, page numbers, logos NEC and B-lossom Center on the cover.
import type JsPdf from 'jspdf';
import type { Plan } from '../types';
import { NON_REMPLI, etapesComptees, phraseCouverture, resteAFaire, resumePdf, secteur, sectionsPdf, textePdf, type Bloc } from './contenu';
import { nomFichier } from './sauvegarde';

const VIOLET: [number, number, number] = [96, 0, 90];
const VIOLET_CLAIR: [number, number, number] = [242, 229, 240];
const TURQUOISE: [number, number, number] = [11, 118, 128];
const ENCRE: [number, number, number] = [51, 51, 51];
const DOUX: [number, number, number] = [110, 110, 110];
const FILET: [number, number, number] = [227, 214, 225];

const LARGEUR = 210;
const HAUTEUR = 297;
const MARGE = 18;
const UTILE = LARGEUR - 2 * MARGE;
const BAS = HAUTEUR - 18;
const MM_PAR_PT = 0.3528;

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Madagascar date (UTC+3): "10 novembre 2026" and "2026-11-10". */
export function dateMadagascar(d = new Date()): { fr: string; iso: string } {
  const m = new Date(d.getTime() + 3 * 3600 * 1000);
  const iso = m.toISOString().slice(0, 10);
  return { fr: `${m.getUTCDate()} ${MOIS[m.getUTCMonth()]} ${m.getUTCFullYear()}`, iso };
}

export function nomPdf(plan: Plan, d = new Date()): string {
  return `Business-plan_${nomFichier(plan.identite.nomProjet)}_${dateMadagascar(d).iso}.pdf`;
}

async function imageDataUrl(chemin: string): Promise<string | null> {
  try {
    const r = await fetch(chemin);
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise<string | null>((ok) => {
      const lecteur = new FileReader();
      lecteur.onload = () => ok(typeof lecteur.result === 'string' ? lecteur.result : null);
      lecteur.onerror = () => ok(null);
      lecteur.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

class Redaction {
  y = MARGE;
  readonly doc: JsPdf;
  constructor(doc: JsPdf) {
    this.doc = doc;
  }

  hauteurLigne(taille: number, interligne = 1.3): number {
    return taille * MM_PAR_PT * interligne;
  }

  nouvellePage(): void {
    this.doc.addPage();
    this.y = MARGE;
  }

  /** Breaks the page when `h` mm do not fit any more. */
  place(h: number): void {
    if (this.y + h > BAS) this.nouvellePage();
  }

  lignes(texte: string, largeur: number, taille: number, style: 'normal' | 'bold' | 'italic' = 'normal'): string[] {
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(taille);
    return this.doc.splitTextToSize(textePdf(texte), largeur) as string[];
  }

  paragraphe(texte: string, opts: { taille?: number; style?: 'normal' | 'bold' | 'italic'; couleur?: [number, number, number]; avant?: number; apres?: number } = {}): void {
    const taille = opts.taille ?? 10.5;
    const style = opts.style ?? 'normal';
    const lignes = this.lignes(texte, UTILE, taille, style);
    const hl = this.hauteurLigne(taille);
    this.y += opts.avant ?? 0;
    for (const l of lignes) {
      this.place(hl);
      this.doc.setFont('helvetica', style);
      this.doc.setFontSize(taille);
      this.doc.setTextColor(...(opts.couleur ?? ENCRE));
      this.doc.text(l, MARGE, this.y + hl * 0.78);
      this.y += hl;
    }
    this.y += opts.apres ?? 0;
  }

  titreSection(titre: string): void {
    this.nouvellePage();
    this.doc.setFillColor(...VIOLET);
    this.doc.rect(MARGE, this.y, UTILE, 1.2, 'F');
    this.y += 4;
    this.paragraphe(titre, { taille: 17, style: 'bold', couleur: VIOLET, apres: 3 });
  }

  bloc(b: Bloc): void {
    if (b.type === 'sousTitre') {
      this.place(this.hauteurLigne(13) + 12);
      this.paragraphe(b.texte, { taille: 13, style: 'bold', couleur: VIOLET, avant: 2.5, apres: 1.5 });
    } else if (b.type === 'texte') {
      this.place(this.hauteurLigne(10.5) * 2);
      this.paragraphe(b.texte, { taille: 10.5, style: 'bold', avant: 1.5, apres: 0.5 });
    } else if (b.type === 'champ') {
      // Label kept with at least the first line of its answer.
      this.place(this.hauteurLigne(9.5) + this.hauteurLigne(10.5) + 1);
      this.paragraphe(b.label, { taille: 9.5, style: 'bold', couleur: TURQUOISE });
      const vide = b.valeur === NON_REMPLI;
      this.paragraphe(b.valeur, { taille: 10.5, style: vide ? 'italic' : 'normal', couleur: vide ? DOUX : ENCRE, apres: 2.5 });
    } else {
      this.tableau(b.entetes, b.lignes, b.largeurs, !!b.total);
    }
  }

  tableau(entetes: string[], lignes: string[][], parts: number[], total: boolean): void {
    const taille = 9.5;
    const hl = this.hauteurLigne(taille, 1.25);
    const pad = 1.6;
    const largeurs = parts.map((p) => p * UTILE);
    const xs = largeurs.map((_, i) => MARGE + largeurs.slice(0, i).reduce((a, b) => a + b, 0));
    const numerique = (t: string) => /^-?\d[\d\s ]*([\s ](Ar|%))?$/.test(t.trim());

    const ligne = (cellules: string[], style: 'entete' | 'normal' | 'total') => {
      const contenus = cellules.map((c, i) => this.lignes(c, largeurs[i] - 2 * pad, taille, style === 'normal' ? (c === NON_REMPLI ? 'italic' : 'normal') : 'bold'));
      const h = Math.max(...contenus.map((c) => c.length)) * hl + 2 * pad;
      return { contenus, h, style };
    };
    const dessiner = (l: ReturnType<typeof ligne>, cellules: string[]) => {
      const { doc } = this;
      if (l.style === 'entete') {
        doc.setFillColor(...VIOLET_CLAIR);
        doc.rect(MARGE, this.y, UTILE, l.h, 'F');
      }
      doc.setDrawColor(...FILET);
      doc.setLineWidth(0.25);
      doc.rect(MARGE, this.y, UTILE, l.h);
      l.contenus.forEach((c, i) => {
        if (i > 0) doc.line(xs[i], this.y, xs[i], this.y + l.h);
        const style = l.style === 'normal' ? (cellules[i] === NON_REMPLI ? 'italic' : 'normal') : 'bold';
        doc.setFont('helvetica', style);
        doc.setFontSize(taille);
        doc.setTextColor(...(l.style === 'entete' ? VIOLET : cellules[i] === NON_REMPLI ? DOUX : ENCRE));
        const droite = i > 0 && numerique(cellules[i]);
        c.forEach((t, j) => {
          const yy = this.y + pad + hl * j + hl * 0.78;
          if (droite) doc.text(t, xs[i] + largeurs[i] - pad, yy, { align: 'right' });
          else doc.text(t, xs[i] + pad, yy);
        });
      });
      this.y += l.h;
    };

    const tete = entetes.length ? ligne(entetes, 'entete') : null;
    this.y += 1;
    this.place((tete?.h ?? 0) + hl + 2 * pad);
    if (tete) dessiner(tete, entetes);
    lignes.forEach((cellules, k) => {
      const l = ligne(cellules, total && k === lignes.length - 1 ? 'total' : 'normal');
      if (this.y + l.h > BAS) {
        this.nouvellePage();
        if (tete) dessiner(tete, entetes);
      }
      dessiner(l, cellules);
    });
    this.y += 3.5;
  }
}

/** Text cut to `max` lines of `largeur` mm, the last one ending with "..." when cut. */
function lignesCoupees(r: Redaction, texte: string, largeur: number, taille: number, max: number, style: 'normal' | 'bold' | 'italic' = 'normal'): string[] {
  const toutes = r.lignes(texte, largeur, taille, style);
  if (toutes.length <= max) return toutes;
  if (max <= 0) return [];
  const gardees = toutes.slice(0, max);
  let derniere = gardees[max - 1].replace(/\s+$/, '');
  while (derniere.length > 0 && r.doc.getTextWidth(`${derniere}...`) > largeur) derniere = derniere.slice(0, -1).replace(/\s+$/, '');
  gardees[max - 1] = `${derniere.replace(/[\s.,;:]+$/, '')}...`;
  return gardees;
}

function couverture(r: Redaction, plan: Plan, opts: OptionsPdf, nom: string, date: string): void {
  const { doc } = r;
  const i = plan.identite;
  r.y = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...TURQUOISE);
  doc.text('NOSY BE ENTREPRENEURSHIP CAMP 2026', MARGE, r.y, { charSpace: 0.8 });
  r.y += 5;
  r.paragraphe("Plan d'action", { taille: 32, style: 'bold', couleur: ENCRE, apres: 4 });
  doc.setFillColor(...VIOLET);
  doc.rect(MARGE, r.y, 40, 1.4, 'F');
  r.y += 9;
  r.paragraphe(nom, { taille: 26, style: 'bold', couleur: VIOLET, apres: 5 });
  if (i.nomPrenom.trim()) r.paragraphe(i.nomPrenom.trim(), { taille: 14, style: 'bold', apres: 1.5 });
  const sect = secteur(plan);
  if (sect) r.paragraphe(sect, { taille: 11.5, couleur: DOUX, apres: 1.5 });
  if (opts.coordonnees) {
    for (const c of [i.telephone, i.email]) if (c.trim()) r.paragraphe(c.trim(), { taille: 11, couleur: DOUX, apres: 1 });
  }
  r.y += 10;

  const phrase = phraseCouverture(plan);
  if (phrase) {
    const taille = 12.5;
    const pad = 7;
    const lignes = lignesCoupees(r, phrase, UTILE - 2 * pad, taille, 8, 'italic');
    const hl = r.hauteurLigne(taille, 1.35);
    const h = lignes.length * hl + 2 * pad;
    doc.setFillColor(...VIOLET_CLAIR);
    doc.roundedRect(MARGE, r.y, UTILE, h, 3, 3, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(taille);
    doc.setTextColor(...VIOLET);
    lignes.forEach((l, k) => doc.text(l, MARGE + pad, r.y + pad + hl * k + hl * 0.78));
    r.y += h + 12;
  }

  r.paragraphe(date, { taille: 11, couleur: DOUX, apres: 8 });

  const etapes = etapesComptees(plan);
  const faites = etapes.filter((e) => e.fait).length;
  r.paragraphe(`${faites} étape${faites > 1 ? 's' : ''} franchie${faites > 1 ? 's' : ''} sur ${etapes.length}`, { taille: 11.5, style: 'bold', couleur: TURQUOISE, apres: 3 });
  const rayon = 2.4;
  etapes.forEach((e, k) => {
    const x = MARGE + rayon + k * (2 * rayon + 3.2);
    doc.setLineWidth(0.5);
    doc.setDrawColor(...(e.fait ? TURQUOISE : FILET));
    if (e.fait) {
      doc.setFillColor(...TURQUOISE);
      doc.circle(x, r.y + rayon, rayon, 'FD');
    } else doc.circle(x, r.y + rayon, rayon, 'S');
  });
}

/** Page 2, "Mon projet en une page": never more than one page (long texts cut with "..."). */
function resume(r: Redaction, plan: Plan): void {
  const { cartes, chiffres } = resumePdf(plan);
  if (!cartes.length && !chiffres.length) return;
  const { doc } = r;
  r.titreSection('Mon projet en une page');
  const ecart = 5;
  const largeur = (UTILE - ecart) / 2;
  const pad = 3.5;
  const tTitre = 10;
  const tTexte = 9.5;
  const tMention = 8;
  const hlTitre = r.hauteurLigne(tTitre, 1.25);
  const hlTexte = r.hauteurLigne(tTexte, 1.3);
  const hlMention = r.hauteurLigne(tMention, 1.3);
  const tChiffre = chiffres.length > 2 ? 14 : 17;
  const hChiffres = chiffres.length ? 28 : 0;
  const rangs = Math.ceil(cartes.length / 2);
  const dispo = BAS - r.y - hChiffres - 2;
  const plafond = rangs ? (dispo - (rangs - 1) * ecart) / rangs : 0;

  const mesure = cartes.map((c) => {
    const titre = r.lignes(c.titre, largeur - 2 * pad, tTitre, 'bold');
    const fixe = 2 * pad + titre.length * hlTitre + 1.5 + (c.tire ? hlMention + 1 : 0);
    const max = Math.max(1, Math.floor((plafond - fixe) / hlTexte));
    const texte = lignesCoupees(r, c.texte, largeur - 2 * pad, tTexte, max);
    return { c, titre, texte, h: fixe + texte.length * hlTexte };
  });

  for (let rang = 0; rang < rangs; rang++) {
    const paire = mesure.slice(rang * 2, rang * 2 + 2);
    const h = Math.max(...paire.map((m) => m.h));
    paire.forEach((m, k) => {
      const x = MARGE + k * (largeur + ecart);
      doc.setFillColor(250, 246, 249);
      doc.setDrawColor(...FILET);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, r.y, largeur, h, 2.5, 2.5, 'FD');
      let y = r.y + pad;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(tTitre);
      doc.setTextColor(...VIOLET);
      for (const l of m.titre) {
        doc.text(l, x + pad, y + hlTitre * 0.78);
        y += hlTitre;
      }
      y += 1.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(tTexte);
      doc.setTextColor(...ENCRE);
      for (const l of m.texte) {
        doc.text(l, x + pad, y + hlTexte * 0.78);
        y += hlTexte;
      }
      if (m.c.tire) {
        y += 1;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(tMention);
        doc.setTextColor(...DOUX);
        doc.text(textePdf('tiré de mes réponses'), x + pad, y + hlMention * 0.78);
      }
    });
    r.y += h + ecart;
  }

  if (chiffres.length) {
    r.y += 3;
    const col = UTILE / chiffres.length;
    chiffres.forEach((c, k) => {
      const x = MARGE + k * col;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...TURQUOISE);
      doc.text(textePdf(c.label), x, r.y + 3);
      const valeur = lignesCoupees(r, c.valeur, col - 4, tChiffre, 2, 'bold');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(tChiffre);
      doc.setTextColor(...VIOLET);
      valeur.forEach((l, j) => doc.text(l, x, r.y + 10 + j * 6.5));
    });
    r.y += hChiffres;
  }
}

/** Last page "Mon plan continue": the steps 1 to 11 not done, each with its percentage (not for examples). */
function planContinue(r: Redaction, plan: Plan): void {
  const reste = resteAFaire(plan);
  if (!reste) return;
  const { doc } = r;
  r.titreSection('Mon plan continue');
  if (!reste.length) {
    r.paragraphe('Ton plan est complet. Prochaine étape : le pitch devant le jury.', { taille: 13, style: 'bold', couleur: TURQUOISE, avant: 2 });
    return;
  }
  r.paragraphe(
    "Voici ce qui reste à compléter pour présenter ton projet au jury le 14 novembre. Tu peux le faire dans l'app, même sans réseau, puis refaire ce PDF.",
    { taille: 11.5, avant: 1, apres: 6 }
  );
  const hl = 11;
  for (const e of reste) {
    r.place(hl);
    const y = r.y + 6.5;
    const label = lignesCoupees(r, `${e.n}. ${e.label}`, UTILE - 60, 11, 1, 'bold')[0] ?? '';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...ENCRE);
    doc.text(label, MARGE, y);
    // Small progress bar, then the percentage right aligned.
    const xb = LARGEUR - MARGE - 52;
    doc.setFillColor(...FILET);
    doc.roundedRect(xb, y - 3, 34, 3.2, 1.6, 1.6, 'F');
    if (e.pct > 0) {
      doc.setFillColor(...TURQUOISE);
      doc.roundedRect(xb, y - 3, Math.max(3.2, (34 * e.pct) / 100), 3.2, 1.6, 1.6, 'F');
    }
    doc.setTextColor(...(e.pct > 0 ? TURQUOISE : DOUX));
    doc.text(`${e.pct} %`, LARGEUR - MARGE, y, { align: 'right' });
    doc.setDrawColor(...FILET);
    doc.setLineWidth(0.25);
    doc.line(MARGE, r.y + hl, LARGEUR - MARGE, r.y + hl);
    r.y += hl;
  }
}

export interface OptionsPdf {
  /** Telephone and e-mail on the cover, only when the participant ticked "Ajouter mes coordonnées". */
  coordonnees: boolean;
  maintenant?: Date;
}

/** Builds the PDF; returns the file ready to share or download. */
export async function creerPdf(plan: Plan, opts: OptionsPdf): Promise<File> {
  const JsPDF = (await import('jspdf')).default;
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  const nom = plan.identite.nomProjet.trim() || 'Projet sans nom';
  const date = dateMadagascar(opts.maintenant);
  doc.setProperties({ title: textePdf(`Mon business plan : ${nom}`), subject: 'NEC 2026, Nosy Be', creator: 'Mon business plan, 1saKELY' });
  const r = new Redaction(doc);

  // NEC-CC-19 cover: NEC logo top left, B-lossom Center (colour) top right, then the project.
  const [nec, blossom] = await Promise.all([imageDataUrl('/plan/logos/nec-logo-v1.png'), imageDataUrl('/plan/logos/blossom-couleur-v1.png')]);
  const hLogo = 22;
  if (nec) doc.addImage(nec, 'PNG', MARGE, MARGE, (hLogo * 195) / 120, hLogo);
  if (blossom) doc.addImage(blossom, 'PNG', LARGEUR - MARGE - (hLogo * 126) / 120, MARGE, (hLogo * 126) / 120, hLogo);
  couverture(r, plan, opts, nom, date.fr);

  resume(r, plan);

  for (const s of sectionsPdf(plan)) {
    r.titreSection(s.titre);
    for (const b of s.blocs) r.bloc(b);
  }

  planContinue(r, plan);

  // Page numbers (and the project name) on every page but the cover.
  // Same cast as the PDF of PUDi and Validation (the host's jspdf typing lacks this method).
  const total = (doc as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DOUX);
    doc.text(textePdf(`Mon business plan : ${nom}`), MARGE, HAUTEUR - 9);
    doc.text(`Page ${p} sur ${total}`, LARGEUR - MARGE, HAUTEUR - 9, { align: 'right' });
  }

  const blob = doc.output('blob');
  return new File([blob], nomPdf(plan, opts.maintenant), { type: 'application/pdf' });
}
