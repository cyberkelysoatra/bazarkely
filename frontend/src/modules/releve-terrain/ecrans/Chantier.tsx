// Screen 4: a work site (Chantier.dc.html). « + Nouveau relevé » (sheet: name, date, operators, heights
// 1,50 by default), list of relevés (name, date, author « ce téléphone », step, number of stations,
// calibration pill, H01); a tap opens the step where it stopped; ⋯ per relevé (H03): « Dupliquer »,
// « Supprimer le relevé ».
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { REGLAGES_DEFAUT } from '../calcul'
import { Bandeau } from '../composants/Bandeau'
import { Bouton } from '../composants/Bouton'
import { ChampNombre } from '../composants/ChampNombre'
import { EnTete } from '../composants/EnTete'
import { Aide, Confirmation, Feuille, FeuilleMenu } from '../composants/Feuilles'
import { ChampTexte } from '../composants/Formulaires'
import { Icone } from '../composants/Icones'
import { PastilleEtat, type CouleurEtat } from '../composants/Pastilles'
import * as depot from '../db/depot'
import { lireChantier } from '../db/lecture'
import type { Releve } from '../db/types'
import { executer, montrerAvis } from '../etat/avis'
import { cheminEtape, dateFr, NOMS_ETAPES, pluriel } from '../etat/navigation'
import type { ReleveCalcule } from '../etat/releveCalcule'
import { calculerMesure } from '../etat/useReleve'
import { useBandeauTelephone } from '../etat/useEnvoi'
import { useRequete } from '../etat/useRequete'
import { refusSuppression } from '../sync/regles'
import { MenuHaut } from './MenuHaut'
import { MenuTerrain } from './MenuTerrain'
import { exporterSauvegarde } from './registre'

const LIMITES_HAUTEUR = {
  min: 0,
  minExclu: true,
  max: 5,
  messageHorsLimites: 'Hauteur refusée : elle doit être supérieure à 0 et au plus 5 m.',
}

function pastilleCalage(c: ReleveCalcule): { couleur: CouleurEtat; mot: string } {
  if (c.etatCalage === 'saute') return { couleur: 'gris', mot: 'calage sauté' }
  if (!c.couleurCalage) return { couleur: 'gris', mot: 'calage à faire' }
  return { couleur: c.couleurCalage, mot: `calage ${c.couleurCalage}` }
}

function FeuilleNouveauReleve({ ouvert, chantierId, onFermer }: { ouvert: boolean; chantierId: string; onFermer: () => void }) {
  const naviguer = useNavigate()
  const [nom, setNom] = useState('')
  const [date, setDate] = useState(depot.dateMadagascar())
  const [operateurs, setOperateurs] = useState('')
  const [hi, setHi] = useState<number | null>(depot.HAUTEUR_DEFAUT)
  const [ht, setHt] = useState<number | null>(depot.HAUTEUR_DEFAUT)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  return (
    <Feuille ouvert={ouvert} titre="Nouveau relevé" onFermer={onFermer}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!nom.trim()) {
            setErreur(depot.MESSAGE_NOM_VIDE)
            return
          }
          setEnvoi(true)
          const r = await executer(() => depot.creerReleve(chantierId, { nom, date, operateurs, hi: hi ?? undefined, ht: ht ?? undefined }))
          setEnvoi(false)
          if (r) {
            onFermer()
            naviguer(cheminEtape(r.id, 1))
          }
        }}
      >
        <ChampTexte libelle="Nom du relevé" valeur={nom} onChange={(v) => { setNom(v); setErreur(null) }} erreur={erreur} autoComplete="off" maxLength={120} />
        <div className="flex flex-col gap-1">
          <label htmlFor="rt-date" className="text-[15px] font-semibold text-encre2">
            Date
          </label>
          <input
            id="rt-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || depot.dateMadagascar())}
            className="min-h-[56px] w-full rounded-rt border-[3px] border-encre bg-surface px-3 text-[20px] font-semibold outline-none focus:border-4 focus:bg-champActif"
          />
        </div>
        <ChampTexte libelle="Opérateurs" valeur={operateurs} onChange={setOperateurs} autoComplete="off" maxLength={120} />
        <div className="grid grid-cols-2 gap-3">
          <ChampNombre libelle="Hauteur de l'appareil" valeur={hi} onChange={setHi} unite="m" decimales={2} {...LIMITES_HAUTEUR} />
          <ChampNombre libelle="Hauteur des cibles" valeur={ht} onChange={setHt} unite="m" decimales={2} {...LIMITES_HAUTEUR} />
        </div>
        <Aide titre="Les deux hauteurs">
          <p className="m-0">Hauteur de l'appareil : la baguette sur laquelle vous posez le télémètre. Hauteur des cibles : la hauteur du centre des cibles au-dessus du sol. Toutes deux valent 1,50 m d'habitude.</p>
        </Aide>
        <Bouton type="submit" disabled={envoi}>
          Créer le relevé
        </Bouton>
      </form>
    </Feuille>
  )
}

