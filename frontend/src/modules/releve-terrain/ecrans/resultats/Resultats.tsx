// Screen 12, étape 4 « Résultats » (H16 to H22, Exports.dc.html), route /r/:releve/resultats: contour
// lines (interval of this phone, « Voir sur la carte »), comparison with the plan (#points-plan), exports,
// settings of the thresholds.
import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { formaterNombre } from '../../composants/ChampNombre'
import { Bouton } from '../../composants/Bouton'
import { useReleve } from '../../etat/useReleve'
import { saisieTenueIci } from '../../db/depot'
import { CadreReleve, LectureSeule } from '../CadreReleve'
import { ChoixIntervalle } from '../carte/ChoixIntervalle'
import { POINTS_MIN_COURBES } from '../carte/modele'
import { useCourbes, useIntervalle } from '../carte/useCourbes'
import { ComparaisonPlan } from './ComparaisonPlan'
import { Exporter } from './Exporter'
import { ReglagesSeuils } from './ReglagesSeuils'

export default function Resultats() {
  const { releve } = useParams()
  const { hash } = useLocation()
  const naviguer = useNavigate()
  const r = useReleve(releve)
  const { intervalle, choisir } = useIntervalle()
  const calcule = r.etat.statut === 'pret' ? r.etat.calcule : null
  const donnees = useCourbes(calcule, intervalle)
  const pret = r.etat.statut === 'pret'

  // Screen 6 links to #points-plan: scroll to the card once the relevé is on screen.
  useEffect(() => {
    if (!pret || hash !== '#points-plan') return
    const t = window.setTimeout(() => document.getElementById('points-plan')?.scrollIntoView({ block: 'start' }), 30)
    return () => window.clearTimeout(t)
  }, [pret, hash])

  if (r.etat.statut !== 'pret' || !calcule || !donnees) return <CadreReleve releve={r} etape={4} onglet="resultats">{null}</CadreReleve>
  const { releve: rel, chantier, domaine, objets } = r.etat
  const nbPoints = calcule.pointsCourbes.length
  const tenue = saisieTenueIci(rel)

  return (
    <CadreReleve releve={r} etape={4} onglet="resultats">
      <h1 className="rt-etroite m-0 text-[34px] font-extrabold leading-tight">Étape 4 : résultats</h1>

      <section aria-labelledby="rt-titre-courbes" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-4">
        <h2 id="rt-titre-courbes" className="rt-etroite m-0 text-[26px] font-extrabold leading-tight">
          Courbes de niveau
        </h2>
        <p className="m-0 text-[16px] leading-snug text-encre2">Affichées sur la carte, limitées à la zone couverte.</p>
        <ChoixIntervalle valeur={intervalle} onChange={choisir} />
        <p className="m-0 text-[15px] font-semibold leading-snug" data-resume-courbes="">
          {nbPoints < POINTS_MIN_COURBES
            ? `${nbPoints} point${nbPoints > 1 ? 's' : ''} : les courbes demandent au moins ${POINTS_MIN_COURBES} points, bornes comprises.`
            : `${nbPoints} points, ${donnees.gardes} triangle${donnees.gardes > 1 ? 's' : ''} gardé${donnees.gardes > 1 ? 's' : ''} sur ${donnees.triangulation.triangles.length} (coupure ${formaterNombre(calcule.reglages.coupure)} m).`}
        </p>
        <Bouton variante="secondaire" grand={false} onClick={() => naviguer(`/r/${rel.id}/carte`)}>
          Voir sur la carte
        </Bouton>
      </section>

      {/* Phase 3b (6.8): plan points, thresholds, cut-off and declination read-only when the input is held elsewhere; exports and the contour interval stay. */}
      {tenue ? (
        <ComparaisonPlan objets={objets} triangulation={donnees.triangulation} actions={r.actions} />
      ) : (
        <LectureSeule>
          <ComparaisonPlan objets={objets} triangulation={donnees.triangulation} actions={r.actions} />
        </LectureSeule>
      )}

      <Exporter
        calcule={calcule}
        infos={{
          releveId: rel.id,
          nom: rel.nom,
          date: rel.entete.date,
          chantier: chantier?.nom ?? '',
          domaine: domaine?.nom ?? '',
          operateurs: rel.entete.operateurs ?? '',
          intervalle,
        }}
      />

      {tenue ? (
        <ReglagesSeuils reglages={calcule.reglages} actions={r.actions} />
      ) : (
        <LectureSeule>
          <ReglagesSeuils reglages={calcule.reglages} actions={r.actions} />
        </LectureSeule>
      )}
    </CadreReleve>
  )
}
