// FRAÎCHEUR BAY example, module 4 (source step 5). Planned dates: last day of the month given by the source.
import type { Plan } from '../../../types';
import { demarches } from '../assembler';

export const m4: Partial<Plan['m4']> = {
  produit: 'Poisson entier ou en filets, pesé devant le client, sous glace.',
  prix: '17 000 Ar le kg en moyenne, prix du jour envoyé le matin.',
  place: 'Livraison avant 11 h, à vélo cargo.',
  promotion: 'Visite avec la pêche du jour, groupe WhatsApp, cartes laissées aux cuisiniers ; budget 20 000 Ar par mois.',
  etapes: '1. Achat au retour des pirogues (6 h).\n2. Tri et mise sous glace.\n3. Message WhatsApp.\n4. Tournée de livraison.\n5. Nettoyage des glacières.',
  equipe: [
    { id: 'eb-e1', personne: 'Moi', role: "Achat et vente, j'en vis", competences: '', temps: 'plein' },
    { id: 'eb-e2', personne: 'Un livreur', role: 'Livraison, salarié', competences: '', temps: 'plein' }
  ],
  fournisseurs: "Pêcheurs d'Ambatozavavy ; fabricant de glace ; réparateur de vélos.",
  calendrier: [
    { periode: 't1', objectif: "NIF et STAT d'ici mars 2027, 10 restaurants servis chaque semaine d'ici mars 2027.", responsable: '' },
    { periode: 't2', objectif: '400 kg vendus en juin 2027.', responsable: '' },
    { periode: 't3', objectif: "15 restaurants fidèles d'ici septembre 2027.", responsable: '' },
    { periode: 't4', objectif: "Second vélo cargo acheté d'ici décembre 2027.", responsable: '' }
  ],
  forme: 'Entreprise individuelle',
  formePourquoi: 'Seul, je démarre petit.',
  demarches: demarches({ nif: '2027-03-31', stat: '2027-03-31', compte: '2027-03-31', rcs: '2027-04-30', carteFiscale: '2027-04-30', cnaps: '2027-03-31' })
};
