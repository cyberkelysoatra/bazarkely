// Screen 16 « Partager » (Partager.dc.html, look MODELE B), owner only (F13, H25, PRD 6.8). The whole
// domain (its future work sites included) or one or several of its work sites, the right « Consulter » or
// « Relever », then « Préparer le message WhatsApp »: rt_invitation_creer, the message shared through the
// phone's share menu, else WhatsApp by its address, else copied. The token lives only in this screen's
// memory (never written on the phone).
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { Icone } from '../../composants/Icones'
import { db } from '../../db/base'
import { montrerAvis } from '../../etat/avis'
import { synchroniser } from '../../sync/moteur'
import {
  creerInvitation,
  MESSAGE_CUMUL,
  MESSAGE_DROITS,
  MESSAGE_PAS_ENVOYE,
  MESSAGE_RESEAU_PARTAGE,
  MESSAGE_UNE_FOIS,
  messageInvitation,
  type DroitPartage,
} from '../../sync/partage'
import { CadrePartage, ReserveProprietaire, rpcCompte, TitreEcran, useDomaineProprio } from './commun'

function enLigne(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/** Share menu of the phone, else WhatsApp by its address, else the clipboard. Returns what was done. */
export async function partagerTexte(text: string): Promise<'partage' | 'annule' | 'whatsapp' | 'copie' | 'echec'> {
  const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ text })
      return 'partage'
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'annule'
    }
  }
  const w = typeof window.open === 'function' ? window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener') : null
  if (w) return 'whatsapp'
  try {
    await navigator.clipboard.writeText(text)
    return 'copie'
  } catch {
    return 'echec'
  }
}

function CaseACocher({ coche, onChange, titre, detail }: { coche: boolean; onChange: (v: boolean) => void; titre: string; detail?: string }) {
  return (
    <label className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-rt border-2 border-encre bg-surface px-3 py-2">
      <input type="checkbox" checked={coche} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className={`flex h-8 w-8 flex-none items-center justify-center rounded-rt border-[3px] border-encre peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 ${coche ? 'bg-jaune' : 'bg-surface'}`}>
        {coche ? <Icone nom="coche" taille={20} couleur="#000000" epaisseur={3} /> : null}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="rt-etroite text-[22px] font-bold leading-tight">{titre}</span>
        {detail ? <span className="text-[14px] text-encre2">{detail}</span> : null}
      </span>
    </label>
  )
}

