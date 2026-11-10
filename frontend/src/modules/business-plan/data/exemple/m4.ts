// JUS'NOSY example, module 4 (workbook pages 10 to 12). The 4 P texts are also shown under
// "Voir l'exemple" in the page of module 4.
import type { Plan } from '../../types';

export const m4: Partial<Plan['m4']> = {
  // The 4 P: exact examples of the workbook page 10 table.
  produit: '3 parfums, bouteille en verre de 50 cl consignée, étiquette locale',
  prix: '3 000 Ar la bouteille ; 2 800 Ar à partir de 50 bouteilles par semaine',
  place: 'Livraison directe aux hôtels deux fois par semaine',
  promotion: 'Dégustations gratuites, page Facebook, bouche-à-oreille des hôteliers',
  etapes:
    "1. Achat des fruits chez 3 producteurs et au marché de Hell-Ville, chaque matin à 6 h.\n2. Lavage, épluchage, pressage et filtrage.\n3. Mise en bouteille, bouchon, étiquette, passage au froid.\n4. Livraison avant 10 h.\n5. Reprise des bouteilles vides, lavage et stérilisation.",
  equipe: [
    { id: 'ex-e1', personne: 'La porteuse du projet', role: 'Gérante, ventes aux hôtels', competences: "Dix ans dans l'hôtellerie de Nosy Be, connaît les acheteurs", temps: 'plein' },
    { id: 'ex-e2', personne: 'Un employé de production', role: 'Pressage, mise en bouteille, lavage', competences: 'Hygiène alimentaire (formation prévue au mois 1)', temps: 'plein' },
    { id: 'ex-e3', personne: 'Un livreur', role: 'Livraison du matin, reprise des bouteilles', competences: 'Permis moto, connaît Hell-Ville et Ambatoloaka', temps: 'partiel' }
  ],
  fournisseurs:
    "3 producteurs de mangue et d'ananas d'Ambanoro (accord pour la saison), le marché de Hell-Ville pour le complément, l'imprimerie de Hell-Ville pour les étiquettes, un réparateur de froid. Partenaire : l'office du tourisme, pour se faire connaître des hôtels.",
  calendrier: [
    { periode: 't1', objectif: "Installer l'atelier, obtenir le NIF et le STAT, faire déguster dans 15 hôtels d'ici fin mars 2027.", responsable: 'La porteuse du projet' },
    { periode: 't2', objectif: "Livrer 10 hôtels chaque semaine d'ici juin 2027.", responsable: 'La porteuse du projet' },
    { periode: 't3', objectif: "Vendre 1 200 bouteilles par mois d'ici septembre 2027.", responsable: 'La porteuse du projet et le livreur' },
    { periode: 't4', objectif: 'Signer avec 4 restaurants de plus et ne manquer aucune livraison en décembre 2027.', responsable: "L'employé de production et le livreur" }
  ],
  forme: 'SARL unipersonnelle (SARLU)',
  formePourquoi:
    'Une seule porteuse, et ses biens personnels sont protégés : elle ne risque que son apport. Les hôtels préfèrent acheter à une société, et des associés pourront entrer plus tard (la SARLU devient alors une SARL).',
  demarches: [
    { id: 'statuts', fait: false, datePrevue: '2026-12-15' },
    { id: 'nif', fait: false, datePrevue: '2027-01-10' },
    { id: 'stat', fait: false, datePrevue: '2027-01-10' },
    { id: 'rcs', fait: false, datePrevue: '2027-01-20' },
    { id: 'carteFiscale', fait: false, datePrevue: '2027-01-31' },
    { id: 'compte', fait: true, datePrevue: '' },
    { id: 'cnaps', fait: false, datePrevue: '2027-02-01' }
  ]
};
