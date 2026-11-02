// /validation/i/:jeton (VC-01, VC-03, D13, D15, D16).
// With a session: the account is attached (vc_invitation_utiliser), then registration or home.
// Without: vc_invitation_apercu → screen 1 (invitation), « déjà servi » variant, or screen 9.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apercuInvitation, utiliserInvitation } from '../appels/api';
import { lireRetourConnexion } from '../appels/session';
import { useEspace } from '../EspaceContexte';
import EnTete from '../composants/EnTete';
import BoutonsConnexion from '../composants/BoutonsConnexion';
import { BoutonWhatsApp, CarteMessage, Corps, PRIMAIRE, SECONDAIRE, Squelette, useCouleurTheme } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { LIEN_WHATSAPP_JOEL } from '../utils/regles';
import type { Apercu } from '../utils/types';

type Ecran =
  | { type: 'lecture' }
  | { type: 'apercu'; a: Apercu }
  | { type: 'invalide' }
  | { type: 'deja' }
  | { type: 'unSeul' }
  | { type: 'erreur' };

export default function Invitation() {
  useCouleurTheme('#0369a1');
  const { jeton = '' } = useParams();
  const navigate = useNavigate();
  const { session, recharger, lent } = useEspace();
  const [ecran, setEcran] = useState<Ecran>({ type: 'lecture' });
  const [essai, setEssai] = useState(0);
  const uid = session?.id ?? '';

  useEffect(() => {
    let vivant = true;
    setEcran({ type: 'lecture' });
    (async () => {
      await lireRetourConnexion();
      try {
        const a = await apercuInvitation(jeton);
        if (!vivant) return;
        if (!uid) {
          if (a.valide) setEcran({ type: 'apercu', a });
          else setEcran({ type: a.deja_utilisee ? 'deja' : 'invalide' });
          return;
        }
        // Same account reopening its link (VC-03): home, without screen 9.
        if (a.deja_rattache) {
          await recharger();
          if (vivant) navigate('/', { replace: true });
          return;
        }
        const r = await utiliserInvitation(jeton);
        if (!vivant) return;
        if (r.ok) {
          // vc_invitation_utiliser added « validation » to preferences.modules on the server: the
          // module never writes preferences, the host re-reads them from the server.
          await recharger();
          if (!vivant) return;
          if (r.inscription) navigate('/inscription', { replace: true });
          else navigate('/', { replace: true, state: { ajout: true } });
          return;
        }
        if (r.code === 'COMPTE_DEJA_DANS_LE_PROJET') {
          await recharger();
          if (vivant) navigate('/', { replace: true });
          return;
        }
        if (r.code === 'INVITATION_DEJA_UTILISEE') setEcran({ type: 'deja' });
        else if (r.code === 'UN_SEUL_PROJET') setEcran({ type: 'unSeul' });
        else setEcran({ type: 'invalide' });
      } catch {
        if (vivant) setEcran({ type: 'erreur' });
      }
    })();
    return () => {
      vivant = false;
    };
  }, [jeton, uid, essai, navigate, recharger]);

  if (ecran.type === 'apercu') return <PageInvitation a={ecran.a} />;

  return (
    <>
      <EnTete variante="neutre" />
      <Corps centre={ecran.type !== 'lecture'}>
        {ecran.type === 'lecture' && <Squelette lent={lent} />}
        {ecran.type === 'invalide' && (
          <>
            <CarteMessage
              titre="Cette invitation n'est plus valable"
              texte="Cette invitation a déjà servi ou a été annulée. Si vous avez déjà un compte 1saKELY, connectez-vous avec lui ; sinon, demandez une nouvelle invitation à Joël."
            >
              <BoutonWhatsApp className="self-stretch" />
            </CarteMessage>
            <button type="button" className={SECONDAIRE} onClick={() => navigate('/connexion')} data-me-connecter="">
              Me connecter à 1saKELY
            </button>
          </>
        )}
        {ecran.type === 'deja' && (
          <CarteMessage titre="Cette invitation a déjà servi." texte="Si c'est la vôtre, connectez-vous.">
            <div className="self-stretch flex flex-col gap-2.5" data-deja-servi="">
              <BoutonsConnexion libelleGoogle="Me connecter avec Google" mention={false} />
            </div>
            <a className="text-[14px] text-ciel" href={LIEN_WHATSAPP_JOEL} target="_blank" rel="noopener noreferrer">
              Écrire à Joël sur WhatsApp
            </a>
          </CarteMessage>
        )}
        {ecran.type === 'unSeul' && (
          <CarteMessage texte="Votre compte 1saKELY suit déjà un autre projet. Pour celui-ci, écrivez à Joël.">
            <BoutonWhatsApp className="self-stretch" />
          </CarteMessage>
        )}
        {ecran.type === 'erreur' && (
          <CarteMessage texte="Le réseau ne répond pas. Vérifiez votre connexion, puis réessayez.">
            <button type="button" className={`${PRIMAIRE} self-stretch`} onClick={() => setEssai((n) => n + 1)}>
              Réessayer
            </button>
          </CarteMessage>
        )}
      </Corps>
    </>
  );
}

