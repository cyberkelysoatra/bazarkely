// Screen 3: menu ⋯ of a domain or of a work site (MenuTerrain.dc.html), as a bottom sheet.
// Domain: « + Nouveau chantier », « Renommer le domaine », « Supprimer le domaine ».
// Work site: « Renommer le chantier », « Supprimer le chantier », « Ouvrir une sauvegarde ici » (when provided).
// Deleting a domain or a work site that holds relevés: confirmation that says how many relevés go with
// it, with « Exporter leurs sauvegardes d'abord » (when provided).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Confirmation, FeuilleMenu, type ElementMenu } from '../composants/Feuilles'
import { FeuilleNom } from '../composants/Formulaires'
import * as depot from '../db/depot'
import { idsReleves } from '../db/lecture'
import type { Chantier, Domaine } from '../db/types'
import { executer, montrerAvis } from '../etat/avis'
import { cheminChantier, pluriel } from '../etat/navigation'
import { exporterSauvegarde, ouvrirSauvegarde } from './registre'

export type CibleMenu = ({ type: 'domaine'; domaine: Domaine; releves: number } | { type: 'chantier'; chantier: Chantier; releves: number }) & {
  /** Opens directly the « Nouveau chantier » sheet of a domain. */
  depart?: 'nouveau_chantier'
}

type Vue = 'menu' | 'nouveau_chantier' | 'renommer' | 'supprimer'

function texteSuppression(nb: number, quoi: 'domaine' | 'chantier'): string {
  if (nb === 0) return quoi === 'domaine' ? 'Ce domaine ne contient aucun relevé.' : 'Ce chantier ne contient aucun relevé.'
  return `${pluriel(nb, 'relevé sera supprimé', 'relevés seront supprimés')} avec lui, sur ce téléphone. Cette action est définitive.`
}

export async function exporterTout(ids: string[]): Promise<void> {
  if (!exporterSauvegarde) return
  for (const id of ids) await exporterSauvegarde(id)
}

export function MenuTerrain({ cible, onFermer }: { cible: CibleMenu; onFermer: () => void }) {
  const [vue, setVue] = useState<Vue>(cible.depart ?? 'menu')
  const naviguer = useNavigate()
  const estDomaine = cible.type === 'domaine'
  const nom = estDomaine ? cible.domaine.nom : cible.chantier.nom

  const elements: ElementMenu[] = estDomaine
    ? [
        { libelle: '+ Nouveau chantier', onClick: () => setVue('nouveau_chantier') },
        { libelle: 'Renommer le domaine', onClick: () => setVue('renommer') },
        { libelle: 'Supprimer le domaine', onClick: () => setVue('supprimer'), danger: true },
      ]
    : [
        { libelle: 'Renommer le chantier', onClick: () => setVue('renommer') },
        ...(ouvrirSauvegarde
          ? [
              {
                libelle: 'Ouvrir une sauvegarde ici',
                onClick: () => {
                  onFermer()
                  void executer(async () => ouvrirSauvegarde?.(cible.chantier.id))
                },
              },
            ]
          : []),
        { libelle: 'Supprimer le chantier', onClick: () => setVue('supprimer'), danger: true },
      ]

  const supprimer = async () => {
    const ok = await executer(() => (estDomaine ? depot.supprimerDomaine(cible.domaine.id) : depot.supprimerChantier(cible.chantier.id)).then(() => true))
    if (ok) {
      montrerAvis(estDomaine ? `Domaine « ${nom} » supprimé.` : `Chantier « ${nom} » supprimé.`)
      onFermer()
      if (!estDomaine) naviguer('/')
    }
  }

  return (
    <>
      <FeuilleMenu ouvert={vue === 'menu'} titre={nom} onFermer={onFermer} elements={elements} />
      <FeuilleNom
        ouvert={vue === 'nouveau_chantier'}
        titre="Nouveau chantier"
        libelle="Nom du chantier"
        bouton="Créer le chantier"
        onFermer={onFermer}
        onValider={async (n) => {
          if (!estDomaine) return false
          const c = await executer(() => depot.creerChantier(cible.domaine.id, n))
          if (c) naviguer(cheminChantier(c.id))
          return c !== null
        }}
      />
      <FeuilleNom
        ouvert={vue === 'renommer'}
        titre={estDomaine ? 'Renommer le domaine' : 'Renommer le chantier'}
        libelle={estDomaine ? 'Nom du domaine' : 'Nom du chantier'}
        valeurInitiale={nom}
        bouton="Enregistrer"
        onFermer={onFermer}
        onValider={async (n) => {
          const ok = await executer(() => (estDomaine ? depot.renommerDomaine(cible.domaine.id, n) : depot.renommerChantier(cible.chantier.id, n)).then(() => true))
          return ok === true
        }}
      />
      <Confirmation
        ouvert={vue === 'supprimer'}
        titre={estDomaine ? `Supprimer le domaine « ${nom} » ?` : `Supprimer le chantier « ${nom} » ?`}
        texte={
          <>
            <p className="m-0">{texteSuppression(cible.releves, estDomaine ? 'domaine' : 'chantier')}</p>
            {estDomaine ? <p className="m-0 mt-2 text-encre2">Ses chantiers sont supprimés avec lui.</p> : null}
          </>
        }
        onAnnuler={onFermer}
        autre={
          exporterSauvegarde && cible.releves > 0
            ? {
                libelle: "Exporter leurs sauvegardes d'abord",
                onClick: () => {
                  void executer(async () => exporterTout(await idsReleves(estDomaine ? { domaineId: cible.domaine.id } : { chantierId: cible.chantier.id })))
                },
              }
            : undefined
        }
        confirmer={{ libelle: estDomaine ? 'Supprimer le domaine' : 'Supprimer le chantier', onClick: () => void supprimer() }}
      />
    </>
  )
}
