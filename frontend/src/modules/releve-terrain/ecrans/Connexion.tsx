// Screen 1: « Connectez-vous » (Connexion.dc.html, MODELE B), phase 3 (F11, H23). « Continuer avec Google »
// and « Se connecter par e-mail », as Validation's BoutonsConnexion; back to the page asked before
// (?retour=). Shown at the first opening with network and no session; never without network.
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Bouton } from '../composants/Bouton'
import { EnTete } from '../composants/EnTete'
import { ChampTexte } from '../composants/Formulaires'
import { connexionEmail, connexionGoogle, useSession } from '../sync/session'

function LogoGoogle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  )
}

/** Page asked before, inside /releve (never another site). */
export function cheminRetour(brut: string | null): string {
  const r = brut ?? '/'
  return r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/connexion') ? r : '/'
}

function FormulaireEmail({ retour }: { retour: string }) {
  const naviguer = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!email.trim() || !motDePasse) {
          setErreur('Saisissez votre e-mail et votre mot de passe.')
          return
        }
        setEnvoi(true)
        setErreur(null)
        try {
          await connexionEmail(email, motDePasse)
          naviguer(retour, { replace: true })
        } catch {
          setErreur("Connexion refusée : vérifiez l'e-mail, le mot de passe et le réseau.")
          setEnvoi(false)
        }
      }}
    >
      <ChampTexte libelle="E-mail" valeur={email} onChange={setEmail} type="email" autoComplete="email" inputMode="email" />
      <ChampTexte libelle="Mot de passe" valeur={motDePasse} onChange={setMotDePasse} type="password" autoComplete="current-password" erreur={erreur} />
      <Bouton type="submit" disabled={envoi}>
        Se connecter
      </Bouton>
    </form>
  )
}

export default function Connexion() {
  const [params] = useSearchParams()
  const session = useSession()
  const retour = cheminRetour(params.get('retour'))
  const [parEmail, setParEmail] = useState(false)
  const [erreur, setErreur] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  if (session) return <Navigate to={retour} replace />
  return (
    <div className="rt-ecran">
      <EnTete titre="Relevé terrain" sousTitre="Première ouverture" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-5">
        <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-tight">Connectez-vous</h2>
        <p className="m-0 text-[18px] leading-snug">
          Relevé terrain utilise votre compte 1sakely.org, le même que pour vos autres modules. Il faut du réseau cette fois-ci seulement.
        </p>
        <button
          type="button"
          disabled={envoi}
          data-google
          onClick={async () => {
            setErreur(false)
            setEnvoi(true)
            try {
              await connexionGoogle(retour)
            } catch {
              setErreur(true)
              setEnvoi(false)
            }
          }}
          className="rt-etroite flex min-h-[60px] w-full items-center justify-center gap-3 rounded-rt border-[3px] border-encre bg-surface px-4 text-[21px] font-extrabold text-encre disabled:opacity-50"
        >
          <LogoGoogle />
          Continuer avec Google
        </button>
        {erreur ? (
          <p role="alert" className="m-0 text-[16px] font-semibold text-rougeTexte">
            La connexion n'a pas pu démarrer. Vérifiez le réseau et réessayez.
          </p>
        ) : null}
        {parEmail ? (
          <FormulaireEmail retour={retour} />
        ) : (
          <Bouton variante="secondaire" grand={false} onClick={() => setParEmail(true)} data-email="">
            Se connecter par e-mail
          </Bouton>
        )}
        <p className="m-0 text-[16px] text-encre2">Pas encore de compte ? Il se crée à la première connexion.</p>
        <section className="mt-2 flex flex-col gap-1 rounded-rt border-2 border-encre bg-surface p-3.5">
          <h3 className="rt-etroite m-0 text-[22px] font-extrabold">Ensuite</h3>
          <p className="m-0 text-[16px] leading-snug">
            Relevé terrain apparaît dans votre sélecteur de modules, sans demande à l'administrateur. Vos terrains vous suivent sur tout téléphone connecté à votre compte.
          </p>
        </section>
      </main>
    </div>
  )
}
