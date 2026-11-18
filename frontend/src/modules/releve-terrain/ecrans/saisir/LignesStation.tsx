// Rows of screen 8: one per active target (principal and ephemeral) in letter order, big letter pill and
// place name, distance (m) and slope (degrees) fields with the keypad, « pas visible » toggle. Sights of
// more than 60 m are shown orange; the replacement of a typed reading asks for confirmation (H09).
import { useEffect, useRef } from 'react'
import { ChampNombre } from '../../composants/ChampNombre'
import { Confirmation } from '../../composants/Feuilles'
import { PastilleEtat, PastilleLettre } from '../../composants/Pastilles'
import { heureMadagascar } from '../../etat/navigation'
import { LIMITES_DISTANCE, LIMITES_PENTE, texteRemplacement, type LigneVisee } from './logique'
import type { SaisieStation } from './useSaisieStation'

function OeilBarre({ couleur }: { couleur: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3.2 3.8M6.2 7.6C4 9.4 3 12 3 12s4 6 9 6c1.4 0 2.7-.4 3.8-1" />
    </svg>
  )
}

function Ligne({ ligne, saisie, longue, refaire }: { ligne: LigneVisee; saisie: SaisieStation; longue: boolean; refaire: boolean }) {
  const { borne, visee } = ligne
  const lettre = borne.donnees.lettre
  const cache = !!visee?.pas_visible
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!refaire) return
    const el = ref.current
    el?.scrollIntoView({ block: 'center' })
    const t = window.setTimeout(() => el?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.click(), 50)
    return () => window.clearTimeout(t)
  }, [refaire])
  return (
    <section
      ref={ref}
      data-ligne={lettre}
      data-usage={borne.donnees.usage}
      aria-label={`Visée vers ${ligne.libelle}`}
      className={`flex flex-col gap-2 border-t border-trait py-2.5 ${refaire ? '-mx-2 rounded-rt border-[3px] border-encre bg-champActif px-2' : ''} ${borne.active ? '' : 'opacity-80'}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <PastilleLettre lettre={lettre} taille={44} usage={borne.donnees.usage} />
        <span className="min-w-0 flex-1 truncate text-[17px] font-bold" data-nom-ligne>
          {ligne.libelle.slice(ligne.libelle.indexOf(', ') + 2)}
        </span>
        {!borne.active ? <PastilleEtat couleur="gris" mot="RETIRÉE" petite /> : null}
      </div>
      <div className={`grid items-end gap-2 ${cache ? 'grid-cols-[minmax(0,1fr)_52px]' : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_52px]'}`}>
        {cache ? (
          <div className="flex min-h-[64px] items-center rounded-rt border-[3px] border-dashed border-encre2 bg-grisFond px-3 text-[19px] font-bold text-grisTexte">Pas visible</div>
        ) : (
          <>
            <ChampNombre
              libelle={`Distance vers ${lettre}`}
              valeur={visee?.distance ?? null}
              unite="m"
              vide="Saisir"
              {...LIMITES_DISTANCE}
              onChange={(v) => saisie.modifier(borne.id, { champ: 'distance', valeur: v })}
            />
            <ChampNombre
              libelle={`Pente vers ${lettre}`}
              valeur={visee?.pente ?? null}
              unite="°"
              vide="Saisir"
              {...LIMITES_PENTE}
              onChange={(v) => saisie.modifier(borne.id, { champ: 'pente', valeur: v })}
            />
          </>
        )}
        <button
          type="button"
          aria-label={`Borne ${lettre} pas visible`}
          aria-pressed={cache}
          onClick={() => saisie.modifier(borne.id, { champ: 'pas_visible', valeur: !cache })}
          className={`flex h-16 w-[52px] flex-none flex-col items-center justify-center rounded-rt border-[3px] border-encre ${cache ? 'bg-encre' : 'bg-transparent'}`}
        >
          <OeilBarre couleur={cache ? '#FFFFFF' : '#3F3F3A'} />
        </button>
      </div>
      {longue && !cache ? (
        <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-orangeTexte" data-visee-longue={lettre}>
          <PastilleEtat couleur="orange" petite /> Visée de plus de 60 m : précision moindre.
        </p>
      ) : null}
    </section>
  )
}

export interface PropsLignesStation {
  saisie: SaisieStation
  /** Target whose sight is to be redone (screen 9): row highlighted, keypad opened. */
  refaire?: string | null
  /** Title of the block (« Station S13 » by default). */
  titre?: string
  consigne?: string
}

export function LignesStation({ saisie, refaire = null, titre, consigne = 'Lisez la lettre dans le viseur, puis saisissez sur sa ligne.' }: PropsLignesStation) {
  const longues = new Set(saisie.station?.resultat.viseesLongues ?? [])
  const heure = heureMadagascar(saisie.donnees?.heure ?? new Date().toISOString())
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-none">{titre ?? `Station ${saisie.numero}`}</h2>
        <span className="text-[16px] text-encre2">{heure}</span>
      </div>
      <p className="m-0 text-[15px] leading-snug text-encre2">{consigne}</p>
      <div className="flex flex-col">
        {saisie.lignes.map((l) => (
          <Ligne key={l.borne.id} ligne={l} saisie={saisie} longue={longues.has(l.borne.id)} refaire={refaire === l.borne.id} />
        ))}
        {saisie.lignes.length === 0 ? <p className="m-0 text-[17px]">Aucune borne active : revenez à l'étape 1.</p> : null}
      </div>
      <Confirmation
        ouvert={!!saisie.demande}
        titre="Remplacer la visée"
        texte={saisie.demande ? texteRemplacement(saisie.demande.lettre, saisie.demande.ancienne) : ''}
        confirmer={{ libelle: 'Remplacer', onClick: saisie.confirmerRemplacement }}
        onAnnuler={saisie.annulerRemplacement}
      />
    </>
  )
}
