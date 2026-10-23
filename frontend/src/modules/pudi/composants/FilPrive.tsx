// PUDI-CC-14.2: thread of one private conversation (voter page and organisers' view): own
// messages on the right, like the public discussion; composer with the 1000-character limit,
// rule 11 on an empty send, text kept on a failure.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MAX_PRIVE, type MessagePrive } from '../appels/prives';
import { allerAuChamp } from '../utils/champFautif';
import { heureHHmm, libelleJour } from '../pages/Discussion';
import { Icone } from './Icones';

const SUPPRIME = 'Ce message a été supprimé';

export function FilPrive({
  messages,
  vide,
  supprimer,
  verrouille = false
}: {
  messages: MessagePrive[];
  vide: string;
  /** Organisers only: soft delete with a reason. */
  supprimer?: (m: MessagePrive) => void;
  verrouille?: boolean;
}) {
  if (!messages.length) return <p className="py-6 text-center text-[15px] text-gris">{vide}</p>;
  let jour = '';
  return (
    <ol className="space-y-2" data-fil-prive="">
      {messages.map((m) => {
        const j = libelleJour(m.cree_at);
        const sep = j !== jour;
        jour = j;
        return (
          <li key={m.id}>
            {sep && <p className="my-2 text-center text-[12px] font-bold text-gris">{j}</p>}
            <div className={`flex ${m.est_moi ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${m.est_moi ? 'bg-marine text-white rounded-br-md' : 'bg-white border border-filet rounded-bl-md'}`}
                data-message-prive={m.id}
                data-cote={m.est_moi ? 'droite' : 'gauche'}
              >
                {!m.est_moi && <p className="text-[12px] font-bold text-marine">{m.auteur_nom}</p>}
                <p className={`text-[15px] whitespace-pre-wrap break-words ${m.supprime ? 'italic opacity-70' : ''}`}>{m.supprime ? SUPPRIME : m.texte}</p>
                <div className="mt-0.5 flex items-center justify-end gap-2">
                  {supprimer && !m.supprime && (
                    <button
                      type="button"
                      disabled={verrouille}
                      onClick={() => supprimer(m)}
                      className={`min-h-[32px] px-1 text-[12px] font-bold underline disabled:opacity-50 ${m.est_moi ? 'text-white' : 'text-[#B42318]'}`}
                    >
                      Supprimer
                    </button>
                  )}
                  <span className={`text-[11px] ${m.est_moi ? 'text-white/80' : 'text-gris'}`}>{heureHHmm(m.cree_at)}</span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Composer: returns true when the text was sent (then emptied). */
export function ComposeurPrive({
  envoyer,
  desactive = false,
  erreur,
  effacerErreur,
  placeholder = 'Écrire un message…'
}: {
  envoyer: (texte: string) => Promise<boolean>;
  desactive?: boolean;
  erreur: string | null;
  effacerErreur: () => void;
  placeholder?: string;
}) {
  const [texte, setTexte] = useState('');
  const [cours, setCours] = useState(false);
  const [vide, setVide] = useState(false);
  const champ = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (texte.trim()) setVide(false);
  }, [texte]);
  const soumettre = async (e?: FormEvent) => {
    e?.preventDefault();
    const t = texte.trim();
    if (!t) {
      setVide(true);
      allerAuChamp(champ.current);
      return;
    }
    setCours(true);
    try {
      if (await envoyer(t)) setTexte('');
    } finally {
      setCours(false);
    }
  };
  const message = vide ? 'Écrivez votre message avant de l’envoyer.' : erreur;
  return (
    <form onSubmit={(e) => void soumettre(e)} className="space-y-1.5" data-composeur-prive="">
      <div className="flex items-end gap-2">
        <label className="flex-1 min-w-0">
          <span className="sr-only">Votre message</span>
          <textarea
            ref={champ}
            rows={2}
            maxLength={MAX_PRIVE}
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              if (erreur) effacerErreur();
            }}
            placeholder={placeholder}
            disabled={desactive}
            className="w-full max-h-40 rounded-xl border border-filet bg-white px-3 py-2 text-[16px] leading-snug resize-none"
            data-champ-prive=""
          />
        </label>
        <button
          type="submit"
          aria-label="Envoyer le message"
          disabled={cours || desactive}
          className="w-12 h-12 shrink-0 rounded-full bg-marine text-white flex items-center justify-center disabled:opacity-50"
          data-envoyer-prive=""
        >
          <Icone nom="envoyer" className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-start justify-between gap-2 min-h-[16px]">
        {message ? (
          <p role="alert" className="text-[13px] font-bold text-[#9C3F21]" data-erreur-prive="">
            {message}
          </p>
        ) : (
          <span />
        )}
        {texte.length >= 800 && <span className="text-[12px] shrink-0 text-gris">{texte.length} / {MAX_PRIVE}</span>}
      </div>
    </form>
  );
}
