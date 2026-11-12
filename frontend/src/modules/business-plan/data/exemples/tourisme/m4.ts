// TRANO KELY example, module 4 (source ETAPE-05). Planned dates: last day of the month given by the source;
// statutes: "sans objet" (no company).
import type { Plan } from '../../../types';
import { demarches } from '../assembler';

export const m4: Partial<Plan['m4']> = {
  produit: 'Chambre double propre avec ventilateur et wifi ; petit-déjeuner en option ; formule au mois pour les volontaires.',
  prix: '45 000 Ar la nuit ; 900 000 Ar le mois. Pension voisine à 50 000 Ar, hôtels à 90 000 Ar. Couvre mes coûts : vérifié au module 5.',
  place: "Réservation en ligne ou par WhatsApp ; accueil au port ou à l'aéroport par un taxi partenaire.",
  promotion: 'Fiches sur 2 sites de réservation ; page Facebook avec photos ; cartes de visite laissées aux taxis. Budget : 60 000 Ar par mois (cartes, crédit internet, photos).',
  etapes: "1. La réservation arrive.\n2. Je prépare la chambre.\n3. J'accueille le voyageur.\n4. Ménage et linge chaque jour.\n5. Au départ, je demande un avis.",
  equipe: [
    { id: 'to-e1', personne: 'Moi', role: 'Gérant (accueil et réservations)', competences: "2 ans à l'accueil d'un hôtel d'Ambatoloaka ; français, anglais et italien", temps: 'plein' },
    { id: 'to-e2', personne: 'Une femme de ménage', role: 'Ménage et linge, salariée', competences: '', temps: 'partiel' },
    { id: 'to-e3', personne: 'Ma mère', role: 'Petit-déjeuner', competences: '', temps: 'benevole' }
  ],
  fournisseurs: "Sites de réservation, taxi, blanchisserie, guides d'excursion (repris du bloc 8 du canvas).",
  calendrier: [
    { periode: 't1', objectif: "Obtenir le NIF et la carte statistique d'ici fin mars 2027 ; publier les 3 chambres sur 2 sites de réservation d'ici fin février 2027.", responsable: 'Moi' },
    { periode: 't2', objectif: "Recevoir 10 avis en ligne d'ici fin juin 2027.", responsable: 'Moi' },
    { periode: 't3', objectif: 'Occuper 60 % des chambres en août 2027.', responsable: 'Moi' },
    { periode: 't4', objectif: "Signer 2 accords avec des associations qui logent des volontaires d'ici décembre 2027.", responsable: 'Moi' }
  ],
  forme: 'Entreprise individuelle',
  formePourquoi: "Je suis seul et je démarre petit ; je passerai en SARLU si j'investis davantage.",
  demarches: demarches({ nif: '2027-03-31', stat: '2027-03-31', compte: '2027-03-31', rcs: '2027-04-30', carteFiscale: '2027-04-30', cnaps: '2027-04-30' })
};
