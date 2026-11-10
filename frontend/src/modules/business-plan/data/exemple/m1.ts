// JUS'NOSY example, module 1 (workbook pages 4 and 5): problem tree, target client, value proposition, why me.
import type { Plan } from '../../types';

export const m1: Partial<Plan['m1']> = {
  consequences: 'Argent qui sort de l\'île, producteurs mal payés, déchets plastique.',
  probleme: 'Les hôtels de Nosy Be servent surtout des jus importés ou industriels.',
  causes: 'Peu d\'offre locale régulière, fruits perdus faute de transformation.',
  client: {
    qui: 'Hôtels, restaurants et épiceries fines (commerces).',
    ou: 'Nosy Be : Hell-Ville, Ambatoloaka, Andilana.',
    combien: '60 établissements ciblés.',
    aujourdhui: 'Ils achètent des jus importés ou industriels chez les grossistes.',
    prixAujourdhui: 'Environ 3 000 Ar à 4 000 Ar la bouteille de jus importé.',
    decideur: 'Le gérant ou le chef de cuisine décide. L\'établissement paie, à 15 jours.'
  },
  pv: {
    pour: 'les hôtels et restaurants de Nosy Be',
    qui: 'veulent servir des jus frais et locaux à leurs clients',
    propose: 'des jus de fruits frais de l\'île livrés deux fois par semaine',
    quiBenefice: 'valorisent l\'image locale de l\'établissement à un prix connu d\'avance',
    contrairement: 'les jus importés ou industriels qu\'ils servent aujourd\'hui'
  },
  pourquoiMoi:
    'Je connais les producteurs de fruits de l\'île, j\'ai déjà travaillé en cuisine d\'hôtel à Nosy Be, et j\'ai un scooter pour livrer.'
};
