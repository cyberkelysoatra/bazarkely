import { describe, it, expect } from 'vitest';
import {
  cycleDuJour,
  derniereLigneFacturee,
  kwhLigne,
  libelleAvis,
  lignesCsvCycle,
  nbAValiderSansAvis,
  nombreFr,
  preparerFacturesCycle,
  prochainsNumeros,
  resumeAvis,
  sequencePourAnnee,
  totauxFacture,
  type FactureAvecLignes,
} from '../utils/elecFacture';
import { filterEauNavByRoles } from '../components/eauNav';
import { accueilElec, domainesPourRoles, ELEC_FACTURES } from '../utils/domaines';
import { droitsElec } from '../utils/elecReleves';
import type {
  EauRoles,
  ElecClientLocal,
  ElecCompteurLocal,
  ElecFactureLigneLocal,
  ElecFactureLocal,
  ElecReglagesLocal,
  ElecReleveLocal,
  ElecValidationLocal,
} from '../types/gestionEau';

// ───────────────────────────── Fabriques ─────────────────────────────
const REG = { tarif_kwh: 895, forfait_ht: 200000, tva_pct: 20, mode_essai: true } as Pick<
  ElecReglagesLocal,
  'tarif_kwh' | 'forfait_ht' | 'tva_pct' | 'mode_essai'
>;

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

let n = 0;
const releve = (compteurId: string, iso: string, index: number): ElecReleveLocal => ({
  id: `r${++n}`, compteur_id: compteurId, index, rupture_index: false, aberrant_confirme: false, timestamp: iso,
  agent_id: null, note: null, photo_url: null, origine: 'terrain', created_at: null,
});

const releves = (...list: ElecReleveLocal[]) => {
  const m = new Map<string, ElecReleveLocal[]>();
  for (const r of list) m.set(r.compteur_id, [...(m.get(r.compteur_id) ?? []), r]);
  return m;
};

const facture = (over: Partial<ElecFactureLocal>): ElecFactureLocal => ({
  id: 'f', client_id: 'a', bien: null, cycle: '2026-10', statut: 'emise', essai: true, numero: 'FAC-2026-10-050',
  numero_seq: 50, periode_debut: null, periode_fin: null, date_emission: null, date_echeance: null, tarif_kwh: 895,
  forfait_ht: 200000, tva_pct: 20, total_kwh: null, montant_energie: null, montant_ht: null, montant_tva: null,
  montant_ttc: null, client_snapshot: null, emetteur_snapshot: null, validation_date_limite: null, date_envoi: null,
  en_attente_releve: false, motif_attente: null, note_interne: null, cle_regroupement: 'a', created_at: null,
  updated_at: null, ...over,
});

const ligne = (over: Partial<ElecFactureLigneLocal>): ElecFactureLigneLocal => ({
  id: 'l', facture_id: 'f', compteur_id: 'k', code_compteur: 'K', index_debut: 0, date_index_debut: null,
  index_fin: 0, date_index_fin: null, releve_fin_id: null, kwh: null, montant: null, ordre: 0, created_at: null,
  updated_at: null, ...over,
});

const FIN_OCT = '2026-10-31T07:00:00+03:00';

