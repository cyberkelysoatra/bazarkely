import { describe, expect, it } from 'vitest';
import donnees from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { apercuNumeros, lireCollage, lireCsvNumeros, suggererCode } from './listes';
import { ENTETE_VOTES, csvVotes, dateHeureMada, horodatage, nettoyerTexteLibre, nomFichierVotes, type VoteAdmin } from './exports';
import { csvSynthese, preparerSynthese, type ResultatsSynthese } from './synthese';
import { modulesDuCompte } from './modulesCompte';

const D = donnees as unknown as PudiDonnees;

describe('suggererCode', () => {
  it('lowercases, removes accents and turns spaces into hyphens', () => {
    expect(suggererCode('Réunion PIC3 du 20/10')).toBe('reunion-pic3-du-20-10');
    expect(suggererCode('  Groupe WhatsApp « Opérateurs nosybe » ')).toBe('groupe-whatsapp-operateu');
  });
  it('never exceeds 24 characters nor ends with a hyphen', () => {
    const c = suggererCode('Affiche de la Commune Urbaine de Nosy Be');
    expect(c.length).toBeLessThanOrEqual(24);
    expect(c.endsWith('-')).toBe(false);
    expect(/^[a-z0-9-]{1,24}$/.test(c)).toBe(true);
  });
});

describe('lireCsvNumeros', () => {
  it('reads the numero column of a header line, ignores the other columns', () => {
    expect(lireCsvNumeros('nom;numero;ville\nRakoto;034 12 345 67;Hell-Ville\nRabe;0321234567;Dzamandzar')).toEqual([
      '034 12 345 67',
      '0321234567'
    ]);
  });
  it('accepts a comma separator, quotes and an accented header', () => {
    expect(lireCsvNumeros('Numéro,remarque\n"+261 34 00 000 01","a, b"\n0340000002,x')).toEqual(['+261 34 00 000 01', '0340000002']);
  });
  it('takes the first column when there is no header', () => {
    expect(lireCsvNumeros('0340000001;Rakoto\n0340000002;Rabe')).toEqual(['0340000001', '0340000002']);
  });
  it('tolerates a BOM, Windows line ends and empty lines', () => {
    expect(lireCsvNumeros('\uFEFFnumero\r\n0340000001\r\n\r\n0340000002\r\n')).toEqual(['0340000001', '0340000002']);
  });
  it('skips a header without digits even when it is not called numero', () => {
    expect(lireCsvNumeros('telephone\n0340000001')).toEqual(['0340000001']);
  });
});

describe('lireCollage and apercuNumeros', () => {
  it('counts the invalid lines with the server rules (test list of A5)', () => {
    const l = lireCollage('0340000001\n034 00 000 01\nabc\n+261 32 00 000 02\n');
    expect(l).toHaveLength(4);
    expect(apercuNumeros(l)).toEqual({ total: 4, invalides: 1, valides: 3, distincts: 2 });
  });
  it('keeps only the first cell of a pasted Excel row', () => {
    expect(lireCollage('0340000001\tRakoto\n\n  0340000002  ')).toEqual(['0340000001', '0340000002']);
  });
});

const vote = (v: Partial<VoteAdmin>): VoteAdmin => ({
  id_anonyme: 'V-DB2845A4',
  fokontany: 'BEFITINA',
  fokontany_autre: null,
  profil: 'habitant',
  canal_code: 'wa-gihtnb',
  dans_nos_reseaux: true,
  groupes: ['pic3', 'wa-gihtnb'],
  hors_liste_du_canal: false,
  priorites: ['A1', 'T1', 'Q1'],
  urgents: ['A6', 'N2'],
  manquant: null,
  cree_le: '2026-10-21T11:05:00+00:00',
  modifie_le: '2026-10-21T12:00:00+00:00',
  nb_modifications: 1,
  masque: false,
  masque_motif: null,
  est_test: true,
  groupe_ip: 'a1b2c3',
  ...v
});

