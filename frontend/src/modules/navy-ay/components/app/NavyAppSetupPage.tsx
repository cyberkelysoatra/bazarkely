/**
 * NAVY ay Android app 1.1.0+ (phase 3B, decision 56 (6)): guided set-up of an approved
 * driver, one step per screen, in plain French:
 *   1. notifications, 2. position "Toujours", 3. full-screen alert (Android 14+),
 *   4. battery saving removed (+ the manufacturer's own screens: Tecno, Infinix, Itel,
 *      Samsung, Xiaomi), 5. final test: screen off 2 minutes, then "Nous avons reçu X
 *      positions sur Y" from the native service's own log.
 * Opened by itself at the first launch and when a permission is taken back
 * (NavyAppBackground), and from the NAVY menu ("Réglages de l'appli").
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BatteryCharging,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LocateFixed,
  MonitorSmartphone,
  PhoneIncoming,
  Send,
  Rocket,
  Settings2,
  Smartphone,
  Timer,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import { useNavyProfile } from '../../services/navyProfileStore';
import { useDriverState } from '../../services/driverService';
import { getNativePermissions, getNativeTrackingStatus, hasNativeReport, hasNavyNative, isNativeApp, requestNativePermission } from '../../services/nativeApp';
import { formatMinutes, sendAppReport, type AppReportResult } from '../../services/appReportService';
import { isLocalAvailable } from '../../utils/geo';
import { NAVY_APP_PAGE } from '../../utils/nativeAppRules';
import {
  nextSetupStep,
  phoneBrand,
  stepAfterUpdate,
  screenOffTestResult,
  SETUP_STEPS,
  SETUP_TEST_MS,
  stepDone,
  type NativePermissions,
  type PhoneBrand,
  type SetupStepId,
} from '../../utils/backgroundRules';
import { isSetupCompleted, markSetupCompleted } from './NavyAppBackground';
import { btnAccent, btnPrimary, btnSecondary, NavyCard, NavyHelp, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const TEST_KEY = 'navy-app-setup-test';

interface TestState {
  startedAt: number;
  result?: { received: number; expected: number; ok: boolean; tooShort: boolean; at: number };
}

function readTest(): TestState | null {
  try {
    const v = JSON.parse(localStorage.getItem(TEST_KEY) || 'null');
    return v && typeof v.startedAt === 'number' ? (v as TestState) : null;
  } catch {
    return null;
  }
}

function writeTest(t: TestState | null) {
  try {
    if (t) localStorage.setItem(TEST_KEY, JSON.stringify(t));
    else localStorage.removeItem(TEST_KEY);
  } catch {
    // kept in memory only
  }
}

const STEP_META: Record<SetupStepId, { short: string; title: string; icon: typeof Bell }> = {
  notifications: { short: 'Notifications', title: 'Les notifications', icon: Bell },
  location: { short: 'Position', title: 'La position « Toujours »', icon: LocateFixed },
  fullscreen: { short: 'Plein écran', title: 'L’alerte plein écran', icon: PhoneIncoming },
  battery: { short: 'Batterie', title: 'L’économie de batterie', icon: BatteryCharging },
  test: { short: 'Test', title: 'Le test final', icon: Timer },
};

const BRAND_TIPS: Record<PhoneBrand, { name: string; steps: string[] }> = {
  tecno: {
    name: 'Tecno',
    steps: [
      'Ouvrez « Phone Master », puis « Gestion du démarrage » (ou « Lancement auto ») et activez NAVY ay.',
      'Dans les applis récentes (carré en bas de l’écran), faites glisser NAVY ay vers le bas : un cadenas apparaît.',
    ],
  },
  infinix: {
    name: 'Infinix',
    steps: [
      'Ouvrez « Phone Master », puis « Gestion du démarrage » et activez NAVY ay.',
      'Dans les applis récentes, faites glisser NAVY ay vers le bas pour la verrouiller (cadenas).',
    ],
  },
  itel: {
    name: 'Itel',
    steps: [
      'Ouvrez « Phone Master » (ou « Gestionnaire du téléphone »), « Démarrage automatique », et activez NAVY ay.',
      'Dans les applis récentes, verrouillez NAVY ay (glisser vers le bas ou cadenas).',
    ],
  },
  samsung: {
    name: 'Samsung',
    steps: [
      'Paramètres › Applications › NAVY ay › Batterie : choisissez « Non restreinte ».',
      'Paramètres › Batterie › Limites d’utilisation en arrière-plan : NAVY ay ne doit pas être dans les applis en veille.',
    ],
  },
  xiaomi: {
    name: 'Xiaomi, Redmi, Poco',
    steps: [
      'Paramètres › Applications › NAVY ay : « Démarrage automatique » activé, « Économiseur de batterie » sur « Aucune restriction ».',
      'Dans les applis récentes, appuyez longtemps sur NAVY ay et touchez le cadenas.',
    ],
  },
  autre: {
    name: 'Autre téléphone',
    steps: [
      'Paramètres › Applications › NAVY ay › Batterie : « Non restreinte » ou « Aucune restriction ».',
      'Si votre téléphone a un « lancement automatique » ou « démarrage automatique », activez-le pour NAVY ay.',
    ],
  },
};

function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function NavyAppSetupPage() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const driver = useDriverState();
  const navigate = useNavigate();
  const afterUpdate = new URLSearchParams(useLocation().search).has('apres-mise-a-jour');
  const native = hasNavyNative();
  const approved = profile.partners.some((p) => p.kind === 'chauffeur' && p.status === 'approved');
  const [perms, setPerms] = useState<NativePermissions | null>(null);
  const [test, setTest] = useState<TestState | null>(readTest);
  const [step, setStep] = useState<SetupStepId | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tracking, setTracking] = useState<{ running: boolean; intervalMs: number } | null>(null);
  const [report, setReport] = useState<AppReportResult | 'sending' | null>(null);

  const testPassed = !!test?.result?.ok;
  const refresh = useCallback(async () => {
    if (!native) return;
    try {
      const p = await getNativePermissions();
      setPerms(p);
      setStep((cur) => cur ?? (afterUpdate ? stepAfterUpdate(p) : null) ?? nextSetupStep(p, !!readTest()?.result?.ok) ?? 'test');
    } catch {
      /* next time */
    }
    try {
      const s = await getNativeTrackingStatus();
      setTracking({ running: s.running, intervalMs: s.intervalMs || 30_000 });
    } catch {
      /* next time */
    }
  }, [native, afterUpdate]);

  // Android settings pages come back here: read the permissions again each time.
  useEffect(() => {
    void refresh();
    const onVis = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVis);
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(t);
    };
  }, [refresh]);

  // Final test: evaluated once 2 minutes have passed (the driver comes back to the app).
  useEffect(() => {
    if (!native || !test || test.result || now - test.startedAt < SETUP_TEST_MS) return;
    let stop = false;
    void getNativeTrackingStatus()
      .then((s) => {
        if (stop) return;
        const end = Date.now();
        const r = screenOffTestResult(s.sends ?? [], test.startedAt, end, s.intervalMs || 30_000);
        const next: TestState = { startedAt: test.startedAt, result: { ...r, at: end } };
        writeTest(next);
        setTest(next);
        if (r.ok && userId) markSetupCompleted(userId);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [native, test, now, userId]);

  const status = driver.userId === userId ? driver.status : null;
  const available = isLocalAvailable(status, now);
  const brand = useMemo(() => (perms ? phoneBrand(perms) : 'autre'), [perms]);

  if (!isNativeApp() || !native) {
    return (
      <NavyPage>
        <NavyPageTitle icon={Smartphone} title="Réglages de l’appli" />
        <NavyNotice icon={Smartphone}>
          {isNativeApp()
            ? 'Mettez à jour l’appli NAVY ay pour recevoir les courses écran éteint.'
            : 'Ces réglages concernent l’appli Android NAVY ay.'}
        </NavyNotice>
        <Link to={NAVY_APP_PAGE} className={btnAccent}>
          {isNativeApp() ? 'Mettre à jour l’appli' : 'Installer l’appli NAVY ay'}
        </Link>
      </NavyPage>
    );
  }
  if (!approved) {
    return (
      <NavyPage>
        <NavyPageTitle icon={Smartphone} title="Réglages de l’appli" />
        <NavyNotice>Ces réglages servent aux chauffeurs validés : ils permettent de recevoir les courses écran éteint.</NavyNotice>
      </NavyPage>
    );
  }
  if (!perms || !step) {
    return (
      <NavyPage>
        <NavyPageTitle icon={Smartphone} title="Réglages de l’appli" />
        <p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Lecture des réglages du téléphone…</p>
      </NavyPage>
    );
  }

  const index = SETUP_STEPS.indexOf(step);
  const done = (s: SetupStepId) => stepDone(s, perms, testPassed);
  const act = async (fn: () => Promise<NativePermissions & { opened?: string }>) => {
    setBusy(true);
    try {
      setPerms(await fn());
    } catch {
      /* the driver can try again */
    } finally {
      setBusy(false);
    }
  };
  const goNext = () => setStep(SETUP_STEPS[Math.min(SETUP_STEPS.length - 1, index + 1)]);
  const goPrev = () => setStep(SETUP_STEPS[Math.max(0, index - 1)]);
  const meta = STEP_META[step];
  const Icon = meta.icon;
  const allDone = SETUP_STEPS.every(done);
  const finish = () => {
    if (userId) markSetupCompleted(userId);
    navigate('/navy/direction');
  };
  const reviewStep: SetupStepId = !perms.batteryExempt ? 'battery' : perms.location !== 'always' ? 'location' : 'battery';

  let body: ReactNode = null;
  if (step === 'notifications') {
    body = (
      <>
        <p>Une course ne vous attend que 30 secondes. NAVY ay doit pouvoir vous prévenir, même quand le téléphone est dans votre poche.</p>
        {!done('notifications') && (
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void act(() => requestNativePermission('notifications'))}>
            <Bell className="w-5 h-5" aria-hidden="true" /> Autoriser les notifications
          </button>
        )}
      </>
    );
  } else if (step === 'location') {
    body = (
      <>
        <p>Pendant que vous êtes disponible, et pendant une course, NAVY ay envoie votre position toutes les 30 secondes, même écran éteint.</p>
        <p className="text-sm text-navyay-charcoal/80">
          Dans la page qui s’ouvre, touchez « Position » puis choisissez <strong>« Toujours autoriser »</strong>. Si vous choisissez « Seulement pendant l’utilisation », la position s’arrête dès que l’écran s’éteint.
        </p>
        {perms.location === 'none' && (
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void act(() => requestNativePermission('location'))}>
            <LocateFixed className="w-5 h-5" aria-hidden="true" /> Autoriser la position
          </button>
        )}
        {perms.location === 'foreground' && (
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void act(() => requestNativePermission('backgroundLocation'))}>
            <LocateFixed className="w-5 h-5" aria-hidden="true" /> Choisir « Toujours autoriser »
          </button>
        )}
      </>
    );
  } else if (step === 'fullscreen') {
    body = (
      <>
        <p>Quand une course arrive, l’écran s’allume et le téléphone sonne comme pour un appel, même verrouillé. Vous répondez « Accepter » ou « Refuser ».</p>
        {!done('fullscreen') && (
          <>
            <p className="text-sm text-navyay-charcoal/80">Dans la page qui s’ouvre, activez l’autorisation pour NAVY ay, puis revenez ici.</p>
            <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void act(() => requestNativePermission('fullScreen'))}>
              <PhoneIncoming className="w-5 h-5" aria-hidden="true" /> Ouvrir le réglage
            </button>
          </>
        )}
      </>
    );
  } else if (step === 'battery') {
    const tips = BRAND_TIPS[brand];
    body = (
      <>
        <p>Pour économiser la batterie, le téléphone peut endormir NAVY ay quand l’écran est éteint. Il faut l’en empêcher, sinon vous ne recevez plus les courses.</p>
        {!perms.batteryExempt && (
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void act(() => requestNativePermission('battery'))}>
            <BatteryCharging className="w-5 h-5" aria-hidden="true" /> Laisser NAVY ay actif
          </button>
        )}
        <div className="space-y-2 border-t border-navyay-charcoal/10 pt-4">
          <p className="font-semibold">Sur votre téléphone {tips.name}</p>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm">
            {tips.steps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <button type="button" className={`${btnSecondary} w-full`} disabled={busy} onClick={() => void act(() => requestNativePermission('autostart'))}>
            <Rocket className="w-5 h-5" aria-hidden="true" /> Lancement automatique
          </button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Autres marques</summary>
          <div className="mt-2 space-y-3">
            {(Object.keys(BRAND_TIPS) as PhoneBrand[])
              .filter((b) => b !== brand)
              .map((b) => (
                <div key={b}>
                  <p className="font-semibold">{BRAND_TIPS[b].name}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {BRAND_TIPS[b].steps.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </details>
      </>
    );
  } else {
    const running = test && !test.result;
    const elapsed = running ? now - test.startedAt : 0;
    body = (
      <>
        <p>Vérifions que votre position part bien écran éteint.</p>
        {!available ? (
          <>
            <NavyNotice icon={Settings2}>Pour le test, passez d’abord « Disponible » dans Ma direction, puis revenez ici par le menu (Réglages de l’appli).</NavyNotice>
            <Link to="/navy/direction" className={`${btnAccent} w-full`}>Ma direction</Link>
          </>
        ) : test?.result ? (
          <div className="space-y-3" aria-live="polite">
            <p className="text-lg">
              Nous avons reçu <strong>{test.result.received}</strong> position{test.result.received > 1 ? 's' : ''} sur <strong>{test.result.expected}</strong>.
            </p>
            {test.result.ok ? (
              <p className="flex items-center gap-2 text-lg font-bold">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" /> Ça marche
              </p>
            ) : (
              <>
                <p className="flex items-center gap-2 font-bold">
                  <XCircle className="w-6 h-6" aria-hidden="true" /> Des positions manquent
                </p>
                <p className="text-sm">Revoyez l’étape « {STEP_META[reviewStep].short} », puis refaites le test.</p>
                <button type="button" className={`${btnSecondary} w-full`} onClick={() => setStep(reviewStep)}>
                  Revoir l’étape {STEP_META[reviewStep].short}
                </button>
              </>
            )}
            <button
              type="button"
              className={`${btnSecondary} w-full`}
              onClick={() => {
                writeTest(null);
                setTest(null);
              }}
            >
              Refaire le test
            </button>
          </div>
        ) : running ? (
          <div className="space-y-3" aria-live="polite">
            <p className="text-5xl font-bold tabular-nums text-center">{formatClock(Math.max(0, SETUP_TEST_MS - elapsed))}</p>
            <p className="text-center">
              {elapsed < SETUP_TEST_MS ? 'Éteignez l’écran maintenant et posez le téléphone. Rallumez-le après 2 minutes.' : 'Lecture du résultat…'}
            </p>
          </div>
        ) : (
          <>
            {!tracking?.running && <NavyNotice>Le partage de la position démarre… Patientez quelques secondes.</NavyNotice>}
            <button
              type="button"
              className={`${btnAccent} w-full`}
              disabled={!tracking?.running}
              onClick={() => {
                const t: TestState = { startedAt: Date.now() };
                writeTest(t);
                setTest(t);
              }}
            >
              <Timer className="w-5 h-5" aria-hidden="true" /> Démarrer le test (2 minutes)
            </button>
          </>
        )}
      </>
    );
  }

  return (
    <NavyPage>
      <NavyPageTitle icon={Smartphone} title="Réglages de l’appli" subtitle="Pour recevoir les courses écran éteint" />
      {afterUpdate && (
        <NavyNotice tone={stepAfterUpdate(perms) ? 'warn' : 'ok'}>
          {stepAfterUpdate(perms)
            ? `NAVY ay vient d’être mise à jour. Android a remis à zéro le réglage « ${STEP_META[stepAfterUpdate(perms)!].title} » : réactivez-le ci-dessous, puis revenez ici.`
            : 'Tout est de nouveau réglé après la mise à jour. Vous recevrez les courses écran éteint.'}
        </NavyNotice>
      )}

      <ol className="grid grid-cols-5 gap-1" aria-label="Étapes">
        {SETUP_STEPS.map((s, i) => {
          const isCur = s === step;
          const ok = done(s);
          return (
            <li key={s} className="min-w-0">
              <button
                type="button"
                onClick={() => setStep(s)}
                aria-current={isCur ? 'step' : undefined}
                className={`w-full flex flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-charcoal ${
                  isCur ? 'bg-navyay-charcoal text-white' : 'text-navyay-charcoal'
                }`}
              >
                {ok ? (
                  <CheckCircle2 className={`w-6 h-6 ${isCur ? 'text-navyay-yellow' : ''}`} aria-hidden="true" />
                ) : (
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums ${
                      isCur ? 'border-navyay-yellow text-navyay-yellow' : 'border-navyay-charcoal/40'
                    }`}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                )}
                <span className="block w-full truncate text-center text-[10px] font-semibold leading-tight">{STEP_META[s].short}</span>
                <span className="sr-only">{`Étape ${i + 1}${ok ? ', faite' : ', à faire'}`}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <NavyCard className="p-5 space-y-4">
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-navyay-yellow/25">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navyay-yellow">
              <Icon className="w-8 h-8 text-navyay-charcoal" aria-hidden="true" />
            </span>
            {done(step) && (
              <CheckCircle2 className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-white text-navyay-charcoal" aria-label="Fait" />
            )}
          </span>
          <p className="text-sm font-medium text-navyay-charcoal/75">Étape {index + 1} sur {SETUP_STEPS.length}</p>
          <h2 className="text-xl font-bold">{meta.title}</h2>
        </div>
        <div className="space-y-3">{body}</div>
        {done(step) && step !== 'test' && (
          <p className="flex items-center gap-2 font-semibold" aria-live="polite">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> C’est fait.
          </p>
        )}
      </NavyCard>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btnSecondary} disabled={index === 0} onClick={goPrev}>
          <ChevronLeft className="w-5 h-5" aria-hidden="true" /> Précédent
        </button>
        {step !== 'test' ? (
          <button type="button" className={btnPrimary} onClick={goNext}>
            Suivant <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className={btnPrimary} onClick={finish}>
            {allDone || isSetupCompleted(userId ?? '') ? 'Terminer' : 'Plus tard'}
          </button>
        )}
      </div>

      {hasNativeReport() && (
        <NavyCard className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-bold">Rapport de l’appli</h2>
              <p className="mt-0.5 text-sm text-navyay-charcoal/80 leading-relaxed">
                Batterie, écran allumé ou éteint, positions envoyées pendant vos 48 dernières heures. Jamais l’endroit où vous étiez.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`${btnSecondary} w-full`}
            disabled={report === 'sending'}
            onClick={() => {
              setReport('sending');
              void sendAppReport(false).then(setReport);
            }}
          >
            {report === 'sending' ? <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
            Envoyer mon rapport
          </button>
          {report && report !== 'sending' && (
            <p className="text-sm" aria-live="polite">
              {report.kind === 'sent'
                ? `Rapport envoyé, merci : ${formatMinutes(report.summary.screenOffMinutes)} écran éteint${
                    report.summary.drainPctPerHour != null ? `, ${String(report.summary.drainPctPerHour).replace('.', ',')} % de batterie par heure` : ''
                  }, ${report.summary.positionsSent} positions sur ${report.summary.positionsExpected} attendues.`
                : report.kind === 'empty'
                  ? 'Pas encore assez de relevés : passez « Disponible » un moment, puis réessayez.'
                  : 'Le rapport n’est pas parti. Vérifiez votre connexion, puis réessayez.'}
            </p>
          )}
          <p className="text-xs text-navyay-charcoal/75">Il part aussi tout seul quand vous passez « Pas disponible » après au moins 20 minutes écran éteint.</p>
        </NavyCard>
      )}

      <NavyHelp title="Pourquoi ces réglages ?">
        <p>Sans eux, Android endort NAVY ay quand l’écran s’éteint : votre position ne part plus et les courses ne sonnent pas.</p>
        <p>La position n’est envoyée que lorsque vous êtes « Disponible » ou pendant une course. Une notification permanente vous le rappelle, avec un bouton « Pas disponible ».</p>
        <p>Après 1 heure sans bouger (sans course), NAVY ay vous passe « Pas disponible » et vous prévient.</p>
        <p>Vous pouvez rouvrir cet écran à tout moment : menu en haut à droite, « Réglages de l’appli ».</p>
      </NavyHelp>
      <p className="flex items-center gap-2 text-xs text-navyay-charcoal/75">
        <MonitorSmartphone className="w-4 h-4" aria-hidden="true" />
        Appli {perms.appVersion ?? ''} · Android {perms.sdk ?? ''}
      </p>
    </NavyPage>
  );
}
