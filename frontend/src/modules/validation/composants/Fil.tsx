// Thread of a project (screens 8 ter and 11 bis, VC-39, VC-40), shared by the client and Joël:
// bubbles (own ones on the right), question labels, withdraw within 5 minutes, input bar fixed at the
// bottom with the dictation microphone left of the field, offline queue (appels/messages.ts).
// Re-read every 15 s while visible and online; vc_marquer_lu on opening and when new messages come.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as EvPointeur } from 'react';
import { listerMessages, marquerLu, retirerMessage } from '../appels/api';
import { ecrireLocal, lireLocal } from '../appels/local';
import { ajouterMessage, chargerMessages, oublierMessage, surEnvoi, useFileMessages, viderMessages } from '../appels/messages';
import { useFile } from '../appels/file';
import { Icone } from './Icones';
import { useMicro } from './Micro';
import { PRIMAIRE, SECONDAIRE } from './Mise';
import {
  FIL_VIDE,
  LIGNE_FIXE,
  MAX_MESSAGE,
  RELECTURE_FIL_MS,
  TEXTES_MESSAGE,
  compteurMessage,
  couperMessage,
  fusionnerFil,
  heureBulle,
  retirable,
  signature,
  type Bulle
} from '../utils/discussion';
import type { MessageFil } from '../utils/types';

/** Height of 5 lines of the field (22 px each) plus its padding and border. */
const CHAMP_MAX = 5 * 22 + 20 + 2;
const DANGER_PETIT = 'min-h-11 rounded-xl text-[15px] font-semibold flex items-center justify-center px-3 bg-white text-danger border-2 border-danger disabled:opacity-60';

export interface QuestionJointe {
  id: string;
  libelle: string;
}

interface Props {
  client: string;
  /** Name and function shown on the bubbles still on the phone. */
  auteur: { nom: string; fonction: string | null };
  /** Client screen: the fixed line at the top and the empty-thread sentence. */
  client_ecran: boolean;
  placeholder: string;
  question: QuestionJointe | null;
  retirerQuestion: () => void;
  /** Tap on a question label. */
  ouvrirQuestion: (questionId: string) => void;
  /** Line under the thread (Joël's screen). */
  note?: string;
}

function enBas(): boolean {
  return document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 80;
}

function allerEnBas(): void {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior });
}