describe('csvVotes', () => {
  it('has the exact header of the specification, with a BOM and ; separators', () => {
    const csv = csvVotes([vote({})]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1).split('\r\n')[0]).toBe(
      'id_anonyme;cree_le;modifie_le;nb_modifications;fokontany;fokontany_autre;profil;canal;dans_nos_reseaux;groupes;hors_liste_du_canal;nb_voix;voix;urgents;manquant;masque;motif;test;groupe_ip'
    );
    expect(ENTETE_VOTES).toHaveLength(19);
  });
  it('writes Madagascar dates and readable booleans', () => {
    const ligne = csvVotes([vote({})]).split('\r\n')[1].split(';');
    expect(ligne[1]).toBe('2026-10-21 14:05');
    expect(ligne[8]).toBe('oui');
    // PUDI-CC-17: number of votes, then the votes grouped by programme.
    expect(ligne[11]).toBe('3');
    expect(ligne[12]).toBe('A1 ×1, T1 ×1, Q1 ×1');
    expect(ligne[17]).toBe('oui');
  });
  it('never contains an e-mail nor a number of 9 digits or more', () => {
    const csv = csvVotes([
      vote({ manquant: 'Appelez-moi au 034 12 345 67 ou rakoto@example.mg ; merci', masque_motif: 'doublon 0321234567', fokontany_autre: 'x@y.mg' })
    ]);
    expect(csv).not.toMatch(/@/);
    expect(csv).not.toMatch(/\d(?:[\s.]?\d){8,}/);
    expect(csv).toContain('[numéro masqué]');
    expect(csv).not.toMatch(/email|e_mail|telephone|phone/i);
  });
  it('quotes a cell with a separator or a quote', () => {
    expect(csvVotes([vote({ manquant: 'routes; "pistes"' })])).toContain('"routes; ""pistes"""');
  });
});

describe('dates and file names', () => {
  it('uses Madagascar time', () => {
    expect(dateHeureMada('2026-10-26T17:00:00Z')).toBe('2026-10-26 20:00');
    expect(horodatage(new Date('2026-10-21T22:30:00Z'))).toBe('20261022-0130');
    expect(nomFichierVotes(new Date('2026-10-21T11:05:00Z'))).toBe('PUDi_votes_20261021-1405.csv');
  });
  it('cleans free texts', () => {
    expect(nettoyerTexteLibre('+261 34 12 345 67')).toBe('[numéro masqué]');
    expect(nettoyerTexteLibre('2 routes et 300 m')).toBe('2 routes et 300 m');
  });
});

const res: ResultatsSynthese = {
  nb_votants: 4,
  cloture_at: '2026-10-26T17:00:00+00:00',
  calcule_at: '2026-10-21T11:00:00+00:00',
  priorites: D.programmes.map((p, i) => ({ id: p.id, n: i < 3 ? 4 - i : 0, pct: i < 3 ? (100 * (4 - i)) / 4 : 0 })),
  urgents: D.programmes.map((p, i) => ({ id: p.id, n: i === 0 ? 2 : 0, pct: i === 0 ? 50 : 0, tranche_pudi: 2, ecart: i === 0 })),
  par_profil: { habitant: 3, autre: 1 },
  par_fokontany: { BEFITINA: 3, AUTRE: 1 },
  reseaux: { dans_nos_reseaux: 1, hors_reseaux: 3 },
  manquants: ['Sécurité du littoral, appeler le 034 12 345 67']
};

