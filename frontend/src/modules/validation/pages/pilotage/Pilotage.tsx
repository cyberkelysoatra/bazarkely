// Pilotage space of Joël: own lazy chunk, never downloaded by a client (the guard in
// ValidationApp checks the server first). Screens come in phase 3.
import { useCouleurTheme, Corps, CARTE } from '../../composants/Mise';
import { Carre } from '../../composants/EnTete';

export default function Pilotage() {
  useCouleurTheme('#0c4a6e');
  return (
    <>
      <header className="vc-entete sticky top-0 z-30 bg-nuit text-white px-4 pb-3.5">
        <div className="flex items-stretch gap-3">
          <Carre />
          <p className="flex-1 min-w-0 text-[22px] font-bold leading-[1.2] m-0">Pilotage de la validation</p>
        </div>
      </header>
      <Corps>
        <div className={CARTE} data-pilotage="">
          <p className="text-[15px] m-0">Le tableau de bord arrive avec la phase suivante.</p>
        </div>
      </Corps>
    </>
  );
}
