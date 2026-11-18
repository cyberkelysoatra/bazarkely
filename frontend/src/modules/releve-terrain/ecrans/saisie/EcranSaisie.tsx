// State of the input of a relevé (route /r/:releve/saisie), shown instead of the Saisir screen when this
// phone does not write there: screen 13 « Fin de saisie » (finish waiting for the network, H28), screen 14
// « Relevé tenu ailleurs » (read-only, owner's take-over after the warning of 6.10), free relevé (H27),
// taken over (D19), right withdrawn (DR10). A relevé held here goes straight to Saisir.
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { Confirmation } from '../../composants/Feuilles'
import { saisieTenueIci } from '../../db/depot'
import { executer } from '../../etat/avis'
import { estProprietaire, useActionsSaisie } from '../../etat/useEnvoi'
import { useReleve } from '../../etat/useReleve'
import { useRequete } from '../../etat/useRequete'
import { lireCle } from '../../db/depot'
import { MESSAGE_DROIT_RETIRE, MESSAGE_FIN_EN_ATTENTE, avertissementReprise, leJourHeure, messageDerniereDonnee } from '../../sync/messages'
import { CadreReleve } from '../CadreReleve'
import { exporterSauvegarde } from '../registre'

const CALAGE: Record<string, string> = { valide: 'validé', force: 'gardé malgré le rouge', saute: 'sauté (bornes vérifiées)', a_faire: 'à faire' }

function Ligne({ libelle, valeur, attr }: { libelle: string; valeur: string; attr?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-encre/20 py-1.5 last:border-b-0" data-ligne={attr}>
      <span className="text-[16px] font-semibold text-encre2">{libelle}</span>
      <span className="text-right text-[18px] font-extrabold">{valeur}</span>
    </div>
  )
}

function BoutonExport({ releveId, libelle }: { releveId: string; libelle: string }) {
  if (!exporterSauvegarde) return null
  return (
    <Bouton variante="secondaire" onClick={() => void executer(async () => exporterSauvegarde?.(releveId))}>
      {libelle}
    </Bouton>
  )
}

