// Figures of a computed station (H08), shared by screens 8, 9 and 10: X, Y, ground altitude (30 px),
// altitude from each target, altitude deviation, largest distance deviation, geometry index, each with
// its colour word when it is not green.
import { PastilleEtat } from '../../composants/Pastilles'
import type { Couleur, ResultatPosition, ResultatStation } from '../../calcul'
import type { BorneCalculee } from '../../etat/releveCalcule'
import { i2, m3 } from './logique'

export const MOT_COULEUR: Record<Couleur, string> = { vert: 'VERT', orange: 'ORANGE', rouge: 'ROUGE' }

function Grand({ libelle, valeur, unite, nom }: { libelle: string; valeur: string; unite?: string; nom: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-rt border-2 border-encre bg-surface px-2.5 py-2">
      <span className="text-[13px] font-semibold text-encre2">{libelle}</span>
      <span className="rt-etroite truncate text-[30px] font-bold leading-tight" data-chiffre={nom}>
        {valeur}
        {unite ? <span className="ml-1 text-[16px] font-semibold text-encre2">{unite}</span> : null}
      </span>
    </div>
  )
}

function LigneChiffre({ libelle, valeur, couleur, nom }: { libelle: string; valeur: string; couleur?: Couleur; nom: string }) {
  return (
    <div className="flex min-h-[40px] items-center gap-2 border-t border-trait py-1.5">
      <span className="min-w-0 flex-1 text-[16px] font-semibold">{libelle}</span>
      {couleur && couleur !== 'vert' ? <PastilleEtat couleur={couleur} petite /> : null}
      <span className="rt-etroite text-[22px] font-bold" data-chiffre={nom}>
        {valeur}
      </span>
    </div>
  )
}

export interface PropsChiffres {
  resultat: ResultatStation | ResultatPosition
  couleurs?: ResultatStation['couleurs']
  bornes: BorneCalculee[]
  /** Altitudes from each target and the deviations (off for the short « without C » block). */
  detail?: boolean
}

/** « 30,919 (A), 31,248 (B), 30,908 (C) » in letter order. */
export function altitudesParBorne(resultat: { altitudesParBorne?: Record<string, number> }, bornes: BorneCalculee[]): string {
  const alt = resultat.altitudesParBorne ?? {}
  return Object.entries(alt)
    .map(([id, z]) => ({ lettre: bornes.find((b) => b.id === id)?.donnees.lettre ?? '?', z }))
    .sort((a, b) => a.lettre.localeCompare(b.lettre))
    .map((x) => `${m3(x.z)} (${x.lettre})`)
    .join(', ')
}

export function Chiffres({ resultat, couleurs, bornes, detail = true }: PropsChiffres) {
  return (
    <div className="flex flex-col gap-2" data-chiffres>
      <div className="grid grid-cols-2 gap-2">
        <Grand libelle="X" valeur={m3(resultat.x)} unite="m" nom="x" />
        <Grand libelle="Y" valeur={m3(resultat.y)} unite="m" nom="y" />
      </div>
      <Grand libelle="Altitude du sol" valeur={m3(resultat.z)} unite="m" nom="altitude" />
      {detail ? (
        <div className="flex flex-col rounded-rt border-2 border-encre bg-surface px-3">
          <div className="py-2">
            <span className="block text-[13px] font-semibold text-encre2">Altitudes calculées, une par borne</span>
            <span className="text-[17px] font-semibold" data-chiffre="altitudes">
              {altitudesParBorne(resultat, bornes)}
            </span>
          </div>
          <LigneChiffre libelle="Écart d'altitude" valeur={`${m3(resultat.ecartAltitude)} m`} couleur={couleurs?.ecartAltitude} nom="ecart-altitude" />
          <LigneChiffre libelle="Plus grand écart de distance" valeur={`${m3(resultat.ecartPosition)} m`} couleur={couleurs?.ecartPosition} nom="ecart-position" />
          <LigneChiffre libelle="Indice de géométrie" valeur={i2(resultat.indice)} couleur={couleurs?.indice} nom="indice" />
        </div>
      ) : null}
    </div>
  )
}
