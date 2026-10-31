/**
 * Sélecteur de domaine Eau / Électricité du module gestion-eau (ELEC-CC-01).
 *
 * Affiché SEULEMENT à qui a les deux domaines (admin, promoteur, cumul de rôles).
 * Changer de domaine mémorise le choix (par utilisateur) et mène au tableau de bord
 * du domaine choisi. Deux segments, `aria-pressed`, zones tactiles de 44 px.
 */
import { useNavigate } from 'react-router-dom';
import { Droplet, Zap } from 'lucide-react';
import { useGestionEau } from '../../../modules/gestion-eau/context';
import { EAU_HOME, ELEC_HOME } from '../../../modules/gestion-eau/utils/domaines';
import type { EauDomaine } from '../../../modules/gestion-eau/types/gestionEau';

const SEGMENTS: Array<{ d: EauDomaine; label: string; Icon: typeof Droplet }> = [
  { d: 'eau', label: 'Eau', Icon: Droplet },
  { d: 'elec', label: 'Électricité', Icon: Zap },
];

export default function HeaderEauDomaineSwitch() {
  const navigate = useNavigate();
  const { domaines, domaineActif, setDomaineActif } = useGestionEau();

  if (!domaines.eau || !domaines.elec) return null;

  const choisir = (d: EauDomaine) => {
    setDomaineActif(d);
    navigate(d === 'elec' ? ELEC_HOME : EAU_HOME);
  };

  return (
    <div
      role="group"
      aria-label="Domaine affiché"
      data-eau-domaine-switch
      className="mt-3 flex w-full sm:w-auto sm:inline-flex rounded-xl bg-black/15 p-1 border border-white/20"
    >
      {SEGMENTS.map(({ d, label, Icon }) => {
        const actif = domaineActif === d;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={actif}
            onClick={() => (actif ? navigate(d === 'elec' ? ELEC_HOME : EAU_HOME) : choisir(d))}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-4 rounded-lg text-sm font-semibold font-ahuvi-body transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              actif
                ? d === 'elec'
                  ? 'bg-white text-rtb-green shadow-md'
                  : 'bg-white text-ahuvi-forest shadow-md'
                : 'text-white/85 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                actif ? (d === 'elec' ? 'text-rtb-gold' : 'text-ahuvi-teal') : ''
              }`}
              aria-hidden="true"
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
