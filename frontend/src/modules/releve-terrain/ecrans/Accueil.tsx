// Screen 2: home (Main.dc.html, look of MODELE B B-Accueil). Block « Reprendre » (last relevé opened on
// this phone), « Mes terrains » (domains, their work sites with the number of relevés, a ⋯ per domain and
// per work site), empty state, then « Partagés avec moi » (phase 4: owner, domain, work sites with their
// right; address /#partages scrolls to it after an accepted invitation).
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bandeau } from '../composants/Bandeau'
import { Bouton } from '../composants/Bouton'
import { EnTete } from '../composants/EnTete'
import { Aide } from '../composants/Feuilles'
import { FeuilleNom } from '../composants/Formulaires'
import { Icone } from '../composants/Icones'
import { PastilleDroit } from '../composants/Pastilles'
import { creerDomaine } from '../db/depot'
import { dernierReleve, listePartages, listeTerrains, type DomaineListe, type DomainePartage } from '../db/lecture'
import { executer } from '../etat/avis'
import { lancerInstallation, useInstallationDisponible } from '../etat/pwa'
import { useBandeauTelephone } from '../etat/useEnvoi'
import { cheminChantier, cheminEtape, heureMadagascar, pluriel } from '../etat/navigation'
import { calculerMesure } from '../etat/useReleve'
import { useRequete } from '../etat/useRequete'
import { REGLAGES_DEFAUT } from '../calcul'
import { MenuHaut } from './MenuHaut'
import { itemsChantier, MenuTerrain, type CibleMenu } from './MenuTerrain'

function BoutonPoints({ libelle, onClick }: { libelle: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={libelle} onClick={onClick} className="flex h-12 w-12 flex-none items-center justify-center rounded-rt border-[3px] border-encre bg-transparent">
      <Icone nom="points" taille={22} />
    </button>
  )
}

function Reprendre() {
  const dernier = useRequete('dernier_releve', dernierReleve)
  const resume = useMemo(() => {
    if (!dernier) return null
    const c = calculerMesure(dernier.releve.entete, dernier.objets, REGLAGES_DEFAUT)
    const derniere = [...c.stations].sort((a, b) => a.donnees.heure.localeCompare(b.donnees.heure)).pop() ?? null
    const action = c.etape === 3 ? `saisir ${c.prochainNumero}` : c.etape === 2 ? 'calage' : 'bornes'
    return { c, derniere, action }
  }, [dernier])
  if (!dernier || !resume) return null
  const { c, derniere, action } = resume
  return (
    <Link
      to={cheminEtape(dernier.releve.id, c.etape)}
      aria-label={`Reprendre ${dernier.releve.nom} : ${action}`}
      className="flex flex-col rounded-rt border-[3px] border-encre bg-surface text-encre no-underline"
    >
      <div className="flex flex-col gap-0.5 border-b-[3px] border-encre px-3.5 py-3">
        <span className="text-[14px] font-semibold text-encre2">Reprendre</span>
        <span className="rt-etroite text-[28px] font-extrabold leading-none">{dernier.releve.nom}</span>
        <span className="text-[14px] font-medium text-encre2">{[dernier.chantier?.nom, dernier.domaine?.nom].filter(Boolean).join(', ')}</span>
      </div>
      <div className="grid grid-cols-3 border-b-[3px] border-encre">
        <div className="px-2.5 py-2">
          <div className="text-[13px] font-semibold text-encre2">Stations</div>
          <div className="rt-etroite text-[30px] font-bold leading-[1.05]">{c.stations.length}</div>
        </div>
        <div className="border-l-2 border-encre px-2.5 py-2">
          <div className="truncate text-[13px] font-semibold text-encre2">{derniere ? `Dernière ${derniere.numero}` : 'Dernière'}</div>
          <div className="rt-etroite text-[30px] font-bold leading-[1.05]">{derniere ? heureMadagascar(derniere.donnees.heure) : 'aucune'}</div>
        </div>
        <div className="border-l-2 border-encre px-2.5 py-2">
          <div className="text-[13px] font-semibold text-encre2">Étape</div>
          <div className="rt-etroite text-[30px] font-bold leading-[1.05]">{c.etape} / 4</div>
        </div>
      </div>
      <div className="rt-etroite flex min-h-[60px] items-center justify-center bg-jaune px-3 text-center text-[24px] font-extrabold">Reprendre : {action}</div>
    </Link>
  )
}

