// Live monitoring: refreshed every 60 s while the tab is visible.
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icone } from '../../composants/Icones';
import { useDonnees, usePudi } from '../../PudiContexte';
import { lireCanaux, lireRefus, lireSuivi, lireVotes } from '../../appels/admin';
import { dateCourte, heureCourte, libelleMotifRefus } from '../../utils/format';
import { pourcent } from '../../utils/synthese';
import { fr } from '../../i18n/fr';
import { Aide, Chiffre, Erreur, Titre2, petitBouton, useAppel } from './communs';
import ParcoursVisiteurs, { SANS_CANAL } from './Parcours';
import { lireSuiviDiscussion } from '../../appels/discussion';

const PERSONNE = libelleMotifRefus('personne_deja_votee');
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const jourCourt = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
};

export default function Suivi() {
  const { etat } = usePudi();
  const { donnees } = useDonnees();
  const appel = useAppel(async () => {
    const [suivi, votes, canaux, refus, discussion] = await Promise.all([
      lireSuivi(),
      lireVotes(),
      lireCanaux(),
      lireRefus(),
      lireSuiviDiscussion().catch(() => null)
    ]);
    return { suivi, votes, canaux, refus, discussion };
  });
  const { recharger } = appel;

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void recharger();
    }, 60000);
    const visible = () => document.visibilityState === 'visible' && void recharger();
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [recharger]);

  const d = appel.donnees;
  const fokontany = useMemo(() => {
    if (!d || !donnees) return [];
    const comptes: Record<string, number> = {};
    for (const v of d.votes) if (!v.masque && !v.est_test) comptes[v.fokontany] = (comptes[v.fokontany] ?? 0) + 1;
    return donnees.fokontany
      .filter((f) => f.ceni)
      .map((f) => {
        const n = comptes[f.ceni!] ?? 0;
        const inscrits = f.electeurs2023 ?? 0;
        return { nom: f.affichage, n, inscrits, pour1000: inscrits ? (1000 * n) / inscrits : 0 };
      })
      .sort((a, b) => b.pour1000 - a.pour1000 || b.n - a.n || a.nom.localeCompare(b.nom, 'fr'));
  }, [d, donnees]);

  const s = d?.suivi;
  const nomCanal = (code: string) => d?.canaux.find((c) => c.code === code)?.nom ?? (code === SANS_CANAL ? 'Sans lien de canal' : code);
  const numerosRefuses = useMemo(() => {
    const parDetenteur: Record<string, number> = {};
    for (const r of d?.refus ?? []) {
      const k = r.motif === 'personne_deja_votee' ? PERSONNE : (r.id_anonyme_detenteur ?? 'numéro libéré');
      parDetenteur[k] = (parDetenteur[k] ?? 0) + 1;
    }
    return Object.entries(parDetenteur).sort((a, b) => b[1] - a[1]);
  }, [d]);

  return (
    <div>
      <Aide titre="Comment lire cet écran ?">
        <p>Les chiffres comptent les votes réels : les votes de test et les votes masqués sont mis à part.</p>
        <p>« Hors liste du groupe » : vote arrivé par le lien d'un groupe alors que son numéro n'est pas dans la liste de ce groupe (lien transféré à quelqu'un d'autre).</p>
        <p>« Dans nos réseaux » : le numéro figure, sous forme codée, dans au moins une liste fournie par les partenaires.</p>
        <p>Les indices sont des pistes à examiner, jamais des preuves : les opérateurs mobiles placent beaucoup d'abonnés derrière une même adresse internet.</p>
        <p>L'écran se met à jour seul toutes les minutes tant qu'il est affiché.</p>
      </Aide>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[13px] text-gris">{appel.le ? `Mis à jour à ${heureCourte(appel.le.toISOString())}` : fr.app.chargement}</p>
        <button type="button" className={petitBouton} onClick={() => void recharger()} disabled={appel.charge}>
          <Icone nom="actualiser" className="w-4 h-4" />
          Actualiser
        </button>
      </div>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void recharger()} />}

      {s && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Chiffre valeur={s.nb_votes} libelle="Votes comptés" icone="coche" />
            {(!etat?.publie || s.nb_tests > 0) && <Chiffre valeur={s.nb_tests} libelle="Votes de test" icone="drapeau" ton="test" />}
            <Chiffre valeur={s.nb_masques} libelle="Votes masqués" icone="oeilBarre" />
            <Chiffre valeur={s.nb_connexions} libelle="Comptes connectés" icone="personnes" />
            <Chiffre valeur={s.nb_refus} libelle="Tentatives refusées" icone="refus" ton={s.nb_refus ? 'alerte' : undefined} />
            {s.nb_masquages_actifs !== undefined && (
              <Link to="/admin/refus" className="block" data-suivi-masquages="">
                <Chiffre
                  valeur={s.nb_masquages_actifs}
                  libelle={`Masquages automatiques (${s.nb_masquages_retablis ?? 0} rétabli${(s.nb_masquages_retablis ?? 0) > 1 ? 's' : ''})`}
                  icone="oeilBarre"
                  ton={s.nb_masquages_actifs ? 'alerte' : undefined}
                />
              </Link>
            )}
          </div>

          {d?.discussion && (
            <>
              <Titre2 aide="Discussion publique : messages écrits depuis l'ouverture, auteurs différents, messages supprimés.">Discussion</Titre2>
              <div className="grid grid-cols-3 gap-2" data-suivi-discussion="">
                <Chiffre valeur={d.discussion.nb_messages} libelle="Messages" icone="discussion" />
                <Chiffre valeur={d.discussion.nb_auteurs} libelle="Auteurs" icone="personnes" />
                <Chiffre valeur={d.discussion.nb_supprimes} libelle="Supprimés" icone="poubelle" />
              </div>
              {d.discussion.nb_suspendus > 0 && (
                <p className="mt-1 text-[13px] text-gris">{d.discussion.nb_suspendus} compte{d.discussion.nb_suspendus > 1 ? 's' : ''} suspendu{d.discussion.nb_suspendus > 1 ? 's' : ''} de la discussion.</p>
              )}
            </>
          )}

          <ParcoursVisiteurs nomCanal={nomCanal} codes={d?.canaux.map((c) => c.code) ?? []} />

          <Titre2 aide="Dates de Madagascar.">Votes par jour</Titre2>
          {Object.keys(s.par_jour).length ? (
            <ul className="bg-white border border-filet rounded-xl divide-y divide-filet">
              {Object.entries(s.par_jour)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([j, n]) => (
                  <li key={j} className="px-3 py-2 flex items-center gap-3 text-[14px]">
                    <span className="w-28 shrink-0">{jourCourt(j)}</span>
                    <span className="flex-1 h-2.5 rounded-full bg-vide overflow-hidden" aria-hidden="true">
                      <span className="block h-full bg-marine" style={{ width: `${(100 * n) / Math.max(...Object.values(s.par_jour))}%` }} />
                    </span>
                    <span className="font-bold w-10 text-right">{n}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-gris text-[15px]">Aucun vote compté pour le moment.</p>
          )}

          <Titre2 aide="Part = votes du canal sur l'ensemble des votes comptés.">Votes par canal</Titre2>
          {s.par_canal.length ? (
            <div className="bg-white border border-filet rounded-xl overflow-hidden">
              <table className="w-full text-[14px]">
                <thead className="bg-vide text-left">
                  <tr>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-2 py-2 text-right">Votes</th>
                    <th className="px-2 py-2 text-right">Hors liste</th>
                    <th className="px-3 py-2 text-right">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-filet">
                  {s.par_canal.map((c) => (
                    <tr key={c.code}>
                      <td className="px-3 py-2 break-words">{nomCanal(c.code)}</td>
                      <td className="px-2 py-2 text-right font-bold">{c.n}</td>
                      <td className="px-2 py-2 text-right">{c.hors_liste}</td>
                      <td className="px-3 py-2 text-right">{pourcent(s.nb_votes ? (100 * c.n) / s.nb_votes : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gris text-[15px]">Aucun vote compté pour le moment.</p>
          )}

          <Titre2>Portée des réseaux</Titre2>
          <div className="grid grid-cols-2 gap-2">
            <Chiffre valeur={`${s.dans_nos_reseaux}`} libelle={`Dans nos réseaux (${pourcent(s.nb_votes ? (100 * s.dans_nos_reseaux) / s.nb_votes : 0)})`} icone="diffusion" />
            <Chiffre valeur={s.nb_votes - s.dans_nos_reseaux} libelle="Hors réseaux" icone="personnes" />
          </div>

          <Titre2 aide="Votes comptés pour 1 000 électeurs inscrits en 2023 (liste CENI).">Représentativité par fokontany</Titre2>
          <div className="bg-white border border-filet rounded-xl overflow-hidden">
            <table className="w-full text-[14px]">
              <thead className="bg-vide text-left">
                <tr>
                  <th className="px-3 py-2">Fokontany</th>
                  <th className="px-2 py-2 text-right">Votes</th>
                  <th className="px-2 py-2 text-right">Inscrits 2023</th>
                  <th className="px-3 py-2 text-right">Pour 1 000</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-filet">
                {fokontany.map((f) => (
                  <tr key={f.nom}>
                    <td className="px-3 py-1.5">{f.nom}</td>
                    <td className="px-2 py-1.5 text-right font-bold">{f.n}</td>
                    <td className="px-2 py-1.5 text-right">{f.inscrits ? f.inscrits.toLocaleString('fr-FR').replace(/\u202F|\u00A0/g, ' ') : ''}</td>
                    <td className="px-3 py-1.5 text-right">{String(Math.round(f.pour1000 * 10) / 10).replace('.', ',')}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-3 py-1.5">{fr.resultats.autreFokontany}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{s.fokontany_autre}</td>
                  <td className="px-2 py-1.5" />
                  <td className="px-3 py-1.5" />
                </tr>
              </tbody>
            </table>
          </div>

          <Titre2 aide="Indices à examiner, jamais des preuves. Les opérateurs mobiles placent beaucoup d'utilisateurs derrière une même adresse internet.">
            Indices
          </Titre2>
          <div className="grid md:grid-cols-2 gap-2">
            <div className="bg-white border border-filet rounded-xl p-3">
              <p className="font-bold text-[15px] mb-1">Adresses internet avec 5 votes ou plus</p>
              {s.indices_ip.length ? (
                <ul className="text-[14px] space-y-1">
                  {s.indices_ip.map((g) => (
                    <li key={g.groupe}>
                      Groupe <span className="font-bold">{g.groupe}</span> : {g.n} votes, du {dateCourte(g.du)} au {dateCourte(g.au)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-gris">Aucun groupe de 5 votes ou plus.</p>
              )}
            </div>
            <div className="bg-white border border-filet rounded-xl p-3">
              <p className="font-bold text-[15px] mb-1">Numéros refusés (empreintes)</p>
              {numerosRefuses.length ? (
                <ul className="text-[14px] space-y-1">
                  {numerosRefuses.map(([k, n]) => (
                    <li key={k}>
                      {k === PERSONNE ? k : <>Numéro du vote <span className="font-bold">{k}</span></>} : {n} tentative{n > 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-gris">Aucune tentative refusée.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
