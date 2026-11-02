// Reading of the import text written by the project assistant (VC-23, screen 13). Pure function:
// it never throws, returns the JSON expected by vc_admin_brouillon_enregistrer and one problem
// « Ligne <n> : ... » for everything it did not understand. Format: FORMAT_ATTENDU below.
import { verifierArbre } from './arbre';

export const TYPES_DOCUMENT = ['note_cadrage', 'cahier_charges', 'prd', 'maquette', 'recette', 'avenant'] as const;

export type NatureChoix = 'validation' | 'reserve' | 'refus' | 'choix';

export interface ChoixImport {
  lettre: 'A' | 'B' | 'C';
  nature: NatureChoix;
  libelle: string;
  ligne: string;
  avantages: string | null;
  faiblesses: string | null;
  conseille: boolean;
  suivante: string | null;
}

export interface QuestionImport {
  numero: string;
  type: 'validation' | 'choix';
  sujet_client: string;
  critere: string | null;
  texte: string;
  extrait: string | null;
  essentielle: boolean;
  obligatoire: true;
  choix: ChoixImport[];
}

export interface BrouillonImport {
  client_id: string;
  saisi_par: 'assistant' | 'joel';
  source_texte: string;
  document: { type: string; version: string; titre_client: string; contenu_md: string };
  questions: QuestionImport[];
}

export interface LectureImport {
  brouillon: BrouillonImport;
  problemes: string[];
  nbQuestions: number;
  nbChoix: number;
  /** Fewest and most questions on a path (0 when the tree is not valid). */
  cheminMin: number;
  cheminMax: number;
}

/** Text of the « Format attendu » box of screen 13 (one entry per rule). */
export const FORMAT_ATTENDU: string[] = [
  'Première ligne : CONSULTATION : <type> | <version> | <titre pour le client>, le type parmi note_cadrage, cahier_charges, prd, maquette, recette, avenant.',
  'DOCUMENT, puis le texte Markdown complet du document (200 000 caractères au plus), puis FIN DOCUMENT.',
  'QUESTION <n> [essentielle] <sujet pour le client> : n est un nombre, ou « n bis », « n ter » ; sans [essentielle], la question est une information qui ne compte pas pour la porte ; le sujet (80 caractères au plus) s’affiche en petit au-dessus de la question.',
  'Facultatif : CRITÈRE : ... (interne, jamais montré au client) et EXTRAIT : ... (montré au client).',
  'Puis une ligne : le texte de la question (300 caractères au plus).',
  'Puis exactement trois lignes CHOIX A, CHOIX B, CHOIX C : balises [validation], [réserve], [refus] (question de validation : une de chaque ; réserve et refus demandent un commentaire) ou aucune (question à choix) ; [conseillé] facultatif, un seul par question, affiché en premier.',
  'Après les balises : libellé | ligne visible | Avantages : ... | Faiblesses : ... | -> suite. Avantages et faiblesses sont facultatifs ; la suite est un numéro de question, FIN, ou absente (question suivante dans l’ordre).'
];

export const EXEMPLE_IMPORT = `CONSULTATION : note_cadrage | 1.2 | Le résumé de votre projet
DOCUMENT
# Note de cadrage
(texte Markdown complet du document)
FIN DOCUMENT
QUESTION 1 [essentielle] le problème, vu par vous
CRITÈRE : le problème, vu par l'utilisateur
EXTRAIT : Les réservations arrivent par WhatsApp, téléphone et e-mail.
Ce constat décrit-il bien votre situation actuelle ?
CHOIX A [validation] Je valide | Le constat est juste : on passe à la suite. | -> 2
CHOIX B [réserve] Je valide avec une réserve | Juste dans l'ensemble ; vous précisez un point. | -> 2
CHOIX C [refus] Je ne valide pas | Le constat ne vous ressemble pas : Joël le reprend avec vous. | -> 2`;

const RE_NUMERO = /^[0-9]{1,3}( bis| ter)?$/;

