// Layout pieces shared by every PUDi page: sector band, header, state banners, footer with
// partner logos, bottom bar, tranche badge, image with clean fallback.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { COULEURS_SECTEURS, COULEURS_TRANCHES } from '../data';
import { fr } from '../i18n/fr';
import { usePudi } from '../PudiContexte';
import { Icone, type NomIcone } from './Icones';

export function BandeSecteurs() {
  const pas = 100 / COULEURS_SECTEURS.length;
  const fond = `linear-gradient(to bottom, ${COULEURS_SECTEURS.map(
    (c, i) => `${c} ${(i * pas).toFixed(2)}% ${((i + 1) * pas).toFixed(2)}%`
  ).join(', ')})`;
  return <div className="pudi-bande" style={{ background: fond }} aria-hidden="true" />;
}

export function EnTete() {
  return (
    <header className="sticky top-0 z-30 bg-marine text-white">
      <div className="mx-auto max-w-2xl pl-4 pr-6 h-12 flex items-center">
        <Link to="/" className="font-titre text-[17px] tracking-tight min-h-[44px] flex items-center">
          {fr.app.titreCourt}
        </Link>
      </div>
    </header>
  );
}

function Bandeau({ icone, titre, texte, ton }: { icone: NomIcone; titre?: string; texte: string; ton: 'info' | 'alerte' | 'test' }) {
  const styles = {
    info: 'bg-white border-marine text-profond',
    alerte: 'bg-white border-[#B85317] text-texte',
    test: 'bg-[#FFF6E0] border-[#926407] text-texte'
  }[ton];
  return (
    <div role="status" className={`border-l-4 ${styles} rounded-r-lg px-3 py-2.5 flex gap-2.5 items-start shadow-sm`}>
      <Icone nom={icone} className="w-5 h-5 mt-0.5" />
      <div className="text-[15px] leading-snug">
        {titre && <p className="font-bold">{titre}</p>}
        <p>{texte}</p>
      </div>
    </div>
  );
}

/** Banners from pudi_etat(): preparation (D4 B), admin test mode, closed, offline. */
export function BandeauxEtat({ masquerPreparation = false }: { masquerPreparation?: boolean }) {
  const { etat, horsLigne } = usePudi();
  const items: ReactNode[] = [];
  if (horsLigne) items.push(<Bandeau key="hl" icone="horsLigne" texte={fr.etats.horsConnexion} ton="alerte" />);
  if (etat?.clos) items.push(<Bandeau key="clos" icone="cadenas" texte={fr.etats.clos} ton="alerte" />);
  else if (etat && !etat.publie) {
    if (!masquerPreparation)
      items.push(
        <Bandeau key="prep" icone="info" titre={fr.etats.preparationTitre} texte={fr.etats.preparationTexte} ton="info" />
      );
    if (etat.est_admin) items.push(<Bandeau key="test" icone="drapeau" texte={fr.etats.modeTest} ton="test" />);
  }
  if (!items.length) return null;
  return <div className="space-y-2">{items}</div>;
}

const LOGOS: { fichier: string; alt: string; l: number; h: number }[] = [
  { fichier: 'logo-republique-madagascar.webp', alt: fr.logos.republique, l: 480, h: 254 },
  { fichier: 'logo-commune-nosy-be.webp', alt: fr.logos.commune, l: 320, h: 320 },
  { fichier: 'logo-pic.webp', alt: fr.logos.pic, l: 320, h: 320 },
  { fichier: 'logo-matsf.webp', alt: fr.logos.matsf, l: 260, h: 248 },
  { fichier: 'logo-prefecture-police-nosy-be.webp', alt: fr.logos.prefecture, l: 320, h: 320 }
];

