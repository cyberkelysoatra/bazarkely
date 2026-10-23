// « Discussion » (PUDI-CC-12): one public discussion for everyone, like a WhatsApp group. Read by
// all (even signed out), written by signed-in accounts. Newest at the bottom, own messages on
// the right. Polled every 15 s while the page is visible and online. Deleting leaves « Ce message
// a été supprimé ». Links stay plain text. JOEL's role preview never writes (PUDI-CC-11).
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as EvPointeur } from 'react';
import { Icone } from '../composants/Icones';
import { boutonPrincipal } from '../composants/Mise';
import { usePudi } from '../PudiContexte';
import { connexionGoogle, useSessionLocale } from '../appels/session';
import {
  LIMITE_PAGE,
  ecrireMessage,
  lireMessages,
  retablirAuteur,
  supprimerMessage,
  suspendreAuteur,
  type MessageDiscussion
} from '../appels/discussion';
import { marquerDiscussionVue } from '../appels/discussionNonLue';
import { extraireCode } from '../utils/erreurs';
import { allerAuChamp } from '../utils/champFautif';
import { BandeauReseau, useEnvoiFiable } from '../composants/Reseau';
import { nouvelIdClient } from '../appels/prives';
import { Dialogue, type DemandeConfirmation } from './admin/communs';

const MAX = 500;
const COMPTEUR_DES = 400;
const POLL_MS = 15000;
const MADA_MS = 3 * 3600 * 1000;
const SUPPRIME = 'Ce message a été supprimé';
const BLOQUE_APERCU = 'Aperçu : modification désactivée';
const ERREURS: Record<string, string> = {
  TROP_DE_MESSAGES: 'Vous écrivez trop vite : attendez quelques secondes (60 messages par jour au plus).',
  DISCUSSION_SUSPENDU: 'Votre compte ne peut plus écrire dans la discussion. Écrivez au GIHTNB si c’est une erreur.',
  MESSAGE_INVALIDE: 'Écrivez un message de 1 à 500 caractères.',
  NON_CONNECTE: 'Connectez-vous avec Google pour écrire.',
  RESEAU: 'Le réseau ne répond pas. Votre message est gardé : réessayez.',
  AUTRE: 'Le message n’a pas pu être envoyé. Réessayez.'
};

/** Day key and labels in Madagascar time. */
const jourMada = (iso: string) => new Date(Date.parse(iso) + MADA_MS).toISOString().slice(0, 10);
export function libelleJour(iso: string, maintenant = Date.now()): string {
  const j = jourMada(iso);
  const auj = jourMada(new Date(maintenant).toISOString());
  const hier = jourMada(new Date(maintenant - 86400000).toISOString());
  if (j === auj) return "Aujourd'hui";
  if (j === hier) return 'Hier';
  return `${j.slice(8, 10)}/${j.slice(5, 7)}`;
}
export function heureHHmm(iso: string): string {
  return new Date(Date.parse(iso) + MADA_MS).toISOString().slice(11, 16);
}

/** Merge pages by id (the newer copy wins), oldest first. */
export function fusionner(avant: MessageDiscussion[], nouveaux: MessageDiscussion[]): MessageDiscussion[] {
  const m = new Map(avant.map((x) => [x.id, x]));
  for (const x of nouveaux) m.set(x.id, x);
  return [...m.values()].sort((a, b) => Date.parse(a.cree_at) - Date.parse(b.cree_at) || a.id.localeCompare(b.id));
}

function useEnLigne(): boolean {
  const [en, setEn] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const maj = () => setEn(navigator.onLine !== false);
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);
  return en;
}

