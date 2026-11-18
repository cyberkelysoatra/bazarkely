// Cards « Résultat du calage » and « Contrôle du plan de masse » of screen 7 (H05, rules 6.3, 6.3 bis,
// 6.3 ter). Every value and message comes from calcul/ (through useReleve); exact texts of MESSAGES.
import type { ReactNode } from 'react'
import { MESSAGES, type Couleur, type ResultatCalage, type ResultatCote } from '../../calcul'
import { PastilleEtat } from '../../composants/Pastilles'
import { degres, majuscule, metres, metresSigne } from './format'

export interface LettresCalage {
  a: string
  b: string
  c: string
}

export function mentionOrientation(c: ResultatCalage): string {
  if (c.orientation === 'plan') return 'Orienté par le plan'
  return majuscule(c.mentionOrientation ?? (c.orientation === 'nord_approximatif' ? MESSAGES.nordApproximatif : MESSAGES.orientationLibre))
}

const Cellule = ({ children, droite = true }: { children: ReactNode; droite?: boolean }) => (
  <td className={`border-t border-trait px-1 py-1.5 ${droite ? 'text-right' : 'text-left'}`}>{children}</td>
)

function Alerte({ couleur, children }: { couleur: Couleur; children: ReactNode }) {
  const c = couleur === 'rouge' ? 'border-rougeTexte bg-rougeFond text-rougeTexte' : couleur === 'orange' ? 'border-orangeTexte bg-orangeFond text-orangeTexte' : 'border-vertTexte bg-vertFond text-vertTexte'
  return <p className={`m-0 rounded-rt border-2 px-3 py-2 text-[17px] font-semibold leading-snug ${c}`}>{children}</p>
}

export interface PropsResultat {
  calage: ResultatCalage
  cotes: { ab: ResultatCote; bc: ResultatCote; ac: ResultatCote }
  lettres: LettresCalage
  modeSuspect: boolean
}

