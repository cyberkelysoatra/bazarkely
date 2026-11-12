// TRANO KELY example, "Ma mission de terrain": the content of ETAPE-07 gives no TRANO KELY field
// mission, so nothing is filled (never an invented interview).
import type { Mission } from '../../../types';

export const mission: Partial<Mission> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true
};