/** Screen 1, exactly as in the mockup (Main.dc.html). */
function PageInvitation({ a }: { a: Apercu }) {
  const contributeur = a.role === 'contributeur';
  const n = a.nb_questions_max ?? 0;
  const d = a.duree_minutes ?? Math.max(n, 1);
  return (
    <>
      <EnTete variante="invitation" titre={a.nom_court ?? ''} sousTitre={a.entreprise ? `pour ${a.entreprise}` : ''} />
      <Corps>
        <div className="bg-white border border-filet rounded-[14px] flex flex-col gap-3.5 px-[18px] py-5" data-invitation="">
          <p className="text-[15px] text-[#334155] m-0 leading-[1.45]">
            Bonjour {[a.civilite, a.nom].filter(Boolean).join(' ')},
          </p>
          {contributeur ? (
            <h1 className="text-[20px] leading-[1.3] text-nuit font-bold m-0" data-invite-par="">
              {a.invite_par} vous invite à donner votre avis sur le projet « {a.nom_court} » de {a.entreprise}.
            </h1>
          ) : (
            <h1 className="text-[25px] leading-[1.25] text-nuit font-bold m-0" data-reve="">
              {a.phrase_reve || "Et si votre idée devenait l'application dont vous rêvez ?"}
            </h1>
          )}
          <p className="text-[15px] text-[#334155] m-0 leading-[1.45]">
            C’est le projet que nous allons construire avec vous. Avant de commencer, nous voulons être sûrs d’avoir bien compris ce que vous voulez.
          </p>
          <div className="flex items-center gap-2.5 bg-clair rounded-xl px-3.5 py-3 text-[#075985] text-[15px] font-semibold" data-encadre="">
            <Icone nom="horloge" className="w-[22px] h-[22px]" />
            {n} questions simples au plus, environ {d} minutes, depuis votre téléphone.
          </div>
          <BoutonsConnexion />
          <div className="flex items-center gap-3 border-t border-[#e2e8f0] pt-3.5">
            <span aria-hidden="true" className="w-11 h-11 rounded-full bg-ciel text-white font-bold text-[16px] flex items-center justify-center flex-none">
              JS
            </span>
            <p className="text-[14px] text-[#334155] m-0 leading-[1.45]">
              <strong>Joël SOATRA</strong>, CyberKELY, vous accompagne à chaque étape.
            </p>
          </div>
        </div>
        <p className="text-[13px] text-doux text-center m-0">Vous créez votre compte 1saKELY. Seul votre projet vous sera ouvert.</p>
        <p className="text-[14px] text-doux text-center m-0 leading-[1.45]">
          Une question ?{' '}
          <a className="text-ciel" href={LIEN_WHATSAPP_JOEL} target="_blank" rel="noopener noreferrer">
            Écrire à Joël sur WhatsApp
          </a>
        </p>
      </Corps>
    </>
  );
}
