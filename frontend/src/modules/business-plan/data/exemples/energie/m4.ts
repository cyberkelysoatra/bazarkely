// JIRO KELY example, module 4 (source step 5). Planned dates: last day of the month given by the source.
import type { Plan } from '../../../types';
import { demarches } from '../assembler';

export const m4: Partial<Plan['m4']> = {
  produit: 'Lampe solaire puissante avec prise de recharge, chargée chaque jour.',
  prix: '1 000 Ar la nuit ; caution de 10 000 Ar ; 10e nuit offerte.',
  place: 'Kiosque au marché, de 16 h 30 à 18 h et de 6 h à 8 h.',
  promotion: 'Démonstrations le soir, affiche au kiosque, bouche-à-oreille des vendeurs ; budget 20 000 Ar par mois.',
  etapes: "1. Recharger les lampes l'après-midi.\n2. Prêter de 16 h 30 à 18 h.\n3. Récupérer le matin.\n4. Contrôler et nettoyer.\n5. Noter les pannes.",
  equipe: [
    { id: 'en-e1', personne: 'Moi', role: "Gérant et entretien, j'en vis", competences: '', temps: 'plein' },
    { id: 'en-e2', personne: 'Une aide', role: 'Soir et matin, salariée', competences: '', temps: 'partiel' }
  ],
  fournisseurs: 'Fournisseur de lampes à Antananarivo ; association des commerçants du marché.',
  calendrier: [
    { periode: 't1', objectif: "NIF et STAT d'ici mars 2027, 60 lampes louées chaque soir d'ici mars 2027.", responsable: '' },
    { periode: 't2', objectif: '1 560 locations en juin 2027.', responsable: '' },
    { periode: 't3', objectif: 'Moins de 2 lampes perdues par mois en septembre 2027.', responsable: '' },
    { periode: 't4', objectif: '2 000 locations en décembre 2027.', responsable: '' }
  ],
  forme: 'Entreprise individuelle',
  formePourquoi: '',
  demarches: demarches({ nif: '2027-03-31', stat: '2027-03-31', compte: '2027-03-31', rcs: '2027-04-30', carteFiscale: '2027-04-30', cnaps: '2027-03-31' })
};
