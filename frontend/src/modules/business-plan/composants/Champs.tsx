// Input fields of the workbook: text (auto-grow), amount in ariary, number, choices. Each one renders
// the plain value instead of an input in read only mode (example JUS'NOSY).
import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { grouper, lireEntier } from '../utils/format';

interface Base {
  label: string;
  aide?: ReactNode;
  lectureSeule?: boolean;
  /** Small mention under the label (e.g. "Reste sur votre téléphone, n'est jamais envoyé"). */
  mention?: string;
}

function Etiquette({ id, label, mention }: { id: string; label: string; mention?: string }) {
  return (
    <label htmlFor={id} className="block text-[15px] font-bold text-encre leading-snug">
      {label}
      {mention ? <span className="block text-[13px] font-normal text-doux mt-0.5">{mention}</span> : null}
    </label>
  );
}

function Valeur({ children, vide }: { children: ReactNode; vide: boolean }) {
  return <p className={`mt-1 text-base leading-relaxed whitespace-pre-wrap break-words ${vide ? 'text-doux italic' : 'text-encre'}`}>{vide ? 'Non rempli' : children}</p>;
}

export function ChampTexte({
  label,
  aide,
  lectureSeule,
  mention,
  valeur,
  onChange,
  placeholder,
  ligne = false,
  type = 'text',
  autoComplete
}: Base & {
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** One line only (name, phone...). */
  ligne?: boolean;
  type?: 'text' | 'tel' | 'email';
  autoComplete?: string;
}) {
  const id = useId();
  const zone = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = zone.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight + 2, 48) + 'px';
  }, [valeur]);
  return (
    <div className="mb-4">
      <Etiquette id={id} label={label} mention={mention} />
      {aide}
      {lectureSeule ? (
        <Valeur vide={!valeur.trim()}>{valeur}</Valeur>
      ) : ligne ? (
        <input
          id={id}
          type={type}
          inputMode={type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined}
          autoComplete={autoComplete}
          className="bp-champ mt-1.5"
          value={valeur}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <textarea
          id={id}
          ref={zone}
          rows={2}
          className="bp-champ mt-1.5 resize-none overflow-hidden"
          value={valeur}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/** Integer typed with the numeric keyboard, shown grouped ("1 200 000"), stored as a number or null. */
function SaisieEntiere({ id, valeur, onChange, suffixe, placeholder, label }: { id?: string; valeur: number | null; onChange: (v: number | null) => void; suffixe?: string; placeholder?: string; label?: string }) {
  return (
    <div className="bp-champ mt-1.5 flex items-center gap-2 focus-within:outline focus-within:outline-[3px] focus-within:outline-turquoise focus-within:outline-offset-1">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent outline-none text-right tabular-nums"
        value={valeur === null ? '' : grouper(valeur)}
        placeholder={placeholder}
        onChange={(e) => onChange(lireEntier(e.target.value))}
      />
      {suffixe ? <span className="text-doux font-bold shrink-0">{suffixe}</span> : null}
    </div>
  );
}

export function ChampMontant({ label, aide, lectureSeule, mention, valeur, onChange, placeholder }: Base & { valeur: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div className="mb-4">
      <Etiquette id={id} label={label} mention={mention} />
      {aide}
      {lectureSeule ? (
        <Valeur vide={valeur === null}>{valeur === null ? '' : `${grouper(valeur)} Ar`}</Valeur>
      ) : (
        <SaisieEntiere id={id} valeur={valeur} onChange={onChange} suffixe="Ar" placeholder={placeholder ?? '0'} />
      )}
    </div>
  );
}

export function ChampNombre({ label, aide, lectureSeule, mention, valeur, onChange, suffixe, placeholder }: Base & { valeur: number | null; onChange: (v: number | null) => void; suffixe?: string; placeholder?: string }) {
  const id = useId();
  return (
    <div className="mb-4">
      <Etiquette id={id} label={label} mention={mention} />
      {aide}
      {lectureSeule ? (
        <Valeur vide={valeur === null}>{valeur === null ? '' : `${grouper(valeur)}${suffixe ? ' ' + suffixe : ''}`}</Valeur>
      ) : (
        <SaisieEntiere id={id} valeur={valeur} onChange={onChange} suffixe={suffixe} placeholder={placeholder} />
      )}
    </div>
  );
}

/** Amount input without its own label (lines of a list). */
export function SaisieMontant({ valeur, onChange, label }: { valeur: number | null; onChange: (v: number | null) => void; label: string }) {
  return <SaisieEntiere valeur={valeur} onChange={onChange} suffixe="Ar" placeholder="0" label={label} />;
}

/** One choice among a few (chips, 44 px high). */
export function Choix<T extends string>({
  label,
  options,
  valeur,
  onChange,
  lectureSeule,
  aide
}: {
  label: string;
  options: { v: T; t: string }[];
  valeur: T | '';
  onChange: (v: T | '') => void;
  lectureSeule?: boolean;
  aide?: ReactNode;
}) {
  const id = useId();
  const choisi = options.find((o) => o.v === valeur);
  return (
    <fieldset className="mb-4" aria-labelledby={id}>
      <legend id={id} className="block text-[15px] font-bold text-encre leading-snug">
        {label}
      </legend>
      {aide}
      {lectureSeule ? (
        <Valeur vide={!choisi}>{choisi?.t}</Valeur>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((o) => {
            const actif = o.v === valeur;
            return (
              <button
                key={o.v}
                type="button"
                aria-pressed={actif}
                onClick={() => onChange(actif ? '' : o.v)}
                className={`min-h-[44px] px-4 rounded-full border-2 text-[15px] font-bold transition-colors ${
                  actif ? 'bg-violet border-violet text-white' : 'bg-white border-filet text-encre active:bg-violetClair'
                }`}
              >
                {o.t}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
