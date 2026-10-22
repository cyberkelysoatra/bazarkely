// Journal of the administration actions (last 500): nothing is ever deleted silently.
import { Icone } from '../../composants/Icones';
import { fr } from '../../i18n/fr';
import { lireJournal, type EntreeJournal } from '../../appels/admin';
import { dateHeureMada } from '../../utils/exports';
import { Aide, Erreur, petitBouton, useAppel } from './communs';

const ACTIONS: Record<string, string> = {
  masquer_vote: 'Vote masqué',
  reafficher_vote: 'Vote réaffiché',
  changer_cloture: 'Date de clôture changée',
  publier: 'Consultation publiée',
  depublier: 'Consultation dépubliée',
  enregistrer_canal: 'Canal enregistré',
  importer_liste: 'Liste de numéros importée',
  supprimer_liste: 'Liste de numéros supprimée',
  nommer_admin: 'Organisateur nommé',
  retirer_admin: 'Organisateur retiré',
  liberer_numero: 'Numéro libéré',
  purge: 'Données personnelles purgées',
  ajouter_proposition: 'Proposition ajoutée',
  modifier_proposition: 'Proposition modifiée',
  retirer_proposition: 'Proposition retirée',
  retablir_proposition: 'Proposition rétablie',
  masquage_auto: 'Vote masqué automatiquement (même personne)',
  masquage_retabli: 'Vote masqué rétabli',
  vote_refuse: 'Vote refusé'
};

const CLES: Record<string, string> = {
  motif: 'motif',
  avant: 'avant',
  apres: 'après',
  nom: 'nom',
  actif: 'actif',
  source: 'source',
  recus: 'reçus',
  valides: 'enregistrés',
  invalides: 'invalides',
  votes_test_supprimes: 'votes de test supprimés',
  votes: 'votes',
  contacts: 'numéros codés',
  liste: 'liste',
  intitule: 'titre',
  origine_vote: 'vote d’origine',
  efface: 'supprimée',
  masquage: 'référence',
  canal: 'canal',
  automatique: 'automatique',
  whatsapp: 'numéro WhatsApp',
  membre: 'ligne',
  auteur_ligne: 'auteur de la ligne (compte)',
  date: 'date'
};

function details(e: EntreeJournal): string {
  if (!e.details) return '';
  return Object.entries(e.details)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      let val = typeof v === 'boolean' ? (v ? 'oui' : 'non') : String(v);
      if ((k === 'avant' || k === 'apres' || k === 'date') && typeof v === 'string') val = dateHeureMada(v);
      return `${CLES[k] ?? k} : ${val}`;
    })
    .join(' · ');
}

export default function Journal() {
  const appel = useAppel(lireJournal);
  const liste = appel.donnees ?? [];
  return (
    <div>
      <Aide titre="Journal des actions">
        <p>Chaque action des organisateurs est inscrite ici : masquage, libération d'un numéro, canaux, listes, clôture, publication. Rien n'est supprimé en silence.</p>
        <p>Les 500 dernières actions sont affichées, de la plus récente à la plus ancienne (heure de Madagascar).</p>
      </Aide>
      <div className="flex justify-end mb-3">
        <button type="button" className={petitBouton} onClick={() => void appel.recharger()} disabled={appel.charge}>
          <Icone nom="actualiser" className="w-4 h-4" />
          Actualiser
        </button>
      </div>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}
      {appel.charge && !appel.donnees ? (
        <p className="text-gris py-6 text-center">{fr.app.chargement}</p>
      ) : !liste.length ? (
        <p className="text-gris py-6 text-center">Aucune action pour le moment.</p>
      ) : (
        <ul className="bg-white border border-filet rounded-xl divide-y divide-filet">
          {liste.map((e, i) => (
            <li key={`${e.at}-${i}`} className="px-3 py-2.5 text-[14px]" data-action={e.action}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-bold text-marine">{ACTIONS[e.action] ?? e.action}</span>
                {e.cible && <span className="font-mono break-all">{e.cible}</span>}
                <span className="ml-auto text-gris whitespace-nowrap">{dateHeureMada(e.at)}</span>
              </div>
              <p className="text-gris break-all">{e.email ?? 'serveur (tâche planifiée)'}</p>
              {details(e) && <p className="break-words">{details(e)}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