export function RangeeLogos({ titre = true }: { titre?: boolean }) {
  return (
    <div>
      {titre && <p className="text-[13px] text-gris mb-2">{fr.accueil.partenaires}</p>}
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {LOGOS.map((l) => (
          <li key={l.fichier} className="h-11 flex items-center">
            <Image
              src={`/pudi/images/${l.fichier}`}
              alt={l.alt}
              width={l.l}
              height={l.h}
              className="h-11 w-auto object-contain"
              fondSecours="transparent"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PiedDePage({ logos = true }: { logos?: boolean }) {
  return (
    <footer className="mt-10 border-t border-filet pt-5 pb-4 space-y-4">
      {logos && <RangeeLogos titre={false} />}
      <p className="text-[13px] leading-relaxed text-gris">{fr.app.pied}</p>
    </footer>
  );
}

function Onglet({ to, icone, libelle, badge, fin }: { to: string; icone: NomIcone; libelle: string; badge?: number; fin?: boolean }) {
  return (
    <NavLink
      to={to}
      end={fin}
      className={({ isActive }) =>
        `flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-[12px] ${
          isActive ? 'text-marine font-bold' : 'text-gris'
        }`
      }
    >
      <span className="relative">
        <Icone nom={icone} className="w-6 h-6" />
        {badge !== undefined && (
          <span
            className={`absolute -top-1.5 -right-3 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${
              badge === 3 ? 'bg-marine text-white' : 'bg-vide text-profond border border-filet'
            }`}
            aria-label={`${badge} sur 3`}
          >
            {badge}
          </span>
        )}
      </span>
      {libelle}
    </NavLink>
  );
}

export function BarreBas() {
  const { brouillon } = usePudi();
  return (
    <nav
      aria-label={fr.nav.principale}
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-filet pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-2xl flex pr-[6px]">
        <Onglet to="/" icone="accueil" libelle={fr.nav.accueil} fin />
        <Onglet to="/secteurs" icone="grille" libelle={fr.nav.projets} />
        <Onglet to="/choix" icone="liste" libelle={fr.nav.monChoix} badge={brouillon.priorites.length} />
        <Onglet to="/resultats" icone="graphique" libelle={fr.nav.resultats} />
      </div>
    </nav>
  );
}

export function Page({ children, titre, logosPied = true }: { children: ReactNode; titre?: string; logosPied?: boolean }) {
  return (
    <main className="pudi-page mx-auto max-w-2xl pl-4 pr-6 pt-4 pb-24">
      {titre && <h1 className="font-titre text-[24px] leading-tight text-marine mb-4">{titre}</h1>}
      {children}
      <PiedDePage logos={logosPied} />
    </main>
  );
}

export function BadgeTranche({ tranche }: { tranche: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white whitespace-nowrap"
      style={{ background: COULEURS_TRANCHES[tranche] ?? '#0B2A8C' }}
    >
      <Icone nom="calendrier" className="w-3.5 h-3.5" />
      {tranche}
    </span>
  );
}

/** Image that degrades to a coloured block (no broken image icon). */
export function Image({
  src,
  alt,
  width,
  height,
  className = '',
  fondSecours,
  prioritaire = false
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fondSecours: string;
  prioritaire?: boolean;
}) {
  const [echec, setEchec] = useState(false);
  // Deferred images (logos, sector cards) load only when they come near the screen: on 3G the
  // home page must not spend its budget on what is below the fold.
  const [visible, setVisible] = useState(prioritaire || typeof IntersectionObserver === 'undefined');
  const repere = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (visible || !repere.current) return;
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '0px' }
    );
    obs.observe(repere.current);
    return () => obs.disconnect();
  }, [visible]);
  if (echec) return <span className={`block ${className}`} style={{ background: fondSecours }} role="img" aria-label={alt} />;
  if (!visible)
    return (
      <span
        ref={repere}
        className={`block ${className}`}
        style={{ background: fondSecours, aspectRatio: `${width} / ${height}` }}
        role="img"
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      />
    );
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={prioritaire ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setEchec(true)}
      className={className}
      style={{ background: fondSecours }}
    />
  );
}

export const boutonPrincipal =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-marine text-white font-bold text-[16px] active:bg-profond disabled:bg-vide disabled:text-gris';
export const boutonSecondaire =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-white text-marine font-bold text-[16px] border-2 border-marine active:bg-vide disabled:opacity-50';

export function Chargement() {
  return <p className="text-gris py-8 text-center">{fr.app.chargement}</p>;
}

export function ErreurDonnees({ reessayer }: { reessayer: () => void }) {
  return (
    <div className="py-6 space-y-3">
      <p>{fr.app.donneesIndisponibles}</p>
      <button type="button" className={boutonSecondaire} onClick={reessayer}>
        <Icone nom="actualiser" />
        {fr.app.reessayer}
      </button>
    </div>
  );
}
