// Module switcher bar of the header logo (VALIDCLIENT-CC-11, VC-45), copy of
// src/modules/pudi/composants/Commutateur.tsx (tiles, full page navigation). Own chunk, loaded on
// the first tap on the logo. Nothing imported from the host nor from PUDi.
import { useEffect, useRef, useState } from 'react';
import { oublierCommutateur, useFermetureCommutateur } from '../appels/commutateur';
import { rafraichirModules } from '../appels/modules';
import { BarreCommutateur } from './BarreCommutateur';
import type { IdModule, ModuleHote } from '../utils/modulesCompte';

const CASQUE =
  'M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5 M14 6a6 6 0 0 1 6 6v3 M4 15v-3a6 6 0 0 1 6-6 M3 15h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z';
const GOUTTE = 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z';

function Trace({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** PUDi tile: its icon, a coloured square when the image fails (offline, not cached). */
function TuilePudi({ base }: { base: string }) {
  const [rate, setRate] = useState(false);
  if (rate) return <span className={`${base} bg-[#0B2A8C] text-white font-extrabold text-[15px]`}>P</span>;
  return (
    <span className={`${base} overflow-hidden bg-white`}>
      <img src="/pudi/icones/pudi-icone-192.png" alt="" width={44} height={44} className="w-11 h-11 block" onError={() => setRate(true)} />
    </span>
  );
}

/** Simple coloured tiles in each module colour (never the host components). */
function Tuile({ id }: { id: IdModule }) {
  const base = 'w-11 h-11 rounded-xl flex items-center justify-center shadow-sm';
  if (id === 'bazarkely') return <span className={`${base} bg-[#7C3AED] text-white font-extrabold text-[20px]`}>B</span>;
  if (id === 'construction')
    return (
      <span className={`${base} bg-[#C2410C] text-white`}>
        <Trace d={CASQUE} />
      </span>
    );
  if (id === 'gestion-eau')
    return (
      <span className={`${base} bg-[#0F766E] text-white`}>
        <Trace d={GOUTTE} />
      </span>
    );
  if (id === 'pudi') return <TuilePudi base={base} />;
  return <span className={`${base} bg-[#FACC15] text-[#1F2937] font-extrabold text-[20px]`}>N</span>;
}

export default function Commutateur({ modules }: { modules: ModuleHote[] }) {
  const nav = useRef<HTMLElement>(null);
  useFermetureCommutateur(nav);
  // Quiet re-read at each opening (the tiles follow if the account changed elsewhere).
  useEffect(() => {
    void rafraichirModules();
  }, []);
  return (
    <BarreCommutateur refNav={nav}>
      <div className="flex items-start justify-around flex-nowrap overflow-x-auto py-1.5 px-1" data-vc-tuiles="">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              oublierCommutateur();
              window.location.assign(m.adresse);
            }}
            className="flex-shrink-0 min-w-[56px] min-h-[64px] flex flex-col items-center px-0.5 select-none rounded-xl"
            aria-label={`Ouvrir ${m.nom}`}
            data-vc-tuile={m.id}
          >
            <span className="p-1.5 rounded-xl">
              <Tuile id={m.id} />
            </span>
            <span className="text-[11px] min-[380px]:text-xs font-bold mt-0.5 text-encre whitespace-nowrap">{m.nom}</span>
          </button>
        ))}
      </div>
    </BarreCommutateur>
  );
}
