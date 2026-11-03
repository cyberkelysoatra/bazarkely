// Account menu layer (screen 3 quater, VC-17): name and account e-mail, « Mes infos »,
// « Installer l'application » (only when the browser offered it, never once installed; in WhatsApp's
// browser it opens Chrome), « Déconnexion » (red).
// No « Partager », no « Paramètres » in lot 1a. Back button, « Fermer le menu » or a touch
// outside close it.
import { useNavigate } from 'react-router-dom';
import { fermerMenu, quitterMenu } from '../appels/menu';
import { deconnexion } from '../appels/session';
import { lancerInstallation, useInstallationDisponible, useInstallee } from '../appels/installation';
import { adresseChrome } from '../utils/regles';
import { navigateurDe } from '../utils/dictee';
import { Icone } from './Icones';

const LIGNE = 'flex items-center gap-3 min-h-12 px-3.5 w-full text-left text-[15px] font-medium border-t border-[#e2e8f0]';

export default function MenuCompte({ nom, email }: { nom: string; email: string }) {
  const navigate = useNavigate();
  const installable = useInstallationDisponible();
  const installee = useInstallee();
  // WhatsApp's browser cannot install: the line opens the page in Chrome (Android).
  const versChrome = !installee && typeof navigator !== 'undefined' && navigateurDe(navigator.userAgent) === 'interne' && /Android/i.test(navigator.userAgent);
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 bg-fond/65" style={{ top: 'var(--vc-hdr, 92px)' }} onClick={fermerMenu} aria-hidden="true" data-menu-voile="" />
      <div
        role="menu"
        aria-label="Menu du compte"
        className="absolute right-3 top-full mt-1 w-[270px] max-w-[calc(100vw-24px)] z-40 bg-white text-encre border border-filet rounded-[14px] shadow-[0_12px_32px_rgba(3,105,161,0.22)] overflow-hidden"
        data-menu-compte=""
      >
        <div className="p-3.5 flex flex-col gap-0.5">
          <strong className="text-[15px]">{nom}</strong>
          <span className="text-[13px] text-doux break-words">Compte 1saKELY : {email}</span>
        </div>
        <button
          type="button"
          role="menuitem"
          className={LIGNE}
          onClick={() => {
            quitterMenu();
            navigate('/infos', { replace: true });
          }}
        >
          <Icone nom="personne" />
          Mes infos
        </button>
        {versChrome && (
          <a role="menuitem" className={LIGNE} href={adresseChrome(window.location.href, true)} onClick={quitterMenu} data-installer-chrome="">
            <Icone nom="installer" />
            <span className="flex flex-col">
              Installer l'application
              <span className="text-[12px] text-doux font-normal">Ouvrez 1saKELY dans Chrome pour l'installer</span>
            </span>
          </a>
        )}
        {installable && !installee && (
          <button
            type="button"
            role="menuitem"
            className={LIGNE}
            onClick={() => {
              fermerMenu();
              void lancerInstallation();
            }}
            data-installer=""
          >
            <Icone nom="installer" />
            Installer l'application
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className={`${LIGNE} text-danger`}
          onClick={async () => {
            quitterMenu();
            await deconnexion();
            navigate('/', { replace: true });
          }}
          data-deconnexion=""
        >
          <Icone nom="sortir" />
          Déconnexion
        </button>
        <button type="button" className="w-full min-h-11 text-[14px] font-semibold text-ciel border-t border-[#e2e8f0]" onClick={fermerMenu}>
          Fermer le menu
        </button>
      </div>
    </>
  );
}
