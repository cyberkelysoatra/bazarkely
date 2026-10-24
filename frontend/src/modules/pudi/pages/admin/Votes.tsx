// Vote by vote (administrators only): filters, masking with a reason, CSV export.
// No e-mail reaches this screen. PUDI-CC-17: « Numéro connu » shows a number only when it is
// already in a manager's member list (server function, journaled); never exported.
import { useEffect, useMemo, useState } from 'react';
import { Icone } from '../../composants/Icones';
import { PROFIL_VALEURS } from '../../data';
import { fr } from '../../i18n/fr';
import { frPages } from '../../i18n/frPages';
import { useDonnees } from '../../PudiContexte';
import { lireCanaux, lireNumerosConnus, lireVotes, masquerVote, type VoteAdmin } from '../../appels/admin';
import { csvVotes, dateHeureMada, nomFichierVotes, telechargerFichier, voteA3Voix } from '../../utils/exports';
import { normaliserTelephoneAffichage, texteVoix } from '../../utils/regles';
import { dateJour } from '../../utils/format';
import { Aide, Dialogue, Erreur, champ, petitBouton, useAppel, type DemandeConfirmation } from './communs';
import { FormulaireProposition, type DemandeProposition } from './FormulaireProposition';
import { usePudi } from '../../PudiContexte';

type Tri = 'tous' | 'oui' | 'non';

