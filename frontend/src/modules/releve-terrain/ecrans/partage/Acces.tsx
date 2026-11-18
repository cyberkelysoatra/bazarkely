// Screen 17 « Qui a accès » (Acces.dc.html, look MODELE B), owner only (H26, PRD 6.8). rt_acces: per
// account its lines (whole domain or work site) with their right; the line « le plus précis l'emporte »
// when a work site line and a domain line coexist; « Changer le droit » (to « consulter »: confirmation),
// « Retirer » (confirmation); pending invitations with their date and « Retirer l'invitation »;
// « + Partager encore ». Needs the network: nothing of it is kept on the phone.
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { Confirmation } from '../../composants/Feuilles'
import { PastilleDroit } from '../../composants/Pastilles'
import { montrerAvis } from '../../etat/avis'
import { dateFr, heureMadagascar } from '../../etat/navigation'
import { synchroniser } from '../../sync/moteur'
import {
  lireAcces,
  MESSAGE_CHANGER_DROIT,
  MESSAGE_RESEAU_PARTAGE,
  modifierPartage,
  portee,
  retirerInvitation,
  retirerPartage,
  type Acces as DonneesAcces,
  type InvitationAttente,
  type LignePartage,
} from '../../sync/partage'
import { CadrePartage, ReserveProprietaire, rpcCompte, TitreEcran, useDomaineProprio } from './commun'

type Demande =
  | { type: 'droit'; ligne: LignePartage }
  | { type: 'retirer'; ligne: LignePartage }
  | { type: 'invitation'; invitation: InvitationAttente }

