/**
 * Public page of the NAVY ay Android app: 1sakely.org/navy/app (phase 3A), reachable
 * WITHOUT sign-in. Phase 3C (decision 59 (2)): two cases, never confused.
 *  - Opened INSIDE the app: it only speaks of updating ("NAVY ay est à jour (X)" +
 *    "Vérifier maintenant", or the update card). No download or installation wording.
 *  - Opened in a browser (the site cannot know whether the app is on the phone):
 *      Android: first a card "Vous avez déjà NAVY ay ?" with "Ouvrir l'appli pour la mettre
 *      à jour" (intent link: opens the app if present, else Chrome comes back here with
 *      ?appli=absente and says so); BELOW only, set apart, "Première installation" with
 *      the download button, 3 steps, ⓘ help and QR code.
 *      Computer / iPhone: "L'appli NAVY ay existe pour Android", no intent button.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Download, Loader2, Monitor, RefreshCw, ShieldCheck, Smartphone, SmartphoneNfc } from 'lucide-react';
import { NavyWordmark } from '../NavyLogo';
import { NavyHelp, NavyNotice, btnAccent, btnPrimary, btnSecondary } from '../ui/NavyUi';
import { fetchNavyAppVersionInfo } from '../../services/navyAppVersion';
import { isNativeApp } from '../../services/nativeApp';
import { checkNavyAppUpdate, startNavyAppUpdates, useNavyAppUpdate } from '../../services/navyAppUpdate';
import { NAVY_APK_URL, NAVY_APP_PAGE, formatFileSize, lastCheckLabel, openAppIntentUrl, type NavyAppVersionInfo } from '../../utils/nativeAppRules';
import { NavyAppUpdateCard, NavyAppUpdateFlow, NavyAppUpdatedToast, UpdateHelp } from './NavyAppUpdateUi';

const PAGE_URL = `https://1sakely.org${NAVY_APP_PAGE}`;

const STEPS = [
  {
    icon: Download,
    title: 'Télécharger',
    text: 'Touchez le bouton jaune. Le fichier « navy-ay.apk » arrive dans vos téléchargements.',
  },
  {
    icon: ShieldCheck,
    title: 'Autoriser l’installation depuis Chrome',
    text: 'Ouvrez le fichier. Si le téléphone le demande, touchez « Paramètres », activez « Autoriser cette source » pour Chrome, puis revenez.',
  },
  {
    icon: Smartphone,
    title: 'Ouvrir',
    text: 'Touchez « Installer » puis « Ouvrir ». Connectez-vous avec Google, comme sur le site.',
  },
];

type Device = 'android' | 'ios' | 'computer';
function detectDevice(): Device {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'computer';
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navyay-charcoal selection:bg-navyay-yellow selection:text-navyay-charcoal">
      <div className="h-1.5 bg-navyay-yellow" aria-hidden="true" />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex justify-center">
            <Link to="/navy" aria-label="NAVY ay, accueil">
              <NavyWordmark className="h-14 w-auto max-w-full" />
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Inside the app: update only. */
function InAppUpdatePage() {
  const u = useNavyAppUpdate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    startNavyAppUpdates();
  }, []);

  const upToDate = u.status === 'up-to-date' && !!u.installed?.version;
  return (
    <PageShell>
      <h1 className="mt-8 text-center text-2xl font-bold leading-tight text-balance">Mise à jour de l’appli</h1>
      <div className="mt-4">
        <NavyAppUpdatedToast />
      </div>
      <div className="mt-4 space-y-4">
        {upToDate ? (
          <section className="rounded-2xl border border-navyay-charcoal/10 bg-white p-5 text-center" aria-live="polite">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navyay-yellow">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-3 text-lg font-bold">NAVY ay est à jour ({u.installed!.version})</p>
            {lastCheckLabel(u.lastCheck) && <p className="mt-1 text-sm text-navyay-charcoal/75">{lastCheckLabel(u.lastCheck)}</p>}
          </section>
        ) : u.status === 'available' || u.status === 'required' ? (
          <NavyAppUpdateCard />
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Recherche d’une nouvelle version…
          </p>
        )}
        {checked && u.checkFailed && !u.checking && (
          <p className="text-sm text-center" role="alert">
            Vérification impossible pour l’instant : vérifiez votre connexion, puis réessayez.
          </p>
        )}
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          disabled={u.checking}
          onClick={() => {
            setChecked(true);
            void checkNavyAppUpdate(true);
          }}
        >
          {u.checking ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RefreshCw className="h-5 w-5" aria-hidden="true" />}
          Vérifier maintenant
        </button>
        <UpdateHelp />
        <Link to="/navy" className={`${btnPrimary} w-full`}>
          Revenir à NAVY ay
        </Link>
      </div>
      <NavyAppUpdateFlow />
    </PageShell>
  );
}

