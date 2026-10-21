// Panel of the top-right menu (lazy chunk). Same behaviour as the NAVY "Je suis" menu of the
// host: portal, fixed position clamped to the viewport, closes on outside tap, Escape (focus back
// to the trigger) and resize.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icone, type NomIcone } from './Icones';
import { BandeSecteursHorizontale } from './Mise';
import { definirBadgeRefus } from './MenuCompte';
import { usePudi } from '../PudiContexte';
import { lireEtatConnecte, lireMonVote, rpc } from '../appels/api';
import { abonnerInstallation, installationDisponible, lancerInstallation } from '../appels/installation';
import { connexionGoogle, deconnexion, useSessionLocale } from '../appels/session';
import { lireCanal } from '../appels/provenance';
import { VERSION_PUDI, rechercherMiseAJour, type ResultatMiseAJour } from '../appels/miseAJour';
import { refusVus } from '../appels/refusVus';
import { dateCourte } from '../utils/format';

const LARGEUR = 300;

export function lienConsultation(): string {
  const canal = lireCanal();
  return `${window.location.origin}/pudi/${canal ? `?c=${encodeURIComponent(canal)}` : ''}`;
}

export const TEXTE_PARTAGE =
  'Priorisation du PUDi de Nosy Be 2026-2040 : quels projets sont urgents ? Donnez votre avis.';

function Element({
  icone,
  children,
  onClick,
  desactive,
  note,
  danger,
  fin
}: {
  icone: NomIcone;
  children: ReactNode;
  onClick?: () => void;
  desactive?: boolean;
  note?: string;
  danger?: boolean;
  fin?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={desactive}
      onClick={onClick}
      className={`w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] disabled:opacity-50 ${
        danger ? 'text-[#B42318] hover:bg-[#FDECEA]' : 'text-texte hover:bg-vide'
      }`}
    >
      <Icone nom={icone} className={`w-5 h-5 ${danger ? '' : 'text-marine'}`} />
      <span className="flex-1 min-w-0">
        <span className="block font-bold leading-snug">{children}</span>
        {note && <span className="block text-[13px] text-gris leading-snug">{note}</span>}
      </span>
      {fin}
    </button>
  );
}