function jourIso(iso: string): string {
  // AAAA-MM-JJ of the day in Madagascar (UTC+3), for dateFr.
  const d = new Date(Date.parse(iso) + 3 * 3600 * 1000)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function autre(d: LignePartage['droit']): LignePartage['droit'] {
  return d === 'relever' ? 'consulter' : 'relever'
}

function Ligne({ ligne, domaine, onDemande }: { ligne: LignePartage; domaine: string; onDemande: (d: Demande) => void }) {
  return (
    <div data-partage={ligne.id} className="flex flex-col gap-2 border-t-2 border-encre pt-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2.5">
        <span className="rt-etroite min-w-0 text-[21px] font-bold leading-tight">{ligne.chantierId === null ? `Tout le domaine ${domaine}` : (ligne.chantierNom ?? 'Chantier')}</span>
        <PastilleDroit droit={ligne.droit} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Bouton variante="secondaire" grand={false} onClick={() => onDemande({ type: 'droit', ligne })}>
          Changer le droit
        </Bouton>
        <Bouton variante="danger" grand={false} onClick={() => onDemande({ type: 'retirer', ligne })}>
          Retirer
        </Bouton>
      </div>
    </div>
  )
}

export default function Acces() {
  const { domaine: domaineId = '' } = useParams()
  const proprio = useDomaineProprio(domaineId)
  const [acces, setAcces] = useState<DonneesAcces | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [demande, setDemande] = useState<Demande | null>(null)
  const estProprio = !!proprio

  const charger = useCallback(async () => {
    const rpc = await rpcCompte()
    if (!rpc) {
      setErreur(MESSAGE_RESEAU_PARTAGE)
      return
    }
    const res = await lireAcces(rpc, domaineId)
    if (res.ok) {
      setAcces(res.valeur)
      setErreur(null)
    } else setErreur(res.message)
  }, [domaineId])

  useEffect(() => {
    if (estProprio) void charger()
  }, [estProprio, charger])

  if (proprio === undefined) return <div className="rt-ecran" />
  if (proprio === null) return <ReserveProprietaire />
  const nomDomaine = proprio.domaine.nom

  const agir = async (d: Demande) => {
    setDemande(null)
    const rpc = await rpcCompte()
    if (!rpc) {
      montrerAvis(MESSAGE_RESEAU_PARTAGE, 'alerte')
      return
    }
    const res =
      d.type === 'droit' ? await modifierPartage(rpc, d.ligne.id, autre(d.ligne.droit)) : d.type === 'retirer' ? await retirerPartage(rpc, d.ligne.id) : await retirerInvitation(rpc, d.invitation.id)
    if (!res.ok) {
      montrerAvis(res.message, 'alerte')
      return
    }
    montrerAvis(d.type === 'droit' ? `Droit changé : « ${autre(d.ligne.droit)} ».` : d.type === 'retirer' ? 'Partage retiré.' : 'Invitation retirée : le lien ne marche plus.')
    await charger()
    void synchroniser()
  }

  const confirmer = (d: Demande) => {
    // From « consulter » to « relever » nothing is lost: no confirmation.
    if (d.type === 'droit' && d.ligne.droit === 'consulter') void agir(d)
    else setDemande(d)
  }

  return (
    <CadrePartage sousTitre={nomDomaine}>
      <TitreEcran>Qui a accès</TitreEcran>
      {erreur ? (
        <p role="alert" className="m-0 rounded-rt border-2 border-[#991B1B] bg-[#FEE2E2] px-3.5 py-3 text-[16px] font-semibold text-[#7F1D1D]">
          {erreur}
        </p>
      ) : null}
      {acces === null && !erreur ? <p className="m-0 text-[17px] text-encre2">Lecture du serveur...</p> : null}
      {acces && acces.comptes.length === 0 && acces.invitations.length === 0 ? (
        <p className="m-0 rounded-rt border-2 border-dashed border-encre2 p-4 text-[17px] text-encre2">Ce domaine n'est partagé avec personne pour le moment.</p>
      ) : null}
      {acces?.comptes.map((c) => (
        <section key={c.inviteId} aria-label={`Compte de ${c.inviteNom}`} className="flex flex-col gap-2.5 rounded-rt border-[3px] border-encre bg-surface p-3.5">
          <h3 className="rt-etroite m-0 text-[24px] font-extrabold leading-tight">Compte de {c.inviteNom}</h3>
          {c.lignes.map((l) => (
            <Ligne key={l.id} ligne={l} domaine={nomDomaine} onDemande={confirmer} />
          ))}
          {c.precisions.map((p) => (
            <p key={p} data-precision className="m-0 text-[15px] leading-snug text-encre2">
              {p}
            </p>
          ))}
        </section>
      ))}
      {acces?.invitations.map((i) => (
        <section key={i.id} aria-label="Invitation en attente" className="flex flex-col gap-2 rounded-rt border-2 border-dashed border-encre bg-surface p-3.5">
          <h3 className="rt-etroite m-0 text-[22px] font-extrabold">Invitation en attente</h3>
          <div className="flex items-center justify-between gap-2.5">
            <span className="rt-etroite min-w-0 text-[21px] font-bold leading-tight">{i.chantiers === null ? `Tout le domaine ${nomDomaine}` : portee(i.chantiers)}</span>
            <PastilleDroit droit={i.droit} />
          </div>
          <p className="m-0 text-[15px] leading-snug text-encre2">
            Envoyée le {dateFr(jourIso(i.creeAt))} à {heureMadagascar(i.creeAt)}, pas encore acceptée.
          </p>
          <Bouton variante="danger" grand={false} onClick={() => setDemande({ type: 'invitation', invitation: i })}>
            Retirer l’invitation
          </Bouton>
        </section>
      ))}
      <Link to={`/d/${proprio.domaine.id}/partager`} className="rt-etroite flex min-h-[60px] items-center justify-center rounded-rt border-[3px] border-encre bg-jaune text-[21px] font-extrabold text-encre no-underline">
        + Partager encore
      </Link>
      <p className="m-0 text-[15px] leading-snug text-encre2">
        Retirer un partage : la personne ne voit plus ces chantiers à sa prochaine connexion. Ce qu’elle a déjà envoyé reste dans les relevés. Si elle tenait une saisie, elle la perd.
      </p>
      <Confirmation
        ouvert={demande !== null}
        titre={
          demande?.type === 'droit'
            ? `Passer ${demande.ligne.inviteNom} en « consulter » ?`
            : demande?.type === 'retirer'
              ? `Retirer le partage de ${demande.ligne.inviteNom} ?`
              : 'Retirer l’invitation ?'
        }
        texte={
          demande?.type === 'droit'
            ? MESSAGE_CHANGER_DROIT
            : demande?.type === 'retirer'
              ? 'La personne ne voit plus ces chantiers à sa prochaine connexion. Ce qu’elle a déjà envoyé reste dans les relevés. Si elle tenait une saisie, elle la perd.'
              : 'Le lien ne marchera plus. Pour inviter à nouveau, préparez un nouveau message.'
        }
        onAnnuler={() => setDemande(null)}
        confirmer={{
          libelle: demande?.type === 'droit' ? 'Changer le droit' : demande?.type === 'retirer' ? 'Retirer' : 'Retirer l’invitation',
          onClick: () => {
            if (demande) void agir(demande)
          },
        }}
      />
    </CadrePartage>
  )
}
