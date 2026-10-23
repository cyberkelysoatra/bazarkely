// PUDI-CC-11: « Parcours des visiteurs (anonyme) » card of the Suivi screen. Seven steps as a
// funnel with the share of the visits, the real votes for comparison, a channel filter and the
// date the measure started.
import { useEffect, useRef, useState } from 'react';
import { lireParcours } from '../../appels/admin';
import { ETAPES_PARCOURS, pctVisites, type EtapeParcours } from '../../utils/apercu';
import { dateCourte } from '../../utils/format';
import { Aide, Erreur, Titre2, champ, useAppel } from './communs';
import FrequentationEnDirect from './Frequentation';

const LIBELLES: Record<EtapeParcours, string> = {
  visite: 'Ont ouvert la consultation',
  fiche: 'Ont ouvert une fiche de projet',
  choix_commence: 'Ont commencé leur choix',
  choix_complet: 'Ont choisi leurs 3 priorités',
  envoyer: "Ont ouvert l'écran d'envoi",
  connecte: 'Se sont connectés avec Google',
  vote: 'Ont envoyé leur vote'
};

export const SANS_CANAL = '(aucun)';

export default function ParcoursVisiteurs({ nomCanal, codes }: { nomCanal: (code: string) => string; codes: string[] }) {
  const [canal, setCanal] = useState<string>('');
  const appel = useAppel(() => lireParcours(canal || null));
  // Reload only when the channel changes (the first read is done by useAppel).
  const canalLu = useRef(canal);
  const { recharger } = appel;
  useEffect(() => {
    if (canalLu.current === canal) return;
    canalLu.current = canal;
    void recharger();
  }, [canal, recharger]);
  const p = appel.donnees;
  const visites = p?.etapes.visite ?? 0;
  const options = [...new Set([...codes, ...(p?.canaux ?? [])])].sort((a, b) => nomCanal(a).localeCompare(nomCanal(b), 'fr'));

  return (
    <section data-parcours="">
      <Titre2 aide="Aucun compte, aucun numéro : un identifiant tiré au hasard par navigateur.">Parcours des visiteurs (anonyme)</Titre2>
      <FrequentationEnDirect nomCanal={nomCanal} />
      <Aide titre="Comment lire ce parcours ?">
        <p>Chaque ligne compte les navigateurs qui ont atteint cette étape au moins une fois, et leur part des visites.</p>
        <p>« Ont ouvert la consultation » : première page affichée. « Fiche de projet » : un programme ou une proposition ouvert. « Commencé leur choix » : une première priorité cochée. « 3 priorités » : choix complet. « Écran d'envoi » : la page qui demande la connexion Google. « Connectés » : session Google présente sur cette page. « Envoyé leur vote » : envoi réussi.</p>
        <p>Les nombres baissent d'une étape à l'autre : certains visiteurs regardent sans choisir, d'autres s'arrêtent à la connexion Google. Un visiteur qui change de téléphone ou de navigateur compte deux fois.</p>
        <p>« Votes réels comptés » vient de la liste des votes (sans votes masqués ni votes de test) : il peut dépasser « Ont envoyé leur vote » pour les votes arrivés avant le début de la mesure.</p>
      </Aide>
      <label className="block mb-3">
        <span className="block text-[0.8125rem] text-gris mb-1">Canal</span>
        <select className={champ} value={canal} onChange={(e) => setCanal(e.target.value)} data-parcours-canal="">
          <option value="">Tous les canaux</option>
          {options.map((c) => (
            <option key={c} value={c}>
              {nomCanal(c)}
            </option>
          ))}
          <option value={SANS_CANAL}>Sans canal</option>
        </select>
      </label>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}
      {p && (
        <div className="bg-white border border-filet rounded-xl p-3">
          <ol className="space-y-2">
            {ETAPES_PARCOURS.map((e) => {
              const n = p.etapes[e] ?? 0;
              const pct = pctVisites(n, visites);
              return (
                <li key={e} data-etape={e}>
                  <div className="flex items-baseline justify-between gap-2 text-[0.875rem]">
                    <span className="min-w-0">{LIBELLES[e]}</span>
                    <span className="shrink-0 font-bold">
                      {n} <span className="font-normal text-gris">({pct} %)</span>
                    </span>
                  </div>
                  <span className="mt-1 block h-2.5 rounded-full bg-vide overflow-hidden" aria-hidden="true">
                    <span className="block h-full bg-marine" style={{ width: `${pct}%` }} />
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 pt-3 border-t border-filet text-[0.875rem] flex justify-between gap-2" data-parcours-votes="">
            <span>Votes réels comptés</span>
            <span className="font-bold">{p.nb_votes}</span>
          </p>
          <p className="mt-2 text-[0.8125rem] text-gris" data-parcours-debut="">
            {p.debut
              ? `Mesure commencée le ${dateCourte(p.debut)} : les visites antérieures ne sont pas comptées.`
              : 'Mesure pas encore commencée : aucune visite enregistrée.'}
          </p>
        </div>
      )}
    </section>
  );
}
