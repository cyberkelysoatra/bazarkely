/**
 * Onglet « Compteurs » de la page Relevés v2 (façon Transactions).
 *
 * KPI (conso période m³ eau + progression du jour) → recherche → chips de période →
 * liste de cartes compteur (eau + élec mélangés, une carte par compteur, triées « mode
 * tournée »). Chaque carte ouvre, en accordéon (un seul tiroir à la fois), un tiroir
 * « Saisir » (EauTiroirSaisie) ou « Historique » (6 derniers relevés).
 *
 * Source du tri/progression : getTourneeData() (zone/ordre/nom + relevé du jour). Les
 * relevés (eau & élec) sont chargés en 2 lectures Dexie groupées (offline-first).
 */
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import {
  Droplet, Zap, Pencil, History, Search, Gauge, CalendarDays, BarChart3,
} from 'lucide-react';
import { EauStatCard, EauEmptyState, EauListIcon } from './EauUi';
import EauTiroirSaisie, { type ReleveFacet } from './EauTiroirSaisie';
import { getTourneeData, type TourneeItem } from '../services/eauTourneeService';
import { relevesByCompteur, refreshReleves } from '../services/eauReleveService';
import { relevesElecByCompteur, refreshElecReleves } from '../services/eauElecReleveService';
import { refreshCompteurs } from '../services/eauCompteurService';
import { useGestionEau } from '../context';
import { fmtM3, fmtKwh, fmtDate } from '../utils/format';
import type { ReleveCompteurLocal, ElecReleveLocal } from '../types/gestionEau';

const PERIODE_KEY = 'ahuvi_releves_periode';
const PERIODES = [
  { key: '7j', days: 7, label: '7 j' },
  { key: '30j', days: 30, label: '30 j' },
  { key: '1an', days: 365, label: '1 an' },
] as const;
type PeriodeKey = (typeof PERIODES)[number]['key'];

/** Index relevé (eau ou élec) générique — assez pour les calculs de conso/date. */
type AnyReleve = Pick<ReleveCompteurLocal | ElecReleveLocal, 'index' | 'timestamp' | 'rupture_index'>;

interface ReleveCard {
  item: TourneeItem;
  eau: ReleveCompteurLocal[];
  elec: ElecReleveLocal[];
  hasEau: boolean;
  hasElec: boolean;
  headline: ReleveFacet;
}

/** Conso du dernier intervalle (relevé courant − précédent), null si < 2 relevés ou rupture. */
function lastIntervalConso(releves: AnyReleve[]): number | null {
  if (releves.length < 2) return null;
  const last = releves[releves.length - 1];
  const prev = releves[releves.length - 2];
  if (last.rupture_index) return null;
  return Math.max(0, last.index - prev.index);
}

/** Somme des consos d'intervalle dont le relevé de fin tombe dans la fenêtre [sinceMs, ∞). */
function consoInWindow(releves: AnyReleve[], sinceMs: number): number {
  let total = 0;
  for (let i = 1; i < releves.length; i++) {
    if (releves[i].rupture_index) continue;
    if (new Date(releves[i].timestamp).getTime() < sinceMs) continue;
    total += Math.max(0, releves[i].index - releves[i - 1].index);
  }
  return total;
}

/** Groupe de tri « mode tournée » : 0 = jamais relevé, 1 = à relever aujourd'hui, 2 = fait. */
function sortGroup(card: ReleveCard): number {
  if (!card.hasEau && !card.hasElec) return 0;
  return card.item.releveAujourdhui ? 2 : 1;
}

