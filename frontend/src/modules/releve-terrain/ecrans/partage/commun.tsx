// Shared pieces of screens 16 and 17 (owner only): the guard « Réservé au propriétaire du domaine. »
// for a direct address, the screen frame and the network context of the page engine.
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { EnTete } from '../../composants/EnTete'
import { db } from '../../db/base'
import type { Chantier, Domaine } from '../../db/types'
import { useRequete } from '../../etat/useRequete'
import { contextePage } from '../../sync/moteur'
import { MESSAGE_RESERVE_PROPRIETAIRE } from '../../sync/partage'
import type { Rpc } from '../../sync/rpc'
import { MenuHaut } from '../MenuHaut'

export interface DomaineProprio {
  domaine: Domaine
  chantiers: Chantier[]
}

/** The domain with its live work sites, only when the account owns it; null otherwise (guard). */
export async function lireDomaineProprio(domaineId: string): Promise<DomaineProprio | null> {
  const domaine = await db.domaines.get(domaineId)
  if (!domaine || domaine.supprime_at || domaine.a_moi === false) return null
  const chantiers = (await db.chantiers.where('domaine_id').equals(domaineId).toArray())
    .filter((c) => !c.supprime_at && (c.droit === undefined || c.droit === 'proprietaire'))
    .sort((a, b) => a.cree_at.localeCompare(b.cree_at))
  return { domaine, chantiers }
}

export function useDomaineProprio(domaineId: string): DomaineProprio | null | undefined {
  return useRequete(`proprio:${domaineId}`, () => lireDomaineProprio(domaineId))
}

/** Adapter of the signed-in account (null without network or session). */
export async function rpcCompte(): Promise<Rpc | null> {
  const ctx = await contextePage().catch(() => null)
  return ctx ? ctx.rpc : null
}

export function CadrePartage({ sousTitre, children }: { sousTitre: string | null; children: ReactNode }) {
  return (
    <div className="rt-ecran">
      <EnTete titre="Relevé terrain" sousTitre={sousTitre} droite={<MenuHaut />} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-6 pt-3.5">{children}</main>
    </div>
  )
}

/** A direct address to screen 16 or 17 by an invited account, or an unknown domain. */
export function ReserveProprietaire() {
  const naviguer = useNavigate()
  return (
    <CadrePartage sousTitre={null}>
      <p role="alert" className="m-0 rounded-rt border-[3px] border-encre bg-surface p-3.5 text-[18px] font-semibold">
        {MESSAGE_RESERVE_PROPRIETAIRE}
      </p>
      <Bouton onClick={() => naviguer('/')}>Mes terrains</Bouton>
    </CadrePartage>
  )
}

export function TitreEcran({ children }: { children: ReactNode }) {
  return <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-tight">{children}</h2>
}