function Domaine({ d, onMenu }: { d: DomaineListe; onMenu: (c: CibleMenu) => void }) {
  return (
    <section aria-labelledby={`dom-${d.domaine.id}`} className="flex flex-col gap-2">
      <div className="mt-1.5 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={`dom-${d.domaine.id}`} className="rt-etroite m-0 truncate text-[24px] font-extrabold">
            {d.domaine.nom}
          </h2>
          <p className="m-0 text-[14px] text-encre2">Sur ce téléphone, {pluriel(d.chantiers.length, 'chantier', 'chantiers', 'aucun chantier')}</p>
        </div>
        <BoutonPoints libelle={`Plus d’actions sur ${d.domaine.nom}`} onClick={() => onMenu({ type: 'domaine', domaine: d.domaine, releves: d.releves })} />
      </div>
      {d.chantiers.map(({ chantier, releves }) => (
        <div key={chantier.id} className="flex items-stretch gap-2">
          <Link to={cheminChantier(chantier.id)} className="flex min-h-[64px] min-w-0 flex-1 items-center gap-2.5 rounded-rt border-2 border-encre bg-surface px-3 text-encre no-underline">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="rt-etroite truncate text-[22px] font-bold leading-tight">{chantier.nom}</span>
              <span className="text-[14px] text-encre2">{pluriel(releves, 'relevé', 'relevés', 'aucun relevé')}</span>
            </span>
            <Icone nom="chevron" taille={22} />
          </Link>
          <BoutonPoints libelle={`Plus d’actions sur ${chantier.nom}`} onClick={() => onMenu({ type: 'chantier', chantier, releves })} />
        </div>
      ))}
      {d.chantiers.length === 0 ? (
        <Bouton variante="secondaire" grand={false} onClick={() => onMenu({ type: 'domaine', domaine: d.domaine, releves: 0, depart: 'nouveau_chantier' })}>
          + Nouveau chantier
        </Bouton>
      ) : null}
    </section>
  )
}

function DomainePartage({ d, onMenu }: { d: DomainePartage; onMenu: (c: CibleMenu) => void }) {
  const proprietaire = d.domaine.proprietaire_nom || 'compte'
  return (
    <section aria-labelledby={`part-${d.domaine.id}`} data-partage-domaine className="flex flex-col gap-2 rounded-rt border-[3px] border-encre bg-surface p-3">
      <div className="flex flex-col">
        <h3 id={`part-${d.domaine.id}`} className="rt-etroite m-0 truncate text-[24px] font-extrabold leading-tight">
          {d.domaine.nom}
        </h3>
        <p className="m-0 text-[14px] text-encre2">
          Propriétaire : {proprietaire}
          {d.domaine.partage_entier ? ', tout le domaine' : ''}
        </p>
      </div>
      {d.chantiers.length === 0 ? <p className="m-0 text-[15px] text-encre2">Aucun chantier pour le moment.</p> : null}
      {d.chantiers.map(({ chantier, releves, droit }) => (
        <div key={chantier.id} className="flex items-stretch gap-2">
          <Link to={cheminChantier(chantier.id)} className="flex min-h-[64px] min-w-0 flex-1 items-center gap-2.5 rounded-rt border-2 border-encre bg-surface px-3 py-2 text-encre no-underline">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="rt-etroite truncate text-[22px] font-bold leading-tight">{chantier.nom}</span>
              <span className="flex flex-wrap items-center gap-2 text-[14px] text-encre2">
                {pluriel(releves, 'relevé', 'relevés', 'aucun relevé')}
                <PastilleDroit droit={droit} petite />
              </span>
            </span>
            <Icone nom="chevron" taille={22} />
          </Link>
          {itemsChantier(droit).length > 0 ? <BoutonPoints libelle={`Plus d’actions sur ${chantier.nom}`} onClick={() => onMenu({ type: 'chantier', chantier, releves })} /> : null}
        </div>
      ))}
    </section>
  )
}