export default function MenuPanneau({ ancre, fermer }: { ancre: RefObject<HTMLButtonElement | null>; fermer: () => void }) {
  const { etat, horsLigne, definirEtat, rechargerEtat } = usePudi();
  const session = useSessionLocale();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panneau = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);
  const [dateVote, setDateVote] = useState<string | null>(null);
  const [nbRefus, setNbRefus] = useState<number | null>(null);
  const [partageSecours, setPartageSecours] = useState(false);
  const [copie, setCopie] = useState(false);
  const [confirmerSortie, setConfirmerSortie] = useState(false);
  const [maj, setMaj] = useState<ResultatMiseAJour | 'cours' | null>(null);
  const [connexion, setConnexion] = useState(false);
  const installable = useSyncExternalStore(abonnerInstallation, installationDisponible, () => false);
  const enLigne = !horsLigne && (typeof navigator === 'undefined' || navigator.onLine !== false);

  useLayoutEffect(() => {
    const placer = () => {
      const r = ancre.current?.getBoundingClientRect();
      if (!r) return;
      const largeur = Math.min(LARGEUR, window.innerWidth - 16);
      const top = r.bottom + 6;
      setPos({ top, left: Math.max(8, Math.min(r.right - largeur, window.innerWidth - largeur - 8)), maxH: window.innerHeight - top - 8 });
    };
    placer();
  }, [ancre]);

  useEffect(() => {
    const dehors = (e: Event) => {
      const t = e.target as Node;
      if (ancre.current?.contains(t) || panneau.current?.contains(t)) return;
      fermer();
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fermer();
        ancre.current?.focus();
      }
    };
    document.addEventListener('mousedown', dehors);
    document.addEventListener('touchstart', dehors);
    document.addEventListener('keydown', touche);
    window.addEventListener('resize', fermer);
    return () => {
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('touchstart', dehors);
      document.removeEventListener('keydown', touche);
      window.removeEventListener('resize', fermer);
    };
  }, [ancre, fermer]);

  // Signed in and online: authenticated state, own vote date, refusals for administrators.
  useEffect(() => {
    if (!session || !enLigne) return;
    let actif = true;
    (async () => {
      try {
        const e = await lireEtatConnecte();
        if (!actif) return;
        definirEtat(e);
        if (e.a_vote) {
          const v = await lireMonVote();
          if (actif && v) setDateVote(v.updated_at ?? v.created_at);
        }
        if (e.est_admin) {
          const s = await rpc<{ nb_refus: number }>('pudi_admin_suivi');
          if (!actif) return;
          setNbRefus(s.nb_refus);
          definirBadgeRefus(s.nb_refus - refusVus());
        }
      } catch {
        /* offline or expired session: the items stay as they are */
      }
    })();
    return () => {
      actif = false;
    };
  }, [session, enLigne, definirEtat]);

  const aller = (chemin: string, etatNav?: unknown) => {
    fermer();
    navigate(chemin, etatNav ? { state: etatNav } : undefined);
  };

  const partager = async () => {
    const url = lienConsultation();
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'PUDi Nosy Be', text: TEXTE_PARTAGE, url });
        fermer();
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    setPartageSecours(true);
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lienConsultation());
      setCopie(true);
    } catch {
      setCopie(false);
    }
  };

  const seConnecter = () => {
    setConnexion(true);
    connexionGoogle(pathname === '/' ? '/pudi/' : `/pudi${pathname}`).catch(() => setConnexion(false));
  };

  const sortir = async () => {
    try {
      await deconnexion();
    } finally {
      fermer();
      navigate('/');
      void rechargerEtat();
    }
  };

  if (!pos) return null;
  const clos = !!etat?.clos;
  const admin = !!session && !!etat?.est_admin;
  const reserve = !clos && !etat?.a_vote && !admin;
  const connexionNecessaire = 'Connexion nécessaire';
  const badge = nbRefus === null ? 0 : Math.max(0, nbRefus - refusVus());

  return createPortal(
    <div
      ref={panneau}
      id="pudi-menu"
      role="menu"
      aria-label="Menu"
      style={{ top: pos.top, left: pos.left, width: Math.min(LARGEUR, window.innerWidth - 16), maxHeight: pos.maxH }}
      className="pudi-menu pudi-page fixed z-[70] rounded-2xl border border-filet bg-white shadow-xl overflow-y-auto text-texte font-corps"
    >
      <BandeSecteursHorizontale />
      <div className="p-1.5 space-y-0.5">
        <div className="m-1 rounded-xl bg-vide px-3 py-2.5">
          <p className="text-[12px] font-bold uppercase tracking-wide text-gris">{session ? 'Compte actif' : 'Non connecté'}</p>
          {session ? (
            <p className="text-[14px] font-bold break-all">{session.email}</p>
          ) : (
            <button
              type="button"
              role="menuitem"
              disabled={!enLigne || connexion}
              onClick={seConnecter}
              className="mt-1.5 w-full min-h-[44px] rounded-xl bg-marine text-white font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Icone nom="connexion" />
              {connexion ? 'Connexion en cours…' : enLigne ? 'Se connecter avec Google' : connexionNecessaire}
            </button>
          )}
        </div>

        {!clos && (
          <Element
            icone="liste"
            desactive={!enLigne}
            note={!enLigne ? connexionNecessaire : etat?.a_vote ? 'Modifier' : undefined}
            onClick={() => aller(etat?.a_vote ? '/envoyer' : '/choix')}
          >
            {etat?.a_vote
              ? dateVote
                ? `Vous avez voté le ${dateCourte(dateVote)}`
                : 'Vous avez voté'
              : "Vous n'avez pas encore voté"}
          </Element>
        )}
        <Element
          icone={reserve ? 'cadenas' : 'graphique'}
          desactive={!enLigne}
          note={!enLigne ? connexionNecessaire : reserve ? 'après votre vote' : undefined}
          onClick={() => aller('/resultats')}
        >
          Résultats
        </Element>
        <Element icone="partager" onClick={() => void partager()}>
          Partager la consultation
        </Element>
        {partageSecours && (
          <div className="pl-11 pr-2 pb-1 flex flex-col gap-1">
            <button type="button" role="menuitem" onClick={() => void copier()} className="min-h-[44px] flex items-center gap-2 text-[14px] font-bold text-marine">
              <Icone nom="copier" className="w-4 h-4" />
              {copie ? 'Lien copié' : 'Copier le lien'}
            </button>
            <a
              role="menuitem"
              href={`https://wa.me/?text=${encodeURIComponent(`${TEXTE_PARTAGE} ${lienConsultation()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] flex items-center gap-2 text-[14px] font-bold text-marine"
            >
              <Icone nom="message" className="w-4 h-4" />
              Envoyer sur WhatsApp
            </a>
          </div>
        )}
        <Element icone="aide" onClick={() => aller('/', { aide: Date.now() })}>
          Comment ça marche ?
        </Element>
        <Element icone="bouclier" onClick={() => aller('/donnees')}>
          Données personnelles
        </Element>
        {installable && (
          <Element
            icone="telecharger"
            onClick={() => {
              fermer();
              void lancerInstallation();
            }}
          >
            Installer l'application
          </Element>
        )}

        {admin && (
          <>
            <hr className="my-1 border-filet" />
            <Element
              icone="admin"
              desactive={!enLigne}
              note={!enLigne ? connexionNecessaire : undefined}
              onClick={() => aller('/admin')}
              fin={
                badge > 0 ? (
                  <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#F2B705] text-[#2F3547] text-[12px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                ) : undefined
              }
            >
              Administration
            </Element>
            <Element
              icone="oeil"
              desactive={!enLigne}
              note={!enLigne ? connexionNecessaire : undefined}
              onClick={() => aller('/resultats?apercu=1')}
            >
              Aperçu des résultats
            </Element>
          </>
        )}

        <hr className="my-1 border-filet" />
        <Element
          icone="actualiser"
          note={
            maj === 'cours'
              ? 'Recherche en cours…'
              : maj === 'a_jour'
                ? 'Vous avez la dernière version.'
                : maj === 'indisponible'
                  ? 'Recherche impossible pour le moment.'
                  : 'Rechercher une mise à jour'
          }
          onClick={() => {
            setMaj('cours');
            rechercherMiseAJour().then(setMaj, () => setMaj('indisponible'));
          }}
        >
          Mise à jour v{VERSION_PUDI}
        </Element>

        {session &&
          (confirmerSortie ? (
            <div className="m-1 rounded-xl border border-[#F3C5BF] bg-[#FDECEA] p-3 space-y-2" role="alert">
              <p className="text-[14px]">Vous serez aussi déconnecté des autres modules de 1sakely.org (même compte Google).</p>
              <div className="flex gap-2">
                <button type="button" role="menuitem" onClick={() => void sortir()} className="flex-1 min-h-[44px] rounded-xl bg-[#B42318] text-white font-bold text-[14px]">
                  Se déconnecter
                </button>
                <button type="button" role="menuitem" onClick={() => setConfirmerSortie(false)} className="flex-1 min-h-[44px] rounded-xl bg-white border border-filet font-bold text-[14px]">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <Element icone="deconnexion" danger desactive={!enLigne} note={!enLigne ? connexionNecessaire : undefined} onClick={() => setConfirmerSortie(true)}>
              Déconnexion
            </Element>
          ))}
      </div>
    </div>,
    document.body
  );
}