/** Accents and case removed, to read keywords and tags whatever the keyboard. */
function simple(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function numeroPropre(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

interface QuestionLue {
  q: QuestionImport;
  ligne: number;
  lignesChoix: Map<string, number>;
}

export function lireImport(texte: string, clientId = '', saisiPar: 'assistant' | 'joel' = 'assistant'): LectureImport {
  const problemes: { n: number; t: string }[] = [];
  const pb = (n: number, t: string) => problemes.push({ n, t });
  const brouillon: BrouillonImport = {
    client_id: clientId,
    saisi_par: saisiPar,
    source_texte: texte ?? '',
    document: { type: '', version: '', titre_client: '', contenu_md: '' },
    questions: []
  };
  const lignes = String(texte ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const lues: QuestionLue[] = [];
  let i = 0;
  const vide = (k: number) => k < lignes.length && !lignes[k].trim();

  try {
    while (vide(i)) i++;
    if (i >= lignes.length) {
      pb(1, 'le texte est vide.');
      return fin();
    }

    // ---- CONSULTATION : type | version | titre
    const tete = lignes[i].trim();
    const mTete = /^consultation\s*:\s*(.*)$/i.exec(tete);
    if (!mTete) {
      pb(i + 1, 'la première ligne doit être « CONSULTATION : <type> | <version> | <titre pour le client> ».');
    } else {
      const [type = '', version = '', ...reste] = mTete[1].split('|').map((s) => s.trim());
      const titre = reste.join(' | ').trim();
      const t = simple(type).replace(/\s+/g, '_');
      if (!(TYPES_DOCUMENT as readonly string[]).includes(t))
        pb(i + 1, `type de document « ${type} » inconnu (note_cadrage, cahier_charges, prd, maquette, recette ou avenant).`);
      if (!version || version.length > 12) pb(i + 1, 'la version est manquante ou trop longue (12 caractères au plus).');
      if (!titre || titre.length > 60) pb(i + 1, 'le titre pour le client est manquant ou trop long (60 caractères au plus).');
      brouillon.document.type = t;
      brouillon.document.version = version;
      brouillon.document.titre_client = titre;
      i++;
    }

    // ---- DOCUMENT ... FIN DOCUMENT
    while (vide(i)) i++;
    if (i < lignes.length && simple(lignes[i]) === 'document') {
      const debut = i;
      const corps: string[] = [];
      i++;
      while (i < lignes.length && simple(lignes[i]) !== 'fin document') corps.push(lignes[i++]);
      if (i >= lignes.length) {
        pb(debut + 1, 'le bloc DOCUMENT n’est pas fermé par une ligne « FIN DOCUMENT ».');
      } else {
        i++;
      }
      const md = corps.join('\n').replace(/^\n+|\n+$/g, '');
      if (!md.trim()) pb(debut + 1, 'le bloc DOCUMENT est vide.');
      else if (md.length > 200000) pb(debut + 1, `le document fait ${md.length} caractères (200 000 au plus).`);
      brouillon.document.contenu_md = md;
    } else {
      pb(Math.min(i, lignes.length - 1) + 1, 'bloc « DOCUMENT » … « FIN DOCUMENT » absent : le texte complet du document est attendu ici.');
    }

    // ---- Questions
    let courante: QuestionLue | null = null;
    for (; i < lignes.length; i++) {
      const brut = lignes[i];
      const l = brut.trim();
      const n = i + 1;
      if (!l) continue;
      const s = simple(l);

      const mQ = /^question\s+([0-9]{1,3}(?:\s+(?:bis|ter))?)\b\s*(.*)$/i.exec(l);
      if (mQ) {
        const numero = numeroPropre(mQ[1]);
        let reste = mQ[2].trim();
        let essentielle = false;
        const mE = /^\[([^\]]*)\]\s*/.exec(reste);
        if (mE) {
          if (simple(mE[1]) === 'essentielle' || simple(mE[1]) === 'essentiel') essentielle = true;
          else pb(n, `balise « [${mE[1]}] » inconnue après le numéro (seule [essentielle] est possible).`);
          reste = reste.slice(mE[0].length).trim();
        }
        if (!reste) pb(n, `question ${numero} : le sujet pour le client manque après le numéro.`);
        else if (reste.length > 80) pb(n, `question ${numero} : le sujet fait ${reste.length} caractères (80 au plus).`);
        courante = {
          ligne: n,
          lignesChoix: new Map(),
          q: {
            numero,
            type: 'choix',
            sujet_client: reste,
            critere: null,
            texte: '',
            extrait: null,
            essentielle,
            obligatoire: true,
            choix: []
          }
        };
        lues.push(courante);
        continue;
      }
      if (/^question\b/i.test(l)) {
        pb(n, 'numéro de question non compris (exemples : QUESTION 2, QUESTION 2 bis).');
        courante = null;
        continue;
      }
      if (!courante) {
        pb(n, 'ligne non comprise : une ligne QUESTION est attendue ici.');
        continue;
      }
      const q = courante.q;

      const mCrit = /^crit[eè]re\s*:\s*(.*)$/i.exec(l);
      if (mCrit) {
        q.critere = mCrit[1].trim() || null;
        continue;
      }
      const mExt = /^extrait\s*:\s*(.*)$/i.exec(l);
      if (mExt) {
        const e = mExt[1].trim();
        if (e.length > 1500) pb(n, `question ${q.numero} : l’extrait fait ${e.length} caractères (1500 au plus).`);
        q.extrait = e || null;
        continue;
      }

      const mC = /^choix\s+(\S+)\s*(.*)$/i.exec(l);
      if (mC) {
        if (!q.texte) pb(n, `question ${q.numero} : le texte de la question manque avant les choix.`);
        const lettre = mC[1].toUpperCase();
        if (!['A', 'B', 'C'].includes(lettre)) {
          pb(n, `question ${q.numero} : choix « ${mC[1]} » inconnu (A, B ou C).`);
          continue;
        }
        if (courante.lignesChoix.has(lettre)) {
          pb(n, `question ${q.numero} : le choix ${lettre} est écrit deux fois.`);
          continue;
        }
        let reste = mC[2].trim();
        let nature: NatureChoix = 'choix';
        let conseille = false;
        let mB: RegExpExecArray | null;
        while ((mB = /^\[([^\]]*)\]\s*/.exec(reste))) {
          const b = simple(mB[1]);
          if (b === 'validation') nature = 'validation';
          else if (b === 'reserve') nature = 'reserve';
          else if (b === 'refus') nature = 'refus';
          else if (b === 'conseille') conseille = true;
          else pb(n, `question ${q.numero}, choix ${lettre} : balise « [${mB[1]}] » inconnue ([validation], [réserve], [refus] ou [conseillé]).`);
          reste = reste.slice(mB[0].length).trim();
        }
        const parts = reste.split('|').map((p) => p.trim());
        while (parts.length > 2 && !parts[parts.length - 1]) parts.pop();
        const libelle = parts[0] ?? '';
        const ligneVisible = parts[1] ?? '';
        let avantages: string | null = null;
        let faiblesses: string | null = null;
        let suivante: string | null = null;
        for (const p of parts.slice(2)) {
          const ps = simple(p);
          if (ps.startsWith('avantages')) avantages = p.replace(/^[^:]*:\s*/, '').trim() || null;
          else if (ps.startsWith('faiblesses')) faiblesses = p.replace(/^[^:]*:\s*/, '').trim() || null;
          else if (p.startsWith('->')) {
            const v = p.slice(2).trim();
            if (!v) suivante = null;
            else if (/^fin$/i.test(v)) suivante = 'FIN';
            else if (RE_NUMERO.test(numeroPropre(v))) suivante = numeroPropre(v);
            else pb(n, `question ${q.numero}, choix ${lettre} : suite « ${v} » non comprise (un numéro de question ou FIN).`);
          } else if (p) pb(n, `question ${q.numero}, choix ${lettre} : partie « ${p} » non comprise (Avantages : ..., Faiblesses : ... ou -> suite).`);
        }
        if (!libelle || libelle.length > 80) pb(n, `question ${q.numero}, choix ${lettre} : libellé manquant ou trop long (80 caractères au plus).`);
        if (!ligneVisible || ligneVisible.length > 160)
          pb(n, `question ${q.numero}, choix ${lettre} : ligne visible manquante ou trop longue (160 caractères au plus).`);
        if (avantages && avantages.length > 400) pb(n, `question ${q.numero}, choix ${lettre} : avantages trop longs (400 caractères au plus).`);
        if (faiblesses && faiblesses.length > 400) pb(n, `question ${q.numero}, choix ${lettre} : faiblesses trop longues (400 caractères au plus).`);
        courante.lignesChoix.set(lettre, n);
        q.choix.push({ lettre: lettre as 'A' | 'B' | 'C', nature, libelle, ligne: ligneVisible, avantages, faiblesses, conseille, suivante });
        continue;
      }

      if (!q.texte && !q.choix.length) {
        if (l.length > 300) pb(n, `question ${q.numero} : le texte fait ${l.length} caractères (300 au plus).`);
        q.texte = l;
        continue;
      }
      pb(n, `question ${q.numero} : ligne non comprise (CRITÈRE, EXTRAIT ou CHOIX attendu).`);
      void s;
    }

    // ---- Checks per question
    const numeros = lues.map((x) => x.q.numero);
    const dejaVu = new Set<string>();
    for (const { q, ligne, lignesChoix } of lues) {
      if (dejaVu.has(q.numero)) pb(ligne, `deux questions portent le numéro ${q.numero}.`);
      dejaVu.add(q.numero);
      if (!q.texte) pb(ligne, `question ${q.numero} : le texte de la question manque.`);
      q.choix.sort((a, b) => a.lettre.localeCompare(b.lettre));
      if (q.choix.length !== 3)
        pb(ligne, `question ${q.numero} : ${q.choix.length} choix écrit${q.choix.length > 1 ? 's' : ''}, il en faut exactement 3 (CHOIX A, B et C).`);
      const natures = q.choix.map((c) => c.nature);
      const nbTags = natures.filter((x) => x !== 'choix').length;
      if (nbTags > 0) {
        const unDeChaque = ['validation', 'reserve', 'refus'].every((x) => natures.filter((y) => y === x).length === 1);
        if (unDeChaque && q.choix.length === 3) q.type = 'validation';
        else
          pb(ligne, `question ${q.numero} : une question de validation a exactement un choix [validation], un [réserve] et un [refus] ; sans ces balises, c’est une question à choix.`);
      }
      if (q.choix.filter((c) => c.conseille).length > 1) {
        const l2 = q.choix.filter((c) => c.conseille).map((c) => lignesChoix.get(c.lettre) ?? ligne)[1];
        pb(l2, `question ${q.numero} : deux choix [conseillé] ; un seul par question.`);
      }
      for (const c of q.choix) {
        if (c.suivante && c.suivante !== 'FIN' && !numeros.includes(c.suivante))
          pb(lignesChoix.get(c.lettre) ?? ligne, `question ${q.numero}, choix ${c.lettre} : la question « ${c.suivante} » est annoncée mais absente.`);
        if (c.suivante === q.numero) pb(lignesChoix.get(c.lettre) ?? ligne, `question ${q.numero}, choix ${c.lettre} : un choix ne peut pas renvoyer à sa propre question.`);
      }
    }
    if (!lues.length && i >= lignes.length) pb(lignes.length, 'aucune ligne QUESTION trouvée.');
    brouillon.questions = lues.map((x) => x.q);
    return fin();
  } catch {
    pb(i + 1, 'lecture interrompue sur cette ligne.');
    brouillon.questions = lues.map((x) => x.q);
    return fin();
  }

  function fin(): LectureImport {
    let cheminMin = 0;
    let cheminMax = 0;
    const qs = brouillon.questions;
    if (qs.length && !problemes.some((p) => /annoncée mais absente/.test(p.t))) {
      const v = verifierArbre(qs);
      const ligneDe = (num: string) => lues.find((x) => x.q.numero === num)?.ligne ?? 1;
      if (v.boucle) pb(lues[0]?.ligne ?? 1, 'l’arbre contient une boucle : un chemin revient sur une question déjà posée.');
      for (const num of v.inatteignables) pb(ligneDe(num), `question ${num} : aucun chemin n’y mène (question inatteignable).`);
      cheminMin = v.cheminMin;
      cheminMax = v.cheminMax;
    }
    problemes.sort((a, b) => a.n - b.n);
    return {
      brouillon,
      problemes: problemes.map((p) => `Ligne ${p.n} : ${p.t}`),
      nbQuestions: qs.length,
      nbChoix: qs.reduce((t, q) => t + q.choix.length, 0),
      cheminMin,
      cheminMax
    };
  }
}