function PartagesAvecMoi({ onMenu }: { onMenu: (c: CibleMenu) => void }) {
  const partages = useRequete('partages', listePartages)
  const { hash } = useLocation()
  const pret = partages !== undefined
  useEffect(() => {
    if (pret && hash === '#partages') document.getElementById('partages')?.scrollIntoView({ block: 'start' })
  }, [pret, hash])
  if (!partages || partages.length === 0) return null
  return (
    <section id="partages" aria-labelledby="titre-partages" className="mt-2 flex scroll-mt-20 flex-col gap-2.5">
      <h2 id="titre-partages" className="rt-etroite m-0 text-[28px] font-extrabold">
        Partagés avec moi
      </h2>
      {partages.map((d) => (
        <DomainePartage key={d.domaine.id} d={d} onMenu={onMenu} />
      ))}
    </section>
  )
}

export default function Accueil() {
  const terrains = useRequete('terrains', listeTerrains)
  const [menu, setMenu] = useState<CibleMenu | null>(null)
  const [nouveauDomaine, setNouveauDomaine] = useState(false)
  const installable = useInstallationDisponible()
  const envoi = useBandeauTelephone()

  return (
    <div className="rt-ecran">
      <EnTete titre="Relevé terrain" sousTitre="Mes terrains" droite={<MenuHaut />} />
      <Bandeau {...envoi} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-6 pt-3.5">
        <Reprendre />
        {terrains === undefined ? null : terrains.length === 0 ? (
          <div className="mt-6 flex flex-col items-stretch gap-4 rounded-rt border-[3px] border-encre bg-surface p-4">
            <p className="rt-etroite m-0 text-[30px] font-extrabold leading-tight">Commencez par créer votre domaine foncier</p>
            <p className="m-0 text-[17px] text-encre2">Un domaine foncier range vos chantiers, et chaque chantier ses relevés. Tout reste sur ce téléphone, même sans réseau.</p>
            <Bouton onClick={() => setNouveauDomaine(true)}>+ Nouveau domaine foncier</Bouton>
          </div>
        ) : (
          <>
            {terrains.map((d) => (
              <Domaine key={d.domaine.id} d={d} onMenu={(c) => setMenu(c)} />
            ))}
            <div className="mt-2">
              <Aide titre="Ranger mes terrains">
                <p className="m-0">Chaque domaine foncier est un tiroir, chaque chantier un classeur du tiroir, chaque relevé une liasse du classeur.</p>
                <p className="m-0 mt-2">Nouveau domaine : menu du haut. Nouveau chantier, partage, accès, sauvegarde : bouton ⋯ du domaine ou du chantier.</p>
              </Aide>
            </div>
          </>
        )}
        <PartagesAvecMoi onMenu={(c) => setMenu(c)} />
        {installable ? (
          <Bouton variante="secondaire" grand={false} onClick={() => void lancerInstallation()} icone={<Icone nom="installer" />}>
            Installer sur mon téléphone
          </Bouton>
        ) : null}
      </main>
      {menu ? <MenuTerrain key={menu.type === 'domaine' ? menu.domaine.id : menu.chantier.id} cible={menu} onFermer={() => setMenu(null)} /> : null}
      <FeuilleNom
        ouvert={nouveauDomaine}
        titre="Nouveau domaine foncier"
        libelle="Nom du domaine"
        bouton="Créer le domaine"
        onFermer={() => setNouveauDomaine(false)}
        onValider={async (nom) => (await executer(() => creerDomaine(nom))) !== null}
      />
    </div>
  )
}
