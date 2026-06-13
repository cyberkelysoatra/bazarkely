/**
 * Onglet « Apports » de la page Relevés v2 (façon Transactions).
 *
 * Métaphore comptable : un apport = une « entrée » d'eau dans le bassin (revenu).
 * KPI (apports cumulés sur la période choisie) → bouton « Ajouter un apport » (tiroir
 * accordéon : volume m³ + note + date/heure) → liste des derniers apports en cartes
 * (date / volume / note), tri date décroissante, 6 derniers (3 empilés + scroll).
 *
 * Offline-first : `addEntreeBassin` écrit Dexie d'abord (upsert idempotent par id) ;
 * la liste se relit localement. Désactivé en lecture seule (promoteur).
 */
import { ReactNode, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Sprout, Plus, Save, CalendarClock, ArrowDownToLine, Gauge } from 'lucide-react';
import { EauStatCard, EauEmptyState, EauListIcon } from './EauUi';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import { useGestionEau } from '../context';
import { addEntreeBassin, listEntreesBassin, refreshReleves } from '../services/eauReleveService';
import { getDashboardData } from '../services/eauBilanService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { isApportDebitMode } from '../utils/bilan';
import { fmtM3, fmtDate } from '../utils/format';
import type { BilanLocal, EntreeBassinLocal } from '../types/gestionEau';

const PERIODE_KEY = 'ahuvi_releves_periode';
const PERIODES = [
  { key: '7j', days: 7, label: '7 j' },
  { key: '30j', days: 30, label: '30 j' },
  { key: '1an', days: 365, label: '1 an' },
] as const;
type PeriodeKey = (typeof PERIODES)[number]['key'];

