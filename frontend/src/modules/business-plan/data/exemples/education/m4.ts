// MIANATRA PLUS example, module 4 (source step 5). Planned dates: last day of the month given by the source.
import type { Plan } from '../../../types';
import { demarches } from '../assembler';

export const m4: Partial<Plan['m4']> = {
  produit: "3 soirs par semaine de révision encadrée et d'informatique, groupes de 20, bulletin mensuel.",
  prix: "20 000 Ar par mois, payé d'avance ; deuxième enfant à 15 000 Ar.",
  place: 'Salle louée au centre de Hell-Ville, de 17 h à 19 h et de 19 h à 21 h.',
  promotion: "Réunions de parents, affiches devant les écoles, séance d'essai gratuite ; budget 20 000 Ar par mois.",
  etapes: '1. Inscription avec le parent.\n2. Test de niveau.\n3. Séances.\n4. Bulletin du mois.\n5. Relance du paiement.',
  equipe: [
    { id: 'ed-e1', personne: 'Moi', role: "Enseignant et gérant, j'en vis", competences: '', temps: 'plein' },
    { id: 'ed-e2', personne: 'Un enseignant vacataire', role: 'Enseignant, salarié', competences: '', temps: 'partiel' }
  ],
  fournisseurs: "Directeurs d'école ; association des parents ; réparateur informatique.",
  calendrier: [
    { periode: 't1', objectif: "NIF et STAT d'ici mars 2027, 40 élèves inscrits d'ici mars 2027.", responsable: '' },
    { periode: 't2', objectif: '60 élèves en juin 2027.', responsable: '' },
    { periode: 't3', objectif: "2 réunions de parents avant la rentrée d'octobre 2027.", responsable: '' },
    { periode: 't4', objectif: '70 élèves en décembre 2027.', responsable: '' }
  ],
  forme: 'Entreprise individuelle',
  formePourquoi: '',
  demarches: demarches({ nif: '2027-03-31', stat: '2027-03-31', compte: '2027-03-31', rcs: '2027-04-30', carteFiscale: '2027-04-30', cnaps: '2027-03-31' })
};
