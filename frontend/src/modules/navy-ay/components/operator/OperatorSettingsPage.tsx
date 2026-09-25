/**
 * Operator — "Réglages" (phase 1A): suggested fares (navy_settings) and operators
 * (list, add one by e-mail — the account must already exist). ONLINE ONLY.
 */
import { useCallback, useEffect, useState } from 'react';
import { Headset, Loader2, Save, Settings, ShieldCheck, Trash2, UserPlus, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import {
  designateOperator,
  findUserByEmail,
  getSettings,
  listDueDocuments,
  listOperators,
  purgeDueDocuments,
  operatorErrorMessage,
  updateSettings,
} from '../../services/operatorService';
import { navyDb } from '../../db/navyDb';
import { setNavyProfile } from '../../services/navyProfileStore';
import type { NavyOperatorEntry, NavySettings } from '../../types/partner';
import { btnPrimary, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const FIELDS: { key: keyof NavySettings; label: string; required: boolean }[] = [
  { key: 'suggested_min_fare', label: 'Chauffeur : prix minimum conseillé', required: true },
  { key: 'suggested_fare_per_5km', label: 'Chauffeur : prix conseillé par tranche de 5 km', required: true },
  { key: 'suggested_depot_fee', label: 'Épicier : tarif de dépôt conseillé', required: false },
  { key: 'suggested_pickup_fee', label: 'Épicier : tarif de retrait conseillé', required: false },
];

export default function OperatorSettingsPage() {
  const isOnline = useOnlineStatus();
  const [values, setValues] = useState<Record<string, string> | null>(null);
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

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, ops] = await Promise.all([getSettings(), listOperators()]);
      const v: Record<string, string> = {};
      for (const f of FIELDS) v[f.key] = s && s[f.key] != null ? String(s[f.key]) : '';
      setValues(v);
      setOperators(ops);
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
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const saved = await updateSettings(patch as Partial<NavySettings>);
      await navyDb.kv.put({ key: 'settings', value: saved });
      setNavyProfile({ settings: saved });
      setSavedMsg('Tarifs conseillés enregistrés.');
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
      <NavyPageTitle icon={Settings} title="Réglages" subtitle="Tarifs conseillés et opératrices." />
      {error && <NavyNotice tone="error">{error}</NavyNotice>}

      {!values ? (
        !error && <NavyLoader />
      ) : (
        <NavyCard className="p-4">
          <form onSubmit={save} className="space-y-3" noValidate>
            <h3 className="font-semibold">Tarifs conseillés</h3>
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
            {savedMsg && <NavyNotice tone="ok">{savedMsg}</NavyNotice>}
            <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              Enregistrer
            </button>
          </form>
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
        <p>Les tarifs conseillés sont proposés aux chauffeurs et aux épiciers. Ils restent libres de fixer leurs propres prix.</p>
        <p>Une opératrice valide les demandes et gère les partenaires. Elle peut aussi ajouter une autre opératrice. La personne doit s’être déjà connectée une fois à l’application.</p>
      </NavyHelp>
    </NavyPage>
  );
}
