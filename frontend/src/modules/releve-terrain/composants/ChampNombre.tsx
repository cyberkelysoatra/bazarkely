// Number field and its keypad (D8): digits, comma, minus (toggles in one touch), erase, OK. A physical
// keyboard works too on a computer (digits, comma or point, minus, Backspace, Enter, Escape). Values out
// of the limits given by the caller are refused with the caller's message.
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icone } from './Icones'

/** « 1,50 », « −12,1 » (French comma, true minus sign). */
export function formaterNombre(v: number | null | undefined, decimales?: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return ''
  const s = decimales === undefined ? String(Math.round(v * 1e6) / 1e6) : v.toFixed(decimales)
  return s.replace('.', ',').replace('-', '−')
}

/** Reads « 1,5 », « 1.5 », « −12,1 », « -12,1 »; null when not a number. */
export function lireNombre(texte: string): number | null {
  const t = texte.trim().replace(/\s/g, '').replace('−', '-').replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  const v = Number(t)
  return Number.isFinite(v) ? v : null
}

export interface Limites {
  min?: number
  max?: number
  /** min excluded (value must be strictly greater). */
  minExclu?: boolean
  /** Message shown when the value is out of the limits. */
  messageHorsLimites?: string
  /** Extra check of the caller: returns the message to show, or null. */
  valider?: (v: number) => string | null
  /** Empty value accepted (returns null). */
  autoriserVide?: boolean
}

/** Message of the first refused rule, or null when the value is accepted. */
export function verifierValeur(v: number | null, l: Limites): string | null {
  if (v === null) return l.autoriserVide ? null : 'Saisissez une valeur.'
  const hors = l.messageHorsLimites ?? 'Valeur refusée.'
  if (l.min !== undefined && (l.minExclu ? !(v > l.min) : v < l.min)) return hors
  if (l.max !== undefined && v > l.max) return hors
  return l.valider ? l.valider(v) : null
}

const TOUCHE_BASE = 'rt-etroite flex min-h-[58px] items-center justify-center rounded-rt border-[3px] border-encre text-[26px] font-extrabold text-encre select-none'
const TOUCHE = `${TOUCHE_BASE} bg-surface active:bg-champActif`
const TOUCHE_OK = `${TOUCHE_BASE} bg-jaune`

export interface PropsPave extends Limites {
  titre: string
  valeurInitiale: number | null
  unite?: string
  onValider: (v: number | null) => void
  onAnnuler: () => void
}

