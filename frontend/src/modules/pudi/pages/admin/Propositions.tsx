// Administration · « Propositions » (own lazy chunk): projects outside the PUDi list, their real
// votes, withdrawal (deleted when nobody chose it, masked otherwise), and the voters' free texts
// that can become proposals.
import { useMemo, useState } from 'react';
import { Icone } from '../../composants/Icones';
import { fr } from '../../i18n/fr';
import { usePudi } from '../../PudiContexte';
import {
  lirePropositionsAdmin,
  lireVotes,
  retablirProposition,
  retirerProposition,
  type PropositionAdmin
} from '../../appels/admin';
import { rafraichirPropositions } from '../../appels/propositions';
import { dateHeureMada } from '../../utils/exports';
import { dateJour } from '../../utils/format';
import { Aide, Dialogue, Erreur, Titre2, petitBouton, useAppel, type DemandeConfirmation } from './communs';
import { FormulaireProposition, type DemandeProposition } from './FormulaireProposition';

export default function Propositions() {
  const { etat } = usePudi();
  const clos = !!etat?.clos;
  const appel = useAppel(async () => {
    const [propositions, votes] = await Promise.all([lirePropositionsAdmin(), lireVotes()]);
    return { propositions, votes };
  });
  const [formulaire, setFormulaire] = useState<DemandeProposition | null>(null);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const textes = useMemo(
    () =>
      (appel.donnees?.votes ?? [])
        .filter((v) => v.manquant)
        .sort((a, b) => Date.parse(b.cree_le) - Date.parse(a.cree_le)),
    [appel.donnees]
  );

  // After any change: admin list, and the public list kept on this device.
  const actualiser = async () => {
    await appel.recharger();
    void rafraichirPropositions().catch(() => undefined);
  };

  const retirer = (p: PropositionAdmin) =>
    setDemande({
      titre: `Retirer ${p.id} ?`,
      texte: (
        <>
          <p>« {p.intitule} »</p>
          <p>
            Elle est masquée, jamais supprimée : elle disparaît du choix et des résultats publics, les votes qui la citent sont conservés, et
            « Rétablir » la remet en place. Le motif est inscrit au journal.
          </p>
        </>
      ),
      motif: true,
      libelleOk: 'Retirer',
      danger: true,
      action: async (motif) => {
        const r = await retirerProposition(p.id, motif);
        setMessage(
          r.votes
            ? `Masquée : ${r.votes} vote${r.votes > 1 ? 's' : ''} la ${r.votes > 1 ? 'citent' : 'cite'}, ${r.votes > 1 ? 'ils sont conservés' : 'il est conservé'}.`
            : 'Masquée (aucun vote ne la cite). « Rétablir » la remet en place.'
        );
        await actualiser();
      }
    });

  const retablir = (p: PropositionAdmin) =>
    setDemande({
      titre: `Rétablir ${p.id} ?`,
      texte: <p>La proposition « {p.intitule} » sera de nouveau proposée au choix et comptée dans les résultats.</p>,
      libelleOk: 'Rétablir',
      action: async () => {
        await retablirProposition(p.id);
        setMessage(`${p.id} : rétablie.`);
        await actualiser();
      }
    });

  const liste = appel.donnees?.propositions ?? [];
  return (
    <div>
      <Aide titre="Propositions de nouveaux projets">
        <p>
          Une demande déjà prévue dans le PUDi ne devient pas une proposition : retrouvez son programme avec « Trouver un projet ». Une
          proposition ajoutée tard est signalée comme telle dans la synthèse.
        </p>
        <p>Les propositions sont comptées à part dans les résultats, jamais mêlées aux 52 programmes. Les nombres de votes ci-dessous ne comptent que les votes réels (ni test, ni masqués).</p>
        <p>« Retirer » demande un motif : la proposition est masquée, jamais supprimée (les votes restent), et « Rétablir » la remet en place.</p>
      </Aide>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <button
          type="button"
          className={petitBouton}
          disabled={clos}
          title={clos ? 'La consultation est close : plus aucun ajout possible.' : undefined}
          onClick={() => setFormulaire({ t: 'ajout' })}
        >
          <Icone nom="plus" className="w-4 h-4" />
          Ajouter une proposition
        </button>
        <button type="button" className={petitBouton} onClick={() => void appel.recharger()} disabled={appel.charge}>
          <Icone nom="actualiser" className="w-4 h-4" />
          Actualiser
        </button>
      </div>
      {clos && <p className="text-[14px] text-gris mb-3">La consultation est close : plus aucun ajout possible.</p>}
      {message && (
        <p role="status" className="mb-3 border-l-4 border-marine bg-white rounded-r-lg px-3 py-2.5 text-[15px] font-bold text-marine">
          {message}
        </p>
      )}
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}

      {appel.charge && !appel.donnees ? (
        <p className="text-gris py-6 text-center">{fr.app.chargement}</p>
      ) : !liste.length ? (
        <p className="text-gris py-6 text-center">Aucune proposition.</p>
      ) : (
        <ul className="grid lg:grid-cols-2 gap-2">
          {liste.map((p) => (
            <li
              key={p.id}
              data-proposition={p.id}
              className={`rounded-xl p-3 border-2 border-dashed ${p.masque ? 'bg-white border-gris/40 opacity-80' : 'bg-sable border-marine/50'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-titre text-[16px] text-marine">{p.id}</span>
                {p.masque && (
                  <span className="inline-flex items-center rounded-full border border-filet bg-vide px-2 py-0.5 text-[12px] font-bold">masquée</span>
                )}
                <span className="ml-auto flex gap-1.5">
                  <button type="button" className={petitBouton} onClick={() => setFormulaire({ t: 'modif', p })} aria-label={`Modifier ${p.id}`}>
                    <Icone nom="crayon" className="w-4 h-4" />
                    Modifier
                  </button>
                  {p.masque ? (
                    <button type="button" className={petitBouton} onClick={() => retablir(p)} aria-label={`Rétablir ${p.id}`}>
                      <Icone nom="oeil" className="w-4 h-4" />
                      Rétablir
                    </button>
                  ) : (
                    <button type="button" className={petitBouton} onClick={() => retirer(p)} aria-label={`Retirer ${p.id}`}>
                      <Icone nom="poubelle" className="w-4 h-4" />
                      Retirer
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-1.5 font-bold text-[15px] leading-snug break-words">{p.intitule}</p>
              <dl className="mt-1.5 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-[14px]">
                {p.lieu && (
                  <>
                    <dt className="text-gris">Lieu</dt>
                    <dd className="break-words">{p.lieu}</dd>
                  </>
                )}
                <dt className="text-gris">Source</dt>
                <dd className="break-words">
                  {p.source}
                  {p.date_source ? ` (${dateJour(p.date_source)})` : ''}
                </dd>
                <dt className="text-gris">Ajoutée</dt>
                <dd>{dateHeureMada(p.ajoute_at)}</dd>
                <dt className="text-gris">Votes</dt>
                <dd>
                  priorité {p.nb_priorite} · urgent {p.nb_urgent}
                </dd>
                {p.origine_vote && (
                  <>
                    <dt className="text-gris">Vote d'origine</dt>
                    <dd className="font-mono">{p.origine_vote}</dd>
                  </>
                )}
                {p.masque && p.masque_motif && (
                  <>
                    <dt className="text-gris">Motif</dt>
                    <dd className="break-words">{p.masque_motif}</dd>
                  </>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <Titre2 aide="Le champ « Un projet manque au PUDi ? » des votes, du plus récent au plus ancien.">Textes libres des votants</Titre2>
      {!textes.length ? (
        <p className="text-gris text-[15px]">Aucun texte libre pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {textes.map((v) => (
            <li key={v.id_anonyme} className="bg-white border border-filet rounded-xl p-3" data-texte-libre={v.id_anonyme}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-titre text-[15px] text-marine">{v.id_anonyme}</span>
                {v.est_test && (
                  <span className="inline-flex items-center rounded-full border border-[#E9D29A] bg-[#FFF6E0] px-2 py-0.5 text-[12px] font-bold text-[#7A5306]">test</span>
                )}
                <span className="text-[13px] text-gris">{dateHeureMada(v.cree_le)}</span>
                <button
                  type="button"
                  className={`${petitBouton} ml-auto`}
                  disabled={clos}
                  onClick={() => setFormulaire({ t: 'transformer', idAnonyme: v.id_anonyme, texte: v.manquant ?? '' })}
                >
                  <Icone nom="ampoule" className="w-4 h-4" />
                  Transformer en proposition
                </button>
              </div>
              <p className="mt-1.5 text-[15px] whitespace-pre-wrap break-words">{v.manquant}</p>
            </li>
          ))}
        </ul>
      )}

      <FormulaireProposition
        demande={formulaire}
        fermer={() => setFormulaire(null)}
        enregistre={async (nid) => {
          setMessage(`${nid} : enregistrée.`);
          await actualiser();
        }}
      />
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </div>
  );
}
