// PDF synthesis, generated in the browser with jsPDF (dynamic import: own chunk, never in the
// home bundle). A4 portrait, built-in Helvetica, colours of the PIC charter. Lays out the data
// prepared by utils/synthese.ts (pure, unit tested).
import type jsPDFType from 'jspdf';
import { COULEURS_SECTEURS } from '../data';
import { MENTION_PROVISOIRE, NON_PUBLIEE, type LigneClassement, type Synthese } from '../utils/synthese';

type Doc = jsPDFType;
type Rgb = [number, number, number];

const MARINE: Rgb = [11, 42, 140];
const TEXTE: Rgb = [47, 53, 71];
const GRIS: Rgb = [93, 100, 117];
const FILET: Rgb = [228, 224, 216];
const VIDE: Rgb = [239, 235, 228];
const ALERTE: Rgb = [156, 63, 33];
const L = 210;
const H = 297;
const M = 15;
const BAS = H - 24; // content stops above the footer
const UTILE = L - 2 * M;

/** Built-in Helvetica only knows Latin-1: typographic signs outside it are replaced. */
export function pourPdf(t: string): string {
  return t
    .replace(/[\u2018\u2019ʼ]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[\u202F\u2009\u2007]/g, ' ')
    .replace(/[^\u0000-ÿ]/g, '');
}

const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

class Mise {
  y = M;
  doc: Doc;
  private provisoire: boolean;
  constructor(doc: Doc, provisoire: boolean) {
    this.doc = doc;
    this.provisoire = provisoire;
  }

  couleur(c: Rgb) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }

  police(taille: number, gras = false, c: Rgb = TEXTE) {
    this.doc.setFont('helvetica', gras ? 'bold' : 'normal');
    this.doc.setFontSize(taille);
    this.couleur(c);
  }

  bande() {
    const pas = L / COULEURS_SECTEURS.length;
    COULEURS_SECTEURS.forEach((c, i) => {
      const [r, g, b] = rgb(c);
      this.doc.setFillColor(r, g, b);
      this.doc.rect(i * pas, 0, pas + 0.2, 3, 'F');
    });
    if (this.provisoire) {
      this.police(8, true, ALERTE);
      this.doc.text(pourPdf(MENTION_PROVISOIRE), L - M, 8, { align: 'right' });
    }
  }

  nouvellePage() {
    this.doc.addPage();
    this.bande();
    this.y = M;
  }

  place(h: number) {
    if (this.y + h > BAS) this.nouvellePage();
  }

  paragraphe(t: string, taille = 10, gras = false, c: Rgb = TEXTE, largeur = UTILE, x = M) {
    this.police(taille, gras, c);
    const lignes = this.doc.splitTextToSize(pourPdf(t), largeur) as string[];
    const hl = taille * 0.42;
    for (const l of lignes) {
      this.place(hl);
      this.doc.text(l, x, this.y + hl * 0.8);
      this.y += hl;
    }
  }

  titre(t: string) {
    this.place(16);
    this.y += 4;
    this.paragraphe(t, 13, true, MARINE);
    this.doc.setDrawColor(MARINE[0], MARINE[1], MARINE[2]);
    this.doc.setLineWidth(0.4);
    this.doc.line(M, this.y + 1, M + 30, this.y + 1);
    this.y += 4;
  }

  /** Table with wrapped cells; the header is repeated on each new page. */
  tableau(colonnes: { titre: string; l: number; droite?: boolean }[], lignes: string[][]) {
    const taille = 8.5;
    const hl = taille * 0.42;
    const entete = () => {
      this.place(8);
      this.doc.setFillColor(MARINE[0], MARINE[1], MARINE[2]);
      this.doc.rect(M, this.y, UTILE, 6.5, 'F');
      this.police(taille, true, [255, 255, 255]);
      let x = M;
      for (const c of colonnes) {
        this.doc.text(pourPdf(c.titre), c.droite ? x + c.l - 1.5 : x + 1.5, this.y + 4.4, c.droite ? { align: 'right' } : undefined);
        x += c.l;
      }
      this.y += 6.5;
    };
    entete();
    lignes.forEach((ligne, i) => {
      this.police(taille);
      const cellules = ligne.map((v, j) => this.doc.splitTextToSize(pourPdf(v), colonnes[j].l - 3) as string[]);
      const h = Math.max(...cellules.map((c) => c.length)) * hl + 2.4;
      if (this.y + h > BAS) {
        this.nouvellePage();
        entete();
        this.police(taille);
      }
      if (i % 2 === 1) {
        this.doc.setFillColor(VIDE[0], VIDE[1], VIDE[2]);
        this.doc.rect(M, this.y, UTILE, h, 'F');
      }
      let x = M;
      cellules.forEach((c, j) => {
        const col = colonnes[j];
        c.forEach((t, k) => {
          this.doc.text(t, col.droite ? x + col.l - 1.5 : x + 1.5, this.y + 1.2 + hl * (k + 0.8), col.droite ? { align: 'right' } : undefined);
        });
        x += col.l;
      });
      this.y += h;
    });
    this.doc.setDrawColor(FILET[0], FILET[1], FILET[2]);
    this.doc.setLineWidth(0.2);
    this.doc.line(M, this.y, M + UTILE, this.y);
    this.y += 3;
  }
}