export function CarteResultat({ calage, cotes, lettres: L, modeSuspect }: PropsResultat) {
  const lignes: { nom: string; r: ResultatCote }[] = [
    { nom: `${L.a} vers ${L.b}`, r: cotes.ab },
    { nom: `${L.b} vers ${L.c}`, r: cotes.bc },
    { nom: `${L.a} vers ${L.c}`, r: cotes.ac },
  ]
  const placees: [string, { x: number; y: number; z: number }][] = [
    [L.a, calage.bornes.a],
    [L.b, calage.bornes.b],
    [L.c, calage.bornes.c],
  ]
  const alertes: { couleur: Couleur; texte: string }[] = []
  if (calage.messages.includes(MESSAGES.cotesIncompatibles)) alertes.push({ couleur: 'rouge', texte: MESSAGES.cotesIncompatibles })
  if (calage.messages.includes(MESSAGES.bornesAlignees)) alertes.push({ couleur: 'rouge', texte: MESSAGES.bornesAlignees })
  if (modeSuspect) alertes.push({ couleur: 'orange', texte: MESSAGES.modeAffichage })
  const relatives = calage.messages.includes(MESSAGES.altitudesRelatives)
  return (
    <section aria-labelledby="titre-resultat" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-3.5" data-resultat>
      <div className="flex items-center gap-2">
        <h3 id="titre-resultat" className="rt-etroite m-0 flex-1 text-[24px] font-extrabold">
          Résultat du calage
        </h3>
        <PastilleEtat couleur={calage.couleur} />
      </div>
      <table className="rt-etroite w-full border-collapse text-[18px] font-semibold tabular-nums" aria-label="Côtés">
        <thead>
          <tr className="text-[14px] font-semibold text-encre2">
            <th className="px-1 pb-1 text-left font-semibold">Côté</th>
            <th className="px-1 pb-1 text-right font-semibold">Distance</th>
            <th className="px-1 pb-1 text-right font-semibold">Écart déca</th>
            <th className="px-1 pb-1 text-right font-semibold">Dénivelé</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map(({ nom, r }) => (
            <tr key={nom} data-cote={nom}>
              <Cellule droite={false}>
                <span className="block font-bold">{nom}</span>
                <PastilleEtat couleur={r.couleur} petite />
              </Cellule>
              <Cellule>{metres(r.distanceRetenue)}</Cellule>
              <Cellule>{r.ecartDecaApp === null ? 'sans' : metresSigne(r.ecartDecaApp)}</Cellule>
              <Cellule>{metresSigne(r.denivele)}</Cellule>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 flex flex-wrap items-center gap-2 text-[17px] font-semibold" data-boucle>
        <span>Boucle des dénivelés : {metresSigne(calage.fermeture)} m</span>
        <PastilleEtat couleur={calage.couleurFermeture} petite />
      </p>
      <table className="rt-etroite w-full border-collapse text-[20px] font-bold tabular-nums" aria-label="Bornes placées">
        <thead>
          <tr className="text-[14px] font-semibold text-encre2">
            <th className="px-1 pb-1 text-left font-semibold">Borne</th>
            <th className="px-1 pb-1 text-right font-semibold">X</th>
            <th className="px-1 pb-1 text-right font-semibold">Y</th>
            <th className="px-1 pb-1 text-right font-semibold">Altitude</th>
          </tr>
        </thead>
        <tbody>
          {placees.map(([l, p]) => (
            <tr key={l} data-borne-placee={l}>
              <Cellule droite={false}>{l}</Cellule>
              <Cellule>{Number.isFinite(p.x) ? metres(p.x) : 'non placée'}</Cellule>
              <Cellule>{Number.isFinite(p.y) ? metres(p.y) : ''}</Cellule>
              <Cellule>{metres(p.z)}</Cellule>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        <PastilleEtat couleur="bleu" mot={mentionOrientation(calage)} />
        {relatives ? <PastilleEtat couleur="gris" mot={MESSAGES.altitudesRelatives} /> : null}
      </div>
      {alertes.map((a) => (
        <Alerte key={a.texte} couleur={a.couleur}>
          {a.texte}
        </Alerte>
      ))}
    </section>
  )
}

/** True when the control card has something to show (a value of the plan or a message). */
export function aControle(c: ResultatCalage): boolean {
  const k = c.controle
  return k.positionB !== null || k.positionC !== null || k.altitudeB !== null || k.altitudeC !== null || k.ecartCap !== null || k.messages.length > 0
}

export function CarteControle({ calage, lettres: L }: { calage: ResultatCalage; lettres: LettresCalage }) {
  const k = calage.controle
  const lignes: { cle: string; libelle: string; valeur: string | null; couleur?: Couleur }[] = [
    { cle: 'positionB', libelle: `Position de ${L.b}`, valeur: k.positionB === null ? null : `${metres(k.positionB)} m`, couleur: k.couleurs.positionB },
    { cle: 'positionC', libelle: `Position de ${L.c}`, valeur: k.positionC === null ? null : `${metres(k.positionC)} m`, couleur: k.couleurs.positionC },
    { cle: 'altitudeB', libelle: `Altitude de ${L.b}`, valeur: k.altitudeB === null ? null : `${metresSigne(k.altitudeB)} m`, couleur: k.couleurs.altitudeB },
    { cle: 'altitudeC', libelle: `Altitude de ${L.c}`, valeur: k.altitudeC === null ? null : `${metresSigne(k.altitudeC)} m`, couleur: k.couleurs.altitudeC },
    {
      cle: 'cap',
      libelle: `Cap ${L.a} vers ${L.b}${k.directionPlan !== null ? ` (plan ${degres(k.directionPlan)}°)` : ''}`,
      valeur: k.ecartCap === null ? null : `écart ${degres(k.ecartCap)}°`,
      couleur: k.couleurs.cap,
    },
  ]
  return (
    <section aria-labelledby="titre-controle" className="flex flex-col gap-2 rounded-rt border-[3px] border-encre bg-surface p-3.5" data-controle>
      <h3 id="titre-controle" className="rt-etroite m-0 text-[24px] font-extrabold">
        Contrôle du plan de masse
      </h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {lignes.map((l) => (
          <li key={l.cle} data-controle-ligne={l.cle} className="flex min-h-[48px] items-center gap-2 border-t border-trait py-1.5">
            <span className="min-w-0 flex-1 text-[16px] font-semibold">{l.libelle}</span>
            {l.valeur !== null ? (
              <>
                <span className="rt-etroite text-[22px] font-bold tabular-nums">{l.valeur}</span>
                {l.couleur ? <PastilleEtat couleur={l.couleur} petite /> : null}
              </>
            ) : (
              <PastilleEtat couleur="gris" mot={l.cle === 'cap' ? 'non contrôlé' : 'pas au plan'} petite />
            )}
          </li>
        ))}
      </ul>
      {k.messages.map((m) => (
        <Alerte key={m} couleur={m === MESSAGES.capNonControle ? 'orange' : 'rouge'}>
          {m}
        </Alerte>
      ))}
      <p className="m-0 text-[15px] leading-snug text-encre2">Le terrain fait foi pour les distances et les altitudes ; le plan donne l'origine et l'orientation.</p>
    </section>
  )
}
