// Sheet of screen 6: letter painted on the panel of a principal target (rule 6.9). A letter already
// carried by another active target is refused with « La lettre D est déjà portée par <nom> ».
import { useEffect, useState } from 'react'
import { ALPHABET } from '../../calcul'
import { Feuille } from '../../composants/Feuilles'
import type { BorneCalculee } from '../../etat/releveCalcule'

export interface PropsFeuilleLettre {
  borne: BorneCalculee | null
  onFermer: () => void
  /** Refusal message for a letter, or null. */
  verifier: (lettre: string) => string | null
  /** Writes the letter; true when written (the sheet closes). */
  onChoisir: (lettre: string) => Promise<boolean>
}

export function FeuilleLettre({ borne, onFermer, verifier, onChoisir }: PropsFeuilleLettre) {
  const [erreur, setErreur] = useState<string | null>(null)
  useEffect(() => setErreur(null), [borne])
  const actuelle = borne?.donnees.lettre ?? ''
  return (
    <Feuille ouvert={!!borne} titre={`Lettre de la borne ${actuelle}`} onFermer={onFermer}>
      <p className="m-0 mb-3 text-[16px] leading-snug">Choisissez la lettre peinte sur le panneau de cette cible.</p>
      {erreur ? (
        <p role="alert" className="m-0 mb-3 rounded-rt border-2 border-rougeTexte bg-rougeFond px-3 py-2 text-[17px] font-semibold text-rougeTexte">
          {erreur}
        </p>
      ) : null}
      <div role="group" aria-label="Lettres" className="grid grid-cols-6 gap-1.5">
        {ALPHABET.map((l) => {
          const est = l === actuelle
          return (
            <button
              key={l}
              type="button"
              aria-pressed={est}
              data-autofocus={est ? true : undefined}
              onClick={async () => {
                if (est) {
                  onFermer()
                  return
                }
                const m = verifier(l)
                if (m) {
                  setErreur(m)
                  return
                }
                if (await onChoisir(l)) onFermer()
              }}
              className={`rt-etroite flex min-h-[52px] items-center justify-center rounded-rt border-[3px] border-encre text-[26px] font-extrabold text-encre ${est ? 'bg-cible' : 'bg-surface'}`}
            >
              {l}
            </button>
          )
        })}
      </div>
    </Feuille>
  )
}
