// FIX'NOSY example, module 4 (source step 5). Planned dates: last day of the month given by the source.
import type { Plan } from '../../../types';
import { demarches } from '../assembler';

export const m4: Partial<Plan['m4']> = {
  produit: "Réparation d'écran, de batterie et de prise de charge, en une heure, pièce garantie 3 mois.",
  prix: '25 000 Ar en moyenne, annoncé avant de commencer.',
  place: 'Atelier près du marché ; à domicile pour les commerçants.',
  promotion: 'Affiche au marché, statut WhatsApp hebdomadaire, cartes ; budget 30 000 Ar par mois.',
  etapes: '1. Diagnostic devant le client.\n2. Prix annoncé.\n3. Réparation.\n4. Essai devant le client.\n5. Ticket de garantie.',
  equipe: [{ id: 'nu-e1', personne: 'Moi', role: "Réparateur, j'en vis", competences: '', temps: 'plein' }],
  fournisseurs: "Mon cousin à Antananarivo (pièces) ; transporteur des colis ; vendeurs d'accessoires voisins.",
  calendrier: [
    { periode: 't1', objectif: "NIF et STAT d'ici mars 2027, local ouvert d'ici février 2027.", responsable: '' },
    { periode: 't2', objectif: '90 réparations en juin 2027.', responsable: '' },
    { periode: 't3', objectif: 'Moins de 3 retours sous garantie par mois en septembre 2027.', responsable: '' },
    { periode: 't4', objectif: "Un apprenti embauché d'ici janvier 2028.", responsable: '' }
  ],
  forme: 'Entreprise individuelle',
  formePourquoi: '',
  demarches: demarches({ nif: '2027-03-31', stat: '2027-03-31', compte: '2027-03-31', rcs: '2027-04-30', carteFiscale: '2027-04-30', cnaps: '2028-01-31' })
};
