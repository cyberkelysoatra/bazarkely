// MADIO NOSY example, module 1 (source step 2).
import type { Plan } from '../../../types';

export const m1: Partial<Plan['m1']> = {
  consequences: 'Odeurs près des chambres et des tables, plaintes de clients, mauvaise image auprès des touristes, déchets sur les plages et dans les ravines.',
  probleme:
    'Les hôtels et restaurants de Nosy Be produisent chaque jour beaucoup de déchets de cuisine, mal ramassés, qui sentent, attirent les chiens et les mouches, et finissent souvent brûlés ou jetés dans la nature.',
  causes:
    "Ramassage public irrégulier ; ramasseurs à la charrette qui vident les déchets n'importe où ; personne ne transforme ces déchets (cause sur laquelle le projet agit).",
  client: {
    qui: 'Hôtels et restaurants qui servent des repas, surtout ceux qui reçoivent des touristes.',
    ou: "Ambatoloaka et Hell-Ville, sur un trajet de tricycle d'une heure au plus.",
    combien: "Environ 120 (je l'estime : liste des établissements de l'office du tourisme et tour à pied d'Ambatoloaka).",
    aujourdhui: 'Bac devant la porte pour le ramassage public, ou un ramasseur à la charrette payé au mois.',
    prixAujourdhui: "Environ 40 000 Ar par mois au ramasseur à la charrette (je l'ai demandé à 3 restaurants).",
    decideur: 'Le gérant ou le propriétaire ; le chef de cuisine pousse pour un service propre.'
  },
  pv: {
    pour: "les hôtels et restaurants d'Ambatoloaka et de Hell-Ville",
    qui: 'ont des déchets de cuisine mal ramassés',
    propose: "d'enlever les déchets de cuisine 3 fois par semaine dans des bacs fermés et propres, pour 50 000 Ar par mois, et d'en faire du compost",
    quiBenefice: "permet à l'établissement de dire à ses clients que ses déchets sont valorisés",
    contrairement: 'le ramasseur à la charrette qui les jette dans la nature'
  },
  pourquoiMoi:
    "J'ai travaillé deux saisons en cuisine dans un hôtel d'Ambatoloaka, je connais les chefs ; mon oncle est maraîcher et utilise déjà du compost ; j'ai suivi un atelier de compostage avec une association."
};
