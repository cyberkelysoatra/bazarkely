// Contour interval toggle « Sans », « 0,5 m », « 1 m », « 2 m » (phone preference cles.vue_intervalle).
import { INTERVALLES, libelleIntervalle } from './modele'

export function ChoixIntervalle({ valeur, onChange }: { valeur: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Intervalle des courbes de niveau" className="grid grid-cols-4 overflow-hidden rounded-rt border-[3px] border-encre">
      {INTERVALLES.map((v, i) => {
        const actif = v === valeur
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChange(v)}
            className={`rt-etroite min-h-[52px] text-[19px] font-bold ${i > 0 ? 'border-l-[3px] border-encre' : ''} ${actif ? 'bg-jaune text-encre' : 'bg-surface text-encre'}`}
          >
            {libelleIntervalle(v)}
          </button>
        )
      })}
    </div>
  )
}