function classement(m: Mise, lignes: LigneClassement[], urgent: boolean) {
  if (urgent)
    m.tableau(
      [
        { titre: 'Rang', l: 11, droite: true },
        { titre: 'Id', l: 10 },
        { titre: 'Programme', l: 74 },
        { titre: 'Tranche PUDi', l: 23 },
        { titre: 'Votes', l: 13, droite: true },
        { titre: 'Part', l: 17, droite: true },
        { titre: 'Écart avec le PUDi', l: 32 }
      ],
      lignes.map((l) => [String(l.rang), l.id, l.nom, l.tranche ?? '', String(l.n), l.pct, l.ecart ? 'oui, avancé' : ''])
    );
  else
    m.tableau(
      [
        { titre: 'Rang', l: 11, droite: true },
        { titre: 'Id', l: 10 },
        { titre: 'Programme', l: 86 },
        { titre: 'Secteur', l: 43 },
        { titre: 'Votes', l: 13, droite: true },
        { titre: 'Part', l: 17, droite: true }
      ],
      lignes.map((l) => [String(l.rang), l.id, l.nom, l.secteur, String(l.n), l.pct])
    );
}

/** Builds the PDF and returns it as bytes (the caller saves it). */
export async function genererPdf(s: Synthese): Promise<ArrayBuffer> {
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setProperties({ title: pourPdf(s.titre), subject: 'Synthèse de la consultation', creator: 'PUDi Nosy Be, 1sakely.org' });
  const m = new Mise(doc, s.provisoire);
  m.bande();

  m.y = 14;
  m.paragraphe(s.titre, 18, true, MARINE);
  m.y += 2;
  if (s.provisoire) {
    m.place(12);
    doc.setFillColor(255, 246, 224);
    doc.setDrawColor(146, 100, 7);
    doc.setLineWidth(0.5);
    doc.roundedRect(M, m.y, UTILE, 10, 2, 2, 'FD');
    m.police(12, true, ALERTE);
    doc.text(pourPdf(MENTION_PROVISOIRE), L / 2, m.y + 6.6, { align: 'center' });
    m.y += 14;
  }
  m.paragraphe(`Document généré le ${s.genereLe} (heure de Madagascar).`, 9.5, false, GRIS);
  m.y += 3;

  // Key figures
  const chiffres: [string, string][] = [
    ['Votants', String(s.nbVotants)],
    ['Dans nos réseaux', `${s.reseaux.dans} (${s.reseaux.pctDans})`],
    ['Hors réseaux', `${s.reseaux.hors} (${s.reseaux.pctHors})`]
  ];
  const lc = UTILE / chiffres.length;
  m.place(18);
  chiffres.forEach(([lib, val], i) => {
    const x = M + i * lc;
    doc.setFillColor(VIDE[0], VIDE[1], VIDE[2]);
    doc.roundedRect(x + 1, m.y, lc - 2, 16, 2, 2, 'F');
    m.police(14, true, MARINE);
    doc.text(pourPdf(val), x + lc / 2, m.y + 7.5, { align: 'center' });
    m.police(8.5, false, GRIS);
    doc.text(pourPdf(lib), x + lc / 2, m.y + 12.5, { align: 'center' });
  });
  m.y += 20;
  m.paragraphe(
    s.ouverture === NON_PUBLIEE
      ? `Ouverture de la consultation : ${NON_PUBLIEE}.`
      : `Ouverture de la consultation : ${s.ouverture} (heure de Madagascar).`,
    10
  );
  m.paragraphe(`Clôture de la consultation : ${s.cloture}.`, 10);
  m.paragraphe(
    'Part « dans nos réseaux » : votes dont le numéro figure, sous forme codée, dans au moins une liste de contacts fournie par les partenaires.',
    9,
    false,
    GRIS
  );

  m.titre('Classement des priorités absolues');
  m.paragraphe('Part des votants qui ont placé le programme parmi leurs 3 priorités absolues (52 programmes).', 9, false, GRIS);
  m.y += 1;
  classement(m, s.priorites, false);

  m.titre('Classement « Urgent 2026-2030 »');
  m.paragraphe(
    'Part des votants qui veulent le programme dès la tranche 2026-2030. « Écart avec le PUDi » : programme que le PUDi place plus tard et que des votants veulent avancer.',
    9,
    false,
    GRIS
  );
  m.y += 1;
  classement(m, s.urgents, true);

  m.titre('Propositions hors liste du PUDi');
  m.paragraphe(
    'Projets demandés par les parties prenantes et absents de la liste retenue dans le PUDi, comptés à part : ils ne figurent pas dans les deux classements des 52 programmes.',
    9,
    false,
    GRIS
  );
  m.y += 1;
  if (!s.propositions.length) m.paragraphe('Aucune proposition.', 10, false, GRIS);
  else {
    m.tableau(
      [
        { titre: 'Rang', l: 11, droite: true },
        { titre: 'Id', l: 9 },
        { titre: 'Proposition', l: 52 },
        { titre: 'Source', l: 40 },
        { titre: 'Ajoutée le', l: 22 },
        { titre: 'Priorité', l: 23, droite: true },
        { titre: 'Urgent', l: 23, droite: true }
      ],
      s.propositions.map((l) => [
        String(l.rang),
        l.id,
        l.intitule,
        l.source,
        l.ajoutee,
        `${l.nPriorite} (${l.pctPriorite})`,
        `${l.nUrgent} (${l.pctUrgent})`
      ])
    );
    const notes = s.propositions.filter((l) => l.note);
    notes.forEach((l) => {
      m.paragraphe(`${l.id} : ${l.note}.`, 9, false, GRIS, UTILE - 4, M + 2);
    });
  }

  m.titre('Répartition par profil');
  m.tableau(
    [
      { titre: 'Profil', l: 120 },
      { titre: 'Votes', l: 30, droite: true },
      { titre: 'Part', l: 30, droite: true }
    ],
    s.profils.map((p) => [p.libelle, String(p.n), p.pct])
  );

  m.titre('Répartition par fokontany');
  m.tableau(
    [
      { titre: 'Fokontany', l: 120 },
      { titre: 'Votes', l: 30, droite: true },
      { titre: 'Part', l: 30, droite: true }
    ],
    s.fokontany.length ? s.fokontany.map((p) => [p.libelle, String(p.n), p.pct]) : [['Aucun vote compté', '0', '0 %']]
  );

  m.titre('Projets manquants proposés');
  if (!s.manquants.length) m.paragraphe('Aucune proposition.', 10, false, GRIS);
  s.manquants.forEach((t, i) => {
    m.paragraphe(`${i + 1}. ${t}`, 9.5, false, TEXTE, UTILE - 4, M + 2);
    m.y += 1;
  });

  m.titre('Méthode et limites');
  s.methode.forEach((t) => {
    m.paragraphe(`- ${t}`, 9.5, false, TEXTE, UTILE - 4, M + 2);
    m.y += 1;
  });

  // Footer mention and page numbers on every page
  const n = (doc as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setDrawColor(FILET[0], FILET[1], FILET[2]);
    doc.setLineWidth(0.2);
    doc.line(M, H - 20, L - M, H - 20);
    m.police(7.5, false, GRIS);
    const pied = doc.splitTextToSize(pourPdf(s.pied), UTILE - 22) as string[];
    pied.forEach((l, i) => doc.text(l, M, H - 16 + i * 3.3));
    m.police(8, true, MARINE);
    doc.text(`Page ${p} / ${n}`, L - M, H - 16, { align: 'right' });
  }
  return doc.output('arraybuffer');
}
