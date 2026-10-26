import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, Image, Page, RangeeLogos, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { fr } from '../i18n/fr';
import { usePudi } from '../PudiContexte';
import { abonnerInstallation, installationDisponible, lancerInstallation } from '../appels/installation';
import { clotureDepasseeOuverte, dateClotureLongue, tempsRestant, texteRestant } from '../utils/format';

// PUDI-CC-14.4: after the closing the home page becomes « Résultats et synthèse » (own chunk).
const AccueilClos = lazy(() => import('./AccueilClos'));

function CompteARebours() {
  const { clotureAt, decalage, etat } = usePudi();
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);
  const r = tempsRestant(Date.parse(clotureAt), maintenant + decalage);
  // PUDI-CC-21: date passed but the organisers left the vote open: a text replaces the countdown.
  if (clotureDepasseeOuverte(etat, r.fini))
    return (
      <p className="font-bold text-[1rem] text-[#9C3F21] flex items-center gap-1.5" data-depassee-ouvert="">
        <Icone nom="horloge" className="w-5 h-5" />
        {fr.accueil.depasseeOuvert}
      </p>
    );
  if (r.fini) return null;
  const court = texteRestant(r);
  const bloc = (valeur: number, unite: string) => (
    <div className="flex-1 bg-white border border-filet rounded-xl py-2 text-center">
      <div className="font-titre text-[1.75rem] leading-none text-marine">{valeur}</div>
      <div className="text-[0.8125rem] text-gris mt-1">{unite}</div>
    </div>
  );
  return (
    <div aria-label={fr.accueil.restant}>
      {court && (
        <p className="mb-2 font-bold text-[1rem] text-[#9C3F21] flex items-center gap-1.5" data-restant="">
          <Icone nom="horloge" className="w-5 h-5" />
          {court}
        </p>
      )}
      <p className="text-[0.8125rem] text-gris mb-1.5">{fr.accueil.restant}</p>
      <div className="flex gap-2">
        {bloc(r.jours, r.jours > 1 ? fr.accueil.jours : fr.accueil.jour)}
        {bloc(r.heures, fr.accueil.heures)}
        {bloc(r.minutes, fr.accueil.minutes)}
      </div>
    </div>
  );
}

function BoutonInstaller() {
  const dispo = useSyncExternalStore(abonnerInstallation, installationDisponible, () => false);
  if (!dispo) return null;
  return (
    <button type="button" className={`${boutonSecondaire} w-full`} onClick={() => void lancerInstallation()}>
      <Icone nom="telecharger" />
      {fr.accueil.installer}
    </button>
  );
}

export default function Accueil() {
  const { etat, clotureAt } = usePudi();
  const clos = !!etat?.clos;
  // « Comment ça marche ? » of the account menu opens and shows the help block.
  const { state } = useLocation() as { state: { aide?: number } | null };
  const [aideOuverte, setAideOuverte] = useState(false);
  const aide = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!state?.aide) return;
    setAideOuverte(true);
    const id = window.setTimeout(() => aide.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => window.clearTimeout(id);
  }, [state?.aide]);
  if (clos)
    return (
      <Suspense fallback={<Page><Chargement /></Page>}>
        <AccueilClos />
      </Suspense>
    );
  return (
    <Page logosPied={false}>
      <div className="-ml-4 -mr-6 -mt-4 mb-4 sm:mx-0 sm:mt-0 sm:rounded-xl overflow-hidden">
        <Image
          src={`/pudi/images/${clos ? 'cloture' : 'couverture'}.webp`}
          alt=""
          width={1000}
          height={clos ? 535 : 562}
          className="w-full h-auto block"
          fondSecours="#0B2A8C"
          prioritaire
        />
      </div>
      <h1 className="font-titre text-[1.625rem] leading-[1.15] text-marine">{fr.app.titre}</h1>
      <p className="mt-3 text-[1rem] leading-relaxed">{fr.accueil.invitation}</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-gris">{fr.accueil.indicative}</p>

      <div className="mt-4">
        <BandeauxEtat />
      </div>

      <div className="mt-4 bg-white border border-filet rounded-xl p-3 flex gap-3 items-start">
        <Icone nom="calendrier" className="w-5 h-5 text-marine mt-0.5" />
        <p className="text-[0.9375rem]">
          <span className="font-bold">{fr.accueil.cloture} : </span>
          {dateClotureLongue(clotureAt)}
        </p>
      </div>
      <div className="mt-3">
        <CompteARebours />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {clos ? (
          <Link to="/resultats" className={boutonPrincipal}>
            <Icone nom="graphique" />
            {fr.accueil.voirResultats}
          </Link>
        ) : (
          <>
            <Link to="/secteurs" className={boutonPrincipal}>
              <Icone nom="grille" />
              {fr.accueil.decouvrir}
            </Link>
            <Link to="/choix" className={boutonSecondaire}>
              <Icone nom="liste" />
              {fr.accueil.preparer}
            </Link>
          </>
        )}
        <Link to="/recherche" state={{ focus: true }} className={boutonSecondaire}>
          <Icone nom="recherche" />
          {fr.accueil.trouver}
        </Link>
        <BoutonInstaller />
        <Link to="/documents" className="self-center inline-flex items-center gap-1.5 min-h-[44px] px-2 text-[0.875rem] font-bold text-marine underline underline-offset-2 decoration-[#9AA3BD]">
          <Icone nom="document" className="w-4 h-4" />
          {fr.accueil.documents}
        </Link>
      </div>

      <details
        id="aide"
        ref={aide}
        open={aideOuverte}
        onToggle={(e) => setAideOuverte((e.currentTarget as HTMLDetailsElement).open)}
        className="mt-5 bg-white border border-filet rounded-xl group scroll-mt-20"
      >
        <summary className="min-h-[48px] px-3 flex items-center gap-2 cursor-pointer font-bold text-marine list-none">
          <Icone nom="info" />
          {fr.accueil.aideTitre}
          <Icone nom="bas" className="w-5 h-5 ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <ol className="px-4 pb-4 space-y-2.5">
          {fr.accueil.aideEtapes.map((e, i) => (
            <li key={i} className="flex gap-3 text-[0.9375rem]">
              <span className="font-titre text-marine text-[1.125rem] leading-none mt-0.5">{i + 1}</span>
              <span>{e}</span>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-6">
        <RangeeLogos />
      </div>
    </Page>
  );
}