// ───────────────────────────── Calcul ─────────────────────────────
describe('totauxFacture (mêmes règles que la base)', () => {
  it('exemple de contrôle : 1 000 kWh = 1 314 000 Ar TTC', () => {
    const t = totauxFacture([1000], 895, 200000, 20);
    expect(t.montantEnergie).toBe(895000);
    expect(t.montantHt).toBe(1095000);
    expect(t.montantTva).toBe(219000);
    expect(t.montantTtc).toBe(1314000);
  });

  // Chiffres relevés en base (déclencheurs réels, transaction annulée, 01/11/2026).
  const SQL = [
    { cas: 'c1', kwhs: [1000], t: 895, f: 200000, v: 20, ht: 1095000, tva: 219000, ttc: 1314000, kwh: 1000 },
    { cas: 'c2 ,50', kwhs: [0.25], t: 895, f: 200000, v: 20, ht: 200223.75, tva: 40044.75, ttc: 240269, kwh: 0.25 },
    { cas: 'c3 ,49', kwhs: [0.358], t: 895, f: 200000, v: 20, ht: 200320.41, tva: 40064.08, ttc: 240384, kwh: 0.358 },
    {
      cas: 'c4 groupée 11', kwhs: [123.45, 0, 87.6, 310, 450, 12.345, 1000.5, 0.01, 77, 5.5, 999.999], t: 895, f: 200000, v: 20,
      ht: 2944431.59, tva: 588886.32, ttc: 3533318, kwh: 3066.404,
    },
    { cas: 'c5 paramètres décimaux', kwhs: [310, 450], t: 895.5, f: 200000.5, v: 18, ht: 880580.5, tva: 158504.49, ttc: 1039085, kwh: 760 },
    { cas: 'c6 entier', kwhs: [450], t: 895, f: 200000, v: 20, ht: 602750, tva: 120550, ttc: 723300, kwh: 450 },
  ];
  for (const c of SQL) {
    it(`égal à la base : ${c.cas}`, () => {
      const t = totauxFacture(c.kwhs, c.t, c.f, c.v);
      expect(t.totalKwh).toBe(c.kwh);
      expect(t.montantHt).toBe(c.ht);
      expect(t.montantTva).toBe(c.tva);
      expect(t.montantTtc).toBe(c.ttc);
    });
  }

  it('TTC exact à ,50 : arrondi vers le haut ; à ,49 : vers le bas', () => {
    const a = totauxFacture([0.25], 895, 200000, 20);
    expect(a.montantHt + a.montantTva).toBeCloseTo(240268.5, 6);
    expect(a.montantTtc).toBe(240269);
    const b = totauxFacture([0.358], 895, 200000, 20);
    expect(b.montantHt + b.montantTva).toBeCloseTo(240384.49, 6);
    expect(b.montantTtc).toBe(240384);
  });

  it('kWh exacts au millième (pas d’erreur de virgule)', () => {
    expect(kwhLigne(1000.5, 1310.5)).toBe(310);
    expect(kwhLigne(0.1, 0.3)).toBe(0.2);
    expect(kwhLigne(1310.567, 1400)).toBe(89.433);
  });
});

