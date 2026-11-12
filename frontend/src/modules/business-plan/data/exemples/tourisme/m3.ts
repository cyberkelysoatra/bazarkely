// TRANO KELY example, module 3 (source ETAPE-04): 100 x 4 x 1 = 400 nights per month, 13,5 % = 54 nights
// (the share comes from the real capacity: 3 rooms).
import type { Plan } from '../../../types';

export const m3: Partial<Plan['m3']> = {
  nbClients: 100,
  nbClientsSource: "Je l'estime (40 par semaine en haute saison, beaucoup moins hors saison), à vérifier auprès de l'office du tourisme.",
  qteParAchat: 4,
  qteSource: 'Demandé à 5 voyageurs : 4 nuits par séjour.',
  achatsParMois: 1,
  achatsSource: 'Un séjour par mois et par client.',
  prixPrevu: 45000,
  partVisee: 13.5,
  concurrents: [
    { id: 'to-k1', nom: 'Une pension voisine déjà en ligne', type: 'direct', prix: '50 000 Ar', forts: 'Déjà des avis.', faibles: 'Chambres sans ventilateur.', mieux: 'Moins cher, accueil en 3 langues.' },
    { id: 'to-k2', nom: 'Les hôtels visibles en ligne', type: 'direct', prix: '90 000 Ar', forts: 'Piscine, confort.', faibles: 'Deux fois plus chers.', mieux: 'Le séjour long devient possible.' },
    { id: 'to-k3', nom: "La chambre chez l'habitant trouvée en arrivant", type: 'indirect', prix: '35 000 Ar', forts: 'Le moins cher.', faibles: "Rien de sûr avant d'arriver.", mieux: "Réservée à l'avance, propre." },
    { id: 'to-k4', nom: 'Raccourcir son séjour', type: 'indirect', prix: '0 Ar', forts: 'Aucun frais.', faibles: "Il voit moins l'île.", mieux: 'Rester plus longtemps pour le même budget.' }
  ],
  swot: {
    forces: "Maison déjà construite ; 2 ans d'accueil en hôtel ; 3 langues.",
    faiblesses: '3 chambres seulement ; aucun avis en ligne (parade : demander un avis à chaque départ) ; pas de groupe électrogène (parade : lampes solaires).',
    opportunites: 'De plus en plus de voyageurs réservent sur leur téléphone ; demande d\'hébergement simple et propre.',
    menaces: "Basse saison (parade : prix au mois pour les volontaires) ; coupures d'eau (parade : réservoir) ; une nouvelle pension qui ouvre à côté (parade : soigner les avis)."
  }
};
