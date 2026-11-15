/**
 * ELEC-CC-04 (phase 2b) : montant en lettres, format des nombres du PDF, regroupement sans
 * abonnement, cours BCM, PDF de facture (une page) et PDF du cycle.
 * Banc visuel : `ELEC_PDF_OUT=<dossier>` écrit les PDF produits pour les regarder.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { montantEnLettres, nombreEnLettres } from '../utils/montantLettres';
import {
  cleRegroupement,
  contreValeurEur,
  etatCoursBcm,
  identiteIncomplete,
  messageCoursAncien,
  preparerFacturesCycle,
  totauxFacture,
} from '../utils/elecFacture';
import {
  buildElecCyclePdf,
  buildElecFacturePdf,
  dateLongue,
  libelleLot,
  nomFichierFacture,
  nombrePdf,
  recapCycle,
  textePdf,
} from '../utils/elecFacturePdf';
import type {
  ElecClientLocal,
  ElecCompteurLocal,
  ElecFactureLigneLocal,
  ElecFactureLocal,
  ElecReglagesLocal,
  ElecReleveLocal,
} from '../types/gestionEau';

// ───────────────────────────── 3.1 Montant en lettres ─────────────────────────────
describe('nombreEnLettres (orthographe traditionnelle, cahier 6.1)', () => {
  const cas: Array<[number, string]> = [
    [0, 'zéro'],
    [1, 'un'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [200, 'deux cents'],
    [1200, 'mille deux cents'],
    [180000, 'cent quatre-vingt mille'],
    [200000, 'deux cent mille'],
    [280000, 'deux cent quatre-vingt mille'],
    [240269, 'deux cent quarante mille deux cent soixante-neuf'],
    [1000000, 'un million'],
    [2000000, 'deux millions'],
    [1314000, 'un million trois cent quatorze mille'],
    [3533318, 'trois millions cinq cent trente-trois mille trois cent dix-huit'],
    [80000000, 'quatre-vingts millions'],
  ];
  it.each(cas)('%d → « %s »', (n, attendu) => {
    expect(nombreEnLettres(n)).toBe(attendu);
  });

  it('facture d’eau : format capitalisé + « Ariary » inchangé, orthographe corrigée', () => {
    expect(montantEnLettres(0)).toBe('Zéro Ariary');
    expect(montantEnLettres(145500)).toBe('Cent quarante-cinq mille cinq cents Ariary');
    expect(montantEnLettres(575054.7)).toBe('Cinq cent soixante-quinze mille cinquante-cinq Ariary');
    expect(montantEnLettres(280000)).toBe('Deux cent quatre-vingt mille Ariary');
    expect(montantEnLettres(180000)).toBe('Cent quatre-vingt mille Ariary');
    expect(montantEnLettres(1000000)).toBe('Un million Ariary');
  });
});

// ───────────────────────────── Format PDF ─────────────────────────────
describe('nombrePdf (espace normale, virgule)', () => {
  it('milliers séparés par une espace U+0020, jamais U+202F ni U+00A0', () => {
    const v = nombrePdf(1314000, 0);
    expect(v).toBe('1 314 000');
    expect(v).not.toMatch(/[  ]/);
    expect(nombrePdf(5000, 2)).toBe('5 000,00');
    expect(nombrePdf(262.8, 2)).toBe('262,80');
    expect(nombrePdf(1000, 2)).toBe('1 000,00');
    expect(nombrePdf(77.123, 3)).toBe('77,123');
    expect(nombrePdf(240268.5, 0)).toBe('240 269');
    expect(nombrePdf(1.005, 2)).toBe('1,01');
    expect(nombrePdf(0, 0)).toBe('0');
    expect(nombrePdf(null)).toBe('');
  });
  it('toLocaleString fr-FR produit bien des espaces que Helvetica ne dessine pas (raison du formateur)', () => {
    expect((1314000).toLocaleString('fr-FR')).toMatch(/[  ]/);
  });
  it('textePdf retire tirets longs, point médian et espaces spéciales', () => {
    expect(textePdf('a—b–c·d e f')).toBe('a,b,c,d e f');
  });
  it('dates en toutes lettres', () => {
    expect(dateLongue('2026-10-01')).toBe('01 octobre 2026');
    expect(dateLongue('2026-08-31')).toBe('31 août 2026');
  });
  it('lot d’une facture groupée : plages resserrées', () => {
    const codes = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'PISC'];
    expect(libelleLot(null, codes)).toBe('Lots L1 à L11, PISC');
    expect(libelleLot('V4', ['V4'])).toBe('Lot V4');
    expect(libelleLot(null, ['A1', 'A2'])).toBe('Lots A1, A2');
  });
  it('nom de fichier', () => {
    expect(nomFichierFacture({ numero: 'FAC-2026-10-050', cycle: '2026-10' }, 'A')).toBe('FAC-2026-10-050_A.pdf');
    expect(nomFichierFacture({ numero: null, cycle: '2026-10' }, 'A')).toBe('BROUILLON_2026-10_A.pdf');
  });
});

// ───────────────────────────── 3.2 BCM ─────────────────────────────
describe('cours BCM', () => {
  it('contre-valeur : 1 314 000 Ar à 5 000,00 = 262,80 €', () => {
    expect(contreValeurEur(1314000, 5000)).toBe(262.8);
    expect(contreValeurEur(107400, 4000)).toBe(26.85);
    expect(contreValeurEur(1, 3)).toBe(0.33);
    expect(contreValeurEur(5, 1000)).toBe(0.01); // 0,005 monte
    expect(contreValeurEur(100, null)).toBeNull();
  });
  it('cours manquant, futur, récent, ancien (> 4 jours = confirmation)', () => {
    expect(etatCoursBcm({ cours_bcm: null, date_cours_bcm: null }, '2026-11-15').manquant).toBe(true);
    expect(etatCoursBcm({ cours_bcm: 5000, date_cours_bcm: '2026-11-16' }, '2026-11-15').manquant).toBe(true);
    expect(etatCoursBcm({ cours_bcm: 5000, date_cours_bcm: '2026-11-11' }, '2026-11-15')).toEqual({ manquant: false, age: 4, ancien: false });
    expect(etatCoursBcm({ cours_bcm: 5000, date_cours_bcm: '2026-11-10' }, '2026-11-15')).toEqual({ manquant: false, age: 5, ancien: true });
    expect(messageCoursAncien('2026-11-10', 5)).toBe('Cours BCM du 10/11/2026 utilisé (il y a 5 jours). Confirmer ?');
  });
  it('identité obligatoire en mode officiel seulement', () => {
    const vide = { mode_essai: false, raison_sociale: 'RTB', nif: '1', stat: '', iban: 'X', banque: 'B' };
    expect(identiteIncomplete(vide)).toBe(true);
    expect(identiteIncomplete({ ...vide, stat: '2' })).toBe(false);
    expect(identiteIncomplete({ ...vide, mode_essai: true })).toBe(false);
  });
});

// ───────────────────────────── 3.3 Sans abonnement ─────────────────────────────
const client = (id: string, over: Partial<ElecClientLocal> = {}): ElecClientLocal => ({
  id, code: id.toUpperCase(), nom: `Client ${id}`, raison_sociale: null, adresse: null, nif: null, stat: null,
  email: null, telephone: null, facture_groupee: false, hors_domaine: false, statut: 'actif', user_id: null,
  notes_internes: null, created_at: null, updated_at: null, ...over,
});
const compteur = (id: string, clientId: string, bien: string, over: Partial<ElecCompteurLocal> = {}): ElecCompteurLocal => ({
  id, code: id.toUpperCase(), bien, client_id: clientId, decimales: 2, statut: 'actif', remplace_compteur_id: null,
  date_mise_en_service: null, date_arret: null, index_reprise: 0, date_index_reprise: '2026-09-30', ordre: null,
  note: null, created_at: null, updated_at: null, ...over,
});
let nr = 0;
const releve = (compteurId: string, iso: string, index: number): ElecReleveLocal => ({
  id: `r${++nr}`, compteur_id: compteurId, index, rupture_index: false, aberrant_confirme: false, timestamp: iso,
  agent_id: null, note: null, photo_url: null, origine: 'terrain', created_at: null,
});
const FIN_OCT = '2026-10-31T07:00:00+03:00';
const REG = { tarif_kwh: 895, forfait_ht: 200000, tva_pct: 20, mode_essai: true };

describe('facture sans abonnement (cahier 5.4)', () => {
  it('100 kWh sans abonnement : HT 89 500, TVA 17 900, TTC 107 400', () => {
    const t = totauxFacture([100], 895, 0, 20);
    expect([t.montantHt, t.montantTva, t.montantTtc]).toEqual([89500, 17900, 107400]);
  });
  it('clé : un compteur sans abonnement a toujours sa propre facture', () => {
    const a = client('a', { facture_groupee: true });
    expect(cleRegroupement(a, 'L1', compteur('l1', 'a', 'L1'))).toBe('a');
    expect(cleRegroupement(a, 'POMPE', compteur('p', 'a', 'POMPE', { sans_abonnement: true }))).toBe('a|sa|p');
  });
  it('client groupé 3 compteurs (401 637) + pompe sans abonnement = 2 factures, un seul forfait', () => {
    const a = client('a', { facture_groupee: true });
    const cs = [
      compteur('l1', 'a', 'L1', { ordre: 1 }),
      compteur('l2', 'a', 'L2', { ordre: 2 }),
      compteur('l3', 'a', 'L3', { ordre: 3 }),
      compteur('p', 'a', 'POMPE', { ordre: 4, sans_abonnement: true }),
    ];
    const rel = new Map<string, ElecReleveLocal[]>([
      ['l1', [releve('l1', FIN_OCT, 100)]],
      ['l2', [releve('l2', FIN_OCT, 50.5)]],
      ['l3', [releve('l3', FIN_OCT, 0)]],
      ['p', [releve('p', FIN_OCT, 100)]],
    ]);
    const prep = preparerFacturesCycle('2026-10', [a], cs, rel, [], REG);
    expect(prep.factures).toHaveLength(2);
    const groupee = prep.factures.find((f) => f.cle === 'a')!;
    const pompe = prep.factures.find((f) => f.cle === 'a|sa|p')!;
    expect(groupee.avecAbonnement).toBe(true);
    expect(groupee.lignes.map((l) => l.compteur.id)).toEqual(['l1', 'l2', 'l3']);
    expect(groupee.totaux.montantTtc).toBe(401637);
    expect(pompe.avecAbonnement).toBe(false);
    expect(pompe.bien).toBe('POMPE');
    expect(pompe.totaux.montantTtc).toBe(107400);
  });
});

// ───────────────────────────── PDF ─────────────────────────────
const OUT = process.env.ELEC_PDF_OUT;
const LOGO = join(process.cwd(), 'public', 'rtb', 'logo-rtb-monochrome-vert.png');
const logo = existsSync(LOGO) ? { dataUrl: `data:image/png;base64,${readFileSync(LOGO).toString('base64')}` } : null;

const EMETTEUR = {
  raison_sociale: 'RTB ENERGIES', forme_juridique: 'SARL', siege: 'Bâtiment Itampolo Ambonara, 207 Nosy-Be, Madagascar',
  nif: '2019240033', stat: '42201712025010438', rcs: 'NB2025B061', telephone: '+261 32 00 000 00', email: 'rtbenergies@gmail.com',
  banque: 'MCB The Mauritius Commercial Bank Madagascar', titulaire_compte: 'RTB ENERGIES SARL', iban: 'MG46 0000 6000 1000 0015 4629 538',
  bic: 'MCBLMGMG', site: 'Domaine Itampolo, Befefiky, Nosy-Be (207), Madagascar', puissance_kwc: 600, contrat_ref: 'PPA', devise: 'MGA', echeance_jours: 15,
};

function factureEmise(over: Partial<ElecFactureLocal>): ElecFactureLocal {
  return {
    id: 'f1', client_id: 'a', bien: null, cycle: '2026-10', statut: 'emise', essai: true, numero: 'FAC-2026-10-050',
    numero_seq: 50, periode_debut: '2026-10-01', periode_fin: '2026-10-31', date_emission: '2026-11-15', date_echeance: '2026-11-30',
    tarif_kwh: 895, forfait_ht: 200000, tva_pct: 20, avec_abonnement: true, cours_bcm: 5000, date_cours_bcm: '2026-11-14',
    contre_valeur_eur: null, total_kwh: null, montant_energie: null, montant_ht: null, montant_tva: null, montant_ttc: null,
    client_snapshot: { code: 'TEST-A', nom: 'Test Lodges Prestige', raison_sociale: 'TEST SA', adresse: 'Domaine Itampolo', nif: '111', stat: '222', contrat_signe: true },
    emetteur_snapshot: EMETTEUR, validation_date_limite: null, date_envoi: null, en_attente_releve: false, motif_attente: null,
    note_interne: null, cle_regroupement: 'a', created_at: null, updated_at: null, ...over,
  };
}

/** Facture + lignes avec les totaux calculés comme la base. */
function avecTotaux(f: ElecFactureLocal, kwhs: Array<[string, number, number]>): { facture: ElecFactureLocal; lignes: ElecFactureLigneLocal[] } {
  const t = totauxFacture(kwhs.map(([, a, b]) => b - a), f.tarif_kwh!, f.forfait_ht!, f.tva_pct!);
  const lignes = kwhs.map(([code, a, b], i) => ({
    id: `${f.id}:${code}`, facture_id: f.id, compteur_id: `c-${code}`, code_compteur: code, index_debut: a, date_index_debut: null,
    index_fin: b, date_index_fin: null, releve_fin_id: null, kwh: Math.round((b - a) * 1000) / 1000, montant: t.montantsLignes[i],
    ordre: i, created_at: null, updated_at: null,
  }));
  return {
    facture: {
      ...f, total_kwh: t.totalKwh, montant_energie: t.montantEnergie, montant_ht: t.montantHt, montant_tva: t.montantTva,
      montant_ttc: t.montantTtc, contre_valeur_eur: contreValeurEur(t.montantTtc, f.cours_bcm),
    },
    lignes,
  };
}