describe('preparerSynthese', () => {
  const s = preparerSynthese(res, D, { provisoire: true, maintenant: new Date('2026-10-21T11:05:00Z') });
  it('ranks the 52 programmes with names and sectors', () => {
    expect(s.priorites).toHaveLength(52);
    expect(s.priorites[0]).toMatchObject({ rang: 1, id: D.programmes[0].id, nom: D.programmes[0].nom, n: 4, pct: '100 %' });
    expect(s.priorites[1].pct).toBe('75 %');
    expect(s.priorites[0].secteur).not.toBe('');
  });
  it('carries the PUDi tranche and the gap of the urgent ranking', () => {
    expect(s.urgents[0]).toMatchObject({ tranche: '2031-2035', ecart: true, pct: '50 %' });
  });
  it('computes the distributions, networks and the provisional state', () => {
    expect(s.provisoire).toBe(true);
    expect(s.profils.find((p) => p.libelle === 'Habitant')).toEqual({ libelle: 'Habitant', n: 3, pct: '75 %' });
    expect(s.fokontany[1].libelle).toBe('Autre fokontany de Nosy Be');
    expect(s.reseaux).toEqual({ dans: 1, hors: 3, pctDans: '25 %', pctHors: '75 %' });
    expect(s.genereLe).toBe('21 octobre 2026 à 14 h 05');
    expect(s.cloture).toContain('26 octobre 2026 à 20 h');
  });
  it('never carries a phone number nor an em dash', () => {
    expect(s.manquants[0]).toBe('Sécurité du littoral, appeler le [numéro masqué]');
    const tout = JSON.stringify(s) + csvSynthese(s);
    expect(tout).not.toContain('\u2014');
    expect(tout).not.toMatch(/\d(?:[\s.]?\d){8,}/);
  });
  it('exports the two rankings and the distributions as CSV', () => {
    const lignes = csvSynthese(s).slice(1).trim().split('\r\n');
    expect(lignes[0]).toBe('section;rang;id;libelle;secteur;n;part;tranche_pudi;ecart_avec_le_pudi;voix;votants;pct_voix;pct_votants;concentration');
    expect(lignes.filter((l) => l.startsWith('voix;'))).toHaveLength(52);
    expect(lignes.filter((l) => l.startsWith('urgent_2026_2030;'))).toHaveLength(52);
    expect(lignes.some((l) => l.startsWith('profil;'))).toBe(true);
  });
});

describe('modulesDuCompte', () => {
  const ids = (c: Parameters<typeof modulesDuCompte>[0]) => modulesDuCompte(c)?.map((m) => m.id) ?? null;
  it('admin: the four host modules', () => {
    expect(ids({ role: 'admin', preferences: {} })).toEqual(['bazarkely', 'construction', 'gestion-eau', 'navy-ay']);
  });
  it('NAVY ay only for a new account', () => {
    expect(ids({ role: 'user', preferences: { modules: [] } })).toEqual(['navy-ay']);
  });
  it('budget and water from preferences.modules', () => {
    expect(ids({ role: 'user', preferences: { modules: ['gestion-eau', 'bazarkely', 'pudi'] } })).toEqual(['bazarkely', 'gestion-eau', 'navy-ay']);
  });
  it('follows moduleOrder, new modules at the end', () => {
    expect(ids({ role: 'admin', preferences: { moduleOrder: ['navy-ay', 'pudi', 'gestion-eau'] } })).toEqual([
      'navy-ay',
      'gestion-eau',
      'bazarkely',
      'construction'
    ]);
  });
  it('unknown list: a missing modules key counts as empty (host rule), an unknown row is not a refusal', () => {
    expect(ids({ role: 'user', preferences: null })).toEqual(['navy-ay']);
    expect(modulesDuCompte(null)).toBeNull();
    expect(modulesDuCompte(undefined)).toBeNull();
  });
});

describe('pourPdf (built-in Helvetica)', async () => {
  const { pourPdf } = await import('../appels/pdf');
  it('keeps French accents and replaces the signs outside Latin-1', () => {
    expect(pourPdf('Écart, clôture, « résultats »')).toBe('Écart, clôture, « résultats »');
    const tiret = String.fromCharCode(0x2014);
    const apostrophe = String.fromCharCode(0x2019);
    expect(pourPdf(`l${apostrophe}aéroport ${tiret} cœur`)).toBe("l'aéroport - coeur");
    expect(pourPdf('ok ' + String.fromCharCode(0x1f600))).toBe('ok ');
  });
});

describe('csv formula cells', () => {
  it('prefixes a free text starting with = + - @ so Excel never runs it', () => {
    const l = csvVotes([vote({ manquant: '=HYPERLINK("http://x")', masque_motif: '+1 doublon' })]).split('\r\n')[1];
    expect(l).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(l).toContain("'+1 doublon");
  });
});
