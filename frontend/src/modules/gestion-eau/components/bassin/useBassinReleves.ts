/**
 * Hook de données + actions de l'onglet « Bassin » (façon Transactions), extrait de
 * EauBassinReleves lors du découpage v3.62.0. Comportement strictement identique :
 * il porte les états de DONNÉES (config/dimensions/dashboard/relevés/tests/arrêts), les
 * bascules de tiroirs cross-cutting (openDrawer/debitOpen/arretOpen/explainOpen), l'état
 * d'édition admin, et tous les handlers de soumission/mutation. Les états de SAISIE (champs
 * de formulaire) vivent dans les sous-composants pour isoler les re-renders ; les handlers
 * reçoivent donc les valeurs en paramètre + un `reset` appelé à la position d'origine.
 *
 * NE TOUCHE PAS au calcul des bilans (utils/bilan.ts) : consomme `dash` et déclenche
 * addReleveBassin/updateReleveBassin/deleteReleveBassin/recomputeAllBilans.
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useGestionEau } from '../../context';
import { useAppStore } from '../../../../stores/appStore';
import { showConfirm } from '../../../../utils/dialogUtils';
import { getConfig, dimensionsFromConfig } from '../../services/eauConfigService';
import {
  surfaceFromConfig, listDebitTests, addDebitTest,
  listArretsPompe, addArretPompe, deleteArretPompe,
} from '../../services/eauBassinService';
import { getDashboardData, recomputeAllBilans, type DashboardData } from '../../services/eauBilanService';
import {
  addReleveBassin,
  listRecentRelevesBassin,
  updateReleveBassin,
  deleteReleveBassin,
} from '../../services/eauReleveService';
import { hauteurCmToVolumeM3 } from '../../utils/bassin';
import { getCurrentUserIdSync } from '../../services/eauAuth';
import { fmtM3, fmtDate } from '../../utils/format';
import { fmtDuree } from '../../utils/duree';
import { toIsoOrUndefined, isFuture } from '../../utils/dateInput';
import type { ConfigLocal, DebitTestLocal, ReleveBassinLocal, ArretPompeLocal } from '../../types/gestionEau';
import type { BassinDimensions } from '../../utils/bassin';

// Fenêtre glissante (ms) — un releveur pur ne corrige/supprime que les relevés < 48 h
// (borne alignée sur la RLS). Un admin (même cumulé releveur) n'est pas borné.
export const WINDOW_48H_MS = 48 * 60 * 60 * 1000;

/** Période d'arrêt résolue (début/fin/durée) prête à enregistrer. */
export interface ArretResolved {
  debutIso: string;
  finIso: string;
  dureeMin: number;
  future: boolean;
}

/** État d'édition inline d'un relevé (admin/releveur). */
export interface EditingReleve {
  id: string;
  hauteur: string;
  datetime: string;
}

