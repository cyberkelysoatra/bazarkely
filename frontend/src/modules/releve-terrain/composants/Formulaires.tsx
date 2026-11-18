// Text field of MODELE B and the sheet that asks for a name (new domain, work site, rename...).
import { useEffect, useId, useState, type InputHTMLAttributes } from 'react'
import { MESSAGE_NOM_VIDE } from '../db/depot'
import { Bouton } from './Bouton'
import { Feuille } from './Feuilles'

export interface PropsChampTexte extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  libelle: string
  valeur: string
  onChange: (v: string) => void
  erreur?: string | null
}

/** Text field: white surface, black 3 px frame (4 px and `champ-actif` when focused), label above. */
export function ChampTexte({ libelle, valeur, onChange, erreur, id, ...rest }: PropsChampTexte) {
  const auto = useId()
  const ident = id ?? auto
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={ident} className="text-[15px] font-semibold text-encre2">
        {libelle}
      </label>
      <input
        id={ident}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${ident}-e` : undefined}
        className="min-h-[56px] w-full rounded-rt border-[3px] border-encre bg-surface px-3 text-[20px] font-semibold text-encre outline-none focus:border-4 focus:bg-champActif"
        {...rest}
      />
      {erreur ? (
        <p id={`${ident}-e`} role="alert" className="m-0 text-[16px] font-semibold text-rougeTexte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}

export interface PropsFeuilleNom {
  ouvert: boolean
  titre: string
  libelle: string
  valeurInitiale?: string
  bouton: string
  onFermer: () => void
  /** Returns true when written (the sheet closes). */
  onValider: (nom: string) => Promise<boolean>
}

/** Sheet with one name field. A blank name is refused (« Donnez un nom. »). */
export function FeuilleNom({ ouvert, titre, libelle, valeurInitiale = '', bouton, onFermer, onValider }: PropsFeuilleNom) {
  const [nom, setNom] = useState(valeurInitiale)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    if (ouvert) {
      setNom(valeurInitiale)
      setErreur(null)
      setEnvoi(false)
    }
  }, [ouvert, valeurInitiale])
  return (
    <Feuille ouvert={ouvert} titre={titre} onFermer={onFermer}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!nom.trim()) {
            setErreur(MESSAGE_NOM_VIDE)
            return
          }
          setEnvoi(true)
          const ok = await onValider(nom.trim())
          setEnvoi(false)
          if (ok) onFermer()
        }}
      >
        <ChampTexte libelle={libelle} valeur={nom} onChange={(v) => { setNom(v); setErreur(null) }} erreur={erreur} autoComplete="off" enterKeyHint="done" maxLength={120} />
        <Bouton type="submit" disabled={envoi}>
          {bouton}
        </Bouton>
      </form>
    </Feuille>
  )
}