const DOUZE: Array<[string, number, number]> = [
  ...Array.from({ length: 11 }, (_, i) => [`L${i + 1}`, 12000.25 + i * 1000, 12230.5 + i * 1037.77] as [string, number, number]),
  ['PISC', 4521, 4789],
];

/** Nombre de pages (méthode de jsPDF absente du vieux paquet de types @types/jspdf). */
function nbPages(doc: unknown): number {
  return (doc as { getNumberOfPages: () => number }).getNumberOfPages();
}

function texteDuPdf(doc: { output: (t: 'arraybuffer') => ArrayBuffer }): string {
  return Buffer.from(doc.output('arraybuffer')).toString('latin1');
}

function ecrire(nom: string, doc: { output: (t: 'arraybuffer') => ArrayBuffer }) {
  if (!OUT) return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, nom), Buffer.from(doc.output('arraybuffer')));
}

describe('PDF de facture', () => {
  it('facture groupée 12 lignes, essai : une seule page, contenu obligatoire', async () => {
    const { facture, lignes } = avecTotaux(factureEmise({}), DOUZE);
    const doc = await buildElecFacturePdf(facture, lignes, { logo, decimales: new Map([['c-PISC', 0]]), compresser: false });
    expect(nbPages(doc)).toBe(1);
    ecrire('essai-12-lignes.pdf', doc);
    const brut = texteDuPdf(doc);
    expect(brut).toContain('ESSAI, SANS VALEUR');
    expect(brut).toContain('FAC-2026-10-050');
    expect(brut).toContain('Abonnement contrat');
    expect(brut).toContain("Contrat de vente d'");
  });

  it('1 000 kWh : 1 314 000 MGA, 262,80 €, montant en lettres', async () => {
    const { facture, lignes } = avecTotaux(factureEmise({ essai: false, bien: 'L1' }), [['L1', 1000, 2000]]);
    expect(facture.montant_ttc).toBe(1314000);
    expect(facture.contre_valeur_eur).toBe(262.8);
    const doc = await buildElecFacturePdf(facture, lignes, { logo, compresser: false });
    ecrire('officielle-1000kwh.pdf', doc);
    const brut = texteDuPdf(doc);
    expect(brut).toContain('1 314 000 MGA');
    expect(brut).toContain('262,80');
    expect(brut).toContain('un million trois cent quatorze mille Ariary TTC.');
    expect(brut).not.toContain('ESSAI, SANS VALEUR');
  });

  it('sans abonnement : aucune ligne d’abonnement ; contrat absent sans signature', async () => {
    const f = factureEmise({
      bien: 'POMPE', avec_abonnement: false, forfait_ht: 0,
      client_snapshot: { code: 'TEST-A', nom: 'Test', contrat_signe: false },
    });
    const { facture, lignes } = avecTotaux(f, [['POMPE', 0, 100]]);
    expect(facture.montant_ttc).toBe(107400);
    const doc = await buildElecFacturePdf(facture, lignes, { logo: null, compresser: false });
    ecrire('sans-abonnement.pdf', doc);
    const brut = texteDuPdf(doc);
    expect(brut).not.toContain('Abonnement contrat');
    expect(brut).not.toContain("Contrat de vente d'");
  });

  it('brouillon : filigrane BROUILLON, aucun numéro', async () => {
    const f = factureEmise({ numero: null, numero_seq: null, statut: 'brouillon', essai: false, date_emission: null, date_echeance: null, client_snapshot: null, emetteur_snapshot: null, cours_bcm: null, date_cours_bcm: null });
    const { facture, lignes } = avecTotaux(f, [['L1', 0, 250]]);
    const doc = await buildElecFacturePdf(facture, lignes, {
      compresser: false,
      logo,
      apercu: { client: client('a', { nom: 'Client aperçu' }), reglages: { ...(EMETTEUR as unknown as ElecReglagesLocal), cours_bcm: 5000, date_cours_bcm: '2026-11-14' } },
    });
    ecrire('brouillon.pdf', doc);
    const brut = texteDuPdf(doc);
    expect(brut).toContain('BROUILLON');
    expect(brut).not.toContain('FAC-2026');
  });
});

