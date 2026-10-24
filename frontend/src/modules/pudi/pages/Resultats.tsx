import { useCallback, useEffect, useState } from 'react';
import { BoutonsPartage } from '../composants/Partager';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { PROFIL_VALEURS, programmeParId, secteurParId, type PudiDonnees } from '../data';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { useDonnees, usePudi } from '../PudiContexte';
import { lireApercu, lireMonVote, lireResultats, type LigneResultat, type Resultats as Res } from '../appels/api';
import { csvSynthese, preparerSynthese } from '../utils/synthese';
import { nomFichierSyntheseCsv, nomFichierSynthesePdf, telechargerFichier } from '../utils/exports';
import { extraireCode, messageErreur } from '../utils/erreurs';
import { dateClotureLongue, dateCourte, dateJour, dateLongue, heureCourte } from '../utils/format';
import { propositionsConnues } from '../appels/propositions';
import type { LigneProposition } from '../appels/api';

const TRANCHES = ['2026-2030', '2031-2035', '2036-2040'];

const virgule = (v: number) => String(v).replace('.', ',');

/**
 * « 34 voix · 11 votants » under the name, bar proportional to the votes (PUDI-CC-17), and the
 * « Écart avec le PUDi » flag (PUDI-CC-18: top 15 by votes while the PUDi plans it after 2030).
 */
function Barre({ donnees, l, rang, maxVoix = 0 }: { donnees: PudiDonnees; l: LigneResultat; rang: number; maxVoix?: number }) {
  const p = programmeParId(donnees, l.id);
  const s = p ? secteurParId(donnees, p.secteur) : undefined;
  const tranche = l.tranche_pudi ? TRANCHES[l.tranche_pudi - 1] : p?.trancheAffichee;
  const voix = l.voix ?? l.n;
  const largeur = maxVoix ? (100 * voix) / maxVoix : 0;
  return (
    <li className="py-2" data-ligne-resultat={l.id}>
      <div className="flex items-baseline gap-2 text-[0.875rem]">
        <span className="font-titre text-gris w-6 text-right shrink-0">{rang}</span>
        <Link to={`/programme/${l.id}`} className="flex-1 min-w-0 font-bold leading-snug">
          {p?.nom ?? l.id}
        </Link>
        <span className="font-titre text-marine shrink-0">{virgule(l.pct_voix ?? l.pct)} %</span>
      </div>
      <div className="ml-8 mt-1 h-3 rounded-full bg-vide overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, largeur)}%`, background: s?.couleur ?? '#0B2A8C' }} />
      </div>
      <p className="ml-8 mt-1 text-[0.8125rem] text-gris" data-voix-votants="">
        {frPages.resultats.voixVotants(voix, l.votants ?? l.n)}
        {!!l.concentration && ` · ${frPages.resultats.concentrationLigne(l.concentration)}`}
      </p>
      {l.ecart_pudi && tranche && (
        <p className="ml-8 mt-1 inline-flex items-center gap-1 text-[0.8125rem] font-bold text-[#9C3F21]" data-ecart-pudi={l.id}>
          <Icone nom="alerte" className="w-3.5 h-3.5 shrink-0" />
          {frPages.resultats.ecart(tranche)}
        </p>
      )}
    </li>
  );
}