export default function EauCompteursReleves({
  preselect,
  onConsumePreselect,
}: {
  /** Compteur à préselectionner (deep-link `?c=` depuis un scan) → ouvre sa saisie. */
  preselect: string | null;
  onConsumePreselect: () => void;
}) {
  const { isReadOnly } = useGestionEau();
  const [items, setItems] = useState<TourneeItem[]>([]);
  const [eauMap, setEauMap] = useState<Map<string, ReleveCompteurLocal[]>>(new Map());
  const [elecMap, setElecMap] = useState<Map<string, ElecReleveLocal[]>>(new Map());
  const [faits, setFaits] = useState(0);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [periode, setPeriode] = useState<PeriodeKey>(() => {
    try {
      const v = localStorage.getItem(PERIODE_KEY);
      if (v === '7j' || v === '30j' || v === '1an') return v;
    } catch {
      /* localStorage indisponible */
    }
    return '30j';
  });
  const [loading, setLoading] = useState(true);
  // Tiroir ouvert : `${compteurId}:saisir` | `${compteurId}:histo` | null (un seul à la fois).
  const [openKey, setOpenKey] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const load = async () => {
    const [tournee, eMap, lMap] = await Promise.all([
      getTourneeData(),
      relevesByCompteur(),
      relevesElecByCompteur(),
    ]);
    setItems(tournee.items);
    setFaits(tournee.faits);
    setTotal(tournee.total);
    setEauMap(eMap);
    setElecMap(lMap);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (alive) setLoading(false);
      // Rafraîchit en arrière-plan si en ligne (non bloquant), puis recharge.
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await Promise.allSettled([refreshCompteurs(true), refreshReleves(true), refreshElecReleves(true)]);
        if (alive) await load();
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PERIODE_KEY, periode);
    } catch {
      /* ignore */
    }
  }, [periode]);

  // Construit les cartes (une par compteur), enrichies eau + élec.
  const cards = useMemo<ReleveCard[]>(() => {
    return items.map((item) => {
      const eau = eauMap.get(item.compteur.id) ?? [];
      const elec = elecMap.get(item.compteur.id) ?? [];
      const hasEau = eau.length > 0;
      const hasElec = elec.length > 0;
      // Eau = nature de base (le `type` décrit un compteur d'eau). Élec en tête seulement
      // si le compteur n'a QUE des relevés élec.
      const headline: ReleveFacet = hasElec && !hasEau ? 'elec' : 'eau';
      return { item, eau, elec, hasEau, hasElec, headline };
    });
  }, [items, eauMap, elecMap]);

  // Filtrage recherche + tri mode tournée (jamais relevé → à relever → fait).
  const visibleCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? cards.filter((c) => {
          const cp = c.item.compteur;
          return (
            cp.nom.toLowerCase().includes(q) ||
            (cp.proprietaire ?? '').toLowerCase().includes(q) ||
            (cp.zone ?? '').toLowerCase().includes(q)
          );
        })
      : cards;
    // Tri stable : on conserve l'ordre tournée (zone/ordre/nom) à l'intérieur de chaque groupe.
    return filtered
      .map((c, i) => ({ c, i }))
      .sort((a, b) => sortGroup(a.c) - sortGroup(b.c) || a.i - b.i)
      .map((x) => x.c);
  }, [cards, query]);

  // KPI conso période = m³ EAU sur la fenêtre choisie (jamais m³ + kWh).
  const consoPeriodeM3 = useMemo(() => {
    const days = PERIODES.find((p) => p.key === periode)!.days;
    const sinceMs = Date.now() - days * 86400000;
    let total = 0;
    for (const list of eauMap.values()) total += consoInWindow(list, sinceMs);
    return total;
  }, [eauMap, periode]);

  // Préselection (scan) : dès que les cartes sont chargées, ouvre la saisie du compteur ciblé.
  useEffect(() => {
    if (!preselect || loading) return;
    const exists = cards.some((c) => c.item.compteur.id === preselect);
    if (!exists) {
      onConsumePreselect();
      return;
    }
    setOpenKey(`${preselect}:saisir`);
    const el = cardRefs.current.get(preselect);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    onConsumePreselect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, loading, cards]);

  const toggle = (key: string) => setOpenKey((k) => (k === key ? null : key));

  if (loading) {
    return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI : conso période (eau) + progression du jour. */}
      <div className="grid grid-cols-2 gap-3">
        <EauStatCard
          icon={Droplet}
          tone="teal"
          label={`Conso eau · ${PERIODES.find((p) => p.key === periode)!.label}`}
          value={fmtM3(consoPeriodeM3)}
          hint="Compteurs d'eau sur la période"
        />
        <EauStatCard
          icon={CalendarDays}
          tone="forest"
          label="Relevés du jour"
          value={`${faits} / ${total}`}
          hint={
            <span className="block mt-1 h-1.5 w-full rounded-full bg-ahuvi-100 overflow-hidden">
              <span
                className="block h-full rounded-full bg-ahuvi-forest transition-all"
                style={{ width: total > 0 ? `${Math.round((faits / total) * 100)}%` : '0%' }}
              />
            </span>
          }
        />
      </div>

      {/* Recherche. */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un compteur…"
          className="w-full pl-9 rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
        />
      </div>

      {/* Chips de période. */}
      <div className="flex gap-2">
        {PERIODES.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriode(p.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              periode === p.key
                ? 'bg-ahuvi-forest text-white shadow-soft'
                : 'bg-white text-ahuvi-forest border border-ahuvi-200 hover:bg-ahuvi-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Liste de cartes. */}
      {visibleCards.length === 0 ? (
        <EauEmptyState
          icon={Gauge}
          title="Aucun compteur"
          hint={query ? 'Aucun compteur ne correspond à votre recherche.' : 'Aucun compteur actif.'}
        />
      ) : (
        <div className="space-y-2">
          {visibleCards.map((card) => (
            <CompteurCard
              key={card.item.compteur.id}
              card={card}
              openKey={openKey}
              onToggle={toggle}
              isReadOnly={isReadOnly}
              onSaved={async () => {
                setOpenKey(null);
                await load();
              }}
              registerRef={(el) => cardRefs.current.set(card.item.compteur.id, el)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Une carte compteur (ligne d'identité + 2 boutons + tiroir accordéon). */
function CompteurCard({
  card,
  openKey,
  onToggle,
  isReadOnly,
  onSaved,
  registerRef,
}: {
  card: ReleveCard;
  openKey: string | null;
  onToggle: (key: string) => void;
  isReadOnly: boolean;
  onSaved: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const { item, headline, hasEau, hasElec } = card;
  const cp = item.compteur;
  const releves: AnyReleve[] = headline === 'eau' ? card.eau : card.elec;
  const never = !hasEau && !hasElec;
  const fmt = headline === 'eau' ? fmtM3 : fmtKwh;
  const TypeIcon = headline === 'eau' ? Droplet : Zap;
  const tone = headline === 'eau' ? 'teal' : 'gold';

  const dernier = releves.length > 0 ? releves[releves.length - 1] : null;
  const conso = lastIntervalConso(releves);
  const saisirKey = `${cp.id}:saisir`;
  const histoKey = `${cp.id}:histo`;

  return (
    <div
      ref={registerRef}
      className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden"
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <EauListIcon icon={TypeIcon} tone={tone as 'teal' | 'gold'} />
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{cp.nom}</div>
              <div className="text-sm text-gray-500 truncate">
                {cp.zone ?? 'Sans zone'}
                {cp.proprietaire ? ` · ${cp.proprietaire}` : ''}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {never ? (
              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                Aucun relevé
              </span>
            ) : (
              <div className={`text-2xl font-bold ${headline === 'eau' ? 'text-ahuvi-teal' : 'text-[#8a8836]'}`}>
                {dernier ? dernier.index.toLocaleString('fr-FR') : '—'}
              </div>
            )}
          </div>
        </div>

        {!never && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <TypeIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {headline === 'eau' ? 'Eau' : 'Élec'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{fmtDate(dernier?.timestamp)}</span>
            <span aria-hidden="true">·</span>
            <span>{conso == null ? '—' : `+${fmt(conso)}`}</span>
            {/* Repère de l'autre nature présente sur ce même compteur. */}
            {headline === 'eau' && hasElec && (
              <span className="inline-flex items-center gap-0.5 text-[#8a8836]">
                <Zap className="w-3 h-3" aria-hidden="true" /> élec aussi
              </span>
            )}
          </div>
        )}

        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => onToggle(saisirKey)}
            disabled={isReadOnly}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              openKey === saisirKey
                ? 'bg-ahuvi-forest text-white'
                : 'bg-ahuvi-50 text-ahuvi-forest hover:bg-ahuvi-100 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" /> Saisir
          </button>
          <button
            type="button"
            onClick={() => onToggle(histoKey)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              openKey === histoKey
                ? 'bg-ahuvi-forest text-white'
                : 'bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50'
            }`}
          >
            <History className="w-4 h-4" aria-hidden="true" /> Historique
          </button>
        </div>
      </div>

      {openKey === saisirKey && (
        <Drawer>
          <div className="px-3 pb-3 border-t border-ahuvi-100">
            <EauTiroirSaisie compteur={cp} defaultFacet={headline} onSaved={onSaved} />
          </div>
        </Drawer>
      )}
      {openKey === histoKey && (
        <Drawer>
          <div className="px-3 pb-3 border-t border-ahuvi-100">
            <HistoriqueDrawer releves={releves} facet={headline} />
          </div>
        </Drawer>
      )}
    </div>
  );
}

/** Conteneur accordéon : anime l'ouverture (0fr → 1fr) à l'aide d'une grille CSS. */
function Drawer({ children }: { children: ReactNode }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
        grown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

/** Tiroir Historique : mini-graphe + 6 derniers relevés (3 empilés, reste au scroll). */
function HistoriqueDrawer({ releves, facet }: { releves: AnyReleve[]; facet: ReleveFacet }) {
  const fmt = facet === 'eau' ? fmtM3 : fmtKwh;

  // Lignes (date, index, conso) calculées sur la série COMPLÈTE, puis 6 dernières affichées.
  const rows = useMemo(() => {
    const out: { date: string; index: number; conso: number | null; rupture: boolean }[] = [];
    for (let i = 0; i < releves.length; i++) {
      const r = releves[i];
      const rupture = !!r.rupture_index;
      const conso = i === 0 || rupture ? null : Math.max(0, r.index - releves[i - 1].index);
      out.push({ date: r.timestamp, index: r.index, conso, rupture });
    }
    return out.slice(-6).reverse(); // plus récent en premier
  }, [releves]);

  const histo = useMemo(
    () =>
      rows
        .filter((r) => r.conso != null)
        .slice()
        .reverse()
        .map((r, i) => ({ i: i + 1, value: r.conso as number })),
    [rows]
  );

  if (releves.length === 0) {
    return <div className="pt-3 text-sm text-gray-400 text-center">Aucun relevé pour ce compteur.</div>;
  }

  return (
    <div className="pt-3 space-y-2">
      {histo.length > 0 && (
        <div className="rounded-lg border border-ahuvi-100 bg-ahuvi-50/40 p-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> Consommation par période
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <BarChart data={histo}>
              <XAxis dataKey="i" hide />
              <Tooltip formatter={(val: number) => fmt(val)} labelFormatter={() => ''} />
              <Bar
                dataKey="value"
                fill={facet === 'eau' ? '#0E7490' : '#B8860B'}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 3 visibles empilés (léger chevauchement) + le reste révélé au scroll. */}
      <div className="max-h-[8.5rem] overflow-y-auto pr-1">
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
            >
              <span className="text-sm text-gray-600">{fmtDate(r.date)}</span>
              <span className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {r.index.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs text-gray-500 w-20 text-right">
                  {r.rupture ? 'rupture' : r.conso == null ? '—' : `+${fmt(r.conso)}`}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
