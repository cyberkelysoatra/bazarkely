/**
 * ELEC-CC-02 : règles des relevés d'électricité (échelle, conso par jour, écart, index
 * inférieur, 48 h, cycle mensuel en heure de Madagascar), contrôles des réglages RTB et
 * invitations portant des rôles électricité.
 */
import { describe, it, expect } from 'vitest';
import {
  MSG_ENTIERS,
  calculerCycle,
  compteursTournee,
  cycleParDefaut,
  droitsElec,
  evaluerIndex,
  fenetreCycle,
  lireIndex,
  peutModifierReleve,
  saisieMgVersIso,
} from '../utils/elecReleves';
import { bicValide, chiffresValides, controlerReglages, emailValide, ibanValide, numeroFacture } from '../utils/elecReglages';
import {
  buildInvitationMessage,
  buildWhatsappInviteMessage,
  invitationElecSeule,
  invitationTargetPath,
} from '../services/eauInvitationService';
import type { EauRoles, ElecCompteurLocal, ElecReleveLocal } from '../types/gestionEau';

const r = (over: Partial<EauRoles>): EauRoles => ({
  admin: false, releveur: false, client: false, promoteur: false,
  releveurElec: false, gestionElec: false, lectureElec: false, validationElec: false, ...over,
});

const cpt = (over: Partial<ElecCompteurLocal> = {}): ElecCompteurLocal => ({
  id: 'k1', code: 'L1', bien: 'L1', client_id: 'c1', decimales: 2, statut: 'actif',
  remplace_compteur_id: null, date_mise_en_service: null, date_arret: null,
  index_reprise: null, date_index_reprise: null, ordre: null, note: null,
  created_at: null, updated_at: null, ...over,
});

let n = 0;
const rel = (index: number, ts: string, over: Partial<ElecReleveLocal> = {}): ElecReleveLocal => ({
  id: `r${++n}`, compteur_id: 'k1', index, rupture_index: false, aberrant_confirme: false,
  timestamp: ts, agent_id: 'u1', note: null, photo_url: null, origine: 'terrain',
  created_at: ts, updated_at: ts, ...over,
});

describe('Saisie selon l’échelle du compteur', () => {
  it('0 décimale : toute virgule (ou point) est refusée avec le message prévu', () => {
    expect(lireIndex('12345', 0)).toEqual({ ok: true, value: 12345 });
    expect(lireIndex('1234,5', 0)).toEqual({ ok: false, message: MSG_ENTIERS });
    expect(lireIndex('1234.5', 0)).toEqual({ ok: false, message: MSG_ENTIERS });
    expect(MSG_ENTIERS).toBe('ce compteur n’affiche que des nombres entiers');
  });

  it('2 décimales : au plus 2 chiffres après la virgule ; une seule décimale acceptée telle quelle', () => {
    expect(lireIndex('1234,56', 2)).toEqual({ ok: true, value: 1234.56 });
    expect(lireIndex('1234,5', 2)).toEqual({ ok: true, value: 1234.5 });
    expect(lireIndex('1 234,56', 2)).toEqual({ ok: true, value: 1234.56 });
    const trop = lireIndex('1234,567', 2);
    expect(trop.ok).toBe(false);
    expect(trop.ok === false && trop.message).toContain('au plus 2 chiffres');
  });

  it('rejette le texte et le vide', () => {
    expect(lireIndex('', 2).ok).toBe(false);
    expect(lireIndex('12a', 2).ok).toBe(false);
    expect(lireIndex('-5', 2).ok).toBe(false);
  });
});

