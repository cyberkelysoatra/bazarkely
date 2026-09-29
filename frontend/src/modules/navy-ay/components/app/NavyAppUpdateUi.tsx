/**
 * NAVY ay phase 3C (decision 59): the pieces of the app update, inside the Android app
 * only. Card "Mise à jour disponible : X (vous avez Y)", the journey sheet (explanation,
 * download progress with "Annuler", Android's permission explained first, errors),
 * "NAVY ay est à jour (X)" once, and the blocking screen for a version no longer
 * supported (prepared, inactive while minimum_version = 1.0.0).
 * Never the word "installer": only "mise à jour", "mettre à jour", "nouvelle version".
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react';
import {
  askUpdatePermission,
  closeJustUpdated,
  closeUpdateFlow,
  continueInChrome,
  startNavyAppUpdate,
  useNavyAppUpdate,
} from '../../services/navyAppUpdate';
import { formatFileSize, updateTitle } from '../../utils/nativeAppRules';
import { btnAccent, btnPrimary, btnSecondary, NavyHelp } from '../ui/NavyUi';

/** "Ce qui change" of version.json, one line per sentence. */
function Notes({ text, className = '' }: { text: string | null; className?: string }) {
  if (!text) return null;
  const [first, ...rest] = text.split('\n');
  return (
    <div className={`space-y-1 text-sm leading-relaxed text-pretty ${className}`}>
      <p>
        <span className="font-semibold">Ce qui change{'\u00a0'}: </span>
        {first}
      </p>
      {rest.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

export function UpdateHelp() {
  return (
    <NavyHelp title="Comment se passe la mise à jour ?">
      <p>La nouvelle version se télécharge dans l’appli. Android vous demande ensuite de confirmer la mise à jour.</p>
      <p>Vous ne perdez rien : votre compte, vos réglages et vos courses restent. Vous n’avez pas à vous reconnecter.</p>
      <p>Le site NAVY ay, lui, se met à jour tout seul : seule l’appli Android a parfois besoin d’une nouvelle version.</p>
    </NavyHelp>
  );
}

/** Card with the button "Mettre à jour" (the /navy/app page and the "Mise à jour" page). */
export function NavyAppUpdateCard({ className = '' }: { className?: string }) {
  const u = useNavyAppUpdate();
  if (!u.inApp || !u.info || !u.installed?.version || (u.status !== 'available' && u.status !== 'required')) return null;
  const size = formatFileSize(u.info.apkSizeBytes);
  return (
    <section className={`rounded-2xl border-2 border-navyay-yellow bg-navyay-yellow/15 p-4 space-y-3 text-navyay-charcoal ${className}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-navyay-charcoal text-navyay-yellow">
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="min-w-0 pt-1 font-bold leading-snug text-balance">{updateTitle(u.info.version, u.installed.version)}</p>
      </div>
      <Notes text={u.info.notesFr} />
      <button type="button" className={`${btnPrimary} w-full`} onClick={startNavyAppUpdate}>
        <Download className="h-5 w-5" aria-hidden="true" />
        <span>
          Mettre à jour{size ? <span className="font-normal"> ({size})</span> : null}
        </span>
      </button>
    </section>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-navyay-charcoal/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label="Téléchargement de la mise à jour"
    >
      <div className="h-full rounded-full bg-navyay-yellow transition-[width] duration-300 ease-out" style={{ width: `${Math.max(2, percent)}%` }} />
    </div>
  );
}

/** The journey, in a sheet over the page. Renders nothing when no update is in progress. */
export function NavyAppUpdateFlow() {
  const u = useNavyAppUpdate();
  const f = u.flow;
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (f) panelRef.current?.focus();
  }, [f?.step]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!u.inApp || !f || !u.info) return null;

  let icon = <Download className="h-7 w-7" aria-hidden="true" />;
  let title = 'Mise à jour de NAVY ay';
  let body: ReactNode = null;
  let actions: ReactNode = null;

  if (f.step === 'chrome-explain') {
    body = (
      <>
        <p>La mise à jour va se télécharger. Ouvrez ensuite le fichier : Android vous demandera de confirmer la <strong>mise à jour</strong>.</p>
        <p>Votre connexion est gardée.</p>
      </>
    );
    actions = (
      <>
        <button type="button" className={`${btnAccent} w-full`} onClick={continueInChrome}>
          Continuer
        </button>
        <button type="button" className={`${btnSecondary} w-full`} onClick={closeUpdateFlow}>
          Plus tard
        </button>
      </>
    );
  } else if (f.step === 'downloading') {
    body = (
      <>
        <p className="font-semibold tabular-nums" aria-live="polite">
          Téléchargement de la mise à jour… {f.percent} %
        </p>
        <ProgressBar percent={f.percent} />
        <p className="text-sm text-navyay-charcoal/75">Vous pouvez rester sur cet écran. NAVY ay vérifie ensuite que le fichier est bien le sien.</p>
      </>
    );
    actions = (
      <button type="button" className={`${btnSecondary} w-full`} onClick={closeUpdateFlow}>
        Annuler
      </button>
    );
  } else if (f.step === 'permission') {
    icon = <ShieldCheck className="h-7 w-7" aria-hidden="true" />;
    title = 'Une autorisation, une seule fois';
    body = (
      <>
        <p>Android va vous demander une autorisation une seule fois, pour que NAVY ay puisse se mettre à jour.</p>
        <p>
          Touchez <strong>« Autoriser »</strong>, puis revenez.
        </p>
        <NavyHelp title="Pourquoi cette autorisation ?">
          <p>NAVY ay ne passe pas par le Play Store : Android demande donc votre accord pour qu’elle puisse se mettre à jour elle-même.</p>
          <p>L’autorisation ne sert qu’aux nouvelles versions de NAVY ay, vérifiées avant chaque mise à jour.</p>
        </NavyHelp>
      </>
    );
    actions = (
      <>
        <button type="button" className={`${btnAccent} w-full`} onClick={() => void askUpdatePermission()}>
          Continuer
        </button>
        <button type="button" className={`${btnSecondary} w-full`} onClick={closeUpdateFlow}>
          Plus tard
        </button>
      </>
    );
  } else if (f.step === 'android') {
    icon = <Smartphone className="h-7 w-7" aria-hidden="true" />;
    body = (
      <p>
        Android vous demande de confirmer : touchez <strong>« Mettre à jour »</strong>. NAVY ay se rouvre ensuite, toujours connectée.
      </p>
    );
    actions = (
      <button type="button" className={`${btnSecondary} w-full`} onClick={closeUpdateFlow}>
        Fermer
      </button>
    );
  } else {
    icon = <AlertTriangle className="h-7 w-7" aria-hidden="true" />;
    title = 'Mise à jour non faite';
    body = <p>{f.message}</p>;
    actions = (
      <>
        <button type="button" className={`${btnAccent} w-full`} onClick={startNavyAppUpdate}>
          Réessayer
        </button>
        <button type="button" className={`${btnSecondary} w-full`} onClick={closeUpdateFlow}>
          Fermer
        </button>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navyay-charcoal/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="navy-update-title">
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-navyay-charcoal shadow-2xl outline-none sm:rounded-3xl"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navyay-yellow text-navyay-charcoal">
            {f.step === 'downloading' ? <Loader2 className="h-7 w-7 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
          </span>
          <h2 id="navy-update-title" className="text-lg font-bold">
            {title}
          </h2>
          <p className="text-sm font-medium text-navyay-charcoal/75">
            Version {u.info.version}
            {u.installed?.version ? ` (vous avez ${u.installed.version})` : ''}
          </p>
        </div>
        <div className="mt-4 space-y-3 text-base leading-relaxed">{body}</div>
        <div className="mt-5 grid gap-2">{actions}</div>
      </div>
    </div>
  );
}

/** "NAVY ay est à jour (X)", once after an update. */
export function NavyAppUpdatedToast() {
  const u = useNavyAppUpdate();
  useEffect(() => {
    if (!u.justUpdated) return;
    const t = window.setTimeout(closeJustUpdated, 8000);
    return () => window.clearTimeout(t);
  }, [u.justUpdated]);
  if (!u.inApp || !u.justUpdated) return null;
  return (
    <div className="relative z-20 mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900" role="status">
      <CheckCircle2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-0">NAVY ay est à jour ({u.justUpdated})</p>
      <button
        type="button"
        onClick={closeJustUpdated}
        className="-mr-2 rounded-lg p-2 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Blocking screen when the installed app is older than minimum_version (inactive today). */
export function NavyAppRequiredScreen() {
  const u = useNavyAppUpdate();
  if (!u.inApp || u.status !== 'required' || !u.info || u.flow) return null;
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-white p-6 text-navyay-charcoal" role="alertdialog" aria-modal="true" aria-labelledby="navy-required-title">
      <div className="w-full max-w-sm space-y-4 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navyay-yellow">
          <RefreshCw className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 id="navy-required-title" className="text-xl font-bold text-balance">
          Cette version de NAVY ay n’est plus prise en charge.
        </h2>
        <p className="leading-relaxed">Mettez-la à jour pour continuer.</p>
        <Notes text={u.info.notesFr} className="text-left" />
        <button type="button" className={`${btnPrimary} w-full`} onClick={startNavyAppUpdate}>
          <Download className="h-5 w-5" aria-hidden="true" /> Mettre à jour
        </button>
      </div>
    </div>
  );
}

/** Small dot on the NAVY menu button (shared header) when a new app is published. */
export function NavyAppUpdateDot() {
  const u = useNavyAppUpdate();
  if (!u.inApp || (u.status !== 'available' && u.status !== 'required')) return null;
  return (
    <span
      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-navyay-charcoal bg-red-500"
      role="img"
      aria-label="Nouvelle version de l’appli disponible"
    />
  );
}
