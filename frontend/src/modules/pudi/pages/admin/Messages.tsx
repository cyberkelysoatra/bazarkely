// Administration › Messages (PUDI-CC-14.2): private conversations with the organisers. List with
// the author (first name + initial, Gmail to answer by e-mail if needed), last message and unread
// flag; conversation view with reply and soft delete (reason required, logged).
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Icone } from '../../composants/Icones';
import { ComposeurPrive, FilPrive } from '../../composants/FilPrive';
import {
  listerConversations,
  lireConversation,
  nouvelIdClient,
  repondrePrive,
  supprimerPrive,
  type ConversationAdmin,
  type ConversationDetail
} from '../../appels/prives';
import { extraireCode } from '../../utils/erreurs';
import { dateCourte } from '../../utils/format';
import { ERREURS_PRIVE } from '../Prive';
import { Aide, Dialogue, Erreur, type DemandeConfirmation } from './communs';

// Unread count shared with the tab badge of the administration.
let nbNonLus = 0;
const abonnes = new Set<() => void>();
function definirNonLus(liste: ConversationAdmin[]): void {
  nbNonLus = liste.filter((c) => c.non_lu).length;
  abonnes.forEach((f) => f());
}
export function useNbMessagesNonLus(actif: boolean): number {
  useEffect(() => {
    if (!actif) return;
    const lire = () => {
      if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
      listerConversations().then(definirNonLus, () => undefined);
    };
    lire();
    const id = window.setInterval(lire, 60000);
    return () => window.clearInterval(id);
  }, [actif]);
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => nbNonLus,
    () => 0
  );
}

function Conversation({ id, retour }: { id: string; retour: () => void }) {
  const [c, setC] = useState<ConversationDetail | null>(null);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const charger = useCallback(async () => {
    try {
      setC(await lireConversation(id));
      setErreurLecture(null);
      listerConversations().then(definirNonLus, () => undefined);
    } catch (e) {
      setErreurLecture(extraireCode(e) === 'RESEAU' ? 'Le réseau ne répond pas.' : 'Conversation indisponible.');
    }
  }, [id]);
  useEffect(() => {
    void charger();
  }, [charger]);
  const envoyer = async (texte: string) => {
    setErreur(null);
    try {
      await repondrePrive(id, texte, nouvelIdClient());
      await charger();
      return true;
    } catch (e) {
      const code = extraireCode(e) ?? 'AUTRE';
      setErreur(ERREURS_PRIVE[code] ?? ERREURS_PRIVE.AUTRE);
      return false;
    }
  };
  return (
    <section data-conversation-admin={id}>
      <button type="button" onClick={retour} className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[15px]">
        <Icone nom="gauche" />
        Toutes les conversations
      </button>
      {erreurLecture && <Erreur texte={erreurLecture} />}
      {!c ? (
        !erreurLecture && <p className="text-gris py-6 text-center">Chargement…</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-filet rounded-xl p-3">
            <p className="font-bold text-[16px] text-marine">{c.auteur_nom}</p>
            {c.auteur_email && (
              <a href={`mailto:${c.auteur_email}`} className="text-[14px] text-marine underline break-all" data-conversation-email="">
                {c.auteur_email}
              </a>
            )}
          </div>
          <FilPrive
            messages={c.messages}
            vide="Aucun message."
            supprimer={(m) =>
              setDemande({
                titre: 'Supprimer ce message ?',
                texte: 'Il sera remplacé par « Ce message a été supprimé » pour l’auteur et pour les organisateurs. Le motif va au journal.',
                motif: true,
                libelleOk: 'Supprimer',
                danger: true,
                action: async (motif) => {
                  await supprimerPrive(m.id, motif);
                  await charger();
                }
              })
            }
          />
          <ComposeurPrive envoyer={envoyer} erreur={erreur} effacerErreur={() => setErreur(null)} placeholder="Votre réponse…" />
        </div>
      )}
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </section>
  );
}

export default function Messages() {
  const [liste, setListe] = useState<ConversationAdmin[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const charger = useCallback(async () => {
    try {
      const l = await listerConversations();
      setListe(l);
      definirNonLus(l);
      setErreur(null);
    } catch (e) {
      setErreur(extraireCode(e) === 'RESEAU' ? 'Le réseau ne répond pas.' : 'Liste indisponible.');
    }
  }, []);
  useEffect(() => {
    if (!ouverte) void charger();
  }, [ouverte, charger]);

  if (ouverte) return <Conversation id={ouverte} retour={() => setOuverte(null)} />;
  return (
    <section>
      <h2 className="font-bold text-[18px] text-marine mb-2">Messages aux organisateurs</h2>
      <Aide>
        <p>Chaque personne connectée peut écrire aux organisateurs. Seuls les organisateurs lisent ces conversations (ni les responsables de groupe, ni les autres votants).</p>
        <p>L’adresse Gmail de l’auteur permet de répondre par e-mail si besoin. Les messages sont effacés le 28/01/2027.</p>
      </Aide>
      {erreur && <Erreur texte={erreur} />}
      {!liste ? (
        !erreur && <p className="text-gris py-6 text-center">Chargement…</p>
      ) : !liste.length ? (
        <p className="text-gris py-4">Aucune conversation pour l’instant.</p>
      ) : (
        <ul className="space-y-2" data-liste-prives="">
          {liste.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOuverte(c.id)}
                className={`w-full text-left bg-white border rounded-xl p-3 flex gap-3 items-start ${c.non_lu ? 'border-marine border-2' : 'border-filet'}`}
                data-conversation={c.id}
              >
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${c.non_lu ? 'bg-[#E5484D]' : 'bg-transparent'}`} aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[15px]">
                    {c.auteur_nom}
                    {c.non_lu && <span className="sr-only"> (non lu)</span>}
                  </span>
                  <span className="block text-[13px] text-gris break-all">{c.auteur_email ?? ''}</span>
                  <span className="block text-[13px] text-gris">
                    {c.dernier_at ? `Dernier message le ${dateCourte(c.dernier_at)}` : ''} · {c.nb_messages} message{c.nb_messages > 1 ? 's' : ''}
                  </span>
                </span>
                <Icone nom="droite" className="w-4 h-4 mt-1 text-marine shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
