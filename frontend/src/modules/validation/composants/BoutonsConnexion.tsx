// Sign-in buttons (screen 1, « déjà servi » variant, signed-out screen): Google back to the current
// address, « Utiliser mon e-mail » to /connexion. Inside WhatsApp's built-in browser, where Google
// refuses the sign-in, « Pour vous connecter, ouvrez ce lien dans Chrome. » comes first (VC-01).
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { connexionGoogle } from '../appels/session';
import { adresseChrome, estNavigateurInterne } from '../utils/regles';
import { Icone, LogoGoogle } from './Icones';
import { BOUTON, PRIMAIRE } from './Mise';

export function OuvrirDansChrome() {
  const [copie, setCopie] = useState(false);
  if (typeof navigator === 'undefined' || !estNavigateurInterne(navigator.userAgent)) return null;
  const android = /Android/i.test(navigator.userAgent);
  return (
    <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[10px] p-3 flex flex-col gap-2 text-[#78350f]" role="note" data-navigateur-interne="">
      <p className="text-[14px] font-semibold m-0 flex gap-2 items-start">
        <Icone nom="alerte" className="w-5 h-5 mt-px" />
        Pour vous connecter, ouvrez ce lien dans Chrome.
      </p>
      {android ? (
        <a href={adresseChrome(window.location.href, true)} className={PRIMAIRE} data-ouvrir-chrome="">
          <Icone nom="chrome" />
          Ouvrir dans Chrome
        </a>
      ) : (
        <button
          type="button"
          className={PRIMAIRE}
          onClick={async () => {
            const lien = adresseChrome(window.location.href, false);
            try {
              await navigator.clipboard.writeText(lien);
              setCopie(true);
            } catch {
              window.prompt('Copiez ce lien et ouvrez-le dans Chrome :', lien);
            }
          }}
        >
          <Icone nom="chrome" />
          {copie ? 'Lien copié' : 'Copier le lien pour Chrome'}
        </button>
      )}
    </div>
  );
}

export default function BoutonsConnexion({ libelleGoogle = 'Continuer avec Google', mention = true }: { libelleGoogle?: string; mention?: boolean }) {
  const { pathname } = useLocation();
  const [erreur, setErreur] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const retour = encodeURIComponent(pathname);
  return (
    <>
      <OuvrirDansChrome />
      <button
        type="button"
        disabled={envoi}
        className={`${BOUTON} bg-white text-encre border border-[#94a3b8] mt-1`}
        onClick={async () => {
          setErreur(false);
          setEnvoi(true);
          try {
            await connexionGoogle(`/validation${pathname === '/' ? '/' : pathname}`);
          } catch {
            setErreur(true);
            setEnvoi(false);
          }
        }}
        data-google=""
      >
        <LogoGoogle />
        {libelleGoogle}
      </button>
      {erreur && (
        <p className="text-[13px] text-danger text-center m-0" role="alert">
          La connexion n'a pas pu démarrer. Vérifiez le réseau et réessayez.
        </p>
      )}
      {mention && <p className="text-[13px] text-doux text-center m-0">Rien à installer. Nous ne voyons ni vos e-mails ni vos contacts.</p>}
      <Link to={`/connexion?retour=${retour}`} className="text-[14px] text-ciel self-center min-h-11 flex items-center" data-lien-email="">
        Utiliser mon e-mail
      </Link>
    </>
  );
}