describe('Consommation, consommation par jour et alerte d’écart', () => {
  // Trois relevés tous les 10 jours : 10 kWh/j de moyenne.
  const hist = [
    rel(1000, '2026-08-01T06:00:00.000Z'),
    rel(1100, '2026-08-11T06:00:00.000Z'),
    rel(1200, '2026-08-21T06:00:00.000Z'),
  ];

  it('conso et conso par jour exactes depuis le dernier relevé', () => {
    const ev = evaluerIndex(cpt(), hist, 1250, '2026-08-26T06:00:00.000Z', 3);
    expect(ev.conso).toBe(50);
    expect(ev.jours).toBe(5);
    expect(ev.parJour).toBe(10);
    expect(ev.moyenneParJour).toBe(10);
    expect(ev.ecart.aberrant).toBe(false);
  });

  it('écart fort (virgule oubliée : ×100) → alerte haute, jamais un blocage', () => {
    const ev = evaluerIndex(cpt(), hist, 6200, '2026-08-26T06:00:00.000Z', 3);
    expect(ev.parJour).toBe(1000);
    expect(ev.ecart).toEqual({ aberrant: true, type: 'haut' });
  });

  it('écart fort vers le bas (virgule déplacée : ÷10) → alerte basse', () => {
    const ev = evaluerIndex(cpt(), hist, 1205, '2026-08-26T06:00:00.000Z', 3);
    expect(ev.parJour).toBe(1);
    expect(ev.ecart).toEqual({ aberrant: true, type: 'bas' });
  });

  it('index identique (logement vide) : conso 0, pas d’écart', () => {
    const ev = evaluerIndex(cpt(), hist, 1200, '2026-08-26T06:00:00.000Z', 3);
    expect(ev.conso).toBe(0);
    expect(ev.ecart.aberrant).toBe(false);
  });

  it('index inférieur : signalé, aucune conso', () => {
    const ev = evaluerIndex(cpt(), hist, 1199.99, '2026-08-26T06:00:00.000Z', 3);
    expect(ev.inferieur).toBe(true);
    expect(ev.conso).toBeNull();
  });

  it('premier relevé : départ = index de reprise (à minuit heure de Madagascar)', () => {
    const c = cpt({ index_reprise: 500, date_index_reprise: '2026-09-30' });
    const ev = evaluerIndex(c, [], 560, '2026-10-31T21:00:00.000Z', 3); // 1er nov. 00:00 MG
    expect(ev.depart).toEqual({ index: 500, date: '2026-09-29T21:00:00.000Z', source: 'reprise' });
    expect(ev.conso).toBe(60);
    expect(ev.jours).toBe(32);
  });

  it('facteur absent de la configuration : 3 par défaut', () => {
    const ev = evaluerIndex(cpt(), hist, 6200, '2026-08-26T06:00:00.000Z', 0);
    expect(ev.ecart.aberrant).toBe(true);
  });
});

describe('Règle des 48 heures et propriété', () => {
  const maintenant = new Date('2026-11-01T10:00:00.000Z').getTime();
  const releveur = droitsElec(r({ releveurElec: true }));
  const gestion = droitsElec(r({ gestionElec: true }));
  const lecture = droitsElec(r({ lectureElec: true }));

  it('le releveur modifie son relevé de moins de 48 h', () => {
    expect(peutModifierReleve({ agent_id: 'u1', timestamp: '2026-10-31T10:00:00.000Z' }, 'u1', releveur, maintenant)).toBe(true);
  });
  it('pas celui d’un autre, ni le sien de plus de 48 h', () => {
    expect(peutModifierReleve({ agent_id: 'u2', timestamp: '2026-10-31T10:00:00.000Z' }, 'u1', releveur, maintenant)).toBe(false);
    expect(peutModifierReleve({ agent_id: 'u1', timestamp: '2026-10-29T09:00:00.000Z' }, 'u1', releveur, maintenant)).toBe(false);
  });
  it('la gestion modifie tout, la lecture rien', () => {
    expect(peutModifierReleve({ agent_id: 'u2', timestamp: '2026-01-01T00:00:00.000Z' }, 'u1', gestion, maintenant)).toBe(true);
    expect(peutModifierReleve({ agent_id: 'u1', timestamp: '2026-10-31T10:00:00.000Z' }, 'u1', lecture, maintenant)).toBe(false);
  });
  it('droits : releveur seul ne lit ni clients ni cycle ; promoteur lit sans écrire', () => {
    expect(releveur).toEqual({ gestion: false, saisie: true, lecture: false, releveurSeul: true, validation: false });
    expect(droitsElec(r({ promoteur: true }))).toEqual({ gestion: false, saisie: false, lecture: true, releveurSeul: false, validation: false });
    expect(droitsElec(r({ admin: true })).gestion).toBe(true);
  });
});

