// MADIO NOSY example, module 4 (source step 5). Planned dates: last day of the month given by the source.
import type { Plan } from '../../../types';
import { demarches } from '../assembler';

export const m4: Partial<Plan['m4']> = {
  produit: 'Collecte 3 fois par semaine des déchets de cuisine, bacs fermés échangés contre des bacs lavés, attestation trimestrielle « déchets valorisés ».',
  prix: '50 000 Ar par mois ; essai gratuit de 2 semaines.',
  place: 'Chez le client, à jour et heure fixes.',
  promotion: 'Visite des chefs de cuisine, autocollant « Ici, nos déchets deviennent du compost » pour la salle, bouche-à-oreille entre hôteliers ; budget 15 000 Ar par mois.',
  etapes:
    "1. Tournée du matin avec échange des bacs.\n2. Vidage sur l'aire de compostage avec de la sciure.\n3. Lavage des bacs.\n4. Retournement des tas chaque semaine.\n5. Après 3 mois, tamisage et ensachage du compost.",
  equipe: [
    { id: 'ev-e1', personne: 'Moi', role: "Gérant, commercial et compostage, j'en vis", competences: '', temps: 'plein' },
    { id: 'ev-e2', personne: 'Un collecteur', role: 'Collecteur et conducteur du tricycle, salarié', competences: '', temps: 'plein' }
  ],
  fournisseurs: 'Commune (autorisation, terrain) ; menuisiers (sciure gratuite) ; garage (entretien du tricycle).',
  calendrier: [
    { periode: 't1', objectif: "NIF et STAT d'ici mars 2027, 12 établissements abonnés d'ici mars 2027.", responsable: '' },
    { periode: 't2', objectif: '24 établissements en juin 2027 et premiers sacs de compost vendus.', responsable: '' },
    { periode: 't3', objectif: 'Aucun passage manqué en septembre 2027.', responsable: '' },
    { periode: 't4', objectif: '30 établissements en décembre 2027.', responsable: '' }
  ],
  forme: 'Entreprise individuelle',
  formePourquoi: "Autorisation de collecter des déchets et d'exploiter une aire de compostage : à demander à la commune et au service de l'environnement.",
  demarches: demarches({ nif: '2027-03-31', stat: '2027-03-31', compte: '2027-03-31', rcs: '2027-04-30', carteFiscale: '2027-04-30', cnaps: '2027-03-31' })
};