// ───────────────────────────── Regroupement ─────────────────────────────
describe('preparerFacturesCycle', () => {
  it('facture groupée de 11 compteurs : une facture, 11 lignes, UN seul forfait', () => {
    const a = client('a', { facture_groupee: true });
    const cs = Array.from({ length: 11 }, (_, i) => compteur(`k${i}`, 'a', `L${i}`));
    const rs = releves(...cs.map((c, i) => releve(c.id, FIN_OCT, 100 * (i + 1))));
    const p = preparerFacturesCycle('2026-10', [a], cs, rs, [], REG);
    expect(p.factures).toHaveLength(1);
    const f = p.factures[0];
    expect(f.bien).toBeNull();
    expect(f.lignes).toHaveLength(11);
    const kwh = 100 * (11 * 12) / 2; // 6 600 kWh
    expect(f.totaux.totalKwh).toBe(kwh);
    expect(f.totaux.montantHt).toBe(kwh * 895 + 200000);
  });

  it('client non groupé à deux biens : deux factures', () => {
    const b = client('b');
    const cs = [compteur('v1', 'b', 'V1'), compteur('v2', 'b', 'V2')];
    const p = preparerFacturesCycle('2026-10', [b], cs, releves(releve('v1', FIN_OCT, 10), releve('v2', FIN_OCT, 20)), [], REG);
    expect(p.factures.map((f) => f.bien)).toEqual(['V1', 'V2']);
    expect(p.factures.map((f) => f.cle)).toEqual(['b|V1', 'b|V2']);
  });

  it('bien à deux compteurs successifs (ancien arrêté en cours de mois, nouveau à 0) : une facture, deux lignes', () => {
    const c = client('c');
    const ancien = compteur('old', 'c', 'V9', { statut: 'arrete', date_arret: '2026-10-15', index_reprise: 5000 });
    const nouveau = compteur('new', 'c', 'V9', {
      remplace_compteur_id: 'old', index_reprise: 0, date_index_reprise: '2026-10-15', date_mise_en_service: '2026-10-15',
    });
    const rs = releves(releve('old', '2026-10-15T09:00:00+03:00', 5150), releve('new', FIN_OCT, 80));
    const p = preparerFacturesCycle('2026-10', [c], [ancien, nouveau], rs, [], REG);
    expect(p.factures).toHaveLength(1);
    expect(p.factures[0].lignes.map((l) => [l.compteur.id, l.kwh])).toEqual([['old', 150], ['new', 80]]);
    expect(p.factures[0].totaux.montantHt).toBe(230 * 895 + 200000);
    // Le mois suivant, le compteur arrêté n'est plus facturé.
    const nov = preparerFacturesCycle('2026-11', [c], [ancien, nouveau], rs, [], REG);
    expect(nov.factures[0]?.lignes.map((l) => l.compteur.id) ?? []).not.toContain('old');
  });

  it('compteur à 0 décimale', () => {
    const h = client('h');
    const k = compteur('h1', 'h', 'Hôtel', { decimales: 0, index_reprise: 20000 });
    const p = preparerFacturesCycle('2026-10', [h], [k], releves(releve('h1', '2026-10-31T18:00:00+03:00', 20450)), [], REG);
    expect(p.factures[0].lignes[0].kwh).toBe(450);
    expect(p.factures[0].totaux.montantTtc).toBe(723300);
  });

  it('compteur en pause et client en pause : exclus', () => {
    const a = client('a');
    const z = client('z', { statut: 'pause' });
    const cs = [compteur('p1', 'a', 'L1', { statut: 'pause' }), compteur('a2', 'a', 'L2'), compteur('z1', 'z', 'Z1')];
    const rs = releves(releve('p1', FIN_OCT, 10), releve('a2', FIN_OCT, 10), releve('z1', FIN_OCT, 10));
    const p = preparerFacturesCycle('2026-10', [a, z], cs, rs, [], REG);
    expect(p.factures.map((f) => f.cle)).toEqual(['a|L2']);
  });

  it('continuité : le début de novembre = la fin d’octobre facturée, même avec un relevé intermédiaire', () => {
    const a = client('a');
    const k = compteur('k', 'a', 'L2', { index_reprise: 1000.5 });
    const rs = releves(
      releve('k', FIN_OCT, 1310.5),
      releve('k', '2026-11-01T10:00:00+03:00', 1320), // intermédiaire, après la fin facturée
      releve('k', '2026-11-30T07:00:00+03:00', 1500)
    );
    const oct: FactureAvecLignes = {
      facture: facture({ id: 'foct', client_id: 'a', bien: 'L2', cle_regroupement: 'a|L2' }),
      lignes: [ligne({ facture_id: 'foct', compteur_id: 'k', index_debut: 1000.5, index_fin: 1310.5, date_index_fin: FIN_OCT })],
    };
    expect(derniereLigneFacturee('k', '2026-11', [oct])?.index_fin).toBe(1310.5);
    const p = preparerFacturesCycle('2026-11', [a], [k], rs, [oct], REG);
    expect(p.factures[0].lignes[0].indexDebut).toBe(1310.5);
    expect(p.factures[0].lignes[0].kwh).toBe(189.5);
  });

  it('premier cycle : index de reprise', () => {
    const a = client('a');
    const k = compteur('k', 'a', 'L2', { index_reprise: 1000.5, date_index_reprise: '2026-09-30' });
    const p = preparerFacturesCycle('2026-10', [a], [k], releves(releve('k', FIN_OCT, 1310.5)), [], REG);
    expect(p.factures[0].lignes[0].indexDebut).toBe(1000.5);
    expect(p.factures[0].lignes[0].kwh).toBe(310);
    expect(p.factures[0].periodeDebut).toBe('2026-10-01');
    expect(p.factures[0].periodeFin).toBe('2026-10-31');
  });

  it('période décalée : premier index daté du 05', () => {
    const a = client('a');
    const k = compteur('k', 'a', 'L7', { index_reprise: 12, date_index_reprise: '2026-10-05' });
    const p = preparerFacturesCycle('2026-10', [a], [k], releves(releve('k', FIN_OCT, 40)), [], REG);
    expect(p.factures[0].periodeDebut).toBe('2026-10-05');
  });

  it('relevé de clôture manquant : facture en attente qui le dit', () => {
    const a = client('a', { facture_groupee: true });
    const cs = [compteur('l6', 'a', 'L6'), compteur('l7', 'a', 'L7')];
    const p = preparerFacturesCycle('2026-10', [a], cs, releves(releve('l6', FIN_OCT, 10)), [], REG);
    expect(p.factures).toHaveLength(1);
    expect(p.factures[0].attente).toEqual(['relevé de clôture manquant pour L7']);
    expect(p.factures[0].lignes).toHaveLength(1);
  });

  it('idempotent : un brouillon existant est repris, une facture émise n’est jamais touchée', () => {
    const a = client('a');
    const b = client('b');
    const cs = [compteur('ka', 'a', 'L1'), compteur('kb', 'b', 'V1')];
    const rs = releves(releve('ka', FIN_OCT, 10), releve('kb', FIN_OCT, 10));
    const existantes: FactureAvecLignes[] = [
      { facture: facture({ id: 'br', client_id: 'a', bien: 'L1', cle_regroupement: 'a|L1', statut: 'brouillon', numero: null, essai: false }), lignes: [] },
      { facture: facture({ id: 'em', client_id: 'b', bien: 'V1', cle_regroupement: 'b|V1' }), lignes: [] },
    ];
    const p = preparerFacturesCycle('2026-10', [a, b], cs, rs, existantes, REG);
    expect(p.factures).toHaveLength(1);
    expect(p.factures[0].brouillon?.id).toBe('br');
    expect(p.dejaEmises.map((f) => f.id)).toEqual(['em']);
    // En mode officiel, une facture d'essai ne bloque pas la clé.
    const off = preparerFacturesCycle('2026-10', [a, b], cs, rs, existantes, { ...REG, mode_essai: false });
    expect(off.factures.map((f) => f.cle)).toEqual(['a|L1', 'b|V1']);
  });

  it('cycle d’une date d’arrêt : le 1er au matin compte pour le mois écoulé', () => {
    expect(cycleDuJour('2026-10-15')).toBe('2026-10');
    expect(cycleDuJour('2026-11-01')).toBe('2026-10');
  });
});

