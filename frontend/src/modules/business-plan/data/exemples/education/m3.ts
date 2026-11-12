// MIANATRA PLUS example, module 3 (source step 4): 1 500 x 1 x 1 = 1 500 per month, 4 % (capacity of the room).
import type { Plan } from '../../../types';

export const m3: Partial<Plan['m3']> = {
  nbClients: 1500,
  nbClientsSource: 'Estimé, à vérifier auprès de la circonscription scolaire.',
  qteParAchat: 1,
  qteSource: '',
  achatsParMois: 1,
  achatsSource: '',
  prixPrevu: 20000,
  partVisee: 4,
  concurrents: [
    { id: 'ed-k1', nom: 'Cours particuliers à domicile', type: 'direct', prix: "10 000 Ar l'heure", forts: 'Suivi individuel.', faibles: 'Très cher par mois.', mieux: '12 séances pour 20 000 Ar.' },
    { id: 'ed-k2', nom: "Cours de soutien organisés par l'école", type: 'direct', prix: '15 000 Ar par mois', forts: "Dans l'école.", faibles: "Pas d'ordinateur, grandes classes.", mieux: 'Groupes de 20, ordinateurs.' },
    { id: 'ed-k3', nom: 'Réviser seul à la maison', type: 'indirect', prix: '0 Ar', forts: 'Gratuit.', faibles: 'Pas de lumière, personne pour expliquer.', mieux: 'Lumière et aide.' },
    { id: 'ed-k4', nom: "Cybercafé pour l'informatique", type: 'indirect', prix: "1 000 Ar l'heure", forts: 'Ordinateurs.', faibles: 'Personne pour apprendre.', mieux: "On apprend à s'en servir." }
  ],
  swot: {
    forces: 'Diplôme et expérience des cours.',
    faiblesses: '4 ordinateurs seulement (parade : séances en rotation) ; une seule salle (parade : 2 créneaux par soir).',
    opportunites: "Parents prêts à payer pour l'examen, demande d'informatique.",
    menaces:
      "Vacances scolaires sans revenus (parade : stage de révision en août, non compté) ; coupures d'électricité (parade : éclairage solaire) ; une école qui ouvre des cours gratuits (parade : informatique et petits groupes)."
  }
};