export default function Partager() {
  const { domaine: domaineId = '' } = useParams()
  const [params] = useSearchParams()
  const donnees = useDomaineProprio(domaineId)
  const depart = params.get('chantier')
  const [entier, setEntier] = useState(!depart)
  const [choisis, setChoisis] = useState<string[]>(depart ? [depart] : [])
  const [droit, setDroit] = useState<DroitPartage>('relever')
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  if (donnees === undefined) return <div className="rt-ecran" />
  if (donnees === null) return <ReserveProprietaire />
  const { domaine, chantiers } = donnees
  const vivants = chantiers.map((c) => c.id)
  const selection = choisis.filter((id) => vivants.includes(id))
  const pret = entier || selection.length > 0

  const preparer = async () => {
    setErreur(null)
    setMessage(null)
    if (!enLigne()) {
      setErreur(MESSAGE_RESEAU_PARTAGE)
      return
    }
    setEnvoi(true)
    try {
      // The domain and the chosen work sites must be on the server first (they leave on their own).
      const surServeur = async () => {
        const d = await db.domaines.get(domaine.id)
        const cs = await Promise.all(selection.map((id) => db.chantiers.get(id)))
        return d?.envoi === 'envoye' && (entier || cs.every((c) => c?.envoi === 'envoye'))
      }
      if (!(await surServeur())) {
        await synchroniser()
        if (!(await surServeur())) {
          setErreur(MESSAGE_PAS_ENVOYE)
          return
        }
      }
      const rpc = await rpcCompte()
      if (!rpc) {
        setErreur(MESSAGE_RESEAU_PARTAGE)
        return
      }
      const res = await creerInvitation(rpc, domaine.id, entier ? null : selection, droit)
      if (!res.ok) {
        setErreur(res.message)
        return
      }
      const noms = entier ? null : chantiers.filter((c) => selection.includes(c.id)).map((c) => c.nom)
      const texte = messageInvitation({ domaine: domaine.nom, chantiers: noms, droit, jeton: res.valeur.jeton })
      setMessage(texte)
      const fait = await partagerTexte(texte)
      if (fait === 'copie') montrerAvis('Message copié : collez-le dans WhatsApp.')
      else if (fait === 'echec') montrerAvis('Copiez le message ci-dessous et envoyez-le par WhatsApp.', 'alerte')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <CadrePartage sousTitre={domaine.nom}>
      <TitreEcran>Partager</TitreEcran>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="rt-etroite mb-2 p-0 text-[22px] font-extrabold">Quoi ?</legend>
        <CaseACocher
          coche={entier}
          titre={`Tout le domaine ${domaine.nom}`}
          detail="y compris les chantiers créés plus tard"
          onChange={(v) => {
            setEntier(v)
            if (v) setChoisis([])
            setMessage(null)
          }}
        />
        {chantiers.map((c) => (
          <CaseACocher
            key={c.id}
            coche={!entier && selection.includes(c.id)}
            titre={c.nom}
            onChange={(v) => {
              setEntier(false)
              setChoisis((l) => (v ? [...l.filter((x) => x !== c.id), c.id] : l.filter((x) => x !== c.id)))
              setMessage(null)
            }}
          />
        ))}
      </fieldset>
      <div className="flex flex-col gap-2">
        <h3 id="rt-droit" className="rt-etroite m-0 text-[22px] font-extrabold">
          Avec quel droit ?
        </h3>
        <div role="radiogroup" aria-labelledby="rt-droit" className="grid grid-cols-2 gap-2">
          {(['consulter', 'relever'] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={droit === d}
              onClick={() => {
                setDroit(d)
                setMessage(null)
              }}
              className={`rt-etroite min-h-[56px] rounded-rt border-[3px] border-encre text-[21px] font-extrabold ${droit === d ? 'bg-jaune text-encre' : 'bg-surface text-encre'}`}
            >
              {d === 'consulter' ? 'Consulter' : 'Relever'}
            </button>
          ))}
        </div>
        <p className="m-0 text-[15px] leading-snug text-encre2">{MESSAGE_DROITS}</p>
      </div>
      <p role="note" className="m-0 rounded-rt border-2 border-encre bg-[#DBEAFE] px-3.5 py-3 text-[15px] font-semibold leading-snug text-[#1E3A8A]">
        {MESSAGE_CUMUL}
      </p>
      <Bouton onClick={() => void preparer()} disabled={!pret || envoi}>
        {envoi ? 'Préparation...' : 'Préparer le message WhatsApp'}
      </Bouton>
      {!pret ? <p className="m-0 text-[15px] text-encre2">Cochez le domaine entier ou au moins un chantier.</p> : null}
      {erreur ? (
        <p role="alert" className="m-0 rounded-rt border-2 border-[#991B1B] bg-[#FEE2E2] px-3.5 py-3 text-[16px] font-semibold text-[#7F1D1D]">
          {erreur}
        </p>
      ) : null}
      {message ? (
        <section aria-labelledby="rt-message" className="flex flex-col gap-2 rounded-rt border-[3px] border-encre bg-surface p-3.5">
          <h3 id="rt-message" className="rt-etroite m-0 text-[22px] font-extrabold">
            Message préparé
          </h3>
          <p data-message className="m-0 whitespace-pre-wrap break-words text-[15px] leading-snug">
            {message}
          </p>
          <p className="m-0 text-[14px] leading-snug text-encre2">{MESSAGE_UNE_FOIS}</p>
          <div className="grid grid-cols-2 gap-2">
            <Bouton variante="secondaire" grand={false} onClick={() => void partagerTexte(message)}>
              Envoyer
            </Bouton>
            <Bouton
              variante="secondaire"
              grand={false}
              onClick={() =>
                void navigator.clipboard
                  .writeText(message)
                  .then(() => montrerAvis('Message copié.'))
                  .catch(() => montrerAvis('Copie impossible : sélectionnez le texte.', 'alerte'))
              }
            >
              Copier
            </Bouton>
          </div>
        </section>
      ) : null}
      <Link to={`/d/${domaine.id}/acces`} className="rt-etroite flex min-h-[52px] items-center justify-center rounded-rt border-[3px] border-encre text-[19px] font-extrabold text-encre no-underline">
        Qui a accès
      </Link>
    </CadrePartage>
  )
}