describe('PDF du cycle', () => {
  it('récapitulatif = somme des factures, puis une page par facture', async () => {
    const a = avecTotaux(factureEmise({ id: 'f1' }), DOUZE);
    const b = avecTotaux(factureEmise({ id: 'f2', numero: 'FAC-2026-10-051', numero_seq: 51, bien: 'POMPE', avec_abonnement: false, forfait_ht: 0 }), [['POMPE', 0, 100]]);
    const c = avecTotaux(factureEmise({ id: 'f3', numero: 'FAC-2026-10-052', numero_seq: 52, bien: 'V4', client_snapshot: { code: 'TEST-B', nom: 'Villa 4' } }), [['V4', 10, 460]]);
    const r = recapCycle([a, b, c]);
    expect(r.totalTtc).toBe(a.facture.montant_ttc! + b.facture.montant_ttc! + c.facture.montant_ttc!);
    expect(r.totalEur).toBeCloseTo((a.facture.contre_valeur_eur! * 100 + b.facture.contre_valeur_eur! * 100 + c.facture.contre_valeur_eur! * 100) / 100, 2);
    const doc = await buildElecCyclePdf({ cycle: '2026-10', factures: [a, b, c], logo });
    expect(nbPages(doc)).toBe(4);
    ecrire('cycle-3-factures.pdf', doc);
  });

  it('récapitulatif long : en-tête répété, page suivante', async () => {
    const list = Array.from({ length: 45 }, (_, i) =>
      avecTotaux(factureEmise({ id: `g${i}`, numero: `FAC-2026-10-${String(100 + i)}`, numero_seq: 100 + i, bien: `V${i}` }), [[`V${i}`, 0, 100 + i]])
    );
    const doc = await buildElecCyclePdf({ cycle: '2026-10', factures: list, logo: null });
    expect(nbPages(doc)).toBe(2 + 45);
    ecrire('cycle-45-factures.pdf', doc);
  });
});