/** Keypad fixed at the bottom of the screen (portal), with the value being typed and the refusal message. */
export function PaveNumerique({ titre, valeurInitiale, unite, onValider, onAnnuler, ...limites }: PropsPave) {
  const [texte, setTexte] = useState(() => formaterNombre(valeurInitiale).replace('−', '-'))
  const [erreur, setErreur] = useState<string | null>(null)
  const texteRef = useRef(texte)
  // The first key replaces the value shown (the minus sign typed first is kept for the new value).
  const remplacer = useRef(valeurInitiale !== null)
  const signeChoisi = useRef(false)
  const idTitre = useId()

  const poser = useCallback((t: string) => {
    texteRef.current = t
    setTexte(t)
  }, [])

  const taper = useCallback(
    (t: string) => {
      setErreur(null)
      const x = texteRef.current
      if (t === '-') {
        if (remplacer.current) signeChoisi.current = true
        poser(x.startsWith('-') ? x.slice(1) : '-' + x)
        return
      }
      const neuf = remplacer.current
      remplacer.current = false
      if (t === 'effacer') {
        poser(neuf ? '' : x.slice(0, -1))
        return
      }
      const base = neuf ? (signeChoisi.current && x.startsWith('-') ? '-' : '') : x
      if (t === ',') {
        poser(base.includes(',') ? base : (base === '' || base === '-' ? base + '0' : base) + ',')
        return
      }
      if (base.replace('-', '').replace(',', '').length >= 9) poser(base)
      else if (base === '0' || base === '-0') poser(base.slice(0, -1) + t)
      else poser(base + t)
    },
    [poser],
  )

  const valider = useCallback(() => {
    const v = texte.trim() === '' ? null : lireNombre(texte)
    if (texte.trim() !== '' && v === null) {
      setErreur('Valeur illisible : vérifiez le nombre.')
      return
    }
    const m = verifierValeur(v, limites)
    if (m) {
      setErreur(m)
      return
    }
    onValider(v)
  }, [texte, limites, onValider])

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      let pris = true
      if (/^[0-9]$/.test(e.key)) taper(e.key)
      else if (e.key === ',' || e.key === '.' || e.key === 'Decimal') taper(',')
      else if (e.key === '-' || e.key === 'Subtract') taper('-')
      else if (e.key === 'Backspace') taper('effacer')
      else if (e.key === 'Delete') {
        poser('')
        remplacer.current = false
      } else if (e.key === 'Enter') valider()
      else if (e.key === 'Escape') onAnnuler()
      else pris = false
      if (pris) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', f, true)
    return () => window.removeEventListener('keydown', f, true)
  }, [taper, valider, onAnnuler, poser])

  const affiche = texte === '' ? '' : texte.replace('-', '−')
  return createPortal(
    <div role="dialog" aria-labelledby={idTitre} className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <div className="w-full max-w-[520px] border-t-[3px] border-encre bg-fond px-3 pb-[calc(10px+env(safe-area-inset-bottom,0px))] pt-2">
        <div className="mb-2 flex items-center gap-2">
          <span id={idTitre} className="min-w-0 flex-1 truncate text-[15px] font-semibold text-encre2">
            {titre}
          </span>
          <button type="button" onClick={onAnnuler} className="min-h-[44px] rounded-rt px-3 text-[16px] font-semibold underline">
            Annuler
          </button>
        </div>
        <div className="mb-2 flex min-h-[64px] items-center rounded-rt border-4 border-encre bg-champActif px-3" aria-live="polite">
          <span className="rt-etroite min-w-0 flex-1 truncate text-[42px] font-bold leading-none">{affiche || ' '}</span>
          {unite ? <span className="ml-2 text-[22px] font-semibold text-encre2">{unite}</span> : null}
        </div>
        {erreur ? (
          <p role="alert" className="m-0 mb-2 rounded-rt border-2 border-rougeTexte bg-rougeFond px-3 py-2 text-[16px] font-semibold text-rougeTexte">
            {erreur}
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((c) => (
            <button key={c} type="button" className={TOUCHE} onClick={() => taper(c)}>
              {c}
            </button>
          ))}
          <button type="button" className={`${TOUCHE} col-span-3`} onClick={() => taper('0')}>
            0
          </button>
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          <button type="button" className={TOUCHE} aria-label="Changer le signe" onClick={() => taper('-')}>
            −
          </button>
          <button type="button" className={TOUCHE} aria-label="Virgule" onClick={() => taper(',')}>
            ,
          </button>
          <button type="button" className={TOUCHE} aria-label="Effacer" onClick={() => taper('effacer')}>
            <Icone nom="effacer" taille={28} />
          </button>
          <button type="button" className={TOUCHE_OK} onClick={valider}>
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export interface PropsChampNombre extends Limites {
  libelle: string
  valeur: number | null
  onChange: (v: number | null) => void
  unite?: string
  /** Decimals shown (the stored value is never rounded). */
  decimales?: number
  id?: string
  /** Text shown while the field is empty (short in a half-width field). */
  vide?: string
}

/** Field of 64 px: value 42 px, unit on the right; a touch opens the keypad. */
export function ChampNombre({ libelle, valeur, onChange, unite, decimales, id, vide = "Toucher pour saisir", ...limites }: PropsChampNombre) {
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const idAuto = useId()
  const idLibelle = id ?? idAuto
  useEffect(() => {
    if (ouvert) ref.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [ouvert])
  const fermer = () => {
    setOuvert(false)
    ref.current?.focus()
  }
  return (
    <div className="flex flex-col gap-1">
      <span id={idLibelle} className="text-[15px] font-semibold text-encre2">
        {libelle}
      </span>
      <button
        ref={ref}
        type="button"
        aria-labelledby={idLibelle}
        aria-describedby={`${idLibelle}-v`}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        onClick={() => setOuvert(true)}
        className={`flex min-h-[64px] w-full items-center rounded-rt px-3 text-left ${ouvert ? 'border-4 border-encre bg-champActif' : 'border-[3px] border-encre bg-surface'}`}
      >
        <span id={`${idLibelle}-v`} className="rt-etroite min-w-0 flex-1 truncate text-[42px] font-bold leading-none">
          {valeur === null ? <span className="text-[20px] font-semibold text-encre2">{vide}</span> : formaterNombre(valeur, decimales)}
        </span>
        {unite ? <span className="ml-2 text-[22px] font-semibold text-encre2">{unite}</span> : null}
      </button>
      {ouvert ? (
        <PaveNumerique
          titre={libelle}
          valeurInitiale={valeur}
          unite={unite}
          {...limites}
          onAnnuler={fermer}
          onValider={(v) => {
            onChange(v)
            fermer()
          }}
        />
      ) : null}
    </div>
  )
}