export default function Fil({ client, auteur, client_ecran, placeholder, question, retirerQuestion, ouvrirQuestion, note }: Props) {
  const [serveur, setServeur] = useState<MessageFil[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [texte, setTexte] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [aRetirer, setARetirer] = useState<string | null>(null);
  const [retrait, setRetrait] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [, setTic] = useState(0);
  const file = useFileMessages();
  const { enLigne } = useFile();
  const champ = useRef<HTMLTextAreaElement>(null);
  const descendre = useRef(true);
  const connus = useRef<number | null>(null);
  const verrou = useRef(false);

  const lire = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const garde = await lireLocal<MessageFil[]>(`fil:${client}`);
      setServeur((s) => s ?? (Array.isArray(garde) ? garde : null));
      if (!Array.isArray(garde)) setErreur(true);
      return;
    }
    try {
      const l = await listerMessages(client);
      const liste = Array.isArray(l) ? l : [];
      if (!enBas() && connus.current !== null) descendre.current = false;
      else descendre.current = true;
      setServeur(liste);
      setErreur(false);
      void ecrireLocal(`fil:${client}`, liste);
      // Opening, or new messages since the last reading: mark the thread as read.
      if (connus.current === null || liste.length > connus.current) void marquerLu(client).catch(() => undefined);
      connus.current = liste.length;
    } catch {
      const garde = await lireLocal<MessageFil[]>(`fil:${client}`);
      setServeur((s) => s ?? (Array.isArray(garde) ? garde : null));
      setErreur(true);
    }
  }, [client]);

  useEffect(() => {
    connus.current = null;
    descendre.current = true;
    setServeur(null);
    void chargerMessages();
    void lire();
  }, [lire]);

  // Every 15 s while visible and online; at once when visible again or back online.
  useEffect(() => {
    if (!enLigne) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) void lire();
    }, RELECTURE_FIL_MS);
    const visible = () => document.visibilityState === 'visible' && void lire();
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [enLigne, lire]);

  // A queued message recorded by the server: re-read the thread (clock gone, real order).
  useEffect(() => surEnvoi(() => void lire()), [lire]);
  useEffect(() => {
    if (enLigne) void viderMessages();
  }, [enLigne]);

  // The « Retirer » entry disappears by itself after 5 minutes.
  const bulles = useMemo(() => fusionnerFil(serveur ?? [], file, client, auteur), [serveur, file, client, auteur]);
  const unRetirable = bulles.some((b) => !b.attente && !b.refus && retirable(b));
  useEffect(() => {
    if (!unRetirable) return;
    const t = window.setInterval(() => setTic((n) => n + 1), 10000);
    return () => window.clearInterval(t);
  }, [unRetirable]);

  const nb = bulles.length;
  useLayoutEffect(() => {
    if (serveur === null && !file.length) return;
    if (descendre.current) allerEnBas();
  }, [nb, serveur, file.length]);

  // The field grows with the text up to 5 lines, then it scrolls.
  useLayoutEffect(() => {
    const el = champ.current;
    if (!el) return;
    el.style.height = 'auto';
    const h = el.scrollHeight + (el.offsetHeight - el.clientHeight);
    el.style.height = `${Math.min(h, CHAMP_MAX)}px`;
    el.style.overflowY = h > CHAMP_MAX ? 'auto' : 'hidden';
  }, [texte]);

  async function envoyer() {
    const t = couperMessage(texte).trim();
    // Lock taken synchronously: a double tap before the next render never sends twice.
    if (!t || verrou.current) return;
    verrou.current = true;
    const q = question;
    setTexte('');
    retirerQuestion();
    descendre.current = true;
    try {
      await ajouterMessage({
        id: crypto.randomUUID(),
        client,
        texte: t,
        question: q?.id ?? null,
        questionLibelle: q?.libelle ?? null,
        cree_at: new Date().toISOString()
      });
    } finally {
      verrou.current = false;
    }
  }

  async function confirmerRetrait(id: string) {
    setRetrait(true);
    try {
      const r = await retirerMessage(id);
      if (r?.ok) {
        setErreurs((e) => ({ ...e, [id]: '' }));
        await lire();
      } else setErreurs((e) => ({ ...e, [id]: TEXTES_MESSAGE[r?.code ?? ''] ?? TEXTES_MESSAGE.REFUSE }));
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setErreurs((x) => ({ ...x, [id]: /VC_/.test(m) ? TEXTES_MESSAGE.REFUSE : 'Le réseau ne répond pas : le message n’est pas retiré. Réessayez.' }));
    } finally {
      setRetrait(false);
      setARetirer(null);
      setMenu(null);
    }
  }

  const compteur = compteurMessage(texte.length);
  const micro = useMicro({ valeur: texte, changer: (v) => setTexte(couperMessage(v)), max: MAX_MESSAGE });
  return (
    <>
      {client_ecran && (
        <p className="text-[13px] leading-[1.45] m-0 bg-[#f0fdfa] border border-[#99f6e4] text-[#134e4a] rounded-[10px] px-3 py-2.5" data-ligne-fixe="">
          {LIGNE_FIXE}
        </p>
      )}
      {serveur === null && !erreur && !file.length && (
        <p className="text-[14px] text-doux m-0" role="status" data-fil-chargement="">
          Chargement des messages…
        </p>
      )}
      {erreur && (
        <p className="text-[13px] text-[#92400e] m-0" role="status" data-fil-erreur="">
          {serveur === null ? 'Le réseau ne répond pas : les messages s’afficheront au retour du réseau.' : 'Pas de réseau : voici les derniers messages gardés sur ce téléphone.'}
        </p>
      )}
      {serveur !== null && bulles.length === 0 && (
        <p className="text-[15px] text-doux m-0 text-center py-6" data-fil-vide="">
          {client_ecran ? FIL_VIDE : 'Aucun message pour ce projet.'}
        </p>
      )}
      <ol className="list-none m-0 p-0 flex flex-col gap-3.5" data-fil="">
        {bulles.map((b) => (
          <BulleMessage
            key={b.id}
            b={b}
            menu={menu === b.id}
            ouvrirMenu={() => setMenu(retirable(b) && !b.attente && !b.refus ? b.id : null)}
            fermerMenu={() => setMenu(null)}
            demanderRetrait={() => setARetirer(b.id)}
            confirmation={aRetirer === b.id}
            annulerRetrait={() => {
              setARetirer(null);
              setMenu(null);
            }}
            confirmerRetrait={() => void confirmerRetrait(b.id)}
            retrait={retrait}
            erreur={erreurs[b.id] || null}
            ouvrirQuestion={ouvrirQuestion}
            oublier={() => void oublierMessage(b.id)}
          />
        ))}
      </ol>
      {note && <p className="text-[13px] text-doux m-0">{note}</p>}

      <div className="vc-action !flex-col !gap-2" data-barre-saisie="">
        {question && (
          <div className="flex items-center gap-2 self-start max-w-full bg-[#ccfbf1] text-discussion rounded-full pl-3 pr-1 min-h-8" data-question-jointe={question.id}>
            <span className="text-[12px] font-semibold min-w-0 truncate">{question.libelle}</span>
            <button type="button" onClick={retirerQuestion} aria-label="Retirer la référence à la question" className="w-8 h-8 flex-none flex items-center justify-center rounded-full" data-retirer-question="">
              <Icone nom="croix" className="w-3.5 h-3.5" epaisseur={2.6} />
            </button>
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void envoyer();
          }}
        >
          {/* Dictation microphone (phase 8), left of the field. */}
          <div className="w-11 h-11 flex-none" data-emplacement-micro="">
            {micro.bouton}
          </div>
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">Votre message</span>
            <textarea
              ref={champ}
              rows={1}
              value={texte}
              maxLength={MAX_MESSAGE}
              placeholder={placeholder}
              onChange={(e) => setTexte(couperMessage(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void envoyer();
                }
              }}
              className="block w-full box-border min-h-12 rounded-[10px] border border-[#94a3b8] bg-white px-2.5 py-[12px] text-[15px] leading-[22px] font-[inherit] resize-none"
              data-champ-message=""
            />
          </label>
          <button type="submit" className={`${PRIMAIRE} !w-[52px] !px-0 flex-none`} aria-label="Envoyer" title="Envoyer" disabled={!texte.trim()} data-envoyer="">
            <Icone nom="envoyer" epaisseur={2.2} />
          </button>
        </form>
        {micro.message}
        {compteur && (
          <p className={`text-[12px] m-0 text-right ${texte.length >= MAX_MESSAGE ? 'text-danger font-semibold' : 'text-doux'}`} aria-live="polite" data-compteur="">
            {compteur}
          </p>
        )}
      </div>
    </>
  );
}

