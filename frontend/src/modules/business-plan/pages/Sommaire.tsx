// Contents /plan/p/:id: the 11 sections in order, progress of each, global progress, and the trainer
// tracking of the NEC 2026 training (status pill in the header, join or stop sending).
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePlan } from '../etat/usePlan';
import { RUBRIQUES, progressionGlobale } from '../rubriques/registre';
import { Mise } from '../composants/Mise';
import { Progression } from '../composants/Progression';
import { Icone } from '../composants/Icones';
import { arreterEnvoi, texteStatut, useLien, type Lien } from '../sync';
import { Introuvable } from './Introuvable';
import type { Plan } from '../types';
import { pretestDe, score } from '../utils/pretest';

function Pastille({ lien }: { lien: Lien }) {
  const { texte, ton } = texteStatut(lien);
  const couleur = ton === 'ok' ? 'bg-turquoiseClair text-turquoiseTexte' : ton === 'refus' ? 'bg-white text-alerte' : 'bg-white/90 text-violet';
  return (
    <span role="status" className={`bp-pastille mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold ${couleur}`}>
      <Icone nom={ton === 'refus' ? 'alerte' : ton === 'ok' ? 'coche' : 'avion'} className="w-4 h-4" />
      {texte}
    </span>
  );
}

function Formation({ planId, lien }: { planId: string; lien: Lien | null | undefined }) {
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  if (lien === undefined) return null;
  if (!lien) {
    return (
      <Link to={`/p/${planId}/formation`} className="bp-rejoindre mb-4 flex items-center gap-3 rounded-2xl border-2 border-turquoise bg-white p-3.5 active:bg-turquoiseClair">
        <span className="shrink-0 w-9 h-9 rounded-full bg-turquoiseClair text-turquoiseTexte flex items-center justify-center">
          <Icone nom="partager" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold text-encre">Rejoindre la formation</span>
          <span className="block text-[14px] text-doux leading-snug">Le formateur suit votre travail pour vous aider</span>
        </span>
        <span className="text-doux shrink-0">
          <Icone nom="chevron" />
        </span>
      </Link>
    );
  }
  const arreter = async () => {
    setEnCours(true);
    try {
      await arreterEnvoi(planId);
    } finally {
      setEnCours(false);
      setConfirmer(false);
    }
  };
  return (
    <div className="mb-4 rounded-2xl border border-filet bg-white p-3.5">
      <p className="text-[15px] text-encre leading-snug">
        Formation <b>{lien.code}</b> : le formateur voit ce projet sous le prénom <b>{lien.prenom}</b>.
      </p>
      {confirmer ? (
        <div className="mt-3">
          <p className="text-[15px] font-bold text-encre leading-snug">Arrêter l'envoi ? Votre projet sera effacé du serveur du formateur. Il reste sur votre téléphone.</p>
          <div className="mt-2.5 flex gap-2.5">
            <button type="button" onClick={arreter} disabled={enCours} className="flex-1 min-h-[44px] rounded-xl bg-alerte text-white font-bold disabled:opacity-60">
              Arrêter
            </button>
            <button type="button" onClick={() => setConfirmer(false)} className="flex-1 min-h-[44px] rounded-xl border-2 border-filet text-encre font-bold">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmer(true)} className="mt-2.5 w-full min-h-[44px] rounded-xl border-2 border-filet text-encre font-bold">
          Arrêter l'envoi
        </button>
      )}
    </div>
  );
}

/** NEC-CC-16: entry to the pre-test (not done yet) or to the path (done), above the sections. */
function CartePretest({ plan }: { plan: Plan }) {
  const t = pretestDe(plan);
  const fait = !!t.valideLe;
  return (
    <Link to={`/p/${plan.id}/pretest`} className="bp-carte-pretest mb-4 flex items-center gap-3 rounded-2xl border-2 border-violet bg-white p-3.5 active:bg-violetClair">
      <span className="shrink-0 w-9 h-9 rounded-full bg-violetClair text-violet flex items-center justify-center">
        <Icone nom={fait ? 'coche' : 'livre'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold text-encre">Mon pré-test</span>
        <span className="block text-[14px] text-doux leading-snug">{fait ? `Ton parcours : ${score(t)}/15` : 'Fais ton pré-test (5 min)'}</span>
      </span>
      <span className="text-doux shrink-0">
        <Icone nom="chevron" />
      </span>
    </Link>
  );
}

export default function Sommaire() {
  const { id } = useParams();
  const { etat } = usePlan(id);
  const lien = useLien(id);
  if (etat.statut === 'chargement') return <Mise titre="Mon business plan">{null}</Mise>;
  if (etat.statut === 'absent') return <Introuvable />;
  const plan = etat.plan;
  return (
    <Mise
      titre={plan.identite.nomProjet.trim() || 'Projet sans nom'}
      sousTitre={
        <>
          Sommaire du cahier
          {lien ? (
            <span className="block">
              <Pastille lien={lien} />
            </span>
          ) : null}
        </>
      }
      retour={{ vers: '/', texte: 'Mes projets' }}
      plan={plan}
    >
      {plan.exemple ? null : <Formation planId={plan.id} lien={lien} />}
      <div className="rounded-2xl bg-violetClair p-4 mb-4">
        <p className="text-[15px] font-bold text-violet mb-2">Mon cahier est rempli à</p>
        <Progression pct={progressionGlobale(plan)} label="Avancement du cahier" />
      </div>
      {plan.exemple ? null : <CartePretest plan={plan} />}
      <ol className="space-y-2.5">
        {RUBRIQUES.map((r, i) => (
          <li key={r.id}>
            <Link to={`/p/${plan.id}/${r.chemin}`} className="bp-rubrique flex items-center gap-3 rounded-2xl border border-filet bg-white p-3.5 active:bg-violetClair">
              <span className="shrink-0 w-9 h-9 rounded-full bg-turquoiseClair text-turquoiseTexte font-bold flex items-center justify-center">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold text-encre leading-snug break-words">{r.titre}</span>
                <span className="block text-[14px] text-doux leading-snug">{r.sousTitre}</span>
                <span className="block mt-1.5">
                  <Progression pct={r.progression(plan)} compact label={`Avancement : ${r.titre}`} />
                </span>
              </span>
              <span className="text-doux shrink-0">
                <Icone nom="chevron" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        to={`/p/${plan.id}/exporter`}
        className="bp-exporter mt-4 flex items-center gap-3 rounded-2xl bg-violet p-3.5 text-white active:opacity-90"
      >
        <span className="shrink-0 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <Icone nom="partager" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold leading-snug">Exporter</span>
          <span className="block text-[14px] opacity-90 leading-snug">PDF, texte WhatsApp, sauvegarde</span>
        </span>
        <span className="shrink-0">
          <Icone nom="chevron" />
        </span>
      </Link>
    </Mise>
  );
}