function LigneReleve({ releve, calcule, onMenu }: { releve: Releve; calcule: ReleveCalcule; onMenu: () => void }) {
  const p = pastilleCalage(calcule)
  const n = calcule.stations.length
  return (
    <li className="flex items-stretch gap-2">
      <Link to={cheminEtape(releve.id, calcule.etape)} className="flex min-h-[64px] min-w-0 flex-1 items-center gap-2.5 rounded-rt border-2 border-encre bg-surface px-3 py-2 text-encre no-underline">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="rt-etroite truncate text-[22px] font-bold leading-tight">{releve.nom}</span>
          <span className="text-[14px] text-encre2">
            {dateFr(releve.entete.date)}, étape {calcule.etape} {NOMS_ETAPES[calcule.etape]}, {pluriel(n, 'station', 'stations', 'aucune station')}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-[14px] text-encre2">
            <span data-auteur>{releve.cree_par_nom || 'ce téléphone'}</span>
            <PastilleEtat couleur={p.couleur} mot={p.mot} petite />
          </span>
        </span>
        <Icone nom="chevron" taille={22} />
      </Link>
      <button type="button" aria-label={`Plus d’actions sur ${releve.nom}`} onClick={onMenu} className="flex w-12 flex-none items-center justify-center rounded-rt border-[3px] border-encre">
        <Icone nom="points" taille={22} />
      </button>
    </li>
  )
}

export default function Chantier() {
  const { chantier: chantierId = '' } = useParams()
  const naviguer = useNavigate()
  const donnees = useRequete(`chantier:${chantierId}`, () => lireChantier(chantierId))
  const [nouveau, setNouveau] = useState(false)
  const [menuChantier, setMenuChantier] = useState(false)
  const [menuReleve, setMenuReleve] = useState<Releve | null>(null)
  const [aSupprimer, setASupprimer] = useState<Releve | null>(null)
  const envoi = useBandeauTelephone()

  const releves = useMemo(
    () => (donnees ? donnees.releves.map(({ releve, objets }) => ({ releve, calcule: calculerMesure(releve.entete, objets, REGLAGES_DEFAUT) })) : []),
    [donnees],
  )

  if (donnees === undefined) return <div className="rt-ecran" />
  if (donnees === null) {
    return (
      <div className="rt-ecran">
        <EnTete titre="Relevé terrain" droite={<MenuHaut />} />
        <main className="flex flex-col gap-3 px-4 py-4">
          <p className="m-0 text-[18px] font-semibold">Ce chantier n'existe pas ou a été supprimé sur ce téléphone.</p>
          <Bouton onClick={() => naviguer('/')}>Mes terrains</Bouton>
        </main>
      </div>
    )
  }

  const { chantier, domaine } = donnees
  return (
    <div className="rt-ecran">
      <EnTete titre={chantier.nom} sousTitre={domaine ? domaine.nom : null} droite={<MenuHaut />} />
      <Bandeau {...envoi} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-6 pt-3.5">
        <div className="flex items-center gap-2">
          <h2 className="rt-etroite m-0 flex-1 text-[24px] font-extrabold">Relevés</h2>
          <button type="button" aria-label={`Plus d’actions sur le chantier ${chantier.nom}`} onClick={() => setMenuChantier(true)} className="flex h-12 w-12 flex-none items-center justify-center rounded-rt border-[3px] border-encre">
            <Icone nom="points" taille={22} />
          </button>
        </div>
        <Bouton onClick={() => setNouveau(true)}>+ Nouveau relevé</Bouton>
        <p className="m-0 text-[15px] text-encre2">Le relevé s'enregistre sur ce téléphone, même sans réseau.</p>
        {releves.length === 0 ? (
          <p className="m-0 rounded-rt border-2 border-dashed border-encre2 p-4 text-[17px] text-encre2">Aucun relevé dans ce chantier pour le moment.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {releves.map(({ releve, calcule }) => (
              <LigneReleve key={releve.id} releve={releve} calcule={calcule} onMenu={() => setMenuReleve(releve)} />
            ))}
          </ul>
        )}
      </main>
      <FeuilleNouveauReleve key={nouveau ? 'ouvert' : 'ferme'} ouvert={nouveau} chantierId={chantier.id} onFermer={() => setNouveau(false)} />
      {menuChantier ? <MenuTerrain cible={{ type: 'chantier', chantier, releves: releves.length }} onFermer={() => setMenuChantier(false)} /> : null}
      <FeuilleMenu
        ouvert={menuReleve !== null}
        titre={menuReleve?.nom ?? ''}
        onFermer={() => setMenuReleve(null)}
        elements={[
          {
            libelle: 'Dupliquer',
            onClick: async () => {
              const r = menuReleve
              setMenuReleve(null)
              if (!r) return
              const copie = await executer(() => depot.dupliquerReleve(r.id))
              if (copie) montrerAvis(`Copie créée : « ${copie.nom} ».`)
            },
          },
          {
            libelle: 'Supprimer le relevé',
            danger: true,
            onClick: async () => {
              const r = menuReleve
              setMenuReleve(null)
              if (!r) return
              // Never a relevé held by another phone (6.8, section 8).
              const refus = await refusSuppression({ releveId: r.id })
              if (refus) montrerAvis(refus, 'alerte')
              else setASupprimer(r)
            },
          },
        ]}
      />
      <Confirmation
        ouvert={aSupprimer !== null}
        titre={`Supprimer le relevé « ${aSupprimer?.nom ?? ''} » ?`}
        texte="Ses bornes, son calage et ses stations sont supprimés de ce téléphone. Cette action est définitive."
        onAnnuler={() => setASupprimer(null)}
        autre={
          exporterSauvegarde && aSupprimer
            ? {
                libelle: "Exporter la sauvegarde d'abord",
                onClick: () => {
                  const id = aSupprimer.id
                  void executer(async () => exporterSauvegarde?.(id))
                },
              }
            : undefined
        }
        confirmer={{
          libelle: 'Supprimer le relevé',
          onClick: async () => {
            const r = aSupprimer
            setASupprimer(null)
            if (!r) return
            const ok = await executer(() => depot.supprimerReleve(r.id, r.rev))
            if (ok !== null) montrerAvis(`Relevé « ${r.nom} » supprimé.`)
          },
        }}
      />
    </div>
  )
}