describe('Cycle mensuel (heure de Madagascar)', () => {
  it('fenêtre d’octobre 2026 : du 1er octobre midi au 1er novembre midi, heure de Madagascar', () => {
    const f = fenetreCycle('2026-10');
    expect(new Date(f.debut).toISOString()).toBe('2026-10-01T09:00:00.000Z');
    expect(new Date(f.fin).toISOString()).toBe('2026-11-01T09:00:00.000Z');
  });

  it('cycle par défaut : le mois qui vient de se terminer (octobre le 1er et le 10 novembre ; déjà octobre le 31)', () => {
    expect(cycleParDefaut(new Date('2026-10-31T22:30:00.000Z').getTime())).toBe('2026-10'); // 1er nov. 01:30 MG
    expect(cycleParDefaut(new Date('2026-11-10T08:00:00.000Z').getTime())).toBe('2026-10');
    expect(cycleParDefaut(new Date('2026-10-31T15:00:00.000Z').getTime())).toBe('2026-10'); // 31 oct. 18:00 MG
    expect(cycleParDefaut(new Date('2026-10-15T08:00:00.000Z').getTime())).toBe('2026-09');
  });

  it('saisie de date : lue comme heure de Madagascar', () => {
    expect(saisieMgVersIso('2026-11-01T07:30')).toBe('2026-11-01T04:30:00.000Z');
  });

  it('début tiré de la reprise, fin = relevé du 1er au matin, manquants en tête, total juste', () => {
    const a = cpt({ id: 'a', code: 'L1', ordre: 1, decimales: 2, index_reprise: 1000, date_index_reprise: '2026-09-30' });
    const b = cpt({ id: 'b', code: 'H1', ordre: 2, decimales: 0 });
    const c = cpt({ id: 'c', code: 'V4', ordre: 3 });
    const d = cpt({ id: 'd', code: 'V9', ordre: 4, statut: 'arrete' });
    const releves = new Map<string, ElecReleveLocal[]>([
      // A : un relevé le 1er novembre à 07:00 MG (compte pour octobre).
      ['a', [rel(1310.5, '2026-11-01T04:00:00.000Z', { compteur_id: 'a', photo_url: 'data:x' })]],
      // H1 : relevé fin septembre puis fin octobre (index entiers).
      ['b', [rel(20000, '2026-09-30T15:00:00.000Z', { compteur_id: 'b' }), rel(20450, '2026-10-31T15:00:00.000Z', { compteur_id: 'b', origine: 'carnet' })]],
    ]);
    const cy = calculerCycle('2026-10', [a, b, c, d], releves);
    expect(cy.manquants.map((x) => x.code)).toEqual(['V4']);
    const la = cy.lignes.find((l) => l.compteur.code === 'L1')!;
    expect(la.debut).toEqual({ index: 1000, date: '2026-09-29T21:00:00.000Z', source: 'reprise' });
    expect(la.fin?.index).toBe(1310.5);
    expect(la.conso).toBeCloseTo(310.5, 6);
    expect(la.jours).toBeCloseTo(32.2916667, 5); // 30/09 00:00 MG → 01/11 07:00 MG
    expect(la.parJour).toBeCloseTo(310.5 / 32.2916667, 4);
    expect(la.photo).toBe(true);
    const lb = cy.lignes.find((l) => l.compteur.code === 'H1')!;
    expect(lb.debut?.index).toBe(20000);
    expect(lb.conso).toBe(450);
    expect(lb.jours).toBe(31);
    expect(lb.origine).toBe('carnet');
    expect(cy.totalKwh).toBeCloseTo(760.5, 6);
    expect(cy.nbActifs).toBe(3);
    expect(cy.nbActifsReleves).toBe(2);
  });

  it('compteur neuf sans reprise : son premier relevé du mois sert de début', () => {
    const k = cpt({ id: 'n', code: 'L3' });
    const cy = calculerCycle('2026-10', [k], new Map([['n', [
      rel(100, '2026-10-05T04:00:00.000Z', { compteur_id: 'n' }),
      rel(130, '2026-10-31T04:00:00.000Z', { compteur_id: 'n' }),
    ]]]));
    expect(cy.lignes[0].debut).toEqual({ index: 100, date: '2026-10-05T04:00:00.000Z', source: 'releve' });
    expect(cy.lignes[0].conso).toBe(30);
    expect(cy.lignes[0].jours).toBe(26);
  });

  it('tournée : actifs et en pause, arrêtés masqués, ordre de tournée puis code (L2 et L2V10 distincts)', () => {
    const liste = compteursTournee([
      cpt({ id: '1', code: 'L2V10', ordre: null }),
      cpt({ id: '2', code: 'L2', ordre: null, statut: 'pause' }),
      cpt({ id: '3', code: 'V8S', ordre: 1 }),
      cpt({ id: '4', code: 'V8N', ordre: 1, statut: 'arrete' }),
    ]);
    expect(liste.map((c) => c.code)).toEqual(['V8S', 'L2', 'L2V10']);
  });
});

