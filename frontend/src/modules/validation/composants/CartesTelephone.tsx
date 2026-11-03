// Receipt cards (VC-42, decision of Joël of 03/11/2026): « Gardez 1saKELY sur votre téléphone »,
// then, once it is answered (or on its own when it is not shown), the notifications question, once
// per device, never inside WhatsApp's browser, never for Joël. Rules: utils/telephone.ts.
import { useEffect, useState } from 'react';
import { estPilote } from '../appels/api';
import { lancerInstallation, useInstallationDisponible, useInstallee } from '../appels/installation';
import { accepterNotifications, notificationsPossibles, refuserNotifications, reponseNotifications } from '../appels/notifications';
import { ATTENTE_INVITATION_MS, cartesRecu } from '../utils/telephone';
import { navigateurDe } from '../utils/dictee';
import { BoutonChrome } from './BoutonChrome';
import { Icone } from './Icones';
import { SECONDAIRE } from './Mise';

const CLE_PLUS_TARD = 'vc-installation-plus-tard';

function lirePlusTard(): number | null {
  try {
    const v = localStorage.getItem(CLE_PLUS_TARD);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

const CARTE_BLEUE = 'bg-clair border border-[#bae6fd] rounded-[14px] p-4 flex flex-col gap-2';

export default function CartesTelephone() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const nav = navigateurDe(ua);
  const invitation = useInstallationDisponible();
  const installee = useInstallee();
  const [attenteFinie, setAttenteFinie] = useState(false);
  const [plusTardAt, setPlusTardAt] = useState<number | null>(lirePlusTard);
  const [installationRepondue, setInstallationRepondue] = useState(false);
  const [notifRepondue, setNotifRepondue] = useState(() => reponseNotifications() !== null);
  const [pilote, setPilote] = useState<'oui' | 'non' | 'erreur' | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [prevenu, setPrevenu] = useState(false);
  const possibles = notificationsPossibles();
  const permission = possibles ? Notification.permission : 'denied';

  useEffect(() => {
    const t = window.setTimeout(() => setAttenteFinie(true), ATTENTE_INVITATION_MS);
    return () => window.clearTimeout(t);
  }, []);
  // Joël is never asked on this scope (one server call, only when the question could show).
  const pourraitDemander = possibles && permission !== 'denied' && !notifRepondue && nav !== 'interne';
  useEffect(() => {
    if (!pourraitDemander || pilote !== null) return;
    let vivant = true;
    void estPilote().then((r) => vivant && setPilote(r));
    return () => {
      vivant = false;
    };
  }, [pourraitDemander, pilote]);

  const cartes = cartesRecu({
    installee,
    interne: nav === 'interne',
    android: /Android/i.test(ua),
    chromeAndroid: nav === 'chrome_android',
    invitation,
    attenteFinie,
    plusTardAt,
    installationRepondue,
    notificationsPossibles: possibles,
    permission,
    notificationsRepondues: notifRepondue,
    pilote
  });

  return (
    <>
      {cartes.installation && (
        <div className={CARTE_BLEUE} data-carte-installation={cartes.installation}>
          <h2 className="text-[17px] leading-[1.3] font-bold m-0">Gardez 1saKELY sur votre téléphone</h2>
          {cartes.installation === 'chrome' ? (
            <>
              <p className="text-[13px] text-[#075985] leading-[1.45] m-0">Ouvrez 1saKELY dans Chrome pour l'installer.</p>
              <BoutonChrome />
            </>
          ) : (
            <>
              <p className="text-[13px] text-[#075985] leading-[1.45] m-0">
                Une icône sur votre écran d'accueil, comme une application : vous retrouvez votre projet et la suite en un toucher. Rien d'autre n'est installé.
              </p>
              <button
                type="button"
                className={`${SECONDAIRE} !min-h-11 !text-[15px]`}
                disabled={enCours}
                onClick={async () => {
                  setEnCours(true);
                  await lancerInstallation();
                  setEnCours(false);
                  setInstallationRepondue(true);
                }}
                data-installer-carte=""
              >
                <Icone nom="installer" />
                Installer 1saKELY
              </button>
            </>
          )}
          <button
            type="button"
            className="text-[13px] text-ciel underline self-center min-h-11 px-3 flex items-center"
            onClick={() => {
              const t = Date.now();
              try {
                localStorage.setItem(CLE_PLUS_TARD, String(t));
              } catch {
                // Private mode: hidden for this page only.
              }
              setPlusTardAt(t);
              setInstallationRepondue(true);
            }}
            data-plus-tard=""
          >
            Plus tard
          </button>
        </div>
      )}
      {cartes.notifications && (
        <div className={CARTE_BLEUE} data-carte-notifications="">
          <h2 className="text-[17px] leading-[1.3] font-bold m-0 flex items-start gap-2">
            <Icone nom="cloche" className="w-5 h-5 mt-0.5 text-ciel" />
            Voulez-vous être prévenu quand la suite de votre projet est prête ?
          </h2>
          <button
            type="button"
            className={`${SECONDAIRE} !min-h-11 !text-[15px]`}
            disabled={enCours}
            onClick={async () => {
              setEnCours(true);
              const r = await accepterNotifications();
              setEnCours(false);
              setPrevenu(r === 'accordee');
              setNotifRepondue(true);
            }}
            data-notifications-oui=""
          >
            Oui, me prévenir
          </button>
          <button
            type="button"
            className="text-[13px] text-ciel underline self-center min-h-11 px-3 flex items-center"
            onClick={() => {
              refuserNotifications();
              setNotifRepondue(true);
            }}
            data-notifications-non=""
          >
            Non merci
          </button>
        </div>
      )}
      {prevenu && (
        <p className="text-[13px] text-[#166534] font-semibold text-center m-0" role="status" data-notifications-ok="">
          C'est noté : ce téléphone sera prévenu.
        </p>
      )}
    </>
  );
}
