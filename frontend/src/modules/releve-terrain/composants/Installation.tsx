// « Installer sur mon téléphone » (RELEVE-CC-11, D33): shown everywhere outside the installed app, even
// when the browser never offers the install (Brave on Android never fires beforeinstallprompt). A touch
// opens the browser offer when it exists; otherwise the sheet « Installer Relevé terrain » with the
// gesture of the detected browser and, on Android outside Chrome, « Ouvrir dans Chrome ».
import { useMemo, useState, type ReactNode } from 'react'
import { adresseChrome, detecterNavigateur, environnementPage, gestesInstallation, type Detection } from '../etat/installation'
import { lancerInstallation, useEntreeInstallation, useInstallationDisponible } from '../etat/pwa'
import { Bouton } from './Bouton'
import { Feuille } from './Feuilles'
import { Icone } from './Icones'

export const TITRE_INSTALLATION = 'Installer Relevé terrain'
export const LIBELLE_INSTALLATION = 'Installer sur mon téléphone'

/** Drawn key of the browser's own button (the condensed font turns ⋮ into a colon). The glyph stays for screen readers. */
function Touche({ glyphe }: { glyphe: string }) {
  const trace =
    glyphe === '⋮' ? (
      <>
        <circle cx="12" cy="5" r="2.2" fill="currentColor" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        <circle cx="12" cy="19" r="2.2" fill="currentColor" />
      </>
    ) : glyphe === '≡' ? (
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    ) : (
      <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M6 11v9h12v-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    )
  return (
    <span className="mx-1 inline-flex h-8 w-8 translate-y-[3px] items-center justify-center rounded-[6px] border-2 border-encre bg-fond align-baseline" data-touche={glyphe}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        {trace}
      </svg>
      {glyphe === 'partager' ? null : <span className="sr-only">{glyphe}</span>}
    </span>
  )
}

/** A step with its browser keys drawn: ⋮, ≡ and the share button of Safari. */
function Etape({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/(⋮|≡|Partager)/).map((morceau, i) =>
        morceau === '⋮' || morceau === '≡' ? (
          <Touche key={i} glyphe={morceau} />
        ) : morceau === 'Partager' ? (
          <span key={i}>
            Partager
            <Touche glyphe="partager" />
          </span>
        ) : (
          morceau
        ),
      )}
    </>
  )
}

/** Sheet with the gesture of the browser, one short numbered list. */
export function FeuilleInstallation({ ouvert, onFermer, detection }: { ouvert: boolean; onFermer: () => void; detection: Detection }) {
  const gestes = gestesInstallation(detection)
  return (
    <Feuille ouvert={ouvert} titre={TITRE_INSTALLATION} onFermer={onFermer}>
      <div className="flex flex-col gap-4" data-installation={detection.navigateur}>
        <p className="m-0 text-[17px] leading-snug">L'outil s'ouvrira depuis l'écran d'accueil, comme une application, même sans réseau.</p>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {gestes.etapes.map((e, i) => (
            <li key={e} className="flex items-start gap-3 rounded-rt border-2 border-encre bg-surface px-3 py-2.5">
              <span aria-hidden="true" className="rt-etroite flex h-9 w-9 flex-none items-center justify-center rounded-full bg-encre text-[22px] font-extrabold text-jaune">
                {i + 1}
              </span>
              <span className="pt-1 text-[19px] font-semibold leading-snug">
                <Etape texte={e} />
              </span>
            </li>
          ))}
        </ol>
        {gestes.note ? (
          <p className="m-0 text-[17px] font-semibold leading-snug" data-note-installation="">
            {gestes.note}
          </p>
        ) : null}
        {gestes.ouvrirDansChrome ? (
          <a
            href={adresseChrome(window.location.href)}
            data-ouvrir-chrome=""
            className="rt-etroite flex min-h-[60px] w-full items-center justify-center gap-2 rounded-rt border-[3px] border-encre bg-jaune px-4 text-[21px] font-extrabold text-encre no-underline"
          >
            Ouvrir dans Chrome
          </a>
        ) : null}
      </div>
    </Feuille>
  )
}

/**
 * The entry and its sheet. `visible` is false inside the installed app; `ouvrir` uses the browser offer
 * when it exists, else opens the sheet; `feuille` is rendered once by the caller.
 */
export function useInstallation(env = environnementPage): { visible: boolean; ouvrir: () => void; feuille: ReactNode } {
  const visible = useEntreeInstallation()
  const offre = useInstallationDisponible()
  const [ouvert, setOuvert] = useState(false)
  const detection = useMemo(() => detecterNavigateur(env()), [env])
  const ouvrir = () => {
    if (offre) void lancerInstallation()
    else setOuvert(true)
  }
  const feuille = visible ? <FeuilleInstallation ouvert={ouvert} onFermer={() => setOuvert(false)} detection={detection} /> : null
  return { visible, ouvrir, feuille }
}

/** Secondary button of the home screen (below the list). */
export function BoutonInstallation() {
  const { visible, ouvrir, feuille } = useInstallation()
  if (!visible) return null
  return (
    <>
      <Bouton variante="secondaire" grand={false} onClick={ouvrir} icone={<Icone nom="installer" />} className="mt-2" data-entree-installation="">
        {LIBELLE_INSTALLATION}
      </Bouton>
      {feuille}
    </>
  )
}
