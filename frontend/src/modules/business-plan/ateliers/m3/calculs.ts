// Pure computations of 3a "Taille de mon marché" (integers). No React here.
import type { Montant, Plan } from '../../types';

const rempli = (m: Montant | undefined): m is number => typeof m === 'number' && Number.isFinite(m);

export interface Marche {
  /** Marché potentiel par mois, in sale units (clients x quantity x purchases). */
  potentielMois: number | null;
  /** Price used: typed in 3a, null when empty. */
  prix: number | null;
  potentielAr: number | null;
  ventesMois: number | null;
  ventesAn: number | null;
  ventesAnAr: number | null;
}

export function calculerMarche(m3: Plan['m3']): Marche {
  const potentielMois = rempli(m3.nbClients) && rempli(m3.qteParAchat) && rempli(m3.achatsParMois) ? m3.nbClients * m3.qteParAchat * m3.achatsParMois : null;
  const prix = rempli(m3.prixPrevu) ? m3.prixPrevu : null;
  const potentielAr = potentielMois !== null && prix !== null ? potentielMois * prix : null;
  const ventesMois = potentielMois !== null && rempli(m3.partVisee) ? Math.round((potentielMois * m3.partVisee) / 100) : null;
  const ventesAn = ventesMois === null ? null : ventesMois * 12;
  const ventesAnAr = ventesAn !== null && prix !== null ? ventesAn * prix : null;
  return { potentielMois, prix, potentielAr, ventesMois, ventesAn, ventesAnAr };
}
