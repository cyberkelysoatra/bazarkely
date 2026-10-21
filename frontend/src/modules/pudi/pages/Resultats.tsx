import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { BadgeTranche, BandeauxEtat, Chargement, Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { PROFIL_VALEURS, programmeParId, secteurParId, type PudiDonnees } from '../data';
import { fr } from '../i18n/fr';
import { useDonnees, usePudi } from '../PudiContexte';
import { lireApercu, lireResultats, type LigneResultat, type Resultats as Res } from '../appels/api';
import { csvSynthese, preparerSynthese } from '../utils/synthese';
import { nomFichierSyntheseCsv, nomFichierSynthesePdf, telechargerFichier } from '../utils/exports';
import { extraireCode, messageErreur } from '../utils/erreurs';
import { heureCourte } from '../utils/format';

const TRANCHES = ['2026-2030', '2031-2035', '2036-2040'];

function Barre({ donnees, l, rang, urgent }: { donnees: PudiDonnees; l: LigneResultat; rang: number; urgent?: boolean }) {
  const p = programmeParId(donnees, l.id);
  const s = p ? secteurParId(donnees, p.secteur) : undefined;
  const tranche = l.tranche_pudi ? TRANCHES[l.tranche_pudi - 1] : p?.trancheAffichee;
  return (
    <li className="py-2">
      <div className="flex items-baseline gap-2 text-[14px]">
        <span className="font-titre text-gris w-6 text-right shrink-0">{rang}</span>
        <Link to={`/programme/${l.id}`} className="flex-1 min-w-0 font-bold leading-snug">
          {p?.nom ?? l.id}
        </Link>
        <span className="font-titre text-marine shrink-0">{String(l.pct).replace('.', ',')} %</span>
      </div>
      <div className="ml-8 mt-1 h-3 rounded-full bg-vide overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, l.pct)}%`, background: s?.couleur ?? '#0B2A8C' }} />
      </div>
      {urgent && tranche && (
        <div className="ml-8 mt-1.5 flex flex-wrap items-center gap-2">
          <BadgeTranche tranche={tranche} />
          {l.ecart && (
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#9C3F21]">
              <Icone nom="alerte" className="w-3.5 h-3.5" />
              {fr.resultats.ecart}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

function Repartition({ titre, lignes }: { titre: string; lignes: { nom: string; n: number }[] }) {
  const total = lignes.reduce((a, b) => a + b.n, 0) || 1;
  return (
    <section className="mt-6">
      <h2 className="font-bold text-[17px] text-marine mb-2">{titre}</h2>
      <ul className="space-y-1.5">
        {lignes.map((l) => (
          <li key={l.nom} className="text-[14px]">
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
      <span className="flex items-center gap-2 font-bold text-[15px] text-marine">
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
  const { etat } = usePudi();
  const [params] = useSearchParams();
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
    setCharge(true);
    try {
      setRes(enApercu ? await lireApercu() : await lireResultats());
      setCode(null);
    } catch (e) {
      setCode(extraireCode(e) ?? 'AUTRE');
    } finally {
      setCharge(false);
    }
  }, [enApercu]);

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
      const s = preparerSynthese(res, donnees, { provisoire: !res.clos });
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
    ceni === 'AUTRE' ? fr.resultats.autreFokontany : donnees?.fokontany.find((f) => f.ceni === ceni)?.affichage ?? ceni;

  let contenu;
  if (charge && !res) contenu = <Chargement />;
  else if (code === 'RESULTATS_RESERVES')
    contenu = (
      <div className="bg-white border border-filet rounded-xl p-4 space-y-3">
        <p className="text-[16px] flex gap-2 items-start">
          <Icone nom="cadenas" className="w-5 h-5 text-marine mt-0.5" />
          {fr.resultats.reserves}
        </p>
        <Link to="/choix" className={`${boutonPrincipal} w-full`}>
          <Icone nom="liste" />
          {fr.resultats.allerChoix}
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
    const top = fkt.slice(0, 10);
    const reste = fkt.slice(10).reduce((a, b) => a + b.n, 0);
    if (reste) top.push({ nom: fr.resultats.autres, n: reste });
    contenu = (
      <>
        <div className="flex items-end justify-between gap-3 bg-white border border-filet rounded-xl p-3">
          <div>
            <div className="font-titre text-[34px] leading-none text-marine">{res.nb_votants}</div>
            <div className="text-[14px] text-gris">{fr.resultats.votants(res.nb_votants)}</div>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-gris">{fr.resultats.misAJour(heureCourte(res.calcule_at))}</p>
            <button type="button" onClick={() => void charger()} className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[14px]" disabled={charge}>
              <Icone nom="actualiser" className="w-4 h-4" />
              {fr.resultats.actualiser}
            </button>
          </div>
        </div>
        {res.nb_votants === 0 && <p className="mt-3 text-gris">{fr.resultats.aucunVote}</p>}

        <section className="mt-6">
          <h2 className="font-bold text-[17px] text-marine">{fr.resultats.prioritesTitre}</h2>
          <p className="text-[13px] text-gris">{fr.resultats.prioritesAide}</p>
          <ol className="mt-1 divide-y divide-filet">
            {res.priorites.map((l, i) => (
              <Barre key={l.id} donnees={donnees} l={l} rang={i + 1} />
            ))}
          </ol>
        </section>

        <section className="mt-6">
          <h2 className="font-bold text-[17px] text-marine">{fr.resultats.urgentsTitre}</h2>
          <p className="text-[13px] text-gris">{fr.resultats.urgentsAide}</p>
          <ol className="mt-1 divide-y divide-filet">
            {res.urgents.map((l, i) => (
              <Barre key={l.id} donnees={donnees} l={l} rang={i + 1} urgent />
            ))}
          </ol>
        </section>

        <Repartition
          titre={fr.resultats.profilTitre}
          lignes={PROFIL_VALEURS.map((p) => ({ nom: fr.envoi.profils[p], n: res.par_profil[p] ?? 0 }))}
        />
        <Repartition titre={fr.resultats.fokontanyTitre} lignes={top} />

        <section className="mt-6">
          <h2 className="font-bold text-[17px] text-marine mb-2">{fr.resultats.reseauxTitre}</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { n: res.reseaux.dans_nos_reseaux, l: fr.resultats.dansReseaux },
              { n: res.reseaux.hors_reseaux, l: fr.resultats.horsReseaux }
            ].map((x) => (
              <div key={x.l} className="bg-white border border-filet rounded-xl p-3 text-center">
                <div className="font-titre text-[26px] text-marine">{x.n}</div>
                <div className="text-[13px] text-gris">{x.l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-bold text-[17px] text-marine mb-2">{fr.resultats.manquantsTitre}</h2>
          {res.manquants.length ? (
            <ul className="space-y-2">
              {res.manquants.map((m, i) => (
                <li key={i} className="bg-white border border-filet rounded-xl p-3 text-[15px] whitespace-pre-wrap break-words">
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gris text-[15px]">{fr.resultats.aucunManquant}</p>
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
            {erreurFichier && <p role="alert" className="text-[14px] font-bold text-[#9C3F21]">Le fichier n'a pas pu être préparé. Réessayez.</p>}
          </section>
        )}
      </>
    );
  } else contenu = <Chargement />;

  return (
    <Page titre={fr.resultats.titre}>
      <p className="text-[14px] text-gris mb-3">{fr.resultats.indicative}</p>
      <div className="mb-4 space-y-2">
        <BandeauxEtat masquerPreparation />
        {admin && apercu !== null && <Interrupteur actif={apercu} basculer={() => setApercu(!apercu)} />}
        {enApercu && (
          <div role="status" className="border-l-4 border-[#926407] bg-[#FFF6E0] rounded-r-lg px-3 py-2.5 flex gap-2.5 items-start shadow-sm">
            <Icone nom="oeil" className="w-5 h-5 mt-0.5" />
            <p className="text-[15px] leading-snug">Aperçu : vos votes de test sont comptés ; ils seront effacés à la publication</p>
          </div>
        )}
      </div>
      {contenu}
    </Page>
  );
}