/** Proposals outside the PUDi list, counted apart: share of the votes with a bar, voters. */
function LignePropositionResultat({ l, rang, maxVoix = 0 }: { l: LigneProposition; rang: number; maxVoix?: number }) {
  const pct = (v: number) => `${String(v).replace('.', ',')} %`;
  return (
    <li className="py-2">
      <div className="flex items-baseline gap-2 text-[0.875rem]">
        <span className="font-titre text-gris w-6 text-right shrink-0">{rang}</span>
        <Link to={`/proposition/${l.id}`} className="flex-1 min-w-0 font-bold leading-snug">
          {l.intitule}
        </Link>
        <span className="font-titre text-marine shrink-0">{pct(l.pct_voix ?? l.pct_priorite)}</span>
      </div>
      <div className="ml-8 mt-1 h-3 rounded-full bg-vide overflow-hidden" aria-hidden="true">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, maxVoix ? (100 * (l.voix ?? l.n_priorite)) / maxVoix : l.pct_priorite)}%`,
            background: 'repeating-linear-gradient(135deg, #0B2A8C 0 6px, #3F5FB0 6px 12px)'
          }}
        />
      </div>
      <p className="ml-8 mt-1 text-[0.8125rem] text-gris" data-voix-votants="">
        {frPages.resultats.voixVotants(l.voix ?? l.n_priorite, l.votants ?? l.n_priorite)}
        {!!l.concentration && ` · ${frPages.resultats.concentrationLigne(l.concentration)}`} ·{' '}
        {frPages.propositions.ajoutee(dateJour(l.ajoute_at))}
      </p>
    </li>
  );
}

/** How to read the ranking by votes (PUDI-CC-17). */
function AideRegle() {
  return (
    <details className="mt-1 text-[0.8125rem]" data-aide-regle="">
      <summary className="min-h-[44px] inline-flex items-center gap-1.5 cursor-pointer text-marine font-bold">
        <Icone nom="info" className="w-4 h-4" />
        {frPages.resultats.regleAideTitre}
      </summary>
      <p className="mt-1 text-profond">{frPages.resultats.regleAide}</p>
    </details>
  );
}

/** ⓘ of the « Écart avec le PUDi » column (PUDI-CC-18). */
function AideEcart() {
  return (
    <details className="text-[0.8125rem]" data-aide-ecart="">
      <summary className="min-h-[44px] inline-flex items-center gap-1.5 cursor-pointer text-marine font-bold">
        <Icone nom="info" className="w-4 h-4" />
        {frPages.resultats.ecartTitre}
      </summary>
      <p className="mt-1 text-profond">{frPages.resultats.ecartAide}</p>
    </details>
  );
}

/** Concentration (votes with 6 or more on one programme), votes used per voter, votes left at 3. */
function Transparence({ res }: { res: Res }) {
  if (!res.concentration && !res.repartition) return null;
  const pct = (v: number) => `${virgule(v)} %`;
  return (
    <section className="mt-6" data-transparence="">
      {res.concentration && (
        <div className="bg-white border border-filet rounded-xl p-3" data-concentration={res.concentration.votes}>
          <h2 className="font-bold text-[1.0625rem] text-marine">{frPages.resultats.concentrationTitre}</h2>
          <p className="text-[0.9375rem] mt-1">{frPages.resultats.concentration(res.concentration.votes, pct(res.concentration.pct_votes))}</p>
          {res.voix_placees !== undefined && <p className="text-[0.8125rem] text-gris mt-1">{frPages.resultats.voixPlacees(res.voix_placees)}</p>}
          {!!res.nb_votes_convertis && (
            <p className="text-[0.8125rem] text-gris mt-1" data-votes-convertis={res.nb_votes_convertis}>
              {frPages.resultats.convertis(res.nb_votes_convertis)}
            </p>
          )}
        </div>
      )}
      {res.repartition && (
        <Repartition
          titre={frPages.resultats.repartitionTitre}
          lignes={Array.from({ length: 12 }, (_, i) => ({ nom: frPages.resultats.repartitionLigne(i + 1), n: res.repartition?.[String(i + 1)] ?? 0 }))}
        />
      )}
    </section>
  );
}

function Repartition({ titre, lignes }: { titre: string; lignes: { nom: string; n: number }[] }) {
  const total = lignes.reduce((a, b) => a + b.n, 0) || 1;
  return (
    <section className="mt-6">
      <h2 className="font-bold text-[1.0625rem] text-marine mb-2">{titre}</h2>
      <ul className="space-y-1.5">
        {lignes.map((l) => (
          <li key={l.nom} className="text-[0.875rem]">
            <div className="flex justify-between gap-2">
              <span>{l.nom}</span>
              <span className="font-bold">{l.n}</span>
            </div>
            <div className="mt-0.5 h-2 rounded-full bg-vide overflow-hidden" aria-hidden="true">
              <div className="h-full bg-marine" style={{ width: `${(100 * l.n) / total}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Switch of the administrators' preview (test votes counted). */