describe('Réglages RTB', () => {
  it('NIF et STAT en chiffres, espaces tolérés', () => {
    expect(chiffresValides('400 123 4567')).toBe(true);
    expect(chiffresValides('40A')).toBe(false);
  });
  it('IBAN MG de 27 caractères, espaces tolérés ; BIC 8 ou 11 ; e-mail', () => {
    expect(ibanValide('MG46 0000 0000 0000 0000 0000 000')).toBe(true);
    expect(ibanValide('MG46 0000 0000')).toBe(false);
    expect(ibanValide('FR76 3000 6000 0112 3456 7890 189')).toBe(false);
    expect(bicValide('BFAVMGMG')).toBe(true);
    expect(bicValide('BFAVMGMGXXX')).toBe(true);
    expect(bicValide('BFAVMG')).toBe(false);
    expect(emailValide('rtb@exemple.mg')).toBe(true);
    expect(emailValide('rtb@')).toBe(false);
  });
  it('montants positifs et TVA de 0 à 100', () => {
    const base = { tarif_kwh: '895', forfait_ht: '200000', tva_pct: '20', echeance_jours: '15', numero_annee: '2026', numero_prochain: '50' };
    expect(controlerReglages(base)).toEqual({});
    expect(Object.keys(controlerReglages({ ...base, tva_pct: '120', tarif_kwh: '-1' })).sort()).toEqual(['tarif_kwh', 'tva_pct']);
  });
  it('prochain numéro sous sa forme réelle', () => {
    expect(numeroFacture(2026, 10, 50)).toBe('FAC-2026-10-050');
  });
});

describe('Invitations électricité', () => {
  const elec = { role_releveur_elec: true };
  it('cible : releveur électricité seul → ses relevés ; gestion → tableau de bord électricité', () => {
    expect(invitationTargetPath(elec)).toBe('/gestion-eau/elec/releves');
    expect(invitationTargetPath({ role_gestion_elec: true })).toBe('/gestion-eau/elec');
    expect(invitationTargetPath({ role_releveur: true, role_releveur_elec: true })).toBe('/gestion-eau/releves?tab=bassin&bt=niveau');
  });
  it('message neutre (sans l’eau) quand seuls des rôles électricité sont cochés', () => {
    expect(invitationElecSeule(elec)).toBe(true);
    const wa = buildWhatsappInviteMessage({ nom: 'Test', token: 'tok', ...elec });
    expect(wa).toContain('RTB Énergie');
    expect(wa).not.toMatch(/eau/i);
    const mail = buildInvitationMessage({ email: 'x@y.mg', ...elec });
    expect(mail).toContain('Releveur électricité');
    // Seule l'adresse du lien porte le préfixe technique du module ; le texte ne parle pas d'eau.
    expect(mail.split('\n')[0]).not.toMatch(/eau/i);
    expect(buildWhatsappInviteMessage({ token: 'tok', role_releveur: true })).toContain('Gestion Eau AHUVI');
  });
});
