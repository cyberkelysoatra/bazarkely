// Screen 3: menu ⋯ of a domain or of a work site (MenuTerrain.dc.html), as a bottom sheet.
// Domain (owner only): « + Nouveau chantier », « Partager ce domaine », « Qui a accès », « Renommer le
// domaine », « Supprimer le domaine ».
// Work site: owner « Partager ce chantier », « Qui a accès », « Ouvrir une sauvegarde ici » (when provided),
// « Renommer le chantier », « Supprimer le chantier »; invited « relever » only « Ouvrir une sauvegarde
// ici »; invited « consulter » nothing (6.8, see elementsChantier).
// Deleting a domain or a work site that holds relevés: confirmation that says how many relevés go with
// it, with « Exporter leurs sauvegardes d'abord » (when provided).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Confirmation, FeuilleMenu, type ElementMenu } from '../composants/Feuilles'
import { FeuilleNom } from '../composants/Formulaires'
import * as depot from '../db/depot'
import { idsReleves } from '../db/lecture'
import type { Chantier, Domaine, Droit } from '../db/types'
import { executer, montrerAvis } from '../etat/avis'
import { cheminChantier, pluriel } from '../etat/navigation'
import { refusSuppression } from '../sync/regles'
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

/** Items of the ⋯ of a work site for the account's right (6.8). Empty: no ⋯ at all. */
export function itemsChantier(droit: Droit): ('partager' | 'acces' | 'sauvegarde' | 'renommer' | 'supprimer')[] {
  if (droit === 'proprietaire') return ['partager', 'acces', ...(ouvrirSauvegarde ? (['sauvegarde'] as const) : []), 'renommer', 'supprimer']
  if (droit === 'relever') return ouvrirSauvegarde ? ['sauvegarde'] : []
  return []
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

  // Never a domain or a work site holding a relevé held by another phone (6.8, section 8).
  const demanderSuppression = async () => {
    const refus = await refusSuppression(estDomaine ? { domaineId: cible.domaine.id } : { chantierId: cible.chantier.id })
    if (refus) {
      montrerAvis(refus, 'alerte')
      onFermer()
    } else setVue('supprimer')
  }

  const droitChantier = estDomaine ? 'proprietaire' : depot.droitLocal(cible.chantier, null)
  const vers = (chemin: string) => () => {
    onFermer()
    naviguer(chemin)
  }
  const elements: ElementMenu[] = estDomaine
    ? [
        { libelle: '+ Nouveau chantier', onClick: () => setVue('nouveau_chantier') },
        { libelle: 'Partager ce domaine', onClick: vers(`/d/${cible.domaine.id}/partager`) },
        { libelle: 'Qui a accès', onClick: vers(`/d/${cible.domaine.id}/acces`) },
        { libelle: 'Renommer le domaine', onClick: () => setVue('renommer') },
        { libelle: 'Supprimer le domaine', onClick: () => void demanderSuppression(), danger: true },
      ]
    : itemsChantier(droitChantier).map((item): ElementMenu => {
        const c = cible.chantier
        switch (item) {
          case 'partager':
            return { libelle: 'Partager ce chantier', onClick: vers(`/d/${c.domaine_id}/partager?chantier=${c.id}`) }
          case 'acces':
            return { libelle: 'Qui a accès', onClick: vers(`/d/${c.domaine_id}/acces`) }
          case 'sauvegarde':
            return {
              libelle: 'Ouvrir une sauvegarde ici',
              onClick: () => {
                onFermer()
                void executer(async () => ouvrirSauvegarde?.(c.id))
              },
            }
          case 'renommer':
            return { libelle: 'Renommer le chantier', onClick: () => setVue('renommer') }
          case 'supprimer':
            return { libelle: 'Supprimer le chantier', onClick: () => void demanderSuppression(), danger: true }
        }
      })

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
