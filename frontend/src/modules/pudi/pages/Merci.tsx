import { Link, useLocation } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { fr } from '../i18n/fr';

export default function Merci() {
  const test = !!(useLocation().state as { test?: boolean } | null)?.test;
  return (
    <Page>
      <div className="text-center pt-6">
        <span className="inline-flex w-16 h-16 rounded-full bg-marine text-white items-center justify-center">
          <Icone nom="coche" className="w-9 h-9" />
        </span>
        <h1 className="font-titre text-[24px] leading-tight text-marine mt-4">{fr.merci.titre}</h1>
        {test && <p className="mt-3 text-[15px] bg-[#FFF6E0] border-l-4 border-[#926407] rounded-r-lg px-3 py-2 text-left">{fr.merci.test}</p>}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Link to="/resultats" className={boutonPrincipal}>
          <Icone nom="graphique" />
          {fr.merci.voirResultats}
        </Link>
        <Link to="/envoyer" className={boutonSecondaire}>
          <Icone nom="crayon" />
          {fr.merci.modifier}
        </Link>
      </div>
    </Page>
  );
}