export default function EcranSaisie() {
  const { releve: releveId } = useParams()
  const r = useReleve(releveId)
  const naviguer = useNavigate()
  const { prendre, reprendre } = useActionsSaisie(releveId)
  const appareil = useRequete('cle:appareil', () => lireCle('appareil'))
  const [dialogue, setDialogue] = useState(false)
  const [enCours, setEnCours] = useState(false)
  if (r.etat.statut !== 'pret') return <CadreReleve releve={r}>{null}</CadreReleve>
  const { releve, objets, calcule, chantier, domaine } = r.etat
  if (saisieTenueIci(releve) && releve.saisie !== 'fin_en_attente') return <Navigate to={`/r/${releve.id}/${calcule.etatCalage === 'a_faire' ? 'calage' : 'saisir'}`} replace />

  const stations = objets.filter((o) => o.type === 'station')
  const envoyees = stations.filter((o) => o.envoi === 'envoye').length
  const attente = objets.filter((o) => o.envoi === 'a_envoyer').length
  const bornes = calcule.bornes
    .filter((b) => b.donnees.etat === 'active')
    .map((b) => (b.donnees.type === 'ephemere' ? `${b.donnees.lettre} (éphémère)` : b.donnees.lettre))
  const det = releve.detenteur ?? null
  const proprietaire = estProprietaire(chantier, domaine)
  const tenuAilleurs = !!det && det.appareil !== appareil?.id
  const action = async (f: () => Promise<boolean>) => {
    setEnCours(true)
    try {
      if (await f()) naviguer(`/r/${releve.id}/${calcule.etatCalage === 'a_faire' ? 'calage' : 'saisir'}`)
    } finally {
      setEnCours(false)
    }
  }

  // Screen 13: finish recorded, waiting for the network.
  if (releve.saisie === 'fin_en_attente') {
    return (
      <CadreReleve releve={r} etape={3}>
        <section className="flex flex-col gap-1 rounded-rt border-[3px] border-encre bg-surface p-4" data-ecran="fin-saisie">
          <h2 className="rt-etroite m-0 text-[26px] font-extrabold">Fin de journée</h2>
          <Ligne libelle="Stations saisies" valeur={String(stations.length)} attr="saisies" />
          <Ligne libelle="Envoyées" valeur={String(envoyees)} attr="envoyees" />
          <Ligne libelle="En attente" valeur={attente ? `${attente}, partent au retour du réseau` : '0'} attr="attente" />
        </section>
        <p className="m-0 text-[17px] leading-snug">
          {MESSAGE_FIN_EN_ATTENTE}. Le relevé reste à vous jusqu’au retour du réseau ; ensuite la saisie se libère et un autre téléphone peut la prendre.
        </p>
        <BoutonExport releveId={releve.id} libelle="Exporter la sauvegarde par précaution" />
        <p className="m-0 text-[15px] text-encre2">Se déconnecter est refusé tant que des saisies attendent.</p>
      </CadreReleve>
    )
  }

  const resume = (
    <section className="flex flex-col gap-1 rounded-rt border-[3px] border-encre bg-surface p-4" data-ecran="releve-lecture">
      <h2 className="rt-etroite m-0 text-[26px] font-extrabold">{releve.nom}</h2>
      <Ligne libelle="Stations reçues" valeur={String(calcule.stations.length)} attr="stations" />
      <Ligne libelle="Calage" valeur={CALAGE[calcule.etatCalage] ?? calcule.etatCalage} />
      <Ligne libelle="Bornes" valeur={bornes.join(', ') || 'aucune'} />
      {messageDerniereDonnee(releve.derniere_donnee_at) ? <p className="m-0 pt-1 text-[15px] text-encre2">{messageDerniereDonnee(releve.derniere_donnee_at)}</p> : null}
    </section>
  )

  if (releve.saisie === 'reprise') {
    const quand = leJourHeure(releve.reprise_at)
    return (
      <CadreReleve releve={r} etape={3}>
        {resume}
        <p className="m-0 rounded-rt border-[3px] border-[#7F1D1D] bg-[#FEE2E2] p-3 text-[17px] font-semibold leading-snug text-[#7F1D1D]" data-reprise>
          Saisie reprise par le propriétaire{quand ? ` ${quand}` : ''}.{' '}
          {releve.reprise_a_accuser ? 'Vos stations saisies sans réseau partiront au retour du réseau.' : 'Vos stations saisies sans réseau ont été envoyées.'} Vous ne pouvez plus écrire dans ce
          relevé.
        </p>
      </CadreReleve>
    )
  }

  if (releve.saisie === 'lecture' && attente > 0) {
    return (
      <CadreReleve releve={r} etape={3}>
        {resume}
        <p className="m-0 text-[17px] font-semibold leading-snug">{MESSAGE_DROIT_RETIRE}</p>
        <BoutonExport releveId={releve.id} libelle="Exporter la sauvegarde" />
      </CadreReleve>
    )
  }

  const consulter = releve.saisie === 'lecture' || chantier?.droit === 'consulter'
  return (
    <CadreReleve releve={r} etape={3}>
      {resume}
      <p className="m-0 text-[17px] leading-snug">Saisir est fermé : vous voyez la carte et les résultats.</p>
      {!tenuAilleurs && !consulter ? (
        <Bouton disabled={enCours} onClick={() => void action(prendre)}>
          Prendre la saisie
        </Bouton>
      ) : null}
      {tenuAilleurs && proprietaire && !consulter ? (
        <section className="flex flex-col gap-2 rounded-rt border-[3px] border-encre bg-surface p-3" data-reprendre>
          <p className="m-0 text-[17px] font-bold leading-snug">Téléphone perdu ou sans réseau ?</p>
          <p className="m-0 text-[16px] leading-snug">Vous êtes propriétaire : vous pouvez reprendre la saisie, avec du réseau.</p>
          <button
            type="button"
            disabled={enCours}
            onClick={() => setDialogue(true)}
            className="rt-etroite min-h-[60px] w-full rounded-rt border-[3px] border-encre bg-[#B91C1C] text-[21px] font-extrabold text-white"
          >
            Reprendre la saisie
          </button>
        </section>
      ) : null}
      <Confirmation
        ouvert={dialogue}
        titre="Reprendre la saisie ?"
        texte={avertissementReprise(det)}
        confirmer={{
          libelle: 'Oui, reprendre la saisie',
          onClick: () => {
            setDialogue(false)
            void action(reprendre)
          },
        }}
        onAnnuler={() => setDialogue(false)}
      />
    </CadreReleve>
  )
}
