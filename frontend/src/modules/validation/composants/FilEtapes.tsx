// « Les étapes de votre projet » (VC-46): the five steps of the cycle, the current one, the ones
// Joël marked passed (RM2). Full card on the home page; one line on the pages of a questionnaire,
// which a tap unfolds into the full card. Computed from the data kept on the phone (offline too).
import { useId, useState } from 'react';
import { Icone } from './Icones';
import { etapeDuType, etatsEtapes, ligneEtape, majuscule, phraseDefinition, type DocEtape, type Etape, type EtatEtape } from '../utils/etapes';

export function FilEtapes({ docs }: { docs: DocEtape[] | null | undefined }) {
  const etats = etatsEtapes(docs);
  if (!etats) return null;
  return (
    <section className="bg-white border border-[#d6e4ef] rounded-[14px] p-4 flex flex-col gap-1" aria-labelledby="titre-etapes" data-fil-etapes="">
      <h2 id="titre-etapes" className="text-[17px] leading-[1.3] font-bold m-0 mb-1">
        Les étapes de votre projet
      </h2>
      <ol className="list-none m-0 p-0 flex flex-col">
        {etats.map(({ etape, etat }) => (
          <LigneFil key={etape.type} etape={etape} etat={etat} />
        ))}
      </ol>
    </section>
  );
}

function LigneFil({ etape, etat }: { etape: Etape; etat: EtatEtape }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const avenir = etat === 'a_venir';
  return (
    <li className="flex gap-3 items-start py-2 border-b border-[#e2e8f0] last:border-b-0" data-etape-fil={etape.n} data-etat-etape={etat}>
      <Rond etape={etape} etat={etat} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[15px] leading-[1.35] pt-[3px] ${avenir ? 'text-[#64748b] font-medium' : 'text-encre font-semibold'}`}>{majuscule(etape.nom)}</span>
          {etat === 'en_cours' && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-clair text-[#075985] flex-none mt-0.5" data-pastille-en-cours="">
              En cours
            </span>
          )}
        </div>
        <button
          type="button"
          className={`self-start min-h-11 -my-1 text-left text-[13px] bg-transparent border-0 p-0 cursor-pointer underline decoration-dotted underline-offset-[3px] ${avenir ? 'text-[#64748b]' : 'text-ciel'}`}
          aria-expanded={ouvert}
          aria-controls={id}
          onClick={() => setOuvert((o) => !o)}
          data-terme={etape.type}
        >
          ({etape.terme})
        </button>
        {ouvert && (
          <p id={id} className="text-[13px] text-doux leading-[1.45] m-0 mb-1" data-definition={etape.type}>
            {phraseDefinition(etape)}
          </p>
        )}
        {etat === 'franchie' && (
          <span className="text-[13px] font-semibold text-[#15803d]" data-validee="">
            Validée
          </span>
        )}
        {etat === 'verification' && (
          <span className="text-[13px] font-semibold text-[#92400e]" data-verification="">
            En vérification chez CyberKELY
          </span>
        )}
      </div>
    </li>
  );
}

function Rond({ etape, etat }: { etape: Etape; etat: EtatEtape }) {
  const base = 'w-7 h-7 rounded-full flex-none flex items-center justify-center text-[14px] font-bold box-border';
  if (etat === 'franchie')
    return (
      <span className={`${base} bg-[#15803d] text-white`} aria-hidden="true">
        <Icone nom="coche" epaisseur={3} className="w-4 h-4" />
      </span>
    );
  if (etat === 'verification')
    return (
      <span className={`${base} bg-[#fef3c7] text-[#92400e]`} aria-hidden="true">
        <Icone nom="horloge" epaisseur={2.2} className="w-4 h-4" />
      </span>
    );
  if (etat === 'en_cours')
    return (
      <span className={`${base} bg-[#0369a1] text-white`} aria-hidden="true">
        {etape.n}
      </span>
    );
  return (
    <span className={`${base} border-2 border-[#94a3b8] text-[#94a3b8] bg-white`} aria-hidden="true">
      {etape.n}
    </span>
  );
}

/** « Étape <n> sur 5 : <Nom simple> (<terme>) » under the header; a tap unfolds the full card in place. */
export function LigneEtapes({ type, docs }: { type: string | null | undefined; docs: DocEtape[] | null | undefined }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const etape = etapeDuType(type);
  if (!etape || !etatsEtapes(docs)) return null;
  return (
    <div className="flex flex-col gap-2" data-ligne-etapes={etape.n}>
      <button
        type="button"
        className="flex items-center justify-between gap-2 min-h-11 px-3 py-1.5 rounded-xl bg-white border border-[#d6e4ef] text-left text-[14px] font-semibold text-ciel cursor-pointer"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        data-deplier-etapes=""
      >
        <span className="min-w-0">
          {ligneEtape(etape).slice(0, -(etape.terme.length + 2))}
          <span className="whitespace-nowrap">({etape.terme})</span>
        </span>
        <span className={`flex-none transition-transform motion-reduce:transition-none ${ouvert ? 'rotate-180' : ''}`}>
          <Icone nom="chevron" className="w-5 h-5" />
        </span>
      </button>
      {ouvert && (
        <div id={id}>
          <FilEtapes docs={docs} />
        </div>
      )}
    </div>
  );
}
