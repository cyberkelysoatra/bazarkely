// Card « Connexion réussie » (RELEVE-CC-11, D34): the Google sign-in started from the installed app came
// back in a browser tab. Shown at the top of the home screen of that tab once the session is there;
// « Continuer ici » hides it.
import { useState } from 'react'
import { retenirRetourDepuisApp, useSession } from '../sync/session'

export function CarteRetourConnexion() {
  const session = useSession()
  const [depuisApp] = useState(() => retenirRetourDepuisApp())
  const [masquee, setMasquee] = useState(false)
  if (!depuisApp || !session || masquee) return null
  return (
    <section role="status" aria-labelledby="rt-connexion-reussie" data-carte-retour-connexion="" className="flex w-full flex-col gap-2 rounded-rt border-[3px] border-encre bg-jaune p-4 text-encre">
      <h2 id="rt-connexion-reussie" className="rt-etroite m-0 text-[28px] font-extrabold leading-tight">
        Connexion réussie
      </h2>
      <p className="m-0 text-[18px] font-semibold leading-snug">Retournez dans l'application Relevé terrain : vous y êtes connecté. Vous pouvez fermer cette page.</p>
      <button type="button" onClick={() => setMasquee(true)} className="min-h-[48px] self-start px-0 text-left text-[18px] font-bold underline underline-offset-2">
        Continuer ici
      </button>
    </section>
  )
}
