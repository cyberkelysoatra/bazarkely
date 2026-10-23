// PUDI-CC-14.4: home page once the consultation is closed: « Résultats et synthèse » (summary of the
// results, synthesis PDF, links to the full results and the PUDi documents). Own lazy chunk: the
// open-consultation home never downloads it.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, Image, Page, RangeeLogos, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { fr } from '../i18n/fr';
import { usePudi, useDonnees } from '../PudiContexte';
import { lireResultats, type Resultats } from '../appels/api';
import { propositionsConnues } from '../appels/propositions';
import { preparerSynthese, type Synthese } from '../utils/synthese';
import { nomFichierSynthesePdf, telechargerFichier } from '../utils/exports';
import { dateClotureLongue } from '../utils/format';

export default function AccueilClos() {
  const { clotureAt } = usePudi();
  const { donnees } = useDonnees();
  const [res, setRes] = useState<Resultats | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pdf, setPdf] = useState<'cours' | 'erreur' | null>(null);
  useEffect(() => {
    lireResultats().then(setRes, () => setErreur(true));
  }, []);
  const synthese: Synthese | null = res && donnees ? preparerSynthese(res, donnees, { provisoire: false, propositions: propositionsConnues() ?? [] }) : null;
  const telecharger = async () => {
    if (!synthese) return;
    setPdf('cours');
    try {
      const { genererPdf } = await import('../appels/pdf');
      telechargerFichier(await genererPdf(synthese), nomFichierSynthesePdf(), 'application/pdf');
      setPdf(null);
    } catch {
      setPdf('erreur');
    }
  };
  return (
    <Page logosPied={false}>
      <div className="-ml-4 -mr-6 -mt-4 mb-4 sm:mx-0 sm:mt-0 sm:rounded-xl overflow-hidden">
        <Image src="/pudi/images/cloture.webp" alt="" width={1000} height={535} className="w-full h-auto block" fondSecours="#0B2A8C" prioritaire />
      </div>
      <h1 className="font-titre text-[1.625rem] leading-[1.15] text-marine" data-accueil-clos="">
        Résultats et synthèse
      </h1>
      <p className="mt-2 text-[1rem] leading-relaxed">
        La consultation sur les priorités du PUDi de Nosy Be 2026-2040 est close depuis le {dateClotureLongue(clotureAt)}. Merci à toutes les personnes qui ont donné leur avis.
      </p>
      <div className="mt-4">
        <BandeauxEtat />
      </div>
      <section className="mt-4 bg-white border border-filet rounded-xl p-3" data-resume-resultats="">
        {erreur ? (
          <p className="text-[0.9375rem] text-gris">{fr.app.donneesIndisponibles}</p>
        ) : !synthese ? (
          <Chargement />
        ) : (
          <>
            <p className="text-[0.9375rem]">
              <span className="font-titre text-[1.5rem] text-marine">{synthese.nbVotants}</span> votes comptés
            </p>
            <h2 className="mt-3 font-bold text-[1.0625rem] text-marine">Les priorités les plus choisies</h2>
            <ol className="mt-2 space-y-1.5">
              {synthese.priorites.slice(0, 5).map((l) => (
                <li key={l.id} className="flex gap-2 text-[0.9375rem]">
                  <span className="font-titre text-marine w-5 shrink-0">{l.rang}</span>
                  <span className="flex-1 min-w-0">{l.nom}</span>
                  <span className="font-bold shrink-0">{l.pct}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
      <div className="mt-5 flex flex-col gap-3">
        <button type="button" className={boutonPrincipal} disabled={!synthese || pdf === 'cours'} onClick={() => void telecharger()} data-telecharger-synthese="">
          <Icone nom="telecharger" />
          {pdf === 'cours' ? 'Préparation du PDF…' : 'Télécharger la synthèse PDF'}
        </button>
        {pdf === 'erreur' && <p role="alert" className="text-[0.875rem] font-bold text-[#9C3F21]">Le PDF n’a pas pu être préparé. Réessayez.</p>}
        <Link to="/resultats" className={boutonSecondaire}>
          <Icone nom="graphique" />
          Voir tous les résultats
        </Link>
        <Link to="/documents" className={boutonSecondaire}>
          <Icone nom="document" />
          Documents du PUDi
        </Link>
        <Link to="/discussion" className="self-center inline-flex items-center gap-1.5 min-h-[44px] px-2 text-[0.875rem] font-bold text-marine underline underline-offset-2">
          <Icone nom="discussion" className="w-4 h-4" />
          La discussion reste ouverte
        </Link>
      </div>
      <div className="mt-6">
        <RangeeLogos />
      </div>
    </Page>
  );
}
