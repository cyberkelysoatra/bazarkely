import { describe, it, expect, vi } from 'vitest';

// Neutralise la seule chaîne d'import qui atteint la base BazarKELY lourde :
// eauTendanceService → eauBassinService → notificationService → lib/database → `new BazarKELYDB()`.
// Le mock global `dexie` (src/test/setup.ts) n'est pas compatible sous-classe : le constructeur
// mocké renvoie un objet simple, donc `this` perd les méthodes de prototype de BazarKELYDB
// (`this.initializeConnectionPool is not a function` au chargement). Les fonctions testées ici
// sont PURES et n'appellent jamais notificationService — on remplace donc le module entier,
// ce qui empêche l'exécution de son import de `lib/database`. (Test/setup only, aucun comportement
// applicatif modifié.)
vi.mock('../../../services/notificationService', () => ({ default: {} }));

import { computeAlerteCandidates } from '../utils/alertes';
import { isAnnonceActive } from '../services/eauAnnonceService';
import { bucketByDay, consoCompteurPeriode } from '../services/eauTendanceService';
import { targetReportKey, shouldProposeRapport } from '../services/eauRapportService';
import { computeNRW } from '../utils/bilan';
import type { AnnonceLocal, ReleveCompteurLocal } from '../types/gestionEau';

// ───────────────────────────── Alertes (logique pure) ─────────────────────────────
describe('computeAlerteCandidates — déclenchement des alertes', () => {
  const base = {
    now: Date.parse('2026-06-15T10:00:00Z'),
    joursSansReleveAlerte: 30,
    bassinSeuilCritiquePct: 20,
    tauxRemplissagePct: null as number | null,
    compteursActifs: [] as { id: string; nom: string }[],
    dernierReleveParCompteur: {} as Record<string, number | undefined>,
    bilansAnomalieNonTraitee: [] as { id: string; ecart_pct: number | null }[],
    nrwPct: null as number | null,
    pertesM3: null as number | null,
  };

  it('lève une alerte anomalie par bilan non traité', () => {
    const out = computeAlerteCandidates({
      ...base,
      bilansAnomalieNonTraitee: [{ id: 'b1', ecart_pct: 12 }],
    });
    expect(out.filter((a) => a.type === 'anomalie')).toHaveLength(1);
    expect(out[0].ref_id).toBe('b1');
  });

  it('lève une alerte compteur_non_releve au-delà du seuil de jours', () => {
    const vieux = Date.parse('2026-04-01T00:00:00Z'); // > 30 j avant le now
    const out = computeAlerteCandidates({
      ...base,
      compteursActifs: [{ id: 'c1', nom: 'Villa 1' }],
      dernierReleveParCompteur: { c1: vieux },
    });
    expect(out.some((a) => a.type === 'compteur_non_releve' && a.ref_id.startsWith('c1|'))).toBe(true);
  });

  it('ne lève PAS compteur_non_releve si relevé récent', () => {
    const recent = Date.parse('2026-06-10T00:00:00Z'); // 5 j avant
    const out = computeAlerteCandidates({
      ...base,
      compteursActifs: [{ id: 'c1', nom: 'Villa 1' }],
      dernierReleveParCompteur: { c1: recent },
    });
    expect(out.some((a) => a.type === 'compteur_non_releve')).toBe(false);
  });

  it('lève bassin_critique sous le seuil', () => {
    const out = computeAlerteCandidates({ ...base, tauxRemplissagePct: 12 });
    expect(out.some((a) => a.type === 'bassin_critique')).toBe(true);
  });

  it('ne lève PAS bassin_critique au-dessus du seuil', () => {
    const out = computeAlerteCandidates({ ...base, tauxRemplissagePct: 55 });
    expect(out.some((a) => a.type === 'bassin_critique')).toBe(false);
  });

  it('lève fuite quand NRW élevé + pertes positives', () => {
    const out = computeAlerteCandidates({ ...base, nrwPct: 40, pertesM3: 12 });
    expect(out.some((a) => a.type === 'fuite')).toBe(true);
  });

  it('ne lève PAS fuite si NRW faible', () => {
    const out = computeAlerteCandidates({ ...base, nrwPct: 8, pertesM3: 2 });
    expect(out.some((a) => a.type === 'fuite')).toBe(false);
  });
});

