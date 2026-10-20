import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageBlocage, useBasculeChoix } from '../composants/BoutonsChoix';
import { Icone } from '../composants/Icones';
import { BadgeTranche, BandeauxEtat, Chargement, ErreurDonnees, Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { programmeParId, secteurParId, type PudiDonnees } from '../data';
import { fr } from '../i18n/fr';
import { usePudi, useDonnees } from '../PudiContexte';
import { MAX_MANQUANT, MAX_PRIORITES, MAX_URGENTS, brouillonValide, ecartPudi, limiterManquant } from '../utils/regles';

type Etape = '1' | '2' | '3' | 'resume';

/** Accent-insensitive search key. */
const cle = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function ListeProgrammes({ donnees, mode }: { donnees: PudiDonnees; mode: 'priorite' | 'urgent' }) {
  const { brouillon, priorite, urgent, message } = useBasculeChoix();
  const { etat } = usePudi();
  const [secteur, setSecteur] = useState('');
  const [recherche, setRecherche] = useState('');
  const liste = useMemo(() => {
    const q = cle(recherche.trim());
    return donnees.programmes.filter((p) => (!secteur || p.secteur === secteur) && (!q || cle(p.nom).includes(q)));
  }, [donnees, secteur, recherche]);
  const choisis = mode === 'priorite' ? brouillon.priorites : brouillon.urgents;
  const basculer = mode === 'priorite' ? priorite : urgent;
  const clos = !!etat?.clos;

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        <label className="block">
          <span className="sr-only">{fr.choix.filtreSecteur}</span>
          <select
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className="w-full min-h-[48px] rounded-xl border border-filet bg-white px-3 text-[16px]"
          >
            <option value="">{fr.choix.tousSecteurs}</option>
            {donnees.secteurs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="relative block">
          <span className="sr-only">{fr.choix.recherche}</span>
          <Icone nom="recherche" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gris" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={fr.choix.recherche}
            className="w-full min-h-[48px] rounded-xl border border-filet bg-white pl-10 pr-3 text-[16px]"
          />
        </label>
      </div>
      {liste.length === 0 && <p className="text-gris py-4">{fr.choix.aucunResultat}</p>}
      <ul className="space-y-2">
        {liste.map((p) => {
          const s = secteurParId(donnees, p.secteur);
          const actif = choisis.includes(p.id);
          return (
            <li key={p.id}>
              <div
                className={`bg-white rounded-xl border-2 p-3 flex gap-3 items-start ${actif ? 'border-marine' : 'border-filet'}`}
              >
                <button
                  type="button"
                  disabled={clos}
                  aria-pressed={actif}
                  onClick={() => basculer(p.id)}
                  className={`shrink-0 w-11 h-11 rounded-lg border-2 flex items-center justify-center disabled:opacity-50 ${
                    actif
                      ? mode === 'priorite'
                        ? 'bg-marine border-marine text-white'
                        : 'bg-[#B85317] border-[#B85317] text-white'
                      : 'bg-white border-[#9AA3BD] text-gris'
                  }`}
                  aria-label={`${actif ? fr.choix.retirer : mode === 'priorite' ? fr.choix.ajouter : fr.choix.marquer} : ${p.nom}`}
                >
                  <Icone nom={actif ? 'coche' : mode === 'priorite' ? 'etoile' : 'horloge'} />
                </button>
                <div className="flex-1 min-w-0">
                  <Link to={`/programme/${p.id}`} className="font-bold text-[15px] leading-snug block">
                    {p.nom}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-bold" style={{ color: s?.couleurFoncee }}>
                      {s?.nom}
                    </span>
                    {mode === 'urgent' && <BadgeTranche tranche={p.trancheAffichee} />}
                  </div>
                  {mode === 'urgent' && actif && ecartPudi(p.trancheAffichee) && (
                    <p className="text-[13px] text-gris mt-1">{fr.choix.avance}</p>
                  )}
                  {message?.id === p.id && <MessageBlocage texte={message.texte} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Compteur({ n, max }: { n: number; max: number }) {
  return (
    <span
      className={`font-titre text-[22px] ${n === max ? 'text-marine' : 'text-gris'}`}
      aria-live="polite"
      aria-label={`${n} sur ${max}`}
    >
      {fr.choix.compteur(n, max)}
    </span>
  );
}

function NomsProgrammes({ donnees, ids }: { donnees: PudiDonnees; ids: string[] }) {
  if (!ids.length) return <p className="text-gris text-[15px]">{fr.choix.aucun}</p>;
  return (
    <ol className="space-y-1.5">
      {ids.map((id, i) => (
        <li key={id} className="flex gap-2 text-[15px]">
          <span className="font-titre text-marine">{i + 1}</span>
          <span>{programmeParId(donnees, id)?.nom ?? id}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Choix() {
  const { donnees, erreur, reessayer } = useDonnees();
  const { brouillon, majBrouillon, etat } = usePudi();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const brut = params.get('etape');
  const etape: Etape = brut === '2' || brut === '3' || brut === 'resume' ? brut : '1';
  const aller = (e: Etape) => {
    const p = new URLSearchParams(params);
    p.set('etape', e);
    setParams(p);
    window.scrollTo({ top: 0 });
  };
  const valide = brouillonValide(brouillon);
  const clos = !!etat?.clos;

  if (erreur) return <Page titre={fr.choix.titre}><ErreurDonnees reessayer={reessayer} /></Page>;
  if (!donnees) return <Page titre={fr.choix.titre}><Chargement /></Page>;

  const navigation = (precedent: Etape | null, suivant: Etape, libelle: string = fr.choix.suivant) => (
    <div className="sticky bottom-[60px] mt-4 -ml-4 -mr-6 px-4 py-3 bg-creme/95 border-t border-filet flex gap-2">
      {precedent && (
        <button type="button" className={`${boutonSecondaire} flex-1`} onClick={() => aller(precedent)}>
          <Icone nom="gauche" />
          {fr.choix.precedent}
        </button>
      )}
      <button
        type="button"
        className={`${boutonPrincipal} flex-1`}
        disabled={suivant === '2' && brouillon.priorites.length !== MAX_PRIORITES}
        onClick={() => aller(suivant)}
      >
        {libelle}
        <Icone nom="droite" />
      </button>
    </div>
  );

  return (
    <Page titre={fr.choix.titre}>
      <div className="mb-3">
        <BandeauxEtat />
      </div>
      {etape !== 'resume' && <p className="text-[13px] text-gris">{fr.choix.etape(Number(etape))}</p>}

      {etape === '1' && (
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold text-[18px] text-marine">{fr.choix.etape1Titre}</h2>
            <Compteur n={brouillon.priorites.length} max={MAX_PRIORITES} />
          </div>
          <p className="text-[15px] mb-3">{fr.choix.etape1Aide}</p>
          <ListeProgrammes donnees={donnees} mode="priorite" />
          {navigation(null, '2')}
        </section>
      )}

      {etape === '2' && (
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold text-[18px] text-marine">{fr.choix.etape2Titre}</h2>
            <Compteur n={brouillon.urgents.length} max={MAX_URGENTS} />
          </div>
          <p className="text-[15px] mb-3">{fr.choix.etape2Aide}</p>
          <ListeProgrammes donnees={donnees} mode="urgent" />
          {navigation('1', '3')}
        </section>
      )}

      {etape === '3' && (
        <section>
          <h2 className="font-bold text-[18px] text-marine flex items-center gap-2">
            <Icone nom="ampoule" />
            {fr.choix.etape3Titre}
          </h2>
          <p className="text-[15px] mb-3">{fr.choix.etape3Aide}</p>
          <label className="block">
            <span className="sr-only">{fr.choix.etape3Titre}</span>
            <textarea
              value={brouillon.manquant}
              disabled={clos}
              maxLength={MAX_MANQUANT}
              rows={5}
              onChange={(e) => majBrouillon({ ...brouillon, manquant: limiterManquant(e.target.value) })}
              placeholder={fr.choix.etape3Placeholder}
              className="w-full rounded-xl border border-filet bg-white p-3 text-[16px] leading-snug"
            />
          </label>
          <p className="text-right text-[13px] text-gris" aria-live="polite">
            {fr.choix.caracteres(brouillon.manquant.length)}
          </p>
          {navigation('2', 'resume', fr.choix.voirResume)}
        </section>
      )}

      {etape === 'resume' && (
        <section className="space-y-4">
          <h2 className="font-bold text-[18px] text-marine">{fr.choix.resumeTitre}</h2>
          {[
            { titre: fr.choix.resumePriorites, e: '1' as Etape, contenu: <NomsProgrammes donnees={donnees} ids={brouillon.priorites} /> },
            { titre: fr.choix.resumeUrgents, e: '2' as Etape, contenu: <NomsProgrammes donnees={donnees} ids={brouillon.urgents} /> },
            {
              titre: fr.choix.resumeManquant,
              e: '3' as Etape,
              contenu: <p className="text-[15px] whitespace-pre-wrap break-words">{brouillon.manquant.trim() || fr.choix.aucun}</p>
            }
          ].map((b) => (
            <div key={b.e} className="bg-white border border-filet rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-[15px] text-profond">{b.titre}</h3>
                <button type="button" onClick={() => aller(b.e)} className="inline-flex items-center gap-1 min-h-[44px] px-2 text-marine font-bold text-[14px]">
                  <Icone nom="crayon" className="w-4 h-4" />
                  {fr.choix.modifier}
                </button>
              </div>
              {b.contenu}
            </div>
          ))}
          <p className="text-[14px] text-gris">{fr.choix.brouillon}</p>
          {!valide && <MessageBlocage texte={fr.choix.incomplet} />}
          <button
            type="button"
            className={`${boutonPrincipal} w-full`}
            disabled={!valide || clos}
            onClick={() => navigate('/envoyer')}
          >
            <Icone nom="envoyer" />
            {fr.choix.envoyer}
          </button>
        </section>
      )}
    </Page>
  );
}