function Bulle({
  m,
  ouvert,
  ouvrir,
  fermer,
  repondre,
  supprimer,
  suspendre,
  verrouille,
  organisateur
}: {
  m: MessageDiscussion;
  ouvert: boolean;
  ouvrir: () => void;
  fermer: () => void;
  repondre: () => void;
  supprimer: () => void;
  suspendre: () => void;
  /** Preview: delete visible but disabled. */
  verrouille: boolean;
  organisateur: boolean;
}) {
  const appui = useRef<number | null>(null);
  const longFait = useRef(false);
  const debut = (e: EvPointeur) => {
    if (m.supprime || e.button > 0) return;
    longFait.current = false;
    appui.current = window.setTimeout(() => {
      longFait.current = true;
      ouvrir();
    }, 500);
  };
  const fin = () => {
    if (appui.current) window.clearTimeout(appui.current);
    appui.current = null;
  };
  const moi = m.est_moi;
  // The menu opens upwards in the lower half of the screen (the composer sits there).
  const li = useRef<HTMLLIElement>(null);
  const versLeHaut = ouvert && !!li.current && li.current.getBoundingClientRect().top > window.innerHeight / 2;
  return (
    <li ref={li} className={`flex scroll-mt-24 scroll-mb-[220px] ${moi ? 'justify-end' : 'justify-start'}`} data-message={m.id} data-moi={moi ? '1' : '0'}>
      <div className={`relative max-w-[85%] min-w-[40%] ${moi ? 'items-end' : 'items-start'}`}>
        <div
          onPointerDown={debut}
          onPointerUp={fin}
          onPointerLeave={fin}
          onPointerCancel={fin}
          onContextMenu={(e) => {
            if (!m.supprime) {
              e.preventDefault();
              ouvrir();
            }
          }}
          className={`rounded-2xl px-3 py-2 shadow-sm select-text ${
            moi ? 'bg-marine text-white rounded-br-md' : 'bg-white border border-filet text-texte rounded-bl-md'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-[0.8125rem] font-bold truncate ${moi ? 'text-white/90' : 'text-marine'}`} data-auteur="">
              {m.auteur_nom}
            </span>
            <span className={`ml-auto text-[0.75rem] shrink-0 ${moi ? 'text-white/75' : 'text-gris'}`}>{heureHHmm(m.cree_at)}</span>
            {!m.supprime && (
              <button
                type="button"
                aria-label="Actions du message"
                aria-expanded={ouvert}
                onClick={() => (ouvert ? fermer() : ouvrir())}
                className={`-mr-2 -my-1 w-8 h-8 flex items-center justify-center rounded-full ${moi ? 'text-white/80' : 'text-gris'}`}
              >
                <Icone nom="points" className="w-4 h-4" />
              </button>
            )}
          </div>
          {m.reponse_a && (
            <div className={`mt-1 border-l-[3px] rounded-r px-2 py-1 text-[0.8125rem] ${moi ? 'border-white/70 bg-white/10' : 'border-marine bg-vide'}`} data-citation="">
              <span className="block font-bold">{m.reponse_a.auteur_nom}</span>
              <span className={`block ${m.reponse_a.supprime ? 'italic opacity-80' : ''} break-words`}>{m.reponse_a.supprime ? SUPPRIME : m.reponse_a.extrait}</span>
            </div>
          )}
          {m.supprime ? (
            <p className={`mt-0.5 text-[0.9375rem] italic ${moi ? 'text-white/75' : 'text-gris'}`} data-supprime="">
              {SUPPRIME}
            </p>
          ) : (
            <p className="mt-0.5 text-[0.9375rem] leading-snug whitespace-pre-wrap break-words" data-texte="">
              {m.texte}
            </p>
          )}
        </div>
        {ouvert && (
          <div role="menu" className={`absolute z-30 ${versLeHaut ? 'bottom-full mb-1' : 'top-full mt-1'} ${moi ? 'right-0' : 'left-0'} w-56 rounded-xl border border-filet bg-white shadow-xl p-1 text-texte`} data-menu-message="">
            <button type="button" role="menuitem" onClick={repondre} className="w-full min-h-[44px] px-3 flex items-center gap-2 rounded-lg text-[0.9375rem] font-bold hover:bg-vide">
              <Icone nom="repondre" className="w-4 h-4 text-marine" />
              Répondre
            </button>
            {m.peut_supprimer && (
              <button
                type="button"
                role="menuitem"
                onClick={supprimer}
                disabled={verrouille}
                title={verrouille ? BLOQUE_APERCU : undefined}
                className="w-full min-h-[44px] px-3 flex items-center gap-2 rounded-lg text-[0.9375rem] font-bold text-[#B42318] hover:bg-[#FDECEA] disabled:opacity-50"
              >
                <Icone nom="poubelle" className="w-4 h-4" />
                Supprimer
              </button>
            )}
            {organisateur && !m.est_moi && (
              <button type="button" role="menuitem" onClick={suspendre} className="w-full min-h-[44px] px-3 flex items-center gap-2 rounded-lg text-[0.9375rem] font-bold hover:bg-vide">
                <Icone nom={m.auteur_suspendu ? 'deverrouiller' : 'cadenas'} className="w-4 h-4 text-marine" />
                {m.auteur_suspendu ? 'Lever la suspension' : "Suspendre l'auteur"}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function Discussion() {
  const { apercu, etat } = usePudi();
  const session = useSessionLocale();
  const enLigne = useEnLigne();
  const apercuVotant = apercu?.role === 'votant';
  const apercuCanal = apercu?.role === 'responsable' ? apercu.canal : null;
  // Effective state: false during a preview (organisers only in normal mode).
  const organisateur = !!session && !!etat?.est_admin;
  const [messages, setMessages] = useState<MessageDiscussion[]>([]);
  const [charge, setCharge] = useState<'cours' | 'ok' | 'erreur'>('cours');
  const [plusAnciens, setPlusAnciens] = useState(false);
  const [chargeAnciens, setChargeAnciens] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [reponse, setReponse] = useState<MessageDiscussion | null>(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [connexion, setConnexion] = useState(false);
  const allerEnBas = useRef(true);
  const champ = useRef<HTMLTextAreaElement>(null);

  // In the « Votant » preview the fake messages are local only and survive the polling.
  const locaux = useRef<MessageDiscussion[]>([]);
  const rafraichir = useCallback(async () => {
    try {
      const brut = await lireMessages(null, LIMITE_PAGE, apercuCanal);
      // « Votant » preview: a voter may delete only his own messages.
      const l = apercuVotant ? brut.map((x) => ({ ...x, peut_supprimer: x.est_moi && !x.supprime, auteur_suspendu: null })) : brut;
      const pres = document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 160;
      setMessages((avant) => {
        const neuf = fusionner(avant.filter((x) => !x.id.startsWith('apercu-')), [...l, ...locaux.current]);
        if (neuf.length && avant.length && neuf[neuf.length - 1].id !== avant[avant.length - 1].id && pres) allerEnBas.current = true;
        return neuf;
      });
      setPlusAnciens((p) => p || l.length >= LIMITE_PAGE);
      setCharge('ok');
    } catch {
      setCharge((c) => (c === 'cours' ? 'erreur' : c));
    }
  }, [apercuCanal, apercuVotant]);

  useEffect(() => {
    setMessages([]);
    setCharge('cours');
    allerEnBas.current = true;
    void rafraichir();
  }, [rafraichir]);

  // Polling only while visible and online.
  useEffect(() => {
    if (!enLigne) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void rafraichir();
    }, POLL_MS);
    const visible = () => document.visibilityState === 'visible' && void rafraichir();
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [enLigne, rafraichir]);

  // Scroll to the newest message, mark it as seen.
  const dernier = messages.length ? messages[messages.length - 1] : null;
  useEffect(() => {
    if (!dernier) return;
    marquerDiscussionVue(dernier.cree_at);
    if (allerEnBas.current) {
      allerEnBas.current = false;
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior });
    }
  }, [dernier]);

  // Pull-to-refresh at the top of the page.
  useEffect(() => {
    let y0: number | null = null;
    let tire = false;
    const debut = (e: TouchEvent) => {
      y0 = window.scrollY <= 0 ? e.touches[0].clientY : null;
      tire = false;
    };
    const bouge = (e: TouchEvent) => {
      if (y0 !== null && e.touches[0].clientY - y0 > 70) tire = true;
    };
    const fin = () => {
      if (tire) void rafraichir();
      y0 = null;
      tire = false;
    };
    window.addEventListener('touchstart', debut, { passive: true });
    window.addEventListener('touchmove', bouge, { passive: true });
    window.addEventListener('touchend', fin);
    return () => {
      window.removeEventListener('touchstart', debut);
      window.removeEventListener('touchmove', bouge);
      window.removeEventListener('touchend', fin);
    };
  }, [rafraichir]);

  // Closes the action menu on an outside tap.
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: Event) => {
      const t = e.target as HTMLElement;
      if (!t.closest(`[data-message="${menu}"]`)) setMenu(null);
    };
    document.addEventListener('pointerdown', dehors);
    return () => document.removeEventListener('pointerdown', dehors);
  }, [menu]);

  const chargerAnciens = async () => {
    if (!messages.length) return;
    setChargeAnciens(true);
    const hauteur = document.documentElement.scrollHeight;
    try {
      const brut = await lireMessages(messages[0].cree_at, LIMITE_PAGE, apercuCanal);
      const l = apercuVotant ? brut.map((x) => ({ ...x, peut_supprimer: x.est_moi && !x.supprime, auteur_suspendu: null })) : brut;
      setMessages((avant) => fusionner(avant, l));
      setPlusAnciens(l.length >= LIMITE_PAGE);
      requestAnimationFrame(() => window.scrollBy({ top: document.documentElement.scrollHeight - hauteur, behavior: 'instant' as ScrollBehavior }));
    } catch {
      /* the button stays */
    } finally {
      setChargeAnciens(false);
    }
  };

  const erreurEnvoi = (er: unknown) => {
    const code = extraireCode(er) ?? 'AUTRE';
    setErreur(ERREURS[code] ?? ERREURS.AUTRE);
  };
  // PUDI-CC-14.4: network failure = text kept, « Réessayer », one automatic retry when back
  // online, same client id (never written twice).
  const envoiMessage = useEnvoiFiable(async (t: string, rep: string | null, id: string) => {
    setEnvoi(true);
    try {
      await ecrireMessage(t, rep, id);
      setTexte('');
      setReponse(null);
      allerEnBas.current = true;
      await rafraichir();
    } finally {
      setEnvoi(false);
    }
  }, erreurEnvoi);

  const envoyer = async (e?: FormEvent) => {
    e?.preventDefault();
    const t = texte.trim();
    if (!t || t.length > MAX) {
      setErreur(ERREURS.MESSAGE_INVALIDE);
      allerAuChamp(champ.current);
      return;
    }
    setErreur(null);
    if (apercuVotant) {
      // Preview: the message is shown here only, nothing is sent.
      const faux: MessageDiscussion = {
        id: `apercu-${Date.now()}`,
        auteur_nom: 'Vous (aperçu)',
        texte: t,
        supprime: false,
        supprime_role: null,
        cree_at: new Date().toISOString(),
        reponse_a: reponse ? { id: reponse.id, auteur_nom: reponse.auteur_nom, extrait: reponse.texte.slice(0, 80), supprime: reponse.supprime } : null,
        est_moi: true,
        peut_supprimer: true,
        auteur_suspendu: null
      };
      locaux.current = [...locaux.current, faux];
      allerEnBas.current = true;
      setMessages((avant) => fusionner(avant, [faux]));
      setTexte('');
      setReponse(null);
      return;
    }
    try {
      if (!(await envoiMessage.lancer(t, reponse?.id ?? null, nouvelIdClient()))) setErreur(null);
    } catch (er) {
      erreurEnvoi(er);
    }
  };

  const demanderSuppression = (m: MessageDiscussion) => {
    setMenu(null);
    if (m.id.startsWith('apercu-')) {
      locaux.current = locaux.current.map((x) => (x.id === m.id ? { ...x, supprime: true, texte: '', supprime_role: 'auteur' } : x));
      setMessages((avant) => fusionner(avant, locaux.current));
      return;
    }
    setDemande({
      titre: 'Supprimer ce message ?',
      texte: 'Il sera remplacé par « Ce message a été supprimé » pour tout le monde.',
      libelleOk: 'Supprimer',
      danger: true,
      action: async () => {
        await supprimerMessage(m.id);
        await rafraichir();
      }
    });
  };

  const demanderSuspension = (m: MessageDiscussion) => {
    setMenu(null);
    setDemande(
      m.auteur_suspendu
        ? {
            titre: 'Lever la suspension ?',
            texte: `${m.auteur_nom} pourra de nouveau écrire dans la discussion.`,
            libelleOk: 'Lever la suspension',
            action: async () => {
              await retablirAuteur(m.id);
              await rafraichir();
            }
          }
        : {
            titre: "Suspendre l'auteur ?",
            texte: `${m.auteur_nom} ne pourra plus écrire dans la discussion. Ses messages restent visibles. Indiquez le motif (inscrit au journal).`,
            motif: true,
            libelleOk: 'Suspendre',
            danger: true,
            action: async (motif) => {
              await suspendreAuteur(m.id, motif);
              await rafraichir();
            }
          }
    );
  };

  const lignes = useMemo(() => {
    const out: ({ t: 'jour'; cle: string; libelle: string } | { t: 'msg'; m: MessageDiscussion })[] = [];
    let jour = '';
    for (const m of messages) {
      const j = jourMada(m.cree_at);
      if (j !== jour) {
        jour = j;
        out.push({ t: 'jour', cle: j, libelle: libelleJour(m.cree_at) });
      }
      out.push({ t: 'msg', m });
    }
    return out;
  }, [messages]);

  const n = texte.length;
  return (
    <main className="pudi-page mx-auto max-w-2xl pl-4 pr-6 pt-4 pb-[190px]">
      <h1 className="font-titre text-[1.5rem] leading-tight text-marine">Discussion</h1>
      <details className="mt-1 mb-3 group" data-aide-discussion="">
        <summary className="min-h-[44px] flex items-center gap-2 cursor-pointer list-none text-[0.9375rem] font-bold text-profond">
          Discussion ouverte à tous
          <Icone nom="info" className="w-5 h-5 text-marine" />
        </summary>
        <p className="text-[0.875rem] leading-relaxed bg-white border border-filet rounded-xl p-3">
          Tout le monde peut lire. Pour écrire, connectez-vous avec Google. Votre prénom et l'initiale de votre nom s'affichent, jamais votre numéro ni votre adresse.
          Restez courtois : les messages déplacés peuvent être supprimés par les responsables de groupe et les organisateurs.
        </p>
      </details>

      {!enLigne && (
        <p role="status" className="mb-3 border-l-4 border-[#926407] bg-[#FFF6E0] rounded-r-lg px-3 py-2 text-[0.875rem] font-bold" data-hors-ligne="">
          Hors connexion : messages non à jour
        </p>
      )}

      {charge === 'cours' && <p className="py-8 text-center text-gris">Chargement…</p>}
      {charge === 'erreur' && !messages.length && (
        <div className="py-6 text-center space-y-2">
          <p className="text-gris">Les messages n'ont pas pu être chargés.</p>
          <button type="button" className="min-h-[44px] px-4 rounded-xl border border-filet bg-white font-bold text-marine" onClick={() => void rafraichir()}>
            Réessayer
          </button>
        </div>
      )}
      {charge === 'ok' && !messages.length && <p className="py-8 text-center text-gris">Aucun message pour le moment. Soyez le premier à écrire.</p>}

      {plusAnciens && messages.length > 0 && (
        <div className="text-center mb-3">
          <button
            type="button"
            onClick={() => void chargerAnciens()}
            disabled={chargeAnciens || !enLigne}
            className="min-h-[44px] px-4 rounded-full border border-filet bg-white text-[0.875rem] font-bold text-marine disabled:opacity-60"
            data-plus-anciens=""
          >
            {chargeAnciens ? 'Chargement…' : 'Charger les messages plus anciens'}
          </button>
        </div>
      )}

      <ol className="space-y-2" aria-live="polite">
        {lignes.map((l) =>
          l.t === 'jour' ? (
            <li key={`j-${l.cle}`} className="flex justify-center py-1" data-separateur={l.libelle}>
              <span className="px-3 py-0.5 rounded-full bg-vide text-[0.75rem] font-bold text-gris">{l.libelle}</span>
            </li>
          ) : (
            <Bulle
              key={l.m.id}
              m={l.m}
              ouvert={menu === l.m.id}
              ouvrir={() => setMenu(l.m.id)}
              fermer={() => setMenu(null)}
              repondre={() => {
                setMenu(null);
                setReponse(l.m);
                window.setTimeout(() => champ.current?.focus(), 30);
              }}
              supprimer={() => demanderSuppression(l.m)}
              suspendre={() => demanderSuspension(l.m)}
              verrouille={!!apercu && !l.m.id.startsWith('apercu-')}
              organisateur={organisateur}
            />
          )
        )}
      </ol>

      <div
        className="fixed inset-x-0 z-20 bg-white/95 border-t border-filet"
        style={{ bottom: 'calc(57px + env(safe-area-inset-bottom, 0px))', backdropFilter: 'blur(8px)' }}
        data-composeur=""
      >
        <div className="mx-auto max-w-2xl pl-4 pr-6 py-2">
          {!session ? (
            <button
              type="button"
              className={`${boutonPrincipal} w-full`}
              disabled={connexion || !enLigne}
              onClick={() => {
                setConnexion(true);
                connexionGoogle('/pudi/discussion').catch(() => setConnexion(false));
              }}
              data-se-connecter=""
            >
              <Icone nom="connexion" />
              {connexion ? 'Connexion en cours…' : 'Se connecter pour écrire'}
            </button>
          ) : (
            <form onSubmit={(e) => void envoyer(e)} className="space-y-1.5">
              {envoiMessage.enAttente && <BandeauReseau cours={envoi} reessayer={() => void envoiMessage.reessayer().catch(erreurEnvoi)} />}
              {reponse && (
                <div className="flex items-start gap-2 bg-white border-l-[3px] border-marine rounded-r-lg px-2 py-1" data-reponse-a="">
                  <div className="min-w-0 flex-1 text-[0.8125rem]">
                    <span className="block font-bold text-marine">Réponse à {reponse.auteur_nom}</span>
                    <span className="block truncate text-gris">{reponse.texte.slice(0, 80)}</span>
                  </div>
                  <button type="button" aria-label="Annuler la réponse" onClick={() => setReponse(null)} className="w-8 h-8 flex items-center justify-center text-gris">
                    <Icone nom="croix" className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="flex-1 min-w-0">
                  <span className="sr-only">Votre message</span>
                  <textarea
                    ref={champ}
                    rows={2}
                    maxLength={MAX}
                    value={texte}
                    onChange={(e) => {
                      setTexte(e.target.value);
                      if (erreur) setErreur(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void envoyer();
                    }}
                    placeholder={enLigne ? 'Écrire un message…' : 'Hors connexion'}
                    disabled={!enLigne}
                    className="w-full max-h-32 rounded-xl border border-filet bg-white px-3 py-2 text-[1rem] leading-snug resize-none"
                    data-champ-message=""
                  />
                </label>
                <button
                  type="submit"
                  aria-label="Envoyer le message"
                  disabled={envoi || !enLigne}
                  className="w-12 h-12 shrink-0 rounded-full bg-marine text-white flex items-center justify-center disabled:opacity-50"
                  data-envoyer-message=""
                >
                  <Icone nom="envoyer" className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-start justify-between gap-2 min-h-[16px]">
                {erreur ? (
                  <p role="alert" className="text-[0.8125rem] font-bold text-[#9C3F21]" data-erreur-message="">
                    {erreur}
                  </p>
                ) : (
                  <span />
                )}
                {n >= COMPTEUR_DES && (
                  <span className={`text-[0.75rem] shrink-0 ${n >= MAX ? 'text-[#9C3F21] font-bold' : 'text-gris'}`} data-compteur="">
                    {n} / {MAX}
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </main>
  );
}