// Convertit la valeur d'un <input datetime-local> en ISO, ou undefined si vide.
function toIsoOrUndefined(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// true si la valeur saisie est dans le futur.
function isFuture(local: string): boolean {
  if (!local.trim()) return false;
  const t = new Date(local).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export default function EauApportsReleves({
  autoOpenAdd,
  onConsumeAutoOpen,
}: {
  /** Ouvre le tiroir d'ajout au montage (deep-link `?bt=entree` / raccourci « Ajouter apport »). */
  autoOpenAdd: boolean;
  onConsumeAutoOpen: () => void;
}) {
  const { isReadOnly } = useGestionEau();
  const [entrees, setEntrees] = useState<EntreeBassinLocal[]>([]);
  const [dernierBilan, setDernierBilan] = useState<BilanLocal | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [periode, setPeriode] = useState<PeriodeKey>(() => {
    try {
      const v = localStorage.getItem(PERIODE_KEY);
      if (v === '7j' || v === '30j' || v === '1an') return v;
    } catch {
      /* localStorage indisponible */
    }
    return '30j';
  });

  // Champs du tiroir d'ajout.
  const [volM3, setVolM3] = useState('');
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setEntrees(await listEntreesBassin());
    setDernierBilan((await getDashboardData()).dernierBilan);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (alive) setLoading(false);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await refreshReleves(true);
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

  // Ouvre le tiroir d'ajout sur demande (deep-link / raccourci), une seule fois.
  useEffect(() => {
    if (!autoOpenAdd) return;
    setAddOpen(true);
    onConsumeAutoOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAdd]);

  // KPI : apports cumulés sur la fenêtre choisie.
  const cumulPeriodeM3 = useMemo(() => {
    const days = PERIODES.find((p) => p.key === periode)!.days;
    const sinceMs = Date.now() - days * 86400000;
    return entrees.reduce((acc, e) => (new Date(e.timestamp).getTime() >= sinceMs ? acc + e.volume_m3 : acc), 0);
  }, [entrees, periode]);

  // 6 derniers apports (déjà triés décroissant par listEntreesBassin).
  const recents = useMemo(() => entrees.slice(0, 6), [entrees]);

  // Apport ESTIMÉ du dernier bilan (modèle « flotteur », plafonné au flotteur). Affiché
  // seulement quand il provient de l'estimation (pas d'une entrée manuelle déjà listée
  // au-dessus). Libellé : « réaliste (flotteur) » ou repli « (débit) ».
  const apportEstime = useMemo(() => {
    const b = dernierBilan;
    if (!b || b.apport_m3 == null) return null;
    // Une entrée manuelle (apport == entrees_m3 > 0) est déjà comptée dans la liste.
    const estManuel = (b.entrees_m3 ?? 0) > 0 && Math.abs((b.apport_m3 ?? 0) - (b.entrees_m3 ?? 0)) < 1e-6;
    if (estManuel) return null;
    const debit = isApportDebitMode(b);
    return {
      valeur: b.apport_m3,
      debit,
      date: b.timestamp,
    };
  }, [dernierBilan]);

  const submit = async () => {
    if (isReadOnly || busy) return;
    const v = Number(volM3);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error('Volume invalide');
      return;
    }
    if (isFuture(dateTime)) {
      toast.error('Date dans le futur impossible');
      return;
    }
    setBusy(true);
    try {
      await addEntreeBassin({
        volume_m3: v,
        note: note || null,
        agent_id: getCurrentUserIdSync(),
        timestamp: toIsoOrUndefined(dateTime),
      });
      toast.success(`Apport enregistré : ${fmtM3(v)}`);
      setVolM3('');
      setNote('');
      setDateTime('');
      setAddOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      <EauAide id={AIDE.bassinEntree.id} quoi={AIDE.bassinEntree.quoi} comment={AIDE.bassinEntree.comment} />

      {/* KPI : apports cumulés sur la période. */}
      <EauStatCard
        icon={Sprout}
        tone="emerald"
        label={`Apports cumulés · ${PERIODES.find((p) => p.key === periode)!.label}`}
        value={fmtM3(cumulPeriodeM3)}
        hint="Eau entrée dans le bassin sur la période"
      />

      {/* Apport estimé du dernier bilan (modèle flotteur, plafonné). */}
      {apportEstime && (
        <EauStatCard
          icon={Gauge}
          tone="teal"
          label="Apport estimé · dernier bilan"
          value={fmtM3(apportEstime.valeur)}
          hint={
            apportEstime.debit
              ? `Estimation (débit) — ${fmtDate(apportEstime.date)}`
              : `Estimation réaliste tenant compte de l'arrêt au flotteur — ${fmtDate(apportEstime.date)}`
          }
        />
      )}

      {/* Chips de période (partagées avec l'onglet Compteurs). */}
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

      {/* Bouton + tiroir d'ajout (accordéon). */}
      <div className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden">
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          disabled={isReadOnly}
          className={`w-full inline-flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
            addOpen
              ? 'bg-ahuvi-forest text-white'
              : 'bg-ahuvi-50 text-ahuvi-forest hover:bg-ahuvi-100 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Ajouter un apport
        </button>
        {addOpen && (
          <Drawer>
            <div className="px-3 pb-3 border-t border-ahuvi-100 space-y-3 pt-3">
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Volume entré (m³)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={volM3}
                  onChange={(e) => setVolM3(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="ex : 50"
                  autoFocus
                />
              </label>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
              </label>
              <label className="text-sm block">
                <span className="flex items-center gap-1.5 text-gray-600 mb-1">
                  <CalendarClock className="w-4 h-4" aria-hidden="true" /> Date et heure (optionnel)
                </span>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
                <span className="block text-xs text-gray-500 mt-1">
                  Laisser vide = maintenant. Renseigner pour saisir un apport passé.
                </span>
              </label>
              <button
                onClick={submit}
                disabled={busy || volM3.trim() === '' || isReadOnly}
                className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl"
              >
                <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer l'apport
              </button>
            </div>
          </Drawer>
        )}
      </div>

      {/* Liste des derniers apports (cartes, tri décroissant). */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Derniers apports</div>
        {recents.length === 0 ? (
          <EauEmptyState
            icon={Sprout}
            title="Aucun apport"
            hint="Enregistrez une entrée d'eau dans le bassin avec « Ajouter un apport »."
          />
        ) : (
          <div className="max-h-[14rem] overflow-y-auto pr-1">
            <div className="space-y-2">
              {recents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-xl border border-ahuvi-100 bg-white px-3 py-2.5 shadow-sm"
                >
                  <EauListIcon icon={ArrowDownToLine} tone="emerald" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-emerald-700">{fmtM3(e.volume_m3)}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {fmtDate(e.timestamp)}
                      {e.note ? ` · ${e.note}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