function BulleMessage({
  b,
  menu,
  ouvrirMenu,
  fermerMenu,
  demanderRetrait,
  confirmation,
  annulerRetrait,
  confirmerRetrait,
  retrait,
  erreur,
  ouvrirQuestion,
  oublier
}: {
  b: Bulle;
  menu: boolean;
  ouvrirMenu: () => void;
  fermerMenu: () => void;
  demanderRetrait: () => void;
  confirmation: boolean;
  annulerRetrait: () => void;
  confirmerRetrait: () => void;
  retrait: boolean;
  erreur: string | null;
  ouvrirQuestion: (id: string) => void;
  oublier: () => void;
}) {
  const appui = useRef<number | null>(null);
  const debut = (e: EvPointeur) => {
    if (e.button > 0 || !b.moi) return;
    appui.current = window.setTimeout(ouvrirMenu, 500);
  };
  const fin = () => {
    if (appui.current) window.clearTimeout(appui.current);
    appui.current = null;
  };
  const moi = b.moi;
  return (
    <li className={`flex flex-col gap-1 ${moi ? 'items-end' : 'items-start'}`} data-message={b.id} data-moi={moi ? '1' : '0'} data-attente={b.attente ? '1' : '0'}>
      <span className="text-[13px] text-doux" data-signature="">
        {signature(b)}
      </span>
      {b.question &&
        (b.question_id ? (
          <button
            type="button"
            onClick={() => ouvrirQuestion(b.question_id!)}
            className="inline-flex text-left text-[12px] font-semibold text-discussion bg-[#ccfbf1] rounded-full px-2.5 py-[3px] min-h-6 max-w-full"
            data-etiquette-question={b.question_id}
          >
            {b.question}
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-discussion bg-[#ccfbf1] rounded-full px-2.5 py-[3px]">{b.question}</span>
        ))}
      {b.retire ? (
        <div className="max-w-[85%] bg-[#f1f5f9] text-[#64748b] italic border border-[#e2e8f0] rounded-[14px] px-3 py-2.5 text-[15px] leading-[1.45]" data-retire="">
          Message retiré
          <div className="text-[11px] not-italic mt-1 text-right">{heureBulle(b.cree_at)}</div>
        </div>
      ) : (
        <div
          onPointerDown={debut}
          onPointerUp={fin}
          onPointerLeave={fin}
          onPointerCancel={fin}
          onContextMenu={(e) => {
            if (moi && !b.attente && !b.refus) {
              e.preventDefault();
              ouvrirMenu();
            }
          }}
          className={`max-w-[85%] rounded-[14px] px-3 py-2.5 text-[15px] leading-[1.45] whitespace-pre-wrap break-words select-text ${
            moi ? 'bg-ciel text-white' : 'bg-white text-encre border border-filet'
          } ${b.refus ? '!bg-[#fef2f2] !text-encre border-2 !border-danger' : ''}`}
          data-bulle=""
        >
          {b.texte}
          <div className={`text-[11px] mt-1 flex items-center justify-end gap-1 ${moi && !b.refus ? 'text-clair' : 'text-doux'}`}>
            {b.attente && (
              <span className="inline-flex" role="img" aria-label="En attente du réseau" data-horloge="">
                <Icone nom="horloge" className="w-3.5 h-3.5" />
              </span>
            )}
            {heureBulle(b.cree_at)}
          </div>
        </div>
      )}
      {b.refus && (
        <div className="max-w-[85%] flex flex-col items-end gap-1" role="alert" data-refus={b.refus}>
          <p className="text-[13px] font-semibold text-danger m-0 text-right">{TEXTES_MESSAGE[b.refus] ?? TEXTES_MESSAGE.REFUSE}</p>
          <button type="button" onClick={oublier} className="text-[13px] font-semibold text-ciel underline min-h-11" data-oublier="">
            Effacer ce message
          </button>
        </div>
      )}
      {menu && !confirmation && (
        <div className="flex gap-2" data-menu-message="">
          <button type="button" className={DANGER_PETIT} onClick={demanderRetrait} data-retirer-message="">
            Retirer ce message
          </button>
          <button type="button" className={`${SECONDAIRE} !min-h-11 !text-[15px]`} onClick={fermerMenu}>
            Fermer
          </button>
        </div>
      )}
      {confirmation && (
        <div className="max-w-[85%] bg-white border-2 border-danger rounded-[14px] p-3 flex flex-col gap-2" role="alertdialog" aria-label="Retirer ce message" data-confirmer-retrait="">
          <p className="text-[14px] font-semibold m-0">Retirer ce message ? Il sera remplacé par « Message retiré ».</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`${SECONDAIRE} !min-h-11 !text-[15px]`} onClick={annulerRetrait} disabled={retrait}>
              Annuler
            </button>
            <button type="button" className={DANGER_PETIT} onClick={confirmerRetrait} disabled={retrait} data-oui-retirer="">
              Retirer
            </button>
          </div>
        </div>
      )}
      {erreur && (
        <p className="max-w-[85%] text-[13px] font-semibold text-danger m-0" role="alert" data-erreur-retrait="">
          {erreur}
        </p>
      )}
    </li>
  );
}
