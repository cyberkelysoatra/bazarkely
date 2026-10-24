// « Trouver un projet »: search on the device among the 52 programmes and the proposals
// (works offline once visited). The index is built when this page opens. PUDI-CC-15: also the
// pages of the two PUDi documents where the words appear (lazy word index).
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { Chargement, ErreurDonnees, Page } from '../composants/Mise';
import { secteurParId } from '../data';
import { frPages } from '../i18n/frPages';
import { usePudi, useDonnees } from '../PudiContexte';
import { CarteChoix } from '../composants/CarteChoix';
import { usePropositions } from '../appels/propositions';
import { MAX_RESULTATS, construireIndex, rechercher, type Explication, type ResultatRecherche } from '../utils/recherche';
import { BadgeProposition } from './Propositions';
import type { DocumentPudi, PudiDonnees } from '../data/types';
import { documentsPudi, urlDocument } from '../utils/documents';
import { liensPagesDocument, rechercherDocuments, type IndexDocuments, type PagesDocument } from '../utils/rechercheDocuments';

// PUDI-CC-15: word index of the two documents, a lazy chunk (cached offline by the PUDi service
// worker like the other chunks). A failed load only hides the documents block.
let indexDocuments: Promise<IndexDocuments | null> | null = null;
function chargerIndexDocuments(): Promise<IndexDocuments | null> {
  indexDocuments ??= import('../data/index-documents-pudi.json')
    .then((m) => m.default as IndexDocuments)
    .catch(() => {
      indexDocuments = null;
      return null;
    });
  return indexDocuments;
}

function useIndexDocuments(): IndexDocuments | null {
  const [index, setIndex] = useState<IndexDocuments | null>(null);
  useEffect(() => {
    let actif = true;
    void chargerIndexDocuments().then((x) => actif && setIndex(x));
    return () => {
      actif = false;
    };
  }, []);
  return index;
}

/** « PUDi : p. 1, 4, 17… » for each document (at most 12 links, then « et N autres pages »). */
function PagesDocuments({ resultats, docs }: { resultats: PagesDocument[]; docs: DocumentPudi[] }) {
  const t = frPages.recherche.documents;
  return (
    <ul className="space-y-1.5">
      {resultats.map((r) => {
        const doc = docs.find((d) => d.id === r.id);
        if (!doc) return null;
        const { liens, reste } = liensPagesDocument(doc, r.pages);
        return (
          <li key={r.id} className="text-[0.9375rem] leading-snug">
            <span className="font-bold">{t.noms[r.id] ?? doc.titre}</span> : {t.p}{' '}
            {liens.map((l, i) => (
              <span key={l.pageFichier}>
                {i > 0 && ', '}
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener"
                  aria-label={t.ouvrePage(r.id, l.pageImprimee)}
                  className="font-bold text-marine underline underline-offset-2 decoration-[#9AA3BD] inline-block min-w-[24px] py-1 text-center"
                >
                  {l.pageImprimee ?? t.sommaire}
                </a>
              </span>
            ))}
            {reste > 0 && (
              <>
                {' '}
                {t.autres(reste)} ·{' '}
                <a href={urlDocument(doc)} target="_blank" rel="noopener" className="font-bold text-marine underline underline-offset-2 decoration-[#9AA3BD] inline-block py-1">
                  {t.ouvrirDocument}
                </a>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

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
      {frPages.recherche.champs[e.champ]} : <Surligne texte={e.texte} surlignes={e.surlignes} />
      {e.fokontany && ` (${frPages.recherche.champs.fokontany(e.fokontany)})`}
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
      etiquette={
        s ? (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold text-white text-right"
            style={{ background: s.couleurFoncee }}
          >
            {s.nom}
          </span>
        ) : (
          <BadgeProposition court />
        )
      }
    >
        <p className="font-bold text-[1rem] leading-snug" data-titre-carte="">{r.nom}</p>
        <p className="mt-1 text-[0.875rem] text-gris leading-snug break-words">
          <Pourquoi e={r.explication} />
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
  const indexDocs = useIndexDocuments();
  const pagesDocs = useMemo(() => (indexDocs ? rechercherDocuments(indexDocs, saisie) : []), [indexDocs, saisie]);
  const docs = useMemo(() => documentsPudi(donnees), [donnees]);
  const tDocs = frPages.recherche.documents;

  return (
    <Page titre={frPages.recherche.titre}>
      <p className="text-[0.9375rem] text-gris mb-3">{frPages.recherche.intro}</p>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4">
        <label className="relative block">
          <span className="sr-only">{frPages.recherche.champ}</span>
          <Icone nom="recherche" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gris" />
          <input
            ref={champ}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={frPages.recherche.exemple}
            className="w-full min-h-[48px] rounded-xl border-2 border-marine bg-white pl-10 pr-3 text-[1rem]"
          />
        </label>
      </form>

      {erreur ? (
        <ErreurDonnees reessayer={reessayer} />
      ) : !donnees || !reponse ? (
        <Chargement />
      ) : !saisie.trim() ? null : reponse.total === 0 && pagesDocs.length > 0 ? (
        <div className="bg-white border border-filet rounded-xl p-4 space-y-2" role="status">
          <p className="text-[0.9375rem]">{tDocs.aucunProjet(saisie.trim(), donnees.programmes.length)}</p>
          <p className="text-[0.9375rem]">{tDocs.enParlent}</p>
          <PagesDocuments resultats={pagesDocs} docs={docs} />
          <p className="text-[0.9375rem] pt-1">{tDocs.proposer}</p>
          <Link to="/choix?etape=3" className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[0.9375rem]">
            <Icone nom="ampoule" className="w-4 h-4" />
            {frPages.recherche.allerEtape3}
          </Link>
        </div>
      ) : reponse.total === 0 ? (
        <div className="bg-white border border-filet rounded-xl p-4 space-y-2" role="status">
          <p className="text-[0.9375rem]">{frPages.recherche.aucun}</p>
          <Link to="/choix?etape=3" className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[0.9375rem]">
            <Icone nom="ampoule" className="w-4 h-4" />
            {frPages.recherche.allerEtape3}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-[0.875rem] text-gris mb-2" role="status" aria-live="polite">
            {frPages.recherche.resultats(reponse.total)}
            {pagesDocs.length > 0 && tDocs.statut}
            {reponse.total > MAX_RESULTATS && ` · ${frPages.recherche.limite(MAX_RESULTATS)}`}
          </p>
          {reponse.directs.length > 0 && (
            <section className="mb-4">
              <h2 className="font-bold text-[1rem] text-marine mb-2 flex items-center gap-1.5">
                <Icone nom="etoile" className="w-4 h-4" />
                {frPages.recherche.direct}
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
          {pagesDocs.length > 0 && (
            <details className="mt-4 bg-white border border-filet rounded-xl px-4 py-2">
              <summary className="cursor-pointer min-h-[44px] flex items-center font-bold text-[0.9375rem] text-marine">{tDocs.aussi}</summary>
              <div className="pb-2">
                <PagesDocuments resultats={pagesDocs} docs={docs} />
              </div>
            </details>
          )}
        </>
      )}
    </Page>
  );
}
