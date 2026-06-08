/**
 * Centre d'alertes /gestion-eau/alertes (admin) : génération (anomalie, compteur non
 * relevé, bassin critique, fuite), liste avec niveau, marquage lu / traité, et
 * activation des notifications sur l'appareil (réutilise le notificationService partagé).
 */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Bell, BellOff, RefreshCw, Check, Eye, AlertTriangle } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauEmptyState, EauIconButton } from './EauUi';
import { EauReadOnlyBadge } from './EauReadOnly';
import { useGestionEau } from '../context/GestionEauContext';
import { AIDE } from './eauAideTextes';
import {
  listAlertes,
  genererEtNotifier,
  markAlerteLue,
  markAlerteTraitee,
  markAllLues,
} from '../services/eauAlerteService';
import { fmtDate } from '../utils/format';
import notificationService from '../../../services/notificationService';
import type { AlerteLocal, AlerteType } from '../types/gestionEau';

const TYPE_LABEL: Record<AlerteType, string> = {
  anomalie: 'Anomalie',
  fuite: 'Fuite suspectée',
  compteur_non_releve: 'Compteur non relevé',
  bassin_critique: 'Bassin critique',
  flotteur_defaillant: 'Flotteur défaillant',
  debit_instable: 'Débit instable',
};

function niveauClasses(niveau: string | null): string {
  switch (niveau) {
    case 'critique':
      return 'border-rose-300 bg-rose-50';
    case 'warning':
      return 'border-amber-300 bg-amber-50';
    default:
      return 'border-gray-200 bg-white';
  }
}

export default function EauAlertesPage() {
  const { isReadOnly } = useGestionEau();
  const [alertes, setAlertes] = useState<AlerteLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const reload = useCallback(async () => {
    setAlertes(await listAlertes());
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      // Marquer comme lues à l'ouverture du centre (best-effort), puis recharger l'affichage.
      // En lecture seule (promoteur), ne rien écrire en base.
      if (!isReadOnly) {
        await markAllLues();
        await reload();
      }
      setLoading(false);
    })();
  }, [reload, isReadOnly]);

  const generer = async () => {
    if (isReadOnly) return;
    setBusy(true);
    try {
      const created = await genererEtNotifier();
      if (created.length === 0) {
        toast('Aucune nouvelle alerte.', { icon: '✅' });
      } else {
        toast.success(`${created.length} nouvelle(s) alerte(s)`);
      }
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const activerNotifications = async () => {
    try {
      const p = await notificationService.requestPermission();
      setPerm(p);
      if (p === 'granted') {
        await notificationService.initialize();
        toast.success('Notifications activées');
      } else {
        toast.error('Notifications refusées');
      }
    } catch {
      toast.error('Notifications non supportées');
    }
  };

  const traiter = async (a: AlerteLocal) => {
    if (isReadOnly) return;
    await markAlerteTraitee(a.id);
    await reload();
  };

  const basculerLu = async (a: AlerteLocal) => {
    if (isReadOnly) return;
    await markAlerteLue(a.id, !a.lu);
    await reload();
  };

  const actives = alertes.filter((a) => !a.traitee);
  const traitees = alertes.filter((a) => a.traitee);

  return (
    <EauPageShell
      title="Centre d'alertes"
      subtitle="Anomalies, compteurs non relevés, bassin critique, fuites (admin)"
      aide={AIDE.alertes}
      actions={
        isReadOnly ? (
          <EauReadOnlyBadge />
        ) : (
          <EauIconButton icon={RefreshCw} variant="primary" onClick={generer} disabled={busy}>
            Générer
          </EauIconButton>
        )
      }
    >
      {/* Bandeau notifications */}
      <div className="mb-3 rounded-xl border border-ahuvi-100 bg-ahuvi-50/60 p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-ahuvi-800">
          {perm === 'granted' ? <Bell className="w-4 h-4 text-ahuvi-olive" /> : <BellOff className="w-4 h-4 text-gray-400" />}
          <span>
            {perm === 'granted'
              ? 'Notifications activées sur cet appareil.'
              : 'Recevez les alertes en notification sur le téléphone.'}
          </span>
        </div>
        {perm !== 'granted' && (
          <button
            onClick={activerNotifications}
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-ahuvi-forest underline"
          >
            <Bell className="w-3.5 h-3.5" aria-hidden="true" /> Activer
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : alertes.length === 0 ? (
        <EauEmptyState
          icon={AlertTriangle}
          title="Aucune alerte"
          hint={isReadOnly ? 'Aucune alerte à afficher.' : 'Cliquez « Générer » pour analyser les données.'}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800 mb-2 text-sm">À traiter ({actives.length})</h2>
            {actives.length === 0 ? (
              <div className="text-gray-400 text-sm py-4 text-center">Rien à traiter. 👍</div>
            ) : (
              <div className="space-y-2">
                {actives.map((a) => (
                  <div key={a.id} className={`rounded-lg border p-3 shadow-soft ${niveauClasses(a.niveau)} ${!a.lu ? 'ring-1 ring-ahuvi-gold/50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {a.type ? TYPE_LABEL[a.type] : 'Alerte'}
                          {!a.lu && <span className="ml-2 text-[10px] text-ahuvi-gold">● nouveau</span>}
                        </div>
                        <div className="text-sm text-gray-800 mt-0.5">{a.message}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{fmtDate(a.created_at)}</div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => traiter(a)}
                            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded"
                          >
                            <Check className="w-3 h-3" /> Traité
                          </button>
                          <button
                            onClick={() => basculerLu(a)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                          >
                            <Eye className="w-3 h-3" /> {a.lu ? 'Non lu' : 'Lu'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {traitees.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-500 mb-2 text-sm">Traitées ({traitees.length})</h2>
              <div className="space-y-1">
                {traitees.slice(0, 30).map((a) => (
                  <div key={a.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-sm text-gray-500 flex items-center justify-between">
                    <span className="truncate">{a.message}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{fmtDate(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </EauPageShell>
  );
}