// ───────────────────────────── Annonces (fenêtre active) ─────────────────────────────
describe('isAnnonceActive — fenêtre d’affichage', () => {
  const make = (over: Partial<AnnonceLocal>): AnnonceLocal => ({
    id: 'a', titre: 't', texte: '', type: 'promo', actif: true,
    date_debut: null, date_fin: null, created_by: null, created_at: null, ...over,
  });
  const now = Date.parse('2026-06-15T12:00:00Z');

  it('inactive si actif=false', () => {
    expect(isAnnonceActive(make({ actif: false }), now)).toBe(false);
  });
  it('active sans dates', () => {
    expect(isAnnonceActive(make({}), now)).toBe(true);
  });
  it('inactive avant date_debut', () => {
    expect(isAnnonceActive(make({ date_debut: '2026-07-01T00:00:00Z' }), now)).toBe(false);
  });
  it('inactive après date_fin', () => {
    expect(isAnnonceActive(make({ date_fin: '2026-06-01T00:00:00Z' }), now)).toBe(false);
  });
  it('active dans la fenêtre', () => {
    expect(isAnnonceActive(make({ date_debut: '2026-06-01T00:00:00Z', date_fin: '2026-06-30T23:59:59Z' }), now)).toBe(true);
  });
});

// ───────────────────────────── Tendances (helpers purs) ─────────────────────────────
describe('bucketByDay — agrégation journalière', () => {
  it('somme les valeurs d’un même jour et trie croissant', () => {
    const d1 = Date.parse('2026-06-10T08:00:00Z');
    const d1b = Date.parse('2026-06-10T18:00:00Z');
    const d2 = Date.parse('2026-06-11T09:00:00Z');
    const out = bucketByDay([
      { ms: d2, value: 5 },
      { ms: d1, value: 3 },
      { ms: d1b, value: 2 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('2026-06-10');
    expect(out[0].value).toBe(5);
    expect(out[1].value).toBe(5);
  });
});

describe('consoCompteurPeriode — conso sur une fenêtre', () => {
  const mk = (index: number, iso: string, rupture = false): ReleveCompteurLocal => ({
    id: `r-${iso}`, compteur_id: 'c1', index, rupture_index: rupture,
    aberrant_confirme: false, timestamp: iso, agent_id: null, note: null, photo_url: null,
  });

  it('calcule (index fin − index début) en neutralisant l’absence de baseline', () => {
    const releves = [
      mk(100, '2026-05-01T00:00:00Z'),
      mk(130, '2026-06-01T00:00:00Z'),
      mk(160, '2026-06-30T00:00:00Z'),
    ];
    const start = Date.parse('2026-06-01T00:00:00Z');
    const end = Date.parse('2026-06-30T00:00:00Z');
    expect(consoCompteurPeriode(releves, start, end)).toBe(30);
  });

  it('retourne 0 en cas de rupture dans l’intervalle', () => {
    const releves = [
      mk(100, '2026-05-01T00:00:00Z'),
      mk(10, '2026-06-10T00:00:00Z', true), // compteur remplacé
      mk(40, '2026-06-30T00:00:00Z'),
    ];
    const start = Date.parse('2026-06-01T00:00:00Z');
    const end = Date.parse('2026-06-30T00:00:00Z');
    expect(consoCompteurPeriode(releves, start, end)).toBe(0);
  });
});

// ───────────────────────────── NRW ─────────────────────────────
describe('computeNRW — pertes et pourcentage', () => {
  it('calcule pertes et NRW%', () => {
    const r = computeNRW(100, 70);
    expect(r.pertesM3).toBe(30);
    expect(r.nrwPct).toBeCloseTo(30, 5);
  });
  it('renvoie 0% sans entrées', () => {
    expect(computeNRW(0, 0).nrwPct).toBe(0);
  });
});

// ───────────────────────────── Rapport mensuel (proposition) ─────────────────────────────
describe('targetReportKey / shouldProposeRapport — fin de période', () => {
  it('cible le mois courant dans les derniers jours du mois', () => {
    const t = targetReportKey(new Date(2026, 5, 29)); // 29 juin
    expect(t.month).toBe(5);
    expect(t.year).toBe(2026);
  });

  it('cible le mois précédent en début de mois', () => {
    const t = targetReportKey(new Date(2026, 6, 2)); // 2 juillet → juin
    expect(t.month).toBe(5);
    expect(t.year).toBe(2026);
  });

  it('ne propose pas en milieu de mois', () => {
    expect(shouldProposeRapport(new Date(2026, 5, 15))).toBe(false);
  });
});