// ───────────────────────────── Numérotation, avis, export ─────────────────────────────
describe('numérotation et validation', () => {
  const r = {
    numero_annee: 2026, numero_prochain: 50, numero_essai_annee: 2026, numero_essai_prochain: 52, mode_essai: true,
  } as ElecReglagesLocal;

  it('prochains numéros : compteur d’essai en mode essai, officiel sinon', () => {
    expect(prochainsNumeros(r, '2026-10', 2)).toEqual(['FAC-2026-10-052', 'FAC-2026-10-053']);
    expect(prochainsNumeros({ ...r, mode_essai: false }, '2026-10', 1)).toEqual(['FAC-2026-10-050']);
  });

  it('nouvelle année de consommation : repart à 001 (règle unique)', () => {
    expect(sequencePourAnnee(2027, 2026, 80)).toEqual({ annee: 2027, seq: 1 });
    expect(sequencePourAnnee(2026, 2026, 80)).toEqual({ annee: 2026, seq: 80 });
    expect(prochainsNumeros({ ...r, mode_essai: false }, '2027-01', 1)).toEqual(['FAC-2027-01-001']);
  });

  it('pastille du valideur et résumé des avis', () => {
    const fs = [facture({ id: 'x', statut: 'a_valider' }), facture({ id: 'y', statut: 'a_valider' }), facture({ id: 'z', statut: 'emise' })];
    const av: ElecValidationLocal[] = [
      { id: 'x:u', facture_id: 'x', user_id: 'u', avis: 'bon', texte: null, reponse: null, levee: false, created_at: null, updated_at: null },
      { id: 'x:w', facture_id: 'x', user_id: 'w', avis: 'remarque', texte: 'L2 ?', reponse: null, levee: false, created_at: null, updated_at: null },
    ];
    expect(nbAValiderSansAvis(fs, av, 'u')).toBe(1);
    expect(nbAValiderSansAvis(fs, av, 'v')).toBe(2);
    expect(libelleAvis(resumeAvis(av.slice(0, 1)), 2)).toBe('1 sur 2 bon');
    expect(libelleAvis(resumeAvis(av), 2)).toBe('1 sur 2 bon, 1 remarque');
  });

  it('export CSV : nombres à la française, accents conservés', () => {
    const f = facture({
      id: 'f', client_id: 'h', bien: 'Hôtel', total_kwh: 310.5, montant_ht: 477897.5, montant_tva: 95579.5, montant_ttc: 573477,
      periode_debut: '2026-10-01', periode_fin: '2026-10-31', date_echeance: '2026-11-16', statut: 'emise',
    });
    const rows = lignesCsvCycle(
      [f],
      new Map([['f', [ligne({ code_compteur: 'H1', kwh: 310.5 })]]]),
      new Map([['h', { code: 'H', nom: 'Hôtel Été' }]])
    );
    expect(rows[0]).toMatchObject({
      'Numéro': 'FAC-2026-10-050', 'Client': 'H Hôtel Été', 'Bien': 'Hôtel', 'Période': '01/10/2026 au 31/10/2026',
      'kWh par compteur': 'H1 310,5', 'HT': '477897,5', 'TVA': '95579,5', 'TTC': '573477', 'Échéance': '16/11/2026',
      'Statut': 'Émise, non envoyée', 'Essai': 'oui',
    });
    expect(nombreFr(1314000, 0)).toBe('1314000');
  });
});

