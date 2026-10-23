// « Écrire aux organisateurs » (PUDI-CC-14.2, specification v8, 4.16): one private conversation per
// signed-in person, read only by its author and the organisers. In JOEL's « Voir comme » preview
// nothing is read nor sent (a sent message stays on this screen only).
import { useCallback, useEffect, useState } from 'react';
import { Icone } from '../composants/Icones';
import { Chargement, Page, boutonPrincipal } from '../composants/Mise';
import { ComposeurPrive, FilPrive } from '../composants/FilPrive';
import { usePudi } from '../PudiContexte';
import { connexionGoogle, useSessionLocale } from '../appels/session';
import { ecrirePrive, lireMaConversation, nouvelIdClient, type MessagePrive } from '../appels/prives';
import { marquerPriveLu } from '../appels/priveNonLu';
import { extraireCode } from '../utils/erreurs';
import { Aide } from './admin/communs';
import { BandeauReseau, useEnvoiFiable } from '../composants/Reseau';

export const ERREURS_PRIVE: Record<string, string> = {
  TROP_DE_MESSAGES: 'Vous écrivez trop vite : attendez quelques secondes (60 messages par jour au plus).',
  DISCUSSION_SUSPENDU: 'Votre compte ne peut plus écrire. Écrivez au GIHTNB (info.gihtnb@gmail.com) si c’est une erreur.',
  MESSAGE_INVALIDE: 'Écrivez un message de 1 à 1000 caractères.',
  NON_CONNECTE: 'Connectez-vous avec Google pour écrire.',
  RESEAU: 'Le réseau ne répond pas. Votre message est gardé : réessayez.',
  AUTRE: 'Le message n’a pas pu être envoyé. Réessayez.'
};

export default function Prive() {
  const session = useSessionLocale();
  const { apercu } = usePudi();
  const [messages, setMessages] = useState<MessagePrive[] | null>(null);
  const [erreurLecture, setErreurLecture] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [connexion, setConnexion] = useState(false);

  const charger = useCallback(async () => {
    if (apercu) {
      setMessages((m) => m ?? []);
      return;
    }
    try {
      const r = await lireMaConversation();
      setMessages(r.messages);
      setErreurLecture(false);
      marquerPriveLu();
    } catch {
      setErreurLecture(true);
      setMessages((m) => m ?? []);
    }
  }, [apercu]);

  useEffect(() => {
    if (session) void charger();
  }, [session, charger]);

  const erreurEnvoi = (e: unknown) => {
    const code = extraireCode(e) ?? 'AUTRE';
    setErreur(ERREURS_PRIVE[code] ?? ERREURS_PRIVE.AUTRE);
  };
  // PUDI-CC-14.4: network failure = text kept, « Réessayer », one automatic retry when back online
  // with the same client id (never written twice).
  const [envoyes, setEnvoyes] = useState(0);
  const envoi = useEnvoiFiable(async (texte: string, id: string) => {
    await ecrirePrive(texte, id);
    setEnvoyes((n) => n + 1);
    await charger();
  }, erreurEnvoi);

  const envoyer = async (texte: string): Promise<boolean> => {
    setErreur(null);
    if (apercu) {
      setMessages((m) => [
        ...(m ?? []),
        { id: `apercu-${Date.now()}`, texte, supprime: false, cree_at: new Date().toISOString(), role: 'votant', est_moi: true, auteur_nom: 'Vous (aperçu)' }
      ]);
      return true;
    }
    try {
      return await envoi.lancer(texte, nouvelIdClient());
    } catch (e) {
      erreurEnvoi(e);
      return false;
    }
  };

  return (
    <Page titre="Écrire aux organisateurs" logosPied={false}>
      <Aide titre="Qui lit ces messages ?">
        <p>Seuls les organisateurs lisent ces messages.</p>
        <p>Pour une question de détail que vous ne voulez pas poser à tous dans la discussion. La réponse apparaît ici ; un point rouge sur le menu vous prévient.</p>
      </Aide>
      {apercu && (
        <p className="mb-3 bg-[#FFF6E0] border-l-4 border-[#926407] rounded-r-lg px-3 py-2 text-[0.875rem]" data-prive-apercu="">
          Aperçu : aucune conversation n’est lue ni envoyée.
        </p>
      )}
      {!session ? (
        <div className="bg-white border border-filet rounded-xl p-4 space-y-3">
          <p className="text-[0.9375rem]">Connectez-vous avec Google pour écrire aux organisateurs.</p>
          <button
            type="button"
            className={`${boutonPrincipal} w-full`}
            disabled={connexion}
            onClick={() => {
              setConnexion(true);
              connexionGoogle('/pudi/prive').catch(() => setConnexion(false));
            }}
            data-prive-connexion=""
          >
            <Icone nom="connexion" />
            {connexion ? 'Connexion en cours…' : 'Se connecter avec Google'}
          </button>
        </div>
      ) : messages === null ? (
        <Chargement />
      ) : (
        <div className="space-y-4">
          {erreurLecture && <p className="text-[0.875rem] text-gris">Conversation indisponible pour le moment (réseau).</p>}
          <FilPrive messages={messages} vide="Aucun message pour l’instant. Écrivez votre question ci-dessous." />
          {envoi.enAttente && <BandeauReseau reessayer={() => void envoi.reessayer().catch(erreurEnvoi)} />}
          <ComposeurPrive envoyer={envoyer} erreur={erreur} effacerErreur={() => setErreur(null)} placeholder="Votre question aux organisateurs…" envoyes={envoyes} />
        </div>
      )}
    </Page>
  );
}
