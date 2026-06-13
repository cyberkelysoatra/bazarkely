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
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import {
  Droplet, Zap, Pencil, Search, Gauge, CalendarDays, BarChart3, Save, Info,
} from 'lucide-react';
import { EauStatCard, EauEmptyState, EauListIcon } from './EauUi';
import EauTiroirSaisie, { type ReleveFacet } from './EauTiroirSaisie';
import { getTourneeData, type TourneeItem } from '../services/eauTourneeService';
import { relevesByCompteur, refreshReleves, updateReleveCompteur } from '../services/eauReleveService';
import { relevesElecByCompteur, refreshElecReleves, updateReleveElec } from '../services/eauElecReleveService';
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

/**
 * Fait glisser un élément pour que son bord HAUT vienne se placer juste sous le Header
 * partagé (sticky). Réplique le patron de TransactionsPage.toggleTransactionDrawer :
 * une seule animation maison (requestAnimationFrame + ease-in-out cubique) avec cible
 * recalculée à chaque image (suit la barre d'adresse mobile / les changements de hauteur),
 * et respect de `prefers-reduced-motion`.
 */
function scrollElementUnderHeader(el: HTMLElement) {
  const getHeaderOffset = () => {
    const header = document.querySelector('header');
    return header ? header.getBoundingClientRect().height + 8 : 72;
  };
  const getTargetY = () => window.scrollY + el.getBoundingClientRect().top - getHeaderOffset();

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    window.scrollTo({ top: getTargetY(), behavior: 'auto' });
    return;
  }

  const startY = window.scrollY;
  if (Math.abs(getTargetY() - startY) < 2) return; // déjà aligné

  const DURATION = 500;
  const GRACE = 250; // suit une bascule tardive (barre d'adresse mobile)
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const startTime = performance.now();

  const frame = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / DURATION);
    const targetY = getTargetY(); // recalcul continu → auto-correction
    window.scrollTo(0, startY + (targetY - startY) * easeInOutCubic(t));
    const settled = Math.abs(targetY - window.scrollY) < 1;
    if (t < 1 || (!settled && elapsed < DURATION + GRACE)) {
      requestAnimationFrame(frame);
    }
  };
  requestAnimationFrame(frame);
}