function Interrupteur({ actif, basculer }: { actif: boolean; basculer: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      onClick={basculer}
      className="w-full min-h-[48px] flex items-center justify-between gap-3 bg-white border border-filet rounded-xl px-3 text-left"
    >
      <span className="flex items-center gap-2 font-bold text-[0.9375rem] text-marine">
        <Icone nom="oeil" />
        Aperçu avec les votes de test
      </span>
      <span className={`relative w-12 h-7 rounded-full transition-colors ${actif ? 'bg-marine' : 'bg-filet'}`} aria-hidden="true">
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${actif ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

export default function Resultats() {
  const { donnees } = useDonnees();
  const { etat, apercu: apercuRole } = usePudi();
  const [params] = useSearchParams();
  // PUDI-CC-11: JOEL's « Votant » preview keeps the results reserved until the (fake) vote.
  const reserveApercu = apercuRole?.role === 'votant' && !etat?.a_vote && !etat?.clos;
  // Results on return: « Vous avez voté le … » with « Modifier mon choix » and « Accueil ».
  const retour = !!(useLocation().state as { retour?: boolean } | null)?.retour;
  const [dateVote, setDateVote] = useState<string | null>(null);
  useEffect(() => {
    if (!retour) return;
    lireMonVote()
      .then((v) => v && setDateVote(v.updated_at ?? v.created_at))
      .catch(() => {
        /* the line stays without its date */
      });
  }, [retour]);
  const [res, setRes] = useState<Res | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [charge, setCharge] = useState(true);
  const admin = !!etat?.est_admin;
  // Preview: on by default for an administrator while the consultation is not published.
  const [apercu, setApercu] = useState<boolean | null>(null);
  useEffect(() => {
    if (apercu !== null || !etat) return;
    setApercu(etat.est_admin && (!etat.publie || params.get('apercu') === '1'));
  }, [etat, apercu, params]);
  useEffect(() => {
    if (params.get('apercu') === '1' && etat?.est_admin) setApercu(true);
  }, [params, etat?.est_admin]);
  const enApercu = admin && apercu === true;
  const [fichier, setFichier] = useState<'pdf' | 'csv' | null>(null);
  const [erreurFichier, setErreurFichier] = useState(false);

  const charger = useCallback(async () => {
    if (reserveApercu) {
      setRes(null);
      setCode('RESULTATS_RESERVES');
      setCharge(false);
      return;
    }
    setCharge(true);
    try {
      setRes(enApercu ? await lireApercu() : await lireResultats());
      setCode(null);
    } catch (e) {
      setCode(extraireCode(e) ?? 'AUTRE');
    } finally {
      setCharge(false);
    }
  }, [enApercu, reserveApercu]);

  useEffect(() => {
    // Wait for the state of the consultation when an administrator may get the preview.
    if (etat?.est_admin && apercu === null) return;
    void charger();
  }, [charger, etat?.est_admin, apercu]);

  const exporter = async (type: 'pdf' | 'csv') => {
    if (!res || !donnees) return;
    setFichier(type);
    setErreurFichier(false);
    try {
      const s = preparerSynthese(res, donnees, { provisoire: !res.clos, propositions: propositionsConnues() ?? [] });
      if (type === 'csv') telechargerFichier(csvSynthese(s), nomFichierSyntheseCsv(), 'text/csv;charset=utf-8');
      else {
        const { genererPdf } = await import('../appels/pdf');
        telechargerFichier(await genererPdf(s), nomFichierSynthesePdf(), 'application/pdf');
      }
    } catch {
      setErreurFichier(true);
    } finally {
      setFichier(null);
    }
  };

  const libelleFkt = (ceni: string) =>
    ceni === 'AUTRE' ? frPages.resultats.autreFokontany : donnees?.fokontany.find((f) => f.ceni === ceni)?.affichage ?? ceni;

  let contenu;
  if (charge && !res) contenu = <Chargement />;
  else if (code === 'RESULTATS_RESERVES')
    contenu = (
      <div className="bg-white border border-filet rounded-xl p-4 space-y-3">
        <p className="text-[1rem] flex gap-2 items-start">
          <Icone nom="cadenas" className="w-5 h-5 text-marine mt-0.5" />
          {frPages.resultats.reserves}
        </p>
        <Link to="/choix" className={`${boutonPrincipal} w-full`}>
          <Icone nom="liste" />
          {frPages.resultats.allerChoix}
        </Link>
      </div>
    );
  else if (code && !res)
    contenu = (
      <div className="space-y-3">
        <p>{messageErreur(code === 'RESEAU' ? 'RESEAU' : `PUDI_${code}`).message}</p>
        <button type="button" className={boutonSecondaire} onClick={() => void charger()}>
          <Icone nom="actualiser" />
          {fr.app.reessayer}
        </button>
      </div>
    );
  else if (res && donnees) {
    const fkt = Object.entries(res.par_fokontany)
      .map(([k, n]) => ({ nom: libelleFkt(k), n }))
      .sort((a, b) => b.n - a.n);
    const maxVoix = Math.max(0, ...res.priorites.map((l) => l.voix ?? l.n), ...(res.propositions ?? []).map((l) => l.voix ?? l.n_priorite));
    const top = fkt.slice(0, 10);
    const reste = fkt.slice(10).reduce((a, b) => a + b.n, 0);
    if (reste) top.push({ nom: frPages.resultats.autres, n: reste });
    contenu = (
      <>
        <div className="flex items-end justify-between gap-3 bg-white border border-filet rounded-xl p-3">
          <div>
            <div className="font-titre text-[2.125rem] leading-none text-marine">{res.nb_votants}</div>
            <div className="text-[0.875rem] text-gris">{frPages.resultats.votants(res.nb_votants)}</div>
          </div>
          <div className="text-right">
            <p className="text-[0.8125rem] text-gris">{frPages.resultats.misAJour(heureCourte(res.calcule_at))}</p>
            <button type="button" onClick={() => void charger()} className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[0.875rem]" disabled={charge}>
              <Icone nom="actualiser" className="w-4 h-4" />
              {frPages.resultats.actualiser}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[0.8125rem] text-gris">
          {frPages.resultats.ouverture} : {res.publie_at ? dateLongue(res.publie_at) : frPages.resultats.nonPubliee} · {fr.accueil.cloture} :{' '}
          {dateClotureLongue(res.cloture_at)}
        </p>
        {res.nb_votants === 0 && <p className="mt-3 text-gris">{frPages.resultats.aucunVote}</p>}

        <section className="mt-6">
          <h2 className="font-bold text-[1.0625rem] text-marine">{frPages.resultats.prioritesTitre}</h2>
          <p className="text-[0.9375rem] text-profond mt-1" data-urgence-deduite="">{frPages.resultats.urgenceDeduite}</p>
          <p className="text-[0.8125rem] text-gris mt-1">{frPages.resultats.prioritesAide}</p>
          <AideRegle />
          <AideEcart />
          <ol className="mt-1 divide-y divide-filet">
            {res.priorites.map((l, i) => (
              <Barre key={l.id} donnees={donnees} l={l} rang={i + 1} maxVoix={maxVoix} />
            ))}
          </ol>
        </section>
        <Transparence res={res} />

        {res.propositions && res.propositions.length > 0 && (
          <section className="mt-6 bg-sable border-2 border-dashed border-marine/50 rounded-xl p-3">
            <h2 className="font-bold text-[1.0625rem] text-marine">{frPages.resultats.propositionsTitre}</h2>
            <p className="text-[0.8125rem] text-gris">{frPages.resultats.propositionsAide}</p>
            <ol className="mt-1 divide-y divide-filet">
              {res.propositions.map((l, i) => (
                <LignePropositionResultat key={l.id} l={l} rang={i + 1} maxVoix={maxVoix} />
              ))}
            </ol>
          </section>
        )}

        <Repartition
          titre={frPages.resultats.profilTitre}
          lignes={PROFIL_VALEURS.map((p) => ({ nom: fr.envoi.profils[p], n: res.par_profil[p] ?? 0 }))}
        />
        <Repartition titre={frPages.resultats.fokontanyTitre} lignes={top} />

        <section className="mt-6">
          <h2 className="font-bold text-[1.0625rem] text-marine mb-2">{frPages.resultats.reseauxTitre}</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { n: res.reseaux.dans_nos_reseaux, l: frPages.resultats.dansReseaux },
              { n: res.reseaux.hors_reseaux, l: frPages.resultats.horsReseaux }
            ].map((x) => (
              <div key={x.l} className="bg-white border border-filet rounded-xl p-3 text-center">
                <div className="font-titre text-[1.625rem] text-marine">{x.n}</div>
                <div className="text-[0.8125rem] text-gris">{x.l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-bold text-[1.0625rem] text-marine mb-2">{frPages.resultats.manquantsTitre}</h2>
          {res.manquants.length ? (
            <ul className="space-y-2">
              {res.manquants.map((m, i) => (
                <li key={i} className="bg-white border border-filet rounded-xl p-3 text-[0.9375rem] whitespace-pre-wrap break-words">
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gris text-[0.9375rem]">{frPages.resultats.aucunManquant}</p>
          )}
        </section>

        {(res.clos || admin) && (
          <section className="mt-6 flex flex-col gap-2">
            <button type="button" className={`${boutonPrincipal} w-full`} disabled={fichier !== null} onClick={() => void exporter('pdf')}>
              <Icone nom="document" />
              {fichier === 'pdf' ? 'Préparation du PDF…' : res.clos ? 'Télécharger la synthèse (PDF)' : 'Synthèse provisoire (PDF)'}
            </button>
            {admin && (
              <button type="button" className={`${boutonSecondaire} w-full`} disabled={fichier !== null} onClick={() => void exporter('csv')}>
                <Icone nom="telecharger" />
                Exporter la synthèse (CSV)
              </button>
            )}
            {erreurFichier && <p role="alert" className="text-[0.875rem] font-bold text-[#9C3F21]">Le fichier n'a pas pu être préparé. Réessayez.</p>}
          </section>
        )}
      </>
    );
  } else contenu = <Chargement />;

  return (
    <Page titre={frPages.resultats.titre}>
      {retour && (
        <div className="mb-4 bg-white border-l-4 border-marine rounded-r-lg px-3 py-2.5 space-y-2" data-retour-resultats="">
          <p className="text-[0.9375rem] font-bold">{dateVote ? `Vous avez voté le ${dateCourte(dateVote)}` : 'Vous avez voté'}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/choix" className={boutonSecondaire}>
              <Icone nom="crayon" />
              Modifier mon choix
            </Link>
            <Link to="/" className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-[0.9375rem] font-bold text-marine underline underline-offset-2">
              <Icone nom="accueil" className="w-4 h-4" />
              Accueil
            </Link>
          </div>
        </div>
      )}
      <p className="text-[0.875rem] text-gris mb-3">{frPages.resultats.indicative}</p>
      <div className="mb-4 space-y-2">
        <BandeauxEtat masquerPreparation />
        {admin && apercu !== null && <Interrupteur actif={apercu} basculer={() => setApercu(!apercu)} />}
        {enApercu && (
          <div role="status" className="border-l-4 border-[#926407] bg-[#FFF6E0] rounded-r-lg px-3 py-2.5 flex gap-2.5 items-start shadow-sm">
            <Icone nom="oeil" className="w-5 h-5 mt-0.5" />
            <p className="text-[0.9375rem] leading-snug">Aperçu : vos votes de test sont comptés ; ils seront effacés à la publication</p>
          </div>
        )}
      </div>
      {contenu}
      {etat?.a_vote && !etat.clos && (
        <div className="mt-6">
          <BoutonsPartage />
        </div>
      )}
    </Page>
  );
}
