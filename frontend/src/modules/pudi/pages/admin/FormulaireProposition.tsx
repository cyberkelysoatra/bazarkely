// Dialog of a proposal: add, modify, or turn a voter's free text into a proposal (shared by the
// « Propositions » and « Votes » screens). Closes on success only; the server checks everything.
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from '../../composants/Icones';
import { boutonPrincipal, boutonSecondaire } from '../../composants/Mise';
import { enregistrerProposition, transformerManquant, type PropositionAdmin } from '../../appels/admin';
import { champ, messageAdmin } from './communs';

export const SOURCES_SUGGEREES = [
  "Ajout de l'administrateur",
  'Réunion PIC3 du 20/10/2026',
  'Sondage des opérateurs des 18 et 19/10/2026'
];
export const MAX_INTITULE = 140;
export const MAX_PRECISION = 600;

export type DemandeProposition =
  | { t: 'ajout' }
  | { t: 'modif'; p: PropositionAdmin }
  | { t: 'transformer'; idAnonyme: string; texte: string };

/** Today in Madagascar (yyyy-mm-dd), default date of the source. */
function aujourdhuiMada(): string {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function FormulaireProposition({
  demande,
  fermer,
  enregistre
}: {
  demande: DemandeProposition | null;
  fermer: () => void;
  /** Called with the id of the saved proposal. */
  enregistre: (id: string) => void | Promise<void>;
}) {
  const id = useId();
  const [intitule, setIntitule] = useState('');
  const [lieu, setLieu] = useState('');
  const [source, setSource] = useState('');
  const [dateSource, setDateSource] = useState('');
  const [precision, setPrecision] = useState('');
  const [cours, setCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const premier = useRef<HTMLInputElement>(null);
  const origine = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setErreur(null);
    setCours(false);
    if (!demande) return;
    if (demande.t === 'modif') {
      setIntitule(demande.p.intitule);
      setLieu(demande.p.lieu ?? '');
      setSource(demande.p.source);
      setDateSource(demande.p.date_source ?? '');
      setPrecision(demande.p.precision_texte ?? '');
    } else if (demande.t === 'transformer') {
      setIntitule(demande.texte.replace(/\s+/g, ' ').trim().slice(0, MAX_INTITULE));
      setLieu('');
      setSource("Texte libre d'un votant");
      setDateSource(aujourdhuiMada());
      // Same text as the server default, shown so that it is reviewed before sending.
      setPrecision(`Proposé par un votant : « ${demande.texte.replace(/\s+/g, ' ').trim()} »`.slice(0, MAX_PRECISION));
    } else {
      setIntitule('');
      setLieu('');
      setSource(SOURCES_SUGGEREES[0]);
      setDateSource(aujourdhuiMada());
      setPrecision('');
    }
    origine.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => premier.current?.focus(), 30);
    return () => {
      const el = origine.current;
      if (el && document.contains(el)) window.setTimeout(() => el.focus(), 0);
    };
  }, [demande]);

  useEffect(() => {
    if (!demande) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cours) fermer();
    };
    document.addEventListener('keydown', touche);
    return () => document.removeEventListener('keydown', touche);
  }, [demande, cours, fermer]);

  if (!demande) return null;
  const transformer = demande.t === 'transformer';
  const titre = demande.t === 'ajout' ? 'Ajouter une proposition' : demande.t === 'modif' ? `Modifier ${demande.p.id}` : 'Transformer en proposition';

  const valider = async () => {
    if (intitule.trim().length < 3) return setErreur('Indiquez un titre (3 caractères au moins).');
    if (!transformer && source.trim().length < 2) return setErreur('Indiquez la source.');
    setCours(true);
    setErreur(null);
    try {
      const nid =
        demande.t === 'transformer'
          ? await transformerManquant(demande.idAnonyme, intitule.trim(), lieu.trim(), precision)
          : await enregistrerProposition({
              id: demande.t === 'modif' ? demande.p.id : null,
              intitule: intitule.trim(),
              lieu: lieu.trim(),
              source: source.trim(),
              dateSource,
              precision: precision.trim()
            });
      await enregistre(nid);
      fermer();
    } catch (e) {
      setErreur(messageAdmin(e));
      setCours(false);
    }
  };

  const etiquette = (pour: string, texte: string, aide?: string) => (
    <label htmlFor={pour} className="block font-bold text-[14px] mb-1">
      {texte}
      {aide && <span className="font-normal text-gris"> {aide}</span>}
    </label>
  );

  return createPortal(
    <div className="pudi-page fixed inset-0 z-[80] bg-[#0B2A8C]/40 flex items-end sm:items-center justify-center p-3 font-corps text-texte" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        className="w-full max-w-md max-h-[calc(100vh-24px)] overflow-y-auto bg-white rounded-2xl shadow-xl p-4 space-y-3"
      >
        <h2 id={`${id}-t`} className="font-bold text-[18px] text-marine">
          {titre}
        </h2>
        {transformer && (
          <>
            <blockquote className="border-l-4 border-filet pl-3 text-[14px] text-gris whitespace-pre-wrap break-words">
              {demande.texte}
            </blockquote>
            <p role="note" className="flex gap-2 items-start text-[14px] font-bold text-[#9C3F21]">
              <Icone nom="alerte" className="w-4 h-4 mt-0.5 shrink-0" />
              Relisez : aucun nom ni information personnelle ne doit apparaître.
            </p>
          </>
        )}
        <div>
          {etiquette(`${id}-i`, 'Titre', `(${intitule.length} / ${MAX_INTITULE})`)}
          <input id={`${id}-i`} ref={premier} className={champ} maxLength={MAX_INTITULE} value={intitule} onChange={(e) => setIntitule(e.target.value)} />
        </div>
        <div>
          {etiquette(`${id}-l`, 'Lieu', '(facultatif)')}
          <input id={`${id}-l`} className={champ} maxLength={120} value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </div>
        {!transformer && (
          <>
            <div>
              {etiquette(`${id}-s`, 'Source')}
              <input id={`${id}-s`} className={champ} list={`${id}-sl`} maxLength={160} value={source} onChange={(e) => setSource(e.target.value)} />
              <datalist id={`${id}-sl`}>
                {SOURCES_SUGGEREES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              {etiquette(`${id}-d`, 'Date de la source')}
              <input id={`${id}-d`} type="date" className={champ} value={dateSource} onChange={(e) => setDateSource(e.target.value)} />
            </div>
          </>
        )}
        <div>
          {etiquette(`${id}-p`, 'Précision', `(facultatif, ${precision.length} / ${MAX_PRECISION})`)}
          <textarea
            id={`${id}-p`}
            rows={3}
            maxLength={MAX_PRECISION}
            value={precision}
            onChange={(e) => setPrecision(e.target.value)}
            className="w-full rounded-xl border border-filet px-3 py-2 text-[16px]"
          />
        </div>
        {erreur && (
          <p role="alert" className="text-[14px] font-bold text-[#9C3F21]">
            {erreur}
          </p>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" className={boutonSecondaire} onClick={fermer} disabled={cours}>
            Annuler
          </button>
          <button type="button" className={boutonPrincipal} onClick={() => void valider()} disabled={cours}>
            {cours ? 'Envoi…' : demande.t === 'modif' ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
