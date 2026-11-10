// Page shell: header, back bar, example banner, content, bottom nav (Projets, Sommaire, Chiffres, Exporter).
import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { Plan } from '../types';
import { EnTete } from './EnTete';
import { Icone, type NomIcone } from './Icones';
import { dupliquerPlan } from '../db/plans';

export function BandeauExemple({ plan }: { plan: Plan }) {
  const naviguer = useNavigate();
  const lieu = useLocation();
  const [enCours, setEnCours] = useState(false);
  const copier = async () => {
    setEnCours(true);
    try {
      const copie = await dupliquerPlan(plan, "JUS'NOSY (ma copie)");
      // Same screen, on the copy.
      naviguer(lieu.pathname.replace(`/p/${plan.id}`, `/p/${copie.id}`));
    } finally {
      setEnCours(false);
    }
  };
  return (
    <div className="bp-exemple mx-4 mt-3 rounded-xl bg-violetClair border border-violet/20 px-3.5 py-3">
      <p className="text-[15px] font-bold text-violet leading-snug">Exemple : projet fictif du cahier, en lecture seule</p>
      <button
        type="button"
        onClick={copier}
        disabled={enCours}
        className="mt-2 min-h-[44px] w-full rounded-xl bg-violet text-white font-bold px-4 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Icone nom="copier" /> Copier l'exemple pour m'entraîner
      </button>
    </div>
  );
}

function ElementNav({ vers, icone, texte, fin = false }: { vers: string; icone: NomIcone; texte: string; fin?: boolean }) {
  return (
    <NavLink
      to={vers}
      end={fin}
      className={({ isActive }) =>
        `flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-[12px] font-bold ${isActive ? 'text-violet' : 'text-doux'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`w-12 h-7 rounded-full flex items-center justify-center ${isActive ? 'bg-violetClair' : ''}`}>
            <Icone nom={icone} />
          </span>
          {texte}
        </>
      )}
    </NavLink>
  );
}

export function NavBas({ plan }: { plan: Plan }) {
  return (
    <nav className="bp-nav fixed bottom-0 left-1/2 -translate-x-1/2 z-20 w-full max-w-[480px] bg-white border-t border-filet flex" aria-label="Navigation du projet">
      <ElementNav vers="/" icone="projets" texte="Projets" fin />
      <ElementNav vers={`/p/${plan.id}`} icone="sommaire" texte="Sommaire" fin />
      <ElementNav vers={`/p/${plan.id}/m5`} icone="chiffres" texte="Chiffres" />
      <ElementNav vers={`/p/${plan.id}/exporter`} icone="partager" texte="Exporter" />
    </nav>
  );
}

export function Mise({
  titre,
  sousTitre,
  retour,
  plan,
  children,
  droite,
  surTitre
}: {
  surTitre?: string | null;
  titre: ReactNode;
  sousTitre?: ReactNode;
  retour?: { vers: string; texte: string };
  plan?: Plan;
  children: ReactNode;
  droite?: ReactNode;
}) {
  return (
    <div className={`bp-ecran ${plan ? 'bp-avec-nav' : ''}`}>
      <EnTete titre={titre} sousTitre={sousTitre} droite={droite} surTitre={surTitre} />
      {retour ? (
        <div className="px-2 pt-1">
          <Link to={retour.vers} className="inline-flex min-h-[44px] items-center gap-1 px-2 text-[15px] font-bold text-violet">
            <Icone nom="retour" /> {retour.texte}
          </Link>
        </div>
      ) : null}
      {plan?.exemple ? <BandeauExemple plan={plan} /> : null}
      <main className="flex-1 px-4 pt-3 pb-6">{children}</main>
      {plan ? <NavBas plan={plan} /> : null}
    </div>
  );
}
