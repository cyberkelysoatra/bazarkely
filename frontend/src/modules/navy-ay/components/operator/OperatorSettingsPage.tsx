/**
 * Operator — "Réglages" (phase 1A): suggested fares (navy_settings) and operators
 * (list, add one by e-mail — the account must already exist). ONLINE ONLY.
 * Phase 2B1: corridor width around the drivers' routes, road distances between grocers
 * (last computation, "Recalculer les distances", OpenRouteService requests this month).
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Headset, Loader2, Map as MapIcon, RefreshCw, Route, Save, Settings, ShieldCheck, Trash2, UserPlus, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import {
  designateOperator,
  distanceStatus,
  findUserByEmail,
  getSettings,
  listDueDocuments,
  listOperators,
  purgeDueDocuments,
  operatorErrorMessage,
  requestDistanceRefresh,
  updateSettings,
} from '../../services/operatorService';
import { ORS_ATTRIBUTION } from '../../utils/parcelRules';
import { navyDb } from '../../db/navyDb';
import { setNavyProfile } from '../../services/navyProfileStore';
import type { NavyDistanceStatus, NavyOperatorEntry, NavySettings } from '../../types/partner';
import { btnPrimary, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const FIELDS: { key: keyof NavySettings; label: string; required: boolean }[] = [
  { key: 'suggested_min_fare', label: 'Chauffeur : prix minimum conseillé', required: true },
  { key: 'suggested_fare_per_5km', label: 'Chauffeur : prix conseillé par tranche de 5 km', required: true },
  { key: 'suggested_depot_fee', label: 'Épicier : tarif de dépôt conseillé', required: false },
  { key: 'suggested_pickup_fee', label: 'Épicier : tarif de retrait conseillé', required: false },
  // Phase 2A: fixed CyberKELY share per parcel.
  { key: 'cyberkely_share', label: 'Part CyberKELY par colis', required: true },
];

const DEFAULT_CORRIDOR_M = 500;

export default function OperatorSettingsPage() {
  const isOnline = useOnlineStatus();
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [omNumber, setOmNumber] = useState('');
  const [operators, setOperators] = useState<NavyOperatorEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [opMsg, setOpMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [corridor, setCorridor] = useState('');
  const [dist, setDist] = useState<NavyDistanceStatus | null>(null);
  const [distBusy, setDistBusy] = useState(false);
  const [distMsg, setDistMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, ops] = await Promise.all([getSettings(), listOperators()]);
      const v: Record<string, string> = {};
      for (const f of FIELDS) v[f.key] = s && s[f.key] != null ? String(s[f.key]) : '';
      setValues(v);
      setOmNumber(s?.orange_money_number ?? '');
      setCorridor(String(s?.corridor_width_m ?? DEFAULT_CORRIDOR_M));
      setOperators(ops);
      setDist(await distanceStatus());
      setDueCount((await listDueDocuments()).length);
    } catch (err) {
      setError(operatorErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const purge = async () => {
    setPurging(true);
    setPurgeMsg(null);
    try {
      const done = await purgeDueDocuments();
      const left = (await listDueDocuments()).length;
      setDueCount(left);
      setPurgeMsg({
        tone: left ? 'error' : 'ok',
        text: left
          ? `${done.length} pièce(s) supprimée(s), ${left} n’ont pas pu l’être. Réessayez plus tard.`
          : `${done.length} pièce(s) supprimée(s).`,
      });
    } catch (err) {
      setPurgeMsg({ tone: 'error', text: operatorErrorMessage(err) });
    } finally {
      setPurging(false);
    }
  };

  const recompute = async () => {
    setDistBusy(true);
    setDistMsg(null);
    try {
      await requestDistanceRefresh();
      setDistMsg({ tone: 'info', text: 'Calcul demandé. Les distances arrivent dans quelques secondes.' });
      // The server answers through the routing service: read again a few seconds later.
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => window.setTimeout(r, 2500));
        const st = await distanceStatus();
        setDist(st);
        if (!st.full_pending) {
          setDistMsg(
            st.last_error
              ? { tone: 'error', text: 'Le service de distances n’a pas répondu. Les prix utilisent la distance estimée en attendant.' }
              : { tone: 'ok', text: 'Distances recalculées.' }
          );
          return;
        }
      }
      setDistMsg({ tone: 'info', text: 'Calcul toujours en cours. Revenez dans un instant.' });
    } catch (err) {
      setDistMsg({ tone: 'error', text: operatorErrorMessage(err) });
    } finally {
      setDistBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values) return;
    const patch: Record<string, number | null> = {};
    for (const f of FIELDS) {
      const raw = values[f.key].replace(/\s/g, '');
      if (raw === '') {
        if (f.required) {
          setError(`Indiquez : ${f.label.toLowerCase()}.`);
          return;
        }
        patch[f.key] = null;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        setError(`Montant invalide : ${f.label.toLowerCase()}.`);
        return;
      }
      patch[f.key] = Math.round(n);
    }
    const width = Number(corridor.replace(/\s/g, ''));
    if (!Number.isFinite(width) || width < 50 || width > 5000) {
      setError('Largeur du couloir : entre 50 et 5 000 mètres.');
      return;
    }
    const om = omNumber.trim();
    if (om && !/^(\+261|0)\d{9}$/.test(om.replace(/[\s.-]/g, ''))) {
      setError('Numéro Orange Money incomplet (10 chiffres, ex. 032 12 345 67).');
      return;
    }
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const saved = await updateSettings({ ...(patch as Partial<NavySettings>), orange_money_number: om || null, corridor_width_m: Math.round(width) });
      await navyDb.kv.put({ key: 'settings', value: saved });
      setNavyProfile({ settings: saved });
      setSavedMsg('Réglages enregistrés.');
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setOpMsg({ tone: 'error', text: 'Adresse e-mail incomplète.' });
      return;
    }
    setAdding(true);
    setOpMsg(null);
    try {
      const u = await findUserByEmail(clean);
      if (!u) {
        setOpMsg({ tone: 'error', text: 'Aucun compte avec cet e-mail. La personne doit d’abord se connecter une fois à l’application.' });
        return;
      }
      await designateOperator(u.user_id);
      setOpMsg({ tone: 'ok', text: `${u.email} est maintenant opératrice.` });
      setEmail('');
      setOperators(await listOperators());
    } catch (err) {
      setOpMsg({ tone: 'error', text: operatorErrorMessage(err) });
    } finally {
      setAdding(false);
    }
  };

  if (!isOnline) {
    return (
      <NavyPage>
        <NavyPageTitle icon={Settings} title="Réglages" />
        <NavyNotice icon={WifiOff}>Cet écran demande une connexion. Réessayez au retour du réseau.</NavyNotice>
      </NavyPage>
    );
  }

  return (
    <NavyPage>
      <NavyPageTitle icon={Settings} title="Réglages" subtitle="Zones, tarifs, couloir, distances, Orange Money et opératrices." />
      {error && <NavyNotice tone="error">{error}</NavyNotice>}

      <Link
        to="/navy/operatrice/zones"
        className="flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-white px-4 py-4 hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
      >
        <MapIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold">Zones</span>
          <span className="block text-sm text-navyay-charcoal/75">Dessiner et ordonner les zones de Nosy Be.</span>
        </span>
        <ChevronRight className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      </Link>

      {!values ? (
        !error && <NavyLoader />
      ) : (
        <NavyCard className="p-4">
          <form onSubmit={save} className="space-y-3" noValidate>
            <h3 className="font-semibold">Tarifs et paiement</h3>
            {FIELDS.map((f) => (
              <label key={f.key} className={labelCls}>
                {f.label}
                <div className="relative">
                  <input
                    className={`${inputCls} pr-10`}
                    inputMode="numeric"
                    value={values[f.key]}
                    placeholder={f.required ? '' : 'Pas encore fixé'}
                    onChange={(e) => setValues((v) => (v ? { ...v, [f.key]: e.target.value } : v))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">Ar</span>
                </div>
              </label>
            ))}
            <label className={labelCls}>
              Numéro Orange Money de CyberKELY
              <input
                className={inputCls}
                inputMode="tel"
                value={omNumber}
                placeholder="Pas encore renseigné"
                onChange={(e) => setOmNumber(e.target.value)}
              />
              <span className="mt-1 block text-xs text-navyay-charcoal/70">
                {omNumber.trim()
                  ? 'Les clients enverront leur paiement à ce numéro.'
                  : 'Tant qu’il est vide, les clients ne peuvent payer qu’en espèces.'}
              </span>
            </label>
            <label className={labelCls}>
              Largeur du couloir autour du trajet des chauffeurs
              <div className="relative">
                <input
                  className={`${inputCls} pr-10`}
                  inputMode="numeric"
                  value={corridor}
                  onChange={(e) => setCorridor(e.target.value)}
                  aria-describedby="navy-corridor-help"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">m</span>
              </div>
              <span id="navy-corridor-help" className="mt-1 block text-xs text-navyay-charcoal/70">
                Un chauffeur reçoit aussi un colis si son trajet passe à moins de cette distance de l’épicerie d’arrivée. Conseillé : 500 m.
              </span>
            </label>
            {savedMsg && <NavyNotice tone="ok">{savedMsg}</NavyNotice>}
            <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              Enregistrer
            </button>
          </form>
        </NavyCard>
      )}

      {dist && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Route className="w-5 h-5" aria-hidden="true" />
            Distances par la route
          </h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-navyay-charcoal/75">Dernier calcul</dt>
            <dd className="text-right font-medium">{dist.computed_at ? new Date(dist.computed_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Jamais'}</dd>
            <dt className="text-navyay-charcoal/75">Épiceries placées</dt>
            <dd className="text-right font-medium tabular-nums">{dist.grocers}</dd>
            <dt className="text-navyay-charcoal/75">Trajets connus</dt>
            <dd className="text-right font-medium tabular-nums">{dist.pairs_route} sur {Math.max(0, dist.grocers * (dist.grocers - 1))}</dd>
            <dt className="text-navyay-charcoal/75">Demandes ce mois-ci</dt>
            <dd className="text-right font-medium tabular-nums" data-testid="navy-ors-month">
              {dist.month_requests}
              <span className="block text-xs font-normal text-navyay-charcoal/70">
                {dist.month_matrix} distances · {dist.month_directions} trajets{dist.month_errors ? ` · ${dist.month_errors} en échec` : ''}
              </span>
            </dd>
          </dl>
          {dist.last_error && (
            <NavyNotice tone="warn">Dernier calcul non abouti. Les prix utilisent la distance estimée (à vol d’oiseau + 30 %) en attendant.</NavyNotice>
          )}
          <button type="button" className={`${btnPrimary} w-full`} disabled={distBusy} onClick={() => void recompute()}>
            {distBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
            Recalculer les distances
          </button>
          {distMsg && <NavyNotice tone={distMsg.tone}>{distMsg.text}</NavyNotice>}
          <NavyHelp title="Comment sont calculées les distances ?">
            <p>Les distances entre épiceries sont calculées par la route (service OpenRouteService), en une seule demande pour toutes les épiceries.</p>
            <p>Quand une épicerie est validée ou déplacée, seules ses distances sont recalculées, toutes seules. Le bouton refait le calcul pour toutes.</p>
            <p>Si le service ne répond pas, NAVY ay utilise la distance à vol d’oiseau + 30 % : aucune commande n’est bloquée.</p>
            <p>Offre gratuite : 500 calculs de distances et 2 000 trajets de chauffeurs par jour. Au-delà, le service refuse (jamais de facture).</p>
          </NavyHelp>
          <p className="text-xs text-navyay-charcoal/75">{ORS_ATTRIBUTION}</p>
        </NavyCard>
      )}

      <NavyCard className="p-4 space-y-3">
        <h3 className="font-semibold">Opératrices</h3>
        {operators === null ? (
          !error && <NavyLoader />
        ) : (
          <ul className="space-y-1.5">
            {operators.map((o) => (
              <li key={o.user_id} className="flex items-center gap-3 rounded-xl bg-navyay-charcoal/[0.04] px-3 py-2">
                {o.is_admin ? <ShieldCheck className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> : <Headset className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                <span className="flex-1 min-w-0 text-sm">
                  <span className="block font-medium truncate">{o.username || o.email}</span>
                  <span className="block text-navyay-charcoal/70 truncate">{o.is_admin ? 'Administrateur' : o.email}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addOperator} className="space-y-2" noValidate>
          <label className={labelCls}>
            Ajouter une opératrice (e-mail de son compte)
            <input className={inputCls} type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {opMsg && <NavyNotice tone={opMsg.tone}>{opMsg.text}</NavyNotice>}
          <button type="submit" disabled={adding} className={`${btnPrimary} w-full`}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <UserPlus className="w-4 h-4" aria-hidden="true" />}
            Ajouter
          </button>
        </form>
      </NavyCard>

      {isOnline && dueCount !== null && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
            Conservation des pièces
          </h3>
          <p className="text-sm text-navyay-charcoal/80">
            {dueCount === 0
              ? 'Aucune pièce arrivée à échéance.'
              : `${dueCount} pièce${dueCount > 1 ? 's' : ''} arrivée${dueCount > 1 ? 's' : ''} à échéance, à supprimer.`}
          </p>
          <button type="button" className={`${btnPrimary} w-full`} disabled={purging || dueCount === 0} onClick={() => void purge()}>
            {purging ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
            Purger les pièces arrivées à échéance{dueCount ? ` (${dueCount})` : ''}
          </button>
          {purgeMsg && <NavyNotice tone={purgeMsg.tone}>{purgeMsg.text}</NavyNotice>}
          <p className="text-xs text-navyay-charcoal/70">
            Règle actuelle : refus définitif et photos remplacées = suppression immédiate ; fin de partenariat = 12 mois après la fin.
            Durées à confirmer par un avocat.
          </p>
        </NavyCard>
      )}

      <NavyHelp title="À quoi servent ces réglages ?">
        <p>Les tarifs conseillés sont proposés aux chauffeurs et aux épiciers. Ils restent libres de fixer leurs propres prix. La grille chauffeur sert aussi de prix de transport maximum payé par le client.</p>
        <p>La part CyberKELY s’ajoute à chaque colis. Un changement ne touche jamais un colis déjà commandé.</p>
        <p>Une opératrice valide les demandes et gère les partenaires. Elle peut aussi ajouter une autre opératrice. La personne doit s’être déjà connectée une fois à l’application.</p>
      </NavyHelp>
    </NavyPage>
  );
}