/** In a browser: "you already have it?" first, then the first installation. */
function BrowserPage() {
  const [info, setInfo] = useState<NavyAppVersionInfo | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const location = useLocation();
  const device = detectDevice();
  const absent = new URLSearchParams(location.search).get('appli') === 'absente';

  useEffect(() => {
    let cancelled = false;
    fetchNavyAppVersionInfo().then((v) => {
      if (!cancelled) setInfo(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    import('qrcode').then(({ default: QRCode }) => {
      if (cancelled || !qrRef.current) return;
      QRCode.toCanvas(qrRef.current, PAGE_URL, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#4A4A4A', light: '#FFFFFF' },
      }).catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const size = formatFileSize(info?.apkSizeBytes);
  const apkUrl = info?.apkUrl || NAVY_APK_URL;

  return (
    <PageShell>
      <h1 className="mt-8 text-center text-2xl font-bold leading-tight text-balance">L’appli NAVY ay pour Android</h1>
      <p className="mt-2 text-center text-base text-navyay-charcoal/80 leading-relaxed text-pretty">
        Gratuite, pour les téléphones Android 7 et plus récents.
      </p>

      {device === 'android' ? (
        <section className="mt-6 rounded-3xl border-2 border-navyay-charcoal bg-white p-5 space-y-3" aria-labelledby="navy-have-app">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-navyay-charcoal text-navyay-yellow">
              <SmartphoneNfc className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="navy-have-app" className="text-lg font-bold leading-snug">
                Vous avez déjà NAVY ay ?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-navyay-charcoal/80">
                Ouvrez-la : c’est elle qui se met à jour, en gardant votre compte.
              </p>
            </div>
          </div>
          {absent && (
            <NavyNotice tone="warn" icon={Smartphone}>
              L’appli n’est pas sur ce téléphone. Pour l’avoir, suivez la première installation ci-dessous.
            </NavyNotice>
          )}
          <a href={openAppIntentUrl(PAGE_URL)} className={`${btnPrimary} w-full`}>
            <RefreshCw className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-balance">Ouvrir l’appli pour la mettre à jour</span>
          </a>
        </section>
      ) : (
        <div className="mt-6">
          <NavyNotice icon={device === 'ios' ? Smartphone : Monitor}>
            L’appli NAVY ay existe pour Android.{' '}
            {device === 'ios'
              ? 'Sur iPhone, utilisez NAVY ay dans le navigateur, avec le même compte.'
              : 'Ouvrez cette page sur votre téléphone Android, ou faites scanner le code ci-dessous.'}
          </NavyNotice>
        </div>
      )}

      {device === 'ios' ? (
        <Link to="/navy" className={`${btnAccent} mt-6 w-full`}>
          Ouvrir NAVY ay dans le navigateur
        </Link>
      ) : (
        <section className="mt-10 border-t-2 border-dashed border-navyay-charcoal/15 pt-8" aria-labelledby="navy-first-install">
          <h2 id="navy-first-install" className="text-lg font-bold">
            Première installation
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-navyay-charcoal/80">Pas encore l’appli sur ce téléphone ? Téléchargez-la une première fois.</p>

          <a href={apkUrl} className={`${btnAccent} mt-4 w-full py-4`} download="navy-ay.apk">
            <Download className="w-5 h-5" aria-hidden="true" />
            <span>
              Télécharger l’appli NAVY ay
              {size ? <span className="font-normal"> ({size})</span> : null}
            </span>
          </a>
          {info?.version ? <p className="mt-2 text-center text-xs text-navyay-charcoal/75">Version {info.version}</p> : null}

          <h3 className="mt-8 text-base font-bold">Installer en 3 étapes</h3>
          <ol className="mt-4 space-y-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4">
                <span className="relative flex-shrink-0 w-12 h-12 rounded-2xl bg-navyay-charcoal text-navyay-yellow flex items-center justify-center">
                  <Icon className="w-6 h-6" aria-hidden="true" />
                  <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-navyay-yellow text-navyay-charcoal text-xs font-bold flex items-center justify-center" aria-hidden="true">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">
                    <span className="sr-only">Étape {i + 1} : </span>
                    {title}
                  </p>
                  <p className="mt-1 text-sm text-navyay-charcoal/80 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <NavyHelp title="À quoi sert l’appli ?">
              <p>Recevoir les courses comme un appel et partager sa position même écran éteint, quand on est chauffeur.</p>
              <p>Elle affiche le même NAVY ay que le site, avec le même compte : rien à recommencer.</p>
              <p>Ensuite, elle se met à jour elle-même : vous n’aurez plus à revenir sur cette page.</p>
            </NavyHelp>
          </div>

          <section className="mt-8 rounded-3xl border border-navyay-charcoal/10 bg-white px-5 py-6 text-center">
            <canvas ref={qrRef} width={200} height={200} className="mx-auto w-[200px] h-[200px]" aria-label="QR code de la page 1sakely.org/navy/app" role="img" />
            <p className="mt-3 text-sm text-navyay-charcoal/80">Faites scanner ce code pour ouvrir cette page sur un autre téléphone.</p>
            <p className="mt-1 text-xs font-medium break-all">1sakely.org/navy/app</p>
          </section>
        </section>
      )}

      {device !== 'ios' && (
        <p className="mt-6 text-center text-sm text-navyay-charcoal/75">
          Sur iPhone, utilisez NAVY ay dans le navigateur :{' '}
          <Link to="/navy" className="font-medium underline underline-offset-2">
            1sakely.org/navy
          </Link>
        </p>
      )}
    </PageShell>
  );
}

export default function NavyAppDownloadPage() {
  return isNativeApp() ? <InAppUpdatePage /> : <BrowserPage />;
}
