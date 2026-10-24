import { Link, useLocation } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { frPages } from '../i18n/frPages';
import { BoutonsPartage } from '../composants/Partager';
import { IndicateurEtapes } from '../composants/Etapes';

export default function Merci() {
  const etatNav = useLocation().state as { test?: boolean; apercu?: boolean } | null;
  const test = !!etatNav?.test;
  // PUDI-CC-11: end of the « Votant » preview, nothing was sent.
  const apercu = !!etatNav?.apercu;
  return (
    <Page>
      <IndicateurEtapes courante={apercu ? 3 : null} faites={[1, 2, 3]} />
      <div className="text-center pt-6">
        <span className="inline-flex w-16 h-16 rounded-full bg-marine text-white items-center justify-center">
          <Icone nom="coche" className="w-9 h-9" />
        </span>
        <h1 className="font-titre text-[1.5rem] leading-tight text-marine mt-4">{frPages.merci.titre}</h1>
        {test && <p className="mt-3 text-[0.9375rem] bg-[#FFF6E0] border-l-4 border-[#926407] rounded-r-lg px-3 py-2 text-left">{frPages.merci.test}</p>}
        {apercu && (
          <p className="mt-3 text-[0.9375rem] bg-[#FFF6E0] border-l-4 border-[#926407] rounded-r-lg px-3 py-2 text-left" data-merci-apercu="">
            Aperçu : rien n'a été enregistré, aucun vote n'a été envoyé.
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Link to="/resultats" className={boutonPrincipal}>
          <Icone nom="graphique" />
          {frPages.merci.voirResultats}
        </Link>
        <Link to="/envoyer" className={boutonSecondaire}>
          <Icone nom="crayon" />
          {frPages.merci.modifier}
        </Link>
      </div>
      {!apercu && (
        <div className="mt-6">
          <BoutonsPartage />
        </div>
      )}
    </Page>
  );
}