export function useBassinReleves() {
  const { roles, isReadOnly } = useGestionEau();
  const isOnline = useAppStore((s) => s.isOnline);

  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [dim, setDim] = useState<BassinDimensions | null>(null);
  const [surface, setSurface] = useState<number | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [relevesList, setRelevesList] = useState<ReleveBassinLocal[]>([]);
  const [tests, setTests] = useState<DebitTestLocal[]>([]);
  const [arrets, setArrets] = useState<ArretPompeLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Accordéon de la carte Bassin (un seul tiroir à la fois) + sections repliables.
  const [openDrawer, setOpenDrawer] = useState<'saisir' | 'histo' | null>(null);
  const [debitOpen, setDebitOpen] = useState(false);
  const [arretOpen, setArretOpen] = useState(false);
  // Tiroir « comprendre cette situation » sous la carte Stock d'eau (présentationnel).
  const [explainOpen, setExplainOpen] = useState(false);

  // Édition admin/releveur
  const [editing, setEditing] = useState<EditingReleve | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const isReleveurOnly = roles.releveur && !roles.admin;
  const visibleReleves = isReleveurOnly
    ? relevesList.filter((r) => Date.now() - new Date(r.timestamp).getTime() <= WINDOW_48H_MS)
    : relevesList;

  const loadCore = async () => {
    const cfg = await getConfig();
    setConfig(cfg);
    setDim(dimensionsFromConfig(cfg));
    setSurface(surfaceFromConfig(cfg));
    setDash(await getDashboardData());
    setTests(await listDebitTests());
    setArrets(await listArretsPompe());
    if (roles.admin || roles.releveur) setRelevesList(await listRecentRelevesBassin(30));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadCore();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles.admin, roles.releveur]);

  const flotteurCm = useMemo(() => {
    const f = config?.bassin_hauteur_flotteur_m ?? config?.bassin_hauteur_max_m;
    return f != null && f > 0 ? f * 100 : null;
  }, [config]);

  // Historique des tests (du plus ancien au plus récent) pour le graphe en barres.
  const debitChartData = useMemo(
    () => [...tests].reverse().map((t) => ({ label: fmtDate(t.timestamp).slice(0, 5), debit: t.debit_m3h })),
    [tests]
  );

  // Mini-courbe de niveau (6 derniers relevés, du plus ancien au plus récent).
  const niveauChart = useMemo(
    () =>
      relevesList
        .slice(0, 6)
        .slice()
        .reverse()
        .map((r) => ({ x: fmtDate(r.timestamp).slice(0, 5), value: r.volume_m3 })),
    [relevesList]
  );

  const dernierReleve = relevesList[0] ?? null;

  const submitNiveau = async (
    vals: { hauteurCm: string; niveauNote: string; niveauDateTime: string },
    reset: () => void
  ) => {
    if (isReadOnly) return;
    if (!dim) {
      toast.error("Configurez le bassin d'abord");
      return;
    }
    const h = Number(vals.hauteurCm);
    if (!Number.isFinite(h) || h < 0) {
      toast.error('Hauteur invalide');
      return;
    }
    if (isFuture(vals.niveauDateTime)) {
      toast.error('Date dans le futur impossible');
      return;
    }
    const volume = hauteurCmToVolumeM3(h, dim);
    setBusy(true);
    try {
      const { bilan } = await addReleveBassin({
        hauteur_cm: h,
        volume_m3: volume,
        note: vals.niveauNote || null,
        agent_id: getCurrentUserIdSync(),
        timestamp: toIsoOrUndefined(vals.niveauDateTime),
      });
      if (bilan) {
        toast.success(
          bilan.anomalie
            ? `Relevé enregistré — ⚠️ anomalie détectée (écart ${fmtM3(bilan.ecart_m3)})`
            : `Relevé enregistré — bilan OK (écart ${fmtM3(bilan.ecart_m3)})`
        );
      } else {
        toast.success('Relevé enregistré (référence initiale — pas de bilan)');
      }
      reset();
      setOpenDrawer(null);
      await loadCore();
    } finally {
      setBusy(false);
    }
  };

  const submitDebit = async (
    vals: { debitDebutCm: string; debitFinCm: string; debitDureeMin: number | null; debitNote: string },
    reset: () => void
  ) => {
    if (isReadOnly) return;
    if (surface == null) {
      toast.error("Configurez les dimensions du bassin d'abord");
      return;
    }
    if (vals.debitDureeMin == null) {
      toast.error("Renseignez l'heure de début et de fin (fin après début)");
      return;
    }
    setBusy(true);
    try {
      const res = await addDebitTest({
        niveau_debut_cm: Number(vals.debitDebutCm),
        niveau_fin_cm: Number(vals.debitFinCm),
        duree_min: vals.debitDureeMin,
        note: vals.debitNote || null,
        agent_id: getCurrentUserIdSync(),
      });
      toast.success(
        res.instable
          ? `Test enregistré : ${res.test.debit_m3h.toFixed(1)} m³/h — ⚠️ débit instable (écart ${res.ecartPct?.toFixed(0)} %)`
          : `Test enregistré : débit courant ${res.test.debit_m3h.toFixed(1)} m³/h`
      );
      reset();
      setTests(await listDebitTests());
      setDash(await getDashboardData());
    } catch (e: any) {
      toast.error(e?.message ?? 'Test de débit invalide');
    } finally {
      setBusy(false);
    }
  };

  const submitArret = async (
    vals: { arretResolved: ArretResolved | null; arretNote: string },
    reset: () => void
  ) => {
    if (isReadOnly) return;
    if (!vals.arretResolved) {
      toast.error('Renseignez le début et la durée (ou la fin)');
      return;
    }
    if (vals.arretResolved.future) {
      toast.error('Un arrêt dans le futur est impossible');
      return;
    }
    setBusy(true);
    try {
      await addArretPompe({
        timestamp_debut: vals.arretResolved.debutIso,
        timestamp_fin: vals.arretResolved.finIso,
        note: vals.arretNote || null,
        agent_id: getCurrentUserIdSync(),
      });
      toast.success(`Arrêt enregistré (${fmtDuree(vals.arretResolved.dureeMin)})`);
      reset();
      setArrets(await listArretsPompe());
    } catch (e: any) {
      toast.error(e?.message ?? 'Arrêt invalide');
    } finally {
      setBusy(false);
    }
  };

  const removeArret = async (a: ArretPompeLocal) => {
    if (isReadOnly) return;
    const ok = await showConfirm(
      `Supprimer cet arrêt du ${fmtDate(a.timestamp_debut)} (${fmtDuree(a.duree_min)}) ?`,
      'Arrêts de pompe',
      { variant: 'danger', confirmText: 'Supprimer' }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteArretPompe(a.id);
      setArrets(await listArretsPompe());
      toast.success('Arrêt supprimé');
    } catch (e: any) {
      toast.error(e?.message ?? 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  };

  // ── Actions admin/releveur sur un relevé ──
  const saveEdit = async () => {
    if (isReadOnly || !editing) return;
    const h = Number(editing.hauteur);
    if (!Number.isFinite(h) || h < 0) {
      toast.error('Hauteur invalide');
      return;
    }
    if (!editing.datetime.trim() || isFuture(editing.datetime)) {
      toast.error('Date invalide (vide ou dans le futur)');
      return;
    }
    if (isReleveurOnly && Date.now() - new Date(editing.datetime).getTime() > WINDOW_48H_MS) {
      toast.error('Un releveur ne peut dater un relevé que dans les dernières 48 h');
      return;
    }
    setBusy(true);
    try {
      await updateReleveBassin({ id: editing.id, hauteur_cm: h, timestamp: new Date(editing.datetime).toISOString() });
      setEditing(null);
      await loadCore();
      toast.success('Relevé modifié — bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Modification impossible');
    } finally {
      setBusy(false);
    }
  };

  const removeReleve = async (r: ReleveBassinLocal) => {
    if (isReadOnly) return;
    const ok = await showConfirm(
      `Supprimer ce relevé du ${fmtDate(r.timestamp)} (${r.hauteur_cm} cm) ? Les bilans seront recalculés.`,
      'Relevés',
      { variant: 'danger', confirmText: 'Supprimer' }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteReleveBassin(r.id);
      if (editing?.id === r.id) setEditing(null);
      await loadCore();
      toast.success('Relevé supprimé — bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  };

  const recomputeAll = async () => {
    if (isReadOnly) return;
    const ok = await showConfirm(
      'Recalculer TOUS les bilans depuis le début ? Utile pour générer les bilans des relevés importés. Les bilans déjà « traités » repasseront en « non traité ».',
      'Bilans',
      { confirmText: 'Recalculer' }
    );
    if (!ok) return;
    setRecomputing(true);
    try {
      await recomputeAllBilans();
      await loadCore();
      toast.success('Bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Recalcul impossible');
    } finally {
      setRecomputing(false);
    }
  };

  const bilan = dash?.dernierBilan ?? null;
  const anomalie = !!bilan?.anomalie;

  return {
    // contexte / session
    roles,
    isReadOnly,
    isOnline,
    // données
    config,
    dim,
    surface,
    dash,
    relevesList,
    tests,
    arrets,
    loading,
    busy,
    recomputing,
    // tiroirs / bascules
    openDrawer,
    setOpenDrawer,
    debitOpen,
    setDebitOpen,
    arretOpen,
    setArretOpen,
    explainOpen,
    setExplainOpen,
    // édition admin
    editing,
    setEditing,
    // dérivés
    isReleveurOnly,
    visibleReleves,
    dernierReleve,
    bilan,
    anomalie,
    flotteurCm,
    niveauChart,
    debitChartData,
    // actions
    loadCore,
    submitNiveau,
    submitDebit,
    submitArret,
    removeArret,
    saveEdit,
    removeReleve,
    recomputeAll,
  };
}