export default function EauCompteursReleves({
  preselect,
  preselectFacet,
  onConsumePreselect,
}: {
  /** Compteur à préselectionner (deep-link `?c=` depuis un scan) → ouvre sa saisie. */
  preselect: string | null;
  /**
   * Nature à ouvrir par défaut dans le tiroir Saisir. Deep-link `?tab=elec` (carte
   * « Conso électrique » du tableau de bord) : si `preselect` est absent, on cible le
   * compteur dont le dernier relevé élec est le plus récent (sinon la 1ʳᵉ carte) et on
   * ouvre sa saisie sur la nature « Élec ».
   */
  preselectFacet?: ReleveFacet | null;
  onConsumePreselect: () => void;
}) {
  const { isReadOnly, roles } = useGestionEau();
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
  // Nature forcée du tiroir Saisir pour le compteur ciblé par un deep-link élec.
  const [forcedFacet, setForcedFacet] = useState<{ id: string; facet: ReleveFacet } | null>(null);
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

  // Préselection : dès que les cartes sont chargées, ouvre la saisie du compteur ciblé.
  //  - `?c=<id>` (scan)   → ce compteur, nature « de tête ».
  //  - `?tab=elec`        → compteur au relevé élec le plus récent (sinon 1ʳᵉ carte), nature « Élec ».
  useEffect(() => {
    if (loading || (!preselect && !preselectFacet)) return;

    let targetId: string | null =
      preselect && cards.some((c) => c.item.compteur.id === preselect) ? preselect : null;

    if (!targetId && preselectFacet === 'elec') {
      let bestMs = -Infinity;
      for (const [id, list] of elecMap) {
        if (list.length === 0 || !cards.some((c) => c.item.compteur.id === id)) continue;
        const ms = new Date(list[list.length - 1].timestamp).getTime();
        if (ms > bestMs) {
          bestMs = ms;
          targetId = id;
        }
      }
      if (!targetId) targetId = visibleCards[0]?.item.compteur.id ?? null;
    }

    if (targetId) {
      setOpenKey(`${targetId}:saisir`);
      if (preselectFacet) setForcedFacet({ id: targetId, facet: preselectFacet });
      const el = cardRefs.current.get(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    onConsumePreselect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, preselectFacet, loading, cards]);

  const toggle = (key: string) => {
    setForcedFacet(null); // un clic manuel reprend la nature « de tête » de la carte
    setOpenKey((k) => {
      const next = k === key ? null : key;
      // À l'ouverture d'un tiroir (Saisir ou Historique), glisser la carte sous le Header.
      if (next) {
        const id = key.slice(0, key.lastIndexOf(':'));
        const el = cardRefs.current.get(id);
        if (el) requestAnimationFrame(() => requestAnimationFrame(() => scrollElementUnderHeader(el)));
      }
      return next;
    });
  };

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
              isAdmin={roles.admin}
              forcedFacet={forcedFacet?.id === card.item.compteur.id ? forcedFacet.facet : null}
              onSaved={async () => {
                setOpenKey(null);
                setForcedFacet(null);
                await load();
              }}
              onReload={load}
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
  isAdmin,
  forcedFacet,
  onSaved,
  onReload,
  registerRef,
}: {
  card: ReleveCard;
  openKey: string | null;
  onToggle: (key: string) => void;
  isReadOnly: boolean;
  /** Admin = peut éditer les relevés depuis le tiroir Historique (bouton MODIFIER). */
  isAdmin: boolean;
  /** Nature imposée pour le tiroir Saisir (deep-link élec), sinon null = nature « de tête ». */
  forcedFacet: ReleveFacet | null;
  onSaved: () => void;
  /** Recharge les données sans fermer le tiroir (après une édition admin). */
  onReload: () => Promise<void>;
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
        {/* Résumé cliquable → ouvre/ferme le tiroir Historique (accessible clavier). */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={openKey === histoKey}
          onClick={() => onToggle(histoKey)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(histoKey);
            }
          }}
          className="cursor-pointer rounded-lg -m-1 p-1 transition-colors hover:bg-ahuvi-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-400"
        >
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
        </div>

        {/* Saisir uniquement (Historique = clic sur la carte). stopPropagation pour ne
            pas déclencher le clic-carte qui ouvrirait aussi l'Historique. */}
        <div className="mt-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(saisirKey);
            }}
            disabled={isReadOnly}
            className={`w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              openKey === saisirKey
                ? 'bg-ahuvi-forest text-white'
                : 'bg-ahuvi-50 text-ahuvi-forest hover:bg-ahuvi-100 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" /> Saisir
          </button>
        </div>
      </div>

      {openKey === saisirKey && (
        <Drawer>
          <div className="px-3 pb-3 border-t border-ahuvi-100">
            <EauTiroirSaisie compteur={cp} defaultFacet={forcedFacet ?? headline} onSaved={onSaved} />
          </div>
        </Drawer>
      )}
      {openKey === histoKey && (
        <Drawer>
          <div className="px-3 pb-3 border-t border-ahuvi-100">
            <HistoriqueDrawer card={card} isAdmin={isAdmin} onReload={onReload} />
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

/** Brouillon d'édition d'un relevé (champs texte contrôlés). */
type EditDraft = { index: string; note: string };

/**
 * Tiroir Historique : mini-graphe + 6 derniers relevés (3 empilés, reste au scroll).
 * Pour un compteur dual (relevés eau ET élec), un sélecteur eau/élec permet de
 * consulter les deux séries — même affordance que le tiroir Saisir.
 *
 * Admin (`isAdmin`) : bouton MODIFIER → l'index et la note des 6 relevés listés (par
 * nature affichée) deviennent éditables. Dès le 1ᵉʳ changement le bouton bascule en
 * ENREGISTRER → persistance offline-first idempotente (eau : updateReleveCompteur,
 * élec : updateReleveElec), conso recalculée à la relecture, toast + avis « recalculer
 * les bilans » (l'index modifié change le stock du bassin — recalcul hors périmètre ici).
 */
function HistoriqueDrawer({
  card,
  isAdmin,
  onReload,
}: {
  card: ReleveCard;
  isAdmin: boolean;
  onReload: () => Promise<void>;
}) {
  const { eau, elec, hasEau, hasElec, headline } = card;
  const [facet, setFacet] = useState<ReleveFacet>(headline);
  const dual = hasEau && hasElec;
  const releves: (ReleveCompteurLocal | ElecReleveLocal)[] = facet === 'eau' ? eau : elec;
  const fmt = facet === 'eau' ? fmtM3 : fmtKwh;

  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [saving, setSaving] = useState(false);
  const [showBilanAvis, setShowBilanAvis] = useState(false);

  // Lignes (id, date, index, note, conso) calculées sur la série COMPLÈTE, puis 6 affichées.
  const rows = useMemo(() => {
    const out: { id: string; date: string; index: number; note: string; conso: number | null; rupture: boolean }[] = [];
    for (let i = 0; i < releves.length; i++) {
      const r = releves[i];
      const rupture = !!r.rupture_index;
      const conso = i === 0 || rupture ? null : Math.max(0, r.index - releves[i - 1].index);
      out.push({ id: r.id, date: r.timestamp, index: r.index, note: r.note ?? '', conso, rupture });
    }
    return out.slice(-6).reverse(); // plus récent en premier
  }, [releves]);

  // Changer de nature (eau/élec) annule une édition en cours.
  useEffect(() => {
    setEditing(false);
    setDrafts({});
    setShowBilanAvis(false);
  }, [facet]);

  // Un changement existe dès qu'un champ diffère de sa valeur d'origine.
  const dirty = editing && rows.some((r) => {
    const d = drafts[r.id];
    return d && (d.index !== String(r.index) || d.note !== r.note);
  });

  const enterEdit = () => {
    const seed: Record<string, EditDraft> = {};
    for (const r of rows) seed[r.id] = { index: String(r.index), note: r.note };
    setDrafts(seed);
    setShowBilanAvis(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDrafts({});
  };

  const setDraft = (id: string, patch: Partial<EditDraft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const handleSave = async () => {
    if (saving) return;
    // Ne persister que les lignes réellement modifiées (index et/ou note).
    const toSave: { id: string; patch: { index?: number; note?: string | null } }[] = [];
    for (const r of rows) {
      const d = drafts[r.id];
      if (!d) continue;
      const patch: { index?: number; note?: string | null } = {};
      if (d.index !== String(r.index)) {
        const n = Number(d.index);
        if (!Number.isFinite(n)) {
          toast.error(`Index invalide pour le relevé du ${fmtDate(r.date)}`);
          return;
        }
        patch.index = n;
      }
      if (d.note !== r.note) patch.note = d.note.trim() || null;
      if (Object.keys(patch).length > 0) toSave.push({ id: r.id, patch });
    }
    if (toSave.length === 0) {
      cancelEdit();
      return;
    }

    setSaving(true);
    try {
      for (const { id, patch } of toSave) {
        if (facet === 'eau') await updateReleveCompteur(id, patch);
        else await updateReleveElec(id, patch);
      }
      await onReload();
      setEditing(false);
      setDrafts({});
      setShowBilanAvis(true);
      toast.success(toSave.length > 1 ? `${toSave.length} relevés mis à jour` : 'Relevé mis à jour');
    } catch (e: any) {
      toast.error('Échec de l’enregistrement');
      console.warn('⚠️ [HistoriqueDrawer] update relevé échec:', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const histo = useMemo(
    () =>
      rows
        .filter((r) => r.conso != null)
        .slice()
        .reverse()
        .map((r, i) => ({ i: i + 1, value: r.conso as number })),
    [rows]
  );

  // Sélecteur eau/élec — affiché seulement pour un compteur dual (les deux séries présentes).
  const selecteur = dual ? (
    <div className="inline-flex rounded-lg border border-ahuvi-200 bg-white p-0.5 text-sm">
      <button
        type="button"
        onClick={() => setFacet('eau')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
          facet === 'eau' ? 'bg-ahuvi-teal text-white' : 'text-ahuvi-forest hover:bg-ahuvi-50'
        }`}
      >
        <Droplet className="w-4 h-4" aria-hidden="true" /> Eau
      </button>
      <button
        type="button"
        onClick={() => setFacet('elec')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
          facet === 'elec' ? 'bg-ahuvi-gold text-white' : 'text-ahuvi-forest hover:bg-ahuvi-50'
        }`}
      >
        <Zap className="w-4 h-4" aria-hidden="true" /> Élec
      </button>
    </div>
  ) : null;

  if (releves.length === 0) {
    return (
      <div className="pt-3 space-y-2">
        {selecteur}
        <div className="text-sm text-gray-400 text-center py-2">
          Aucun relevé {facet === 'eau' ? 'eau' : 'élec'} pour ce compteur.
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3 space-y-2">
      {/* Sélecteur eau/élec (gauche) + action admin MODIFIER/ENREGISTRER (droite). */}
      {(selecteur || isAdmin) && (
        <div className="flex items-center justify-between gap-2">
          <div>{selecteur}</div>
          {isAdmin && (
            <button
              type="button"
              onClick={dirty ? handleSave : editing ? cancelEdit : enterEdit}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                dirty
                  ? 'bg-ahuvi-forest text-white hover:bg-ahuvi-forest/90'
                  : editing
                    ? 'bg-ahuvi-100 text-ahuvi-forest hover:bg-ahuvi-200'
                    : 'bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50'
              }`}
            >
              {dirty ? (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" /> ENREGISTRER
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" aria-hidden="true" /> MODIFIER
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Avis post-enregistrement : un index modifié change le stock du bassin. */}
      {showBilanAvis && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Index modifié. Pensez à lancer <strong>« Recalculer tous les bilans »</strong> (onglet Bassin)
            pour mettre à jour le stock du bassin et les écarts.
          </span>
        </div>
      )}

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
      <div className={`overflow-y-auto pr-1 ${editing ? 'max-h-80' : 'max-h-[8.5rem]'}`}>
        <div className="space-y-1">
          {rows.map((r) =>
            editing ? (
              <div
                key={r.id}
                className="rounded-lg border border-ahuvi-200 bg-white px-3 py-2 shadow-sm space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-600">{fmtDate(r.date)}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={drafts[r.id]?.index ?? String(r.index)}
                    onChange={(e) => setDraft(r.id, { index: e.target.value })}
                    aria-label={`Index du relevé du ${fmtDate(r.date)}`}
                    className="w-32 text-right rounded-md border-gray-300 text-sm py-1 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                  />
                </div>
                <input
                  type="text"
                  value={drafts[r.id]?.note ?? r.note}
                  onChange={(e) => setDraft(r.id, { note: e.target.value })}
                  placeholder="Note (facultatif)"
                  aria-label={`Note du relevé du ${fmtDate(r.date)}`}
                  className="w-full rounded-md border-gray-300 text-sm py-1 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                />
              </div>
            ) : (
              <div
                key={r.id}
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
            )
          )}
        </div>
      </div>
    </div>
  );
}
