// Card « Cap A vers B » of screen 7 (rule 6.3 bis), always shown: compass of the phone, or the heading
// read on a magnetic compass typed by hand (0 to 360). Read heading, declination applied and corrected
// heading are shown; the caller stores cap_lu, source and declinaison in entete.orientation.
import { useEffect, useRef, useState } from 'react'
import { Bouton } from '../../composants/Bouton'
import { ChampNombre } from '../../composants/ChampNombre'
import { boussoleAnnoncee, capCorrige, ecouterBoussole } from './boussole'
import { AIDES, EXEMPLES } from '../exemples'
import { degres, nombreLibre } from './format'

export const MESSAGE_SANS_BOUSSOLE = 'Pas de boussole sur ce téléphone : saisissez le cap lu sur une boussole.'
export const LIMITES_CAP = { min: 0, max: 360, messageHorsLimites: 'Cap entre 0 et 360°.' }

export interface PropsCarteCap {
  lettreA: string
  lettreB: string
  capLu: number | null
  source: 'boussole' | 'saisi' | null
  /** Declination stored with the heading, else the current setting. */
  declinaison: number
  onCap: (cap: number | null, source: 'boussole' | 'saisi' | null) => void
}

type Mode = 'repos' | 'lecture' | 'manuel'

export function CarteCap({ lettreA, lettreB, capLu, source, declinaison, onCap }: PropsCarteCap) {
  const [mode, setMode] = useState<Mode>('repos')
  const [sansBoussole, setSansBoussole] = useState(false)
  const [direct, setDirect] = useState<number | null>(null)
  const arret = useRef<(() => void) | null>(null)

  useEffect(() => () => arret.current?.(), [])

  const lire = () => {
    setDirect(null)
    if (!boussoleAnnoncee()) {
      setSansBoussole(true)
      setMode('manuel')
      return
    }
    setMode('lecture')
    arret.current?.()
    arret.current = ecouterBoussole({
      cible: window,
      angleEcran: () => (typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0),
      onLecture: setDirect,
      onStable: ({ cap }) => {
        arret.current = null
        setMode('repos')
        onCap(Math.round(cap * 10) / 10, 'boussole')
      },
      onAucune: () => {
        arret.current = null
        setSansBoussole(true)
        setMode('manuel')
      },
    })
  }

  const arreterLecture = () => {
    arret.current?.()
    arret.current = null
    setMode('repos')
  }

  return (
    <section aria-labelledby="titre-cap" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-3.5">
      <h3 id="titre-cap" className="rt-etroite m-0 text-[24px] font-extrabold">
        Cap {lettreA} vers {lettreB}
      </h3>
      <p className="m-0 text-[17px] leading-snug">
        Debout sur la borne {lettreA}, tenez le téléphone à plat, pointez son haut vers la cible {lettreB}, puis appuyez.
      </p>
      {capLu !== null ? (
        <p className="rt-etroite m-0 rounded-rt bg-fond px-3 py-2 text-[22px] font-bold leading-snug" data-cap>
          Cap lu {degres(capLu)}° ; déclinaison {nombreLibre(declinaison)}° ; cap corrigé {degres(capCorrige(capLu, declinaison))}°
          <span className="block font-barlow text-[14px] font-semibold text-encre2">{source === 'boussole' ? 'lu à la boussole du téléphone' : 'saisi à la main'}</span>
        </p>
      ) : (
        <p className="m-0 text-[16px] font-semibold text-encre2">Cap non lu.</p>
      )}
      {mode === 'lecture' ? (
        <div role="status" className="flex flex-col gap-2 rounded-rt border-4 border-encre bg-champActif p-3">
          <span className="text-[17px] font-semibold">Lecture en cours : gardez le téléphone immobile 2 secondes.</span>
          <span className="rt-etroite text-[42px] font-bold leading-none">{direct === null ? ' ' : `${degres(direct)}°`}</span>
          <Bouton variante="secondaire" grand={false} onClick={arreterLecture}>
            Arrêter
          </Bouton>
        </div>
      ) : (
        <Bouton variante={capLu === null ? 'principal' : 'secondaire'} onClick={lire}>
          Lire la boussole
        </Bouton>
      )}
      {sansBoussole ? (
        <p role="alert" className="m-0 rounded-rt border-2 border-orangeTexte bg-orangeFond px-3 py-2 text-[16px] font-semibold text-orangeTexte">
          {MESSAGE_SANS_BOUSSOLE}
        </p>
      ) : null}
      {mode === 'manuel' ? (
        <ChampNombre
          libelle={`Cap ${lettreA} vers ${lettreB} lu sur une boussole`}
          valeur={source === 'saisi' ? capLu : null}
          exemple={EXEMPLES.cap}
          aide={AIDES.cap(lettreA, lettreB)}
          unite="°"
          {...LIMITES_CAP}
          onChange={(v) => {
            if (v !== null) onCap(v, 'saisi')
          }}
        />
      ) : null}
      <div className="flex flex-wrap gap-x-4">
        {mode !== 'manuel' ? (
          <button type="button" onClick={() => setMode('manuel')} className="min-h-[48px] text-[16px] font-semibold underline underline-offset-2">
            Saisir le cap à la main
          </button>
        ) : null}
        {capLu !== null ? (
          <button type="button" onClick={() => onCap(null, null)} className="min-h-[48px] text-[16px] font-semibold underline underline-offset-2">
            Effacer le cap
          </button>
        ) : null}
      </div>
    </section>
  )
}