function Badge({ children, ton }: { children: string; ton: 'test' | 'masque' | 'info' | 'alerte' }) {
  const c = {
    test: 'bg-[#FFF6E0] text-[#7A5306] border-[#E9D29A]',
    masque: 'bg-[#EFEBE4] text-[#2F3547] border-filet',
    info: 'bg-[#EAF0FF] text-marine border-[#C9D6F5]',
    alerte: 'bg-[#FDF1EC] text-[#9C3F21] border-[#F0CDBF]'
  }[ton];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.75rem] font-bold ${c}`}>{children}</span>;
}

export default function Votes() {
  const { donnees } = useDonnees();
  const appel = useAppel(async () => {
    const [votes, canaux, numeros] = await Promise.all([lireVotes(), lireCanaux(), lireNumerosConnus().catch(() => null)]);
    return { votes, canaux, numeros: new Map((numeros ?? []).map((x) => [x.id_anonyme, x.numero])), numerosLus: !!numeros };
  });
  const [canal, setCanal] = useState('');
  const [profil, setProfil] = useState('');
  const [fkt, setFkt] = useState('');
  const [masque, setMasque] = useState<Tri>('tous');
  const [reseau, setReseau] = useState<Tri>('tous');
  const [test, setTest] = useState<Tri>('tous');
  const [trois, setTrois] = useState<Tri>('tous');
  const [recherche, setRecherche] = useState('');
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [formulaire, setFormulaire] = useState<DemandeProposition | null>(null);
  const [transforme, setTransforme] = useState<string | null>(null);
  const { etat } = usePudi();
  const regleAt = etat?.regle_voix_at ?? null;
  useEffect(() => {
    if (!transforme) return;
    const id = window.setTimeout(() => setTransforme(null), 6000);
    return () => window.clearTimeout(id);
  }, [transforme]);

  const votes = appel.donnees?.votes ?? [];
  const filtres = useMemo(() => {
    const tri = (t: Tri, v: boolean) => t === 'tous' || (t === 'oui') === v;
    const q = recherche.trim().toUpperCase();
    return votes.filter(
      (v) =>
        (!canal || (canal === '(aucun)' ? !v.canal_code : v.canal_code === canal)) &&
        (!profil || v.profil === profil) &&
        (!fkt || v.fokontany === fkt) &&
        tri(masque, v.masque) &&
        tri(reseau, v.dans_nos_reseaux) &&
        tri(test, v.est_test) &&
        tri(trois, voteA3Voix(v, regleAt)) &&
        (!q || v.id_anonyme.toUpperCase().includes(q))
    );
  }, [votes, canal, profil, fkt, masque, reseau, test, trois, regleAt, recherche]);

  const nomCanal = (code: string | null) =>
    code ? appel.donnees?.canaux.find((c) => c.code === code)?.nom ?? code : 'Sans lien de canal';
  const nomFkt = (v: VoteAdmin) =>
    v.fokontany === 'AUTRE'
      ? `${frPages.resultats.autreFokontany}${v.fokontany_autre ? ` (${v.fokontany_autre})` : ''}`
      : donnees?.fokontany.find((f) => f.ceni === v.fokontany)?.affichage ?? v.fokontany;
  const nomProfil = (p: string) => (fr.envoi.profils as Record<string, string>)[p] ?? p;

  const masquer = (v: VoteAdmin) =>
    setDemande({
      titre: v.masque ? `Réafficher le vote ${v.id_anonyme} ?` : `Masquer le vote ${v.id_anonyme} ?`,
      texte: v.masque
        ? 'Le vote sera de nouveau compté dans les résultats. Le motif est inscrit au journal.'
        : "Le vote ne sera plus compté dans les résultats. Il n'est pas supprimé : vous pourrez le réafficher. Le motif est inscrit au journal.",
      motif: true,
      libelleOk: v.masque ? 'Réafficher' : 'Masquer',
      action: async (motif) => {
        await masquerVote(v.id_anonyme, !v.masque, motif);
        await appel.recharger();
      }
    });

  const selection = (id: string, valeur: string, set: (v: string) => void, options: [string, string][], libelle: string) => (
    <label className="block min-w-0" htmlFor={id}>
      <span className="block text-[0.8125rem] text-gris mb-0.5">{libelle}</span>
      <select id={id} className={champ} value={valeur} onChange={(e) => set(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const triOptions = (oui: string, non: string): [string, string][] => [
    ['tous', 'Tous'],
    ['oui', oui],
    ['non', non]
  ];

  return (
    <div>
      <Aide titre="Votes un par un">
        <p>Chaque vote est identifié par un code anonyme (V-…). Ni adresse e-mail ni numéro de téléphone ne sont affichés ni exportés.</p>
        <p>« Masquer » retire un vote des résultats sans le supprimer, avec un motif obligatoire inscrit au journal. « Réafficher » le remet.</p>
        <p>« Plusieurs groupes » : le numéro figure dans les listes de plusieurs canaux.</p>
        <p>Le fichier CSV s'ouvre dans Excel (séparateur point-virgule, dates en heure de Madagascar).</p>
        <p>« Voix » : depuis le changement de règle, chaque votant a 12 voix et peut en mettre plusieurs sur un même programme (A4 ×5 = 5 voix sur A4). Les votes envoyés avant n'ont que 3 voix : le filtre « Votes à 3 voix » les retrouve, pour proposer à leurs auteurs de compléter.</p>
        <p>« Numéro connu » : le numéro du votant s'affiche seulement s'il figure déjà dans la liste d'un groupe saisie par un responsable (Mon groupe), sinon « inconnu ». Chaque consultation de cet écran est inscrite au journal. Le numéro n'est jamais exporté.</p>
      </Aide>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <label className="block col-span-2 lg:col-span-1" htmlFor="pudi-v-q">
          <span className="block text-[0.8125rem] text-gris mb-0.5">Rechercher un code</span>
          <input id="pudi-v-q" className={champ} placeholder="V-…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </label>
        {selection('pudi-v-c', canal, setCanal, [['', 'Tous les canaux'], ...(appel.donnees?.canaux ?? []).map((c): [string, string] => [c.code, c.nom]), ['(aucun)', 'Sans lien de canal']], 'Canal')}
        {selection('pudi-v-p', profil, setProfil, [['', 'Tous les profils'], ...PROFIL_VALEURS.map((p): [string, string] => [p, nomProfil(p)])], 'Profil')}
        {selection(
          'pudi-v-f',
          fkt,
          setFkt,
          [['', 'Tous les fokontany'], ...(donnees?.fokontany ?? []).map((f): [string, string] => [f.ceni ?? 'AUTRE', f.affichage])],
          'Fokontany'
        )}
        {selection('pudi-v-m', masque, (v) => setMasque(v as Tri), triOptions('Masqués', 'Comptés'), 'Masqués')}
        {selection('pudi-v-r', reseau, (v) => setReseau(v as Tri), triOptions('Dans nos réseaux', 'Hors réseaux'), 'Réseaux')}
        {selection('pudi-v-t', test, (v) => setTest(v as Tri), triOptions('Votes de test', 'Votes réels'), 'Test')}
        {selection(
          'pudi-v-3',
          trois,
          (v) => setTrois(v as Tri),
          triOptions(regleAt ? `Votes à 3 voix (avant le ${dateJour(regleAt)})` : 'Votes à 3 voix', 'Votes à la nouvelle règle'),
          'Voix'
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[0.875rem] text-gris">
          {filtres.length} vote{filtres.length > 1 ? 's' : ''} sur {votes.length}
        </p>
        <div className="flex gap-2">
          <button type="button" className={petitBouton} onClick={() => void appel.recharger()} disabled={appel.charge}>
            <Icone nom="actualiser" className="w-4 h-4" />
            Actualiser
          </button>
          <button
            type="button"
            className={petitBouton}
            disabled={!filtres.length}
            onClick={() => telechargerFichier(csvVotes(filtres), nomFichierVotes(), 'text/csv;charset=utf-8')}
          >
            <Icone nom="telecharger" className="w-4 h-4" />
            Exporter (CSV)
          </button>
        </div>
      </div>

      {appel.charge && !appel.donnees ? (
        <p className="text-gris py-6 text-center">{fr.app.chargement}</p>
      ) : !filtres.length ? (
        <p className="text-gris py-6 text-center">Aucun vote ne correspond.</p>
      ) : (
        <ul className="grid lg:grid-cols-2 gap-2">
          {filtres.map((v) => (
            <li key={v.id_anonyme} className={`bg-white border rounded-xl p-3 ${v.masque ? 'border-dashed border-gris/40 opacity-80' : 'border-filet'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-titre text-[1rem] text-marine">{v.id_anonyme}</span>
                {v.est_test && <Badge ton="test">test</Badge>}
                {v.masque && <Badge ton="masque">masqué</Badge>}
                {v.dans_nos_reseaux && <Badge ton="info">dans nos réseaux</Badge>}
                {v.groupes.length > 1 && <Badge ton="info">plusieurs groupes</Badge>}
                {v.hors_liste_du_canal && <Badge ton="alerte">hors liste du groupe</Badge>}
                <button
                  type="button"
                  className={`${petitBouton} ml-auto`}
                  onClick={() => masquer(v)}
                  aria-label={`${v.masque ? 'Réafficher' : 'Masquer'} le vote ${v.id_anonyme}`}
                >
                  <Icone nom={v.masque ? 'oeil' : 'oeilBarre'} className="w-4 h-4" />
                  {v.masque ? 'Réafficher' : 'Masquer'}
                </button>
              </div>
              <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[0.875rem]">
                <dt className="text-gris">Fokontany</dt>
                <dd className="break-words">{nomFkt(v)}</dd>
                <dt className="text-gris">Profil</dt>
                <dd>{nomProfil(v.profil)}</dd>
                <dt className="text-gris">Canal</dt>
                <dd className="break-words">{nomCanal(v.canal_code)}</dd>
                {v.groupes.length > 0 && (
                  <>
                    <dt className="text-gris">Groupes</dt>
                    <dd className="break-words">{v.groupes.join(', ')}</dd>
                  </>
                )}
                <dt className="text-gris">Voix</dt>
                <dd className="break-words" data-voix-admin={v.priorites.length}>
                  {v.priorites.length}/12 · {texteVoix(v.priorites)}
                  {voteA3Voix(v, regleAt) && ' (vote à 3 voix)'}
                </dd>
                <dt className="text-gris">Numéro connu</dt>
                <dd data-numero-connu={appel.donnees?.numeros.get(v.id_anonyme) ? 'oui' : 'non'}>
                  {(() => {
                    const n = appel.donnees?.numeros.get(v.id_anonyme);
                    if (!appel.donnees?.numerosLus) return 'non disponible';
                    return n ? normaliserTelephoneAffichage(n) ?? n : 'inconnu';
                  })()}
                </dd>
                <dt className="text-gris">Urgents</dt>
                <dd className="break-words">{v.urgents.length ? v.urgents.join(', ') : 'aucun'}</dd>
                {v.manquant && (
                  <>
                    <dt className="text-gris">Manquant</dt>
                    <dd className="break-words whitespace-pre-wrap">
                      {v.manquant}
                      <button
                        type="button"
                        className={`${petitBouton} mt-1 flex`}
                        disabled={!!etat?.clos}
                        onClick={() => setFormulaire({ t: 'transformer', idAnonyme: v.id_anonyme, texte: v.manquant ?? '' })}
                      >
                        <Icone nom="ampoule" className="w-4 h-4" />
                        Transformer en proposition
                      </button>
                    </dd>
                  </>
                )}
                <dt className="text-gris">Envoyé</dt>
                <dd>
                  {dateHeureMada(v.cree_le)}
                  {v.nb_modifications > 0 && ` · modifié ${v.nb_modifications} fois (${dateHeureMada(v.modifie_le)})`}
                </dd>
                {v.groupe_ip && (
                  <>
                    <dt className="text-gris">Groupe IP</dt>
                    <dd>{v.groupe_ip}</dd>
                  </>
                )}
                {v.masque && v.masque_motif && (
                  <>
                    <dt className="text-gris">Motif</dt>
                    <dd className="break-words">{v.masque_motif}</dd>
                  </>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
      <FormulaireProposition demande={formulaire} fermer={() => setFormulaire(null)} enregistre={(id) => setTransforme(id)} />
      {transforme && (
        <p role="status" className="fixed bottom-20 left-3 right-3 sm:left-auto sm:w-96 z-[60] bg-marine text-white rounded-xl px-4 py-3 text-[0.9375rem] font-bold shadow-xl">
          Proposition {transforme} créée : voir l'onglet Propositions.
        </p>
      )}
    </div>
  );
}
