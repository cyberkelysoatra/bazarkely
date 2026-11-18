// Notice of the app (6 s), above the bottom bar: relevé changed in another tab, memory full...
import { fermerAvis, useAvis } from '../etat/avis'

export function AvisGlobal() {
  const avis = useAvis()
  if (!avis) return null
  const alerte = avis.ton === 'alerte'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-[45] flex justify-center px-4">
      <button
        key={avis.n}
        type="button"
        role={alerte ? 'alert' : 'status'}
        data-avis-releve
        onClick={fermerAvis}
        className={`pointer-events-auto w-full max-w-[488px] rounded-rt border-[3px] px-3 py-2.5 text-left text-[16px] font-semibold leading-snug ${alerte ? 'border-rougeTexte bg-rougeFond text-rougeTexte' : 'border-encre bg-surface text-encre'}`}
      >
        {avis.texte}
      </button>
    </div>
  )
}
