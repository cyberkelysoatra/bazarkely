// PDF "Mon business plan" (A4), drawn with jsPDF loaded on demand (its own chunk, precached by the
// service worker so it works in airplane mode). Helvetica (standard PDF font, nothing to embed),
// NEC violet titles, page numbers, logos NEC and B-lossom Center on the cover.
import type JsPdf from 'jspdf';
import type { Plan } from '../types';
import { NON_REMPLI, secteur, sectionsPdf, textePdf, type Bloc } from './contenu';
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

  // Cover: NEC logo top left, B-lossom Center (colour) top right.
  const [nec, blossom] = await Promise.all([imageDataUrl('/plan/logos/nec-logo-v1.png'), imageDataUrl('/plan/logos/blossom-couleur-v1.png')]);
  const hLogo = 22;
  if (nec) doc.addImage(nec, 'PNG', MARGE, MARGE, (hLogo * 195) / 120, hLogo);
  if (blossom) doc.addImage(blossom, 'PNG', LARGEUR - MARGE - (hLogo * 126) / 120, MARGE, (hLogo * 126) / 120, hLogo);
  r.y = 92;
  r.paragraphe('Mon business plan', { taille: 30, style: 'bold', couleur: VIOLET, apres: 3 });
  r.paragraphe('Organisé par B-lossom Center, Hell-Ville, Nosy Be', { taille: 11, couleur: DOUX, apres: 10 });
  doc.setFillColor(...VIOLET);
  doc.rect(MARGE, r.y, 40, 1.4, 'F');
  r.y += 8;
  r.paragraphe(nom, { taille: 22, style: 'bold', apres: 6 });
  const i = plan.identite;
  const lignesCouv: [string, string][] = [
    ['Porteur du projet', i.nomPrenom],
    ['Secteur', secteur(plan)],
    ['Lieu', i.lieu],
    ...(opts.coordonnees ? ([['Téléphone', i.telephone], ['E-mail', i.email]] as [string, string][]) : []),
    ['Date', date.fr]
  ];
  for (const [label, valeur] of lignesCouv) {
    r.paragraphe(label, { taille: 9.5, style: 'bold', couleur: TURQUOISE });
    r.paragraphe(valeur.trim() || NON_REMPLI, { taille: 12, style: valeur.trim() ? 'normal' : 'italic', couleur: valeur.trim() ? ENCRE : DOUX, apres: 3 });
  }
  r.y = HAUTEUR - 40;
  r.paragraphe('NEC 2026, Nosy Be', { taille: 14, style: 'bold', couleur: VIOLET });
  r.paragraphe('Nosy Be Entrepreneurship Camp 2026', { taille: 10.5, couleur: DOUX });

  for (const s of sectionsPdf(plan)) {
    r.titreSection(s.titre);
    for (const b of s.blocs) r.bloc(b);
  }

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
