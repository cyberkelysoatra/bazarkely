/**
 * Public download page of the NAVY ay Android app: 1sakely.org/navy/app (phase 3A),
 * reachable WITHOUT sign-in. Download button (stable GitHub Releases address, size read
 * from /navy/app/version.json), 3 installation steps, ⓘ help, QR code of this page.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Download, ShieldCheck, Smartphone } from 'lucide-react';
import { NavyWordmark } from '../NavyLogo';
import { NavyHelp, btnAccent } from '../ui/NavyUi';
import { fetchNavyAppVersionInfo } from '../../services/navyAppVersion';
import { getNativeAppVersion, isNativeApp } from '../../services/nativeApp';
import { NAVY_APK_URL, NAVY_APP_PAGE, formatFileSize, type NavyAppVersionInfo } from '../../utils/nativeAppRules';

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

export default function NavyAppDownloadPage() {
  const [info, setInfo] = useState<NavyAppVersionInfo | null>(null);
  const [installed, setInstalled] = useState<string | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNavyAppVersionInfo().then((v) => {
      if (!cancelled) setInfo(v);
    });
    if (isNativeApp()) {
      getNativeAppVersion().then((v) => {
        if (!cancelled) setInstalled(v);
      });
    }
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
    <div className="min-h-screen flex flex-col bg-white text-navyay-charcoal selection:bg-navyay-yellow selection:text-navyay-charcoal">
      <div className="h-1.5 bg-navyay-yellow" aria-hidden="true" />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex justify-center">
            <Link to="/navy" aria-label="NAVY ay, accueil">
              <NavyWordmark className="h-14 w-auto max-w-full" />
            </Link>
          </div>

          <h1 className="mt-8 text-center text-2xl font-bold leading-tight text-balance">L’appli NAVY ay pour Android</h1>
          <p className="mt-2 text-center text-base text-navyay-charcoal/80 leading-relaxed text-pretty">
            Gratuite, pour les téléphones Android 7 et plus récents.
          </p>

          {installed ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-navyay-charcoal/10 bg-navyay-yellow/15 px-4 py-3 text-sm" role="status">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <p>
                Vous utilisez déjà l’appli (version {installed}).
                {info && info.version !== installed ? ` La version ${info.version} est disponible ci-dessous.` : ''}
              </p>
            </div>
          ) : null}

          <a href={apkUrl} className={`${btnAccent} mt-6 w-full py-4`} download="navy-ay.apk">
            <Download className="w-5 h-5" aria-hidden="true" />
            <span>
              Télécharger l’appli NAVY ay
              {size ? <span className="font-normal"> ({size})</span> : null}
            </span>
          </a>
          {info?.version ? (
            <p className="mt-2 text-center text-xs text-navyay-charcoal/75">Version {info.version}</p>
          ) : null}

          <h2 className="mt-10 text-lg font-bold">Installer en 3 étapes</h2>
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
              <p>Recevoir les courses et partager sa position même écran éteint (bientôt).</p>
              <p>Elle affiche le même NAVY ay que le site, avec le même compte : rien à recommencer.</p>
            </NavyHelp>
          </div>

          <section className="mt-8 rounded-3xl border border-navyay-charcoal/10 bg-white px-5 py-6 text-center">
            <canvas ref={qrRef} width={200} height={200} className="mx-auto w-[200px] h-[200px]" aria-label="QR code de la page 1sakely.org/navy/app" role="img" />
            <p className="mt-3 text-sm text-navyay-charcoal/80">Faites scanner ce code pour ouvrir cette page sur un autre téléphone.</p>
            <p className="mt-1 text-xs font-medium break-all">1sakely.org/navy/app</p>
          </section>

          <p className="mt-6 text-center text-sm text-navyay-charcoal/75">
            Sur iPhone, utilisez NAVY ay dans le navigateur :{' '}
            <Link to="/navy" className="font-medium underline underline-offset-2">1sakely.org/navy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
