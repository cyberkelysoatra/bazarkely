// JUS'NOSY example, module 3 (workbook pages 8 and 9): 60 x 25 x 4 = 6 000 bottles per month, 20 %, 1 200.
import type { Plan } from '../../types';

export const m3: Partial<Plan['m3']> = {
  nbClients: 60,
  nbClientsSource: "Liste des hôtels et restaurants de Hell-Ville et d'Ambatoloaka (office du tourisme), vérifiée sur place.",
  qteParAchat: 25,
  qteSource: "Demandé à 10 hôtels et restaurants pendant l'enquête : de 15 à 40 bouteilles par commande.",
  achatsParMois: 4,
  achatsSource: 'Une commande par semaine, comme pour leurs autres boissons.',
  prixPrevu: 3000,
  partVisee: 20,
  concurrents: [
    {
      id: 'ex-k1',
      nom: 'Jus importés (brique ou bouteille)',
      type: 'direct',
      prix: '5 000 à 6 000 Ar le litre',
      forts: 'Toujours disponibles, se gardent longtemps, marques connues.',
      faibles: "Chers, pas frais, emballage jetable, l'argent sort de l'île.",
      mieux: 'Jus frais du jour, fruits de Nosy Be, bouteille en verre consignée, moins cher.'
    },
    {
      id: 'ex-k2',
      nom: 'Sodas',
      type: 'indirect',
      prix: '2 000 Ar la bouteille de 33 cl',
      forts: 'Bon marché, vendus partout, les clients en ont l’habitude.',
      faibles: 'Très sucrés, rien de local à montrer aux touristes.',
      mieux: 'Une boisson naturelle et locale que les hôtels peuvent mettre en avant.'
    },
    {
      id: 'ex-k3',
      nom: "Jus faits maison par l'hôtel",
      type: 'direct',
      prix: 'Environ 2 500 Ar de revient le verre, selon l’hôtel',
      forts: 'Frais, préparés sur place.',
      faibles: 'Prennent du temps au personnel chaque jour, goût irrégulier, fruits perdus.',
      mieux: "L'hôtel gagne du temps, la qualité est la même chaque jour, livraison à heure fixe."
    }
  ],
  swot: {
    forces: 'Jus frais du jour, fruits locaux, bouteille en verre consignée. La porteuse connaît les hôtels et les producteurs. Prix plus bas que les jus importés.',
    faiblesses:
      'Un seul extracteur et un seul réfrigérateur au départ, marque encore inconnue. Réponse : contrat d’entretien du matériel, dégustations dans chaque hôtel visé.',
    opportunites: 'Plus de touristes chaque année à Nosy Be, hôtels qui cherchent des produits locaux, refus croissant du plastique.',
    menaces:
      'Fruits rares ou chers hors saison, coupures de courant, arrivée d’un autre producteur local. Réponse : 3 producteurs sous accord, fruit qui change avec la saison, glacières, fidéliser les hôtels.'
  }
};
