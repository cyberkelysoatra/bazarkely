// « Trouver un projet »: search on the device among the 52 programmes and the proposals
// (works offline once visited). The index is built when this page opens.
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { Chargement, ErreurDonnees, Page } from '../composants/Mise';
import { secteurParId } from '../data';
import { fr } from '../i18n/fr';
import { usePudi, useDonnees } from '../PudiContexte';
import { CarteChoix } from '../composants/CarteChoix';
import { usePropositions } from '../appels/propositions';
import { MAX_RESULTATS, construireIndex, rechercher, type Explication, type ResultatRecherche } from '../utils/recherche';
import { BadgeProposition } from './Propositions';
import type { PudiDonnees } from '../data/types';

function Surligne({ texte, surlignes }: { texte: string; surlignes: [number, number][] }) {
  const morceaux: ReactNode[] = [];
  let pos = 0;
  surlignes.forEach(([a, b], i) => {
    if (a < pos) return;
    if (a > pos) morceaux.push(texte.slice(pos, a));
    morceaux.push(<strong key={i} className="text-texte">{texte.slice(a, b)}</strong>);
    pos = b;
  });
  if (pos < texte.length) morceaux.push(texte.slice(pos));
  return <>{morceaux}</>;
}

function Pourquoi({ e }: { e: Explication }) {
  if (e.champ === 'synonyme')
    return (
      <>
        en lien avec « <strong className="text-texte">{e.texte}</strong> »
      </>
    );
  return (
    <>
      {fr.recherche.champs[e.champ]} : <Surligne texte={e.texte} surlignes={e.surlignes} />
      {e.fokontany && ` (${fr.recherche.champs.fokontany(e.fokontany)})`}
    </>
  );
}

function Ligne({ r, donnees, clos }: { r: ResultatRecherche; donnees: PudiDonnees; clos: boolean }) {
  const s = r.secteur ? secteurParId(donnees, r.secteur) : undefined;
  const lien = r.type === 'programme' ? `/programme/${r.id}` : `/proposition/${r.id}`;
  return (
    <CarteChoix
      id={r.id}
      titre={r.nom}
      details={lien}
      desactive={clos}
      className={`border-l-[6px] ${r.type === 'programme' ? 'bg-white border border-filet' : 'bg-sable border-2 border-dashed border-marine/60'}`}
      style={s ? { borderLeftColor: s.couleur } : undefined}
    >
        <div className="flex flex-wrap items-center gap-2">
          {s ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white"
              style={{ background: s.couleurFoncee }}
            >
              {s.nom}
            </span>
          ) : (
            <BadgeProposition court />
          )}
        </div>
        <p className="mt-1.5 font-bold text-[16px] leading-snug">{r.nom}</p>
        <p className="mt-1 text-[14px] text-gris leading-snug break-words flex gap-1">
          <span className="min-w-0 flex-1">
            <Pourquoi e={r.explication} />
          </span>
        </p>
    </CarteChoix>
  );
}

export default function Recherche() {
  const { donnees, erreur, reessayer } = useDonnees();
  const { liste: propositions } = usePropositions();
  const clos = !!usePudi().etat?.clos;
  const [params, setParams] = useSearchParams();
  const { state } = useLocation() as { state: { focus?: boolean } | null };
  const [saisie, setSaisie] = useState(() => params.get('q') ?? '');
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    champ.current?.focus();
  }, [state]);

  // The query is kept in the address (back button), without a new history entry per letter.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const p = new URLSearchParams(params);
      if (saisie.trim()) p.set('q', saisie);
      else p.delete('q');
      if (p.toString() !== params.toString()) setParams(p, { replace: true });
    }, 300);
    return () => window.clearTimeout(id);
  }, [saisie, params, setParams]);

  const index = useMemo(() => (donnees ? construireIndex(donnees, propositions ?? []) : null), [donnees, propositions]);
  const reponse = useMemo(() => (index ? rechercher(index, saisie) : null), [index, saisie]);

  return (
    <Page titre={fr.recherche.titre}>
      <p className="text-[15px] text-gris mb-3">{fr.recherche.intro}</p>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4">
        <label className="relative block">
          <span className="sr-only">{fr.recherche.champ}</span>
          <Icone nom="recherche" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gris" />
          <input
            ref={champ}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={fr.recherche.exemple}
            className="w-full min-h-[48px] rounded-xl border-2 border-marine bg-white pl-10 pr-3 text-[16px]"
          />
        </label>
      </form>

      {erreur ? (
        <ErreurDonnees reessayer={reessayer} />
      ) : !donnees || !reponse ? (
        <Chargement />
      ) : !saisie.trim() ? null : reponse.total === 0 ? (
        <div className="bg-white border border-filet rounded-xl p-4 space-y-2" role="status">
          <p className="text-[15px]">{fr.recherche.aucun}</p>
          <Link to="/choix?etape=3" className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[15px]">
            <Icone nom="ampoule" className="w-4 h-4" />
            {fr.recherche.allerEtape3}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-[14px] text-gris mb-2" role="status" aria-live="polite">
            {fr.recherche.resultats(reponse.total)}
            {reponse.total > MAX_RESULTATS && ` · ${fr.recherche.limite(MAX_RESULTATS)}`}
          </p>
          {reponse.directs.length > 0 && (
            <section className="mb-4">
              <h2 className="font-bold text-[16px] text-marine mb-2 flex items-center gap-1.5">
                <Icone nom="etoile" className="w-4 h-4" />
                {fr.recherche.direct}
              </h2>
              <ul className="space-y-2">
                {reponse.directs.map((r) => (
                  <Ligne key={r.id} r={r} donnees={donnees} clos={clos} />
                ))}
              </ul>
            </section>
          )}
          {reponse.autres.length > 0 && (
            <ul className="space-y-2">
              {reponse.autres.map((r) => (
                <Fragment key={r.id}>
                  <Ligne r={r} donnees={donnees} clos={clos} />
                </Fragment>
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  );
}
