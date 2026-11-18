// Screen 18 « Invitation reçue » (Invitation.dc.html, look MODELE B), route /i/:jeton (H25, PRD section 8).
// Without session: rt_invitation_apercu (anonymous) shows « De », « Domaine », « Chantiers » or « Tout le
// domaine », « Droit »; « Se connecter et accepter » keeps the token across the Google redirect (written
// just before leaving, removed after use), then rt_invitation_accepter and the home on « Partagés avec
// moi ». With a session: « Accepter l'invitation » directly. A used or withdrawn link, and the owner's own
// invitation, get their message.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { EnTete } from '../../composants/EnTete'
import { PastilleDroit } from '../../composants/Pastilles'
import { synchroniser } from '../../sync/moteur'
import {
  accepterInvitation,
  apercuInvitation,
  MESSAGE_PLUS_VALABLE,
  MESSAGE_RESEAU_INVITATION,
  type Apercu,
} from '../../sync/partage'
import { rpcSupabase, type Rpc } from '../../sync/rpc'
import { useSession } from '../../sync/session'
import { rpcCompte } from './commun'

/** Key holding the token during the sign-in redirect only. */
export const CLE_INVITATION = 'releve_invitation_attente'

export function poserJetonAttente(jeton: string): void {
  try {
    localStorage.setItem(CLE_INVITATION, jeton)
  } catch {
    /* no storage: the person opens the link again after signing in */
  }
}

export function lireJetonAttente(): string | null {
  try {
    return localStorage.getItem(CLE_INVITATION)
  } catch {
    return null
  }
}

export function oublierJetonAttente(): void {
  try {
    localStorage.removeItem(CLE_INVITATION)
  } catch {
    /* nothing kept */
  }
}

function enLigne(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/** Adapter for the preview: the page's (tests) or supabase-js, with or without a session. */
let rpcApercu: Rpc | null = null
export function poserRpcApercu(rpc: Rpc | null): void {
  rpcApercu = rpc
}

/** Acceptance, then one sync cycle so that the shared domain is on the phone before the home shows. */
async function accepter(jeton: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const rpc = await rpcCompte()
  if (!rpc) return { ok: false, message: MESSAGE_RESEAU_INVITATION }
  const r = await accepterInvitation(rpc, jeton)
  if (!r.ok) return { ok: false, message: r.message }
  await synchroniser()
  return { ok: true }
}

function Alerte({ children }: { children: string }) {
  return (
    <p role="alert" className="m-0 rounded-rt border-2 border-[#991B1B] bg-[#FEE2E2] px-3.5 py-3 text-[16px] font-semibold leading-snug text-[#7F1D1D]">
      {children}
    </p>
  )
}

function Rangee({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t-2 border-encre pt-2 first:border-t-0 first:pt-0">
      <dt className="flex-none text-[15px] font-semibold text-encre2">{libelle}</dt>
      <dd className="m-0 min-w-0 text-right text-[18px] font-bold leading-snug">{children}</dd>
    </div>
  )
}

function Cadre({ children }: { children: ReactNode }) {
  return (
    <div className="rt-ecran">
      <EnTete titre="Relevé terrain" sousTitre="Invitation" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-6 pt-3.5">{children}</main>
    </div>
  )
}

export default function Invitation() {
  const { jeton = '' } = useParams()
  const naviguer = useNavigate()
  const session = useSession()
  const [apercu, setApercu] = useState<Apercu | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let fini = false
    if (!enLigne()) {
      setErreur(MESSAGE_RESEAU_INVITATION)
      return
    }
    void apercuInvitation(rpcApercu ?? rpcSupabase(), jeton).then((r) => {
      if (fini) return
      if (r.ok) setApercu(r.valeur)
      else setErreur(r.message)
    })
    return () => {
      fini = true
    }
  }, [jeton])

  const accepterIci = async () => {
    setEnvoi(true)
    setErreur(null)
    const r = await accepter(jeton)
    setEnvoi(false)
    if (r.ok) naviguer('/#partages', { replace: true })
    else setErreur(r.message)
  }

  return (
    <Cadre>
      <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-tight">Vous êtes invité</h2>
      {apercu === null && !erreur ? <p className="m-0 text-[17px] text-encre2">Lecture de l'invitation...</p> : null}
      {apercu && !apercu.valide ? <Alerte>{MESSAGE_PLUS_VALABLE}</Alerte> : null}
      {apercu?.valide ? (
        <>
          <dl className="m-0 flex flex-col gap-2 rounded-rt border-[3px] border-encre bg-surface p-3.5">
            <Rangee libelle="De">{apercu.proprietaire}</Rangee>
            <Rangee libelle="Domaine">{apercu.domaine}</Rangee>
            <Rangee libelle={apercu.chantiers === null ? 'Portée' : apercu.chantiers.length > 1 ? 'Chantiers' : 'Chantier'}>
              {apercu.chantiers === null ? 'Tout le domaine' : apercu.chantiers.join(', ')}
            </Rangee>
            <Rangee libelle="Droit">
              <PastilleDroit droit={apercu.droit} />
            </Rangee>
          </dl>
          <p className="m-0 text-[16px] leading-snug">
            {apercu.droit === 'relever'
              ? 'Vous pourrez caler, saisir des stations, créer vos relevés et les exporter.'
              : 'Vous pourrez voir les relevés, la carte et les courbes, et les exporter.'}
          </p>
          {session ? (
            <Bouton onClick={() => void accepterIci()} disabled={envoi}>
              {envoi ? 'Acceptation...' : 'Accepter l’invitation'}
            </Bouton>
          ) : (
            <Bouton
              onClick={() => {
                poserJetonAttente(jeton)
                naviguer(`/connexion?retour=${encodeURIComponent('/invitation')}`)
              }}
            >
              Se connecter et accepter
            </Bouton>
          )}
          <p className="m-0 text-[15px] leading-snug text-encre2">Il faut du réseau pour accepter. Ensuite, les chantiers apparaissent dans Mes terrains, rubrique « Partagés avec moi ».</p>
        </>
      ) : null}
      {erreur ? <Alerte>{erreur}</Alerte> : null}
    </Cadre>
  )
}

/** Back from the sign-in (/invitation): the token kept before leaving is used once, then removed. */
export function RetourInvitation() {
  const naviguer = useNavigate()
  const session = useSession()
  const [erreur, setErreur] = useState<string | null>(null)
  const [jeton] = useState(lireJetonAttente)
  const lance = useRef(false)
  useEffect(() => {
    if (!session || !jeton || lance.current) return
    lance.current = true
    void accepter(jeton).then((r) => {
      // Used once: removed after the answer, whatever it is (a network failure keeps it for a new try).
      if (r.ok || r.message !== MESSAGE_RESEAU_INVITATION) oublierJetonAttente()
      if (r.ok) naviguer('/#partages', { replace: true })
      else setErreur(r.message)
    })
  }, [session, jeton, naviguer])
  if (!jeton) return <Navigate to="/" replace />
  return (
    <Cadre>
      <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-tight">Vous êtes invité</h2>
      {erreur ? (
        <>
          <Alerte>{erreur}</Alerte>
          <Bouton onClick={() => naviguer('/', { replace: true })}>Mes terrains</Bouton>
        </>
      ) : (
        <p className="m-0 text-[17px] text-encre2">Acceptation de l'invitation...</p>
      )}
    </Cadre>
  )
}