// ───────────────────────────── Rôle validation_elec ─────────────────────────────
describe('rôle Validation électricité', () => {
  const roles = (over: Partial<EauRoles>): EauRoles => ({
    admin: false, releveur: false, client: false, promoteur: false, releveurElec: false, gestionElec: false,
    lectureElec: false, validationElec: false, ...over,
  });

  it('ouvre le domaine électricité, pas l’eau', () => {
    expect(domainesPourRoles(roles({ validationElec: true }))).toEqual({ eau: false, elec: true });
  });

  it('valideur seul : arrive sur les factures, seul bouton Factures', () => {
    const v = roles({ validationElec: true });
    expect(accueilElec(v)).toBe(ELEC_FACTURES);
    expect(filterEauNavByRoles(v, undefined, 'elec').map((i) => i.label)).toEqual(['Factures']);
  });

  it('lit le domaine sans gestion ; gestion et lecture voient aussi Factures ; releveur électricité non', () => {
    expect(droitsElec(roles({ validationElec: true }))).toMatchObject({ gestion: false, lecture: true, validation: true, saisie: false });
    expect(filterEauNavByRoles(roles({ lectureElec: true }), undefined, 'elec').map((i) => i.label)).toContain('Factures');
    expect(filterEauNavByRoles(roles({ releveurElec: true }), undefined, 'elec').map((i) => i.label)).toEqual(['Relevés']);
    expect(filterEauNavByRoles(roles({ releveur: true }), undefined, 'elec')).toEqual([]);
  });
});
