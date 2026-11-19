// Screen 5: top menu (Menu.dc.html). « Mes terrains », « + Nouveau domaine foncier », « Aide : le principe
// de mesure », « Version de l'outil », then « Se déconnecter » (phase 3; refused while rows wait to be
// sent) or « Se connecter ».
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BoutonEnTete } from '../composants/EnTete'
import { Feuille, FeuilleMenu } from '../composants/Feuilles'
import { FeuilleNom } from '../composants/Formulaires'
import { Icone, Point } from '../composants/Icones'
import { creerDomaine } from '../db/depot'
import { executer, montrerAvis } from '../etat/avis'
import { verifierDeconnexion } from '../sync/regles'
import { deconnexion, useSession } from '../sync/session'
import { usePretModeAvion } from '../etat/pwa'
import { LIBELLE_INSTALLATION, useInstallation } from '../composants/Installation'
import { VERSION_RELEVE } from '../version'
import { AIDES, EXEMPLES } from './exemples'

type Vue = null | 'menu' | 'domaine' | 'aide' | 'version'

/** Text of « Aide : le principe de mesure » (PRD section 3, in plain words). */
export function AidePrincipe() {
  return (
    <div className="flex flex-col gap-3 text-[17px] leading-relaxed">
      <p className="m-0">
        Trois <strong>bornes principales</strong> fixes portent chacune une cible ronde à 1,50 m du sol. Chaque cible porte une lettre peinte : A, B, C, puis D, E pour les bornes ajoutées. Dans l'outil, chaque borne est sa lettre et le nom de l'endroit, par exemple A = Borne nord-ouest.
      </p>
      <p className="m-0">
        On pose le télémètre sur une baguette de 1,50 m, n'importe où : c'est une <strong>station</strong>. On vise chaque cible et on note les deux valeurs de l'appareil : la distance en mètres et la pente en degrés, positive si la cible est plus haute, négative si elle est plus basse.
      </p>
      <p className="m-0">
        Comme un enfant qui saurait sa distance à trois arbres connus : un seul endroit du terrain est à ces trois distances à la fois. L'outil le trouve. La pente donne la différence de hauteur avec chaque borne, donc trois fois l'altitude du sol sous la station : si elles ne s'accordent pas, une lecture est fausse.
      </p>
      <p className="m-0">
        Avant tout, on mesure les trois côtés entre les bornes : c'est le <strong>calage</strong>, la règle graduée de tout le relevé.
      </p>
      <p className="m-0">
        Quand une borne ne se voit pas depuis une zone, l'outil propose une <strong>borne éphémère</strong> : un piquet avec une cible lettrée, placé à un endroit qui voit les trois bornes, mesuré comme une station, puis visé à la place de la borne cachée.
      </p>
      <p className="m-0">
        <strong>Rangement</strong> : chaque domaine foncier est un tiroir, chaque chantier un classeur du tiroir, chaque relevé une liasse du classeur. Tout est enregistré sur ce téléphone, même sans réseau.
      </p>
    </div>
  )
}

export function MenuHaut() {
  const [vue, setVue] = useState<Vue>(null)
  const naviguer = useNavigate()
  const { pathname } = useLocation()
  const pret = usePretModeAvion()
  // RELEVE-CC-11 (D33): always offered outside the installed app (browser offer or gesture sheet).
  const installation = useInstallation()
  const session = useSession()
  const fermer = () => setVue(null)
  const compte = session
    ? {
        libelle: 'Se déconnecter',
        onClick: async () => {
          fermer()
          // Refused while rows wait to be sent (section 8).
          const v = await verifierDeconnexion()
          if (!v.ok) {
            montrerAvis(v.message, 'alerte')
            return
          }
          await deconnexion()
          naviguer('/connexion')
        },
      }
    : {
        libelle: 'Se connecter',
        onClick: () => {
          fermer()
          naviguer(`/connexion?retour=${encodeURIComponent(pathname)}`)
        },
      }
  return (
    <>
      <BoutonEnTete libelle="Menu" onClick={() => setVue('menu')} />
      <FeuilleMenu
        ouvert={vue === 'menu'}
        titre="Menu"
        onFermer={fermer}
        elements={[
          {
            libelle: 'Mes terrains',
            onClick: () => {
              fermer()
              naviguer('/')
            },
          },
          { libelle: '+ Nouveau domaine foncier', onClick: () => setVue('domaine') },
          { libelle: 'Aide : le principe de mesure', onClick: () => setVue('aide') },
          { libelle: "Version de l'outil", onClick: () => setVue('version') },
          ...(installation.visible
            ? [
                {
                  libelle: LIBELLE_INSTALLATION,
                  onClick: () => {
                    fermer()
                    installation.ouvrir()
                  },
                },
              ]
            : []),
          compte,
        ]}
      />
      <FeuilleNom
        ouvert={vue === 'domaine'}
        titre="Nouveau domaine foncier"
        libelle="Nom du domaine"
        exemple={EXEMPLES.domaine} aide={AIDES.domaine}
        bouton="Créer le domaine"
        onFermer={fermer}
        onValider={async (nom) => {
          const d = await executer(() => creerDomaine(nom))
          if (d) naviguer('/')
          return d !== null
        }}
      />
      <Feuille ouvert={vue === 'aide'} titre="Le principe de mesure" onFermer={fermer}>
        <AidePrincipe />
      </Feuille>
      <Feuille ouvert={vue === 'version'} titre="Version de l'outil" onFermer={fermer}>
        <div className="flex flex-col gap-3 text-[17px]">
          <p className="m-0">
            Relevé terrain, version <strong className="rt-etroite text-[22px]">{VERSION_RELEVE}</strong>
          </p>
          <p className="m-0 flex items-center gap-2 font-semibold" role="status">
            <Point couleur={pret ? '#15803D' : '#3F3F3A'} taille={12} />
            {pret ? 'Prêt pour le mode avion' : 'Préparation du mode avion : restez connecté une minute'}
          </p>
          <p className="m-0 text-encre2">
            {session
              ? `Vos relevés sont enregistrés sur ce téléphone et partent au serveur de 1sakely.org dès qu'il y a du réseau. Compte : ${session.nomGoogle || session.email}.`
              : "Vos relevés sont enregistrés sur ce téléphone. Connectez-vous pour les retrouver sur tout téléphone."}
          </p>
          {installation.visible ? (
            <button
              type="button"
              onClick={() => {
                fermer()
                installation.ouvrir()
              }}
              className="rt-etroite flex min-h-[56px] items-center justify-center gap-2 rounded-rt border-[3px] border-encre bg-surface text-[20px] font-extrabold"
            >
              <Icone nom="installer" /> Installer sur mon téléphone
            </button>
          ) : null}
        </div>
      </Feuille>
      {installation.feuille}
    </>
  )
}
