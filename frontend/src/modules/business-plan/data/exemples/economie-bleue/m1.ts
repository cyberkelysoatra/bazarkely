// FRAÎCHEUR BAY example, module 1 (source step 2).
import type { Plan } from '../../../types';

export const m1: Partial<Plan['m1']> = {
  consequences: "Les restaurants achètent du congelé ; les pêcheurs bradent ou jettent le poisson de l'après-midi.",
  probleme: "Les restaurants de la côte ouest manquent de poisson frais régulier, alors que les pêcheurs d'Ambatozavavy perdent une partie de leur pêche faute de froid.",
  causes: 'Pas de transport réfrigéré entre le village et les restaurants (cause sur laquelle le projet agit) ; pêche vendue sur la plage, dans la matinée.',
  client: {
    qui: "Restaurants de plage et petits hôtels d'Ambatoloaka et Madirokely qui servent du poisson chaque jour.",
    ou: "Côte ouest, à 30 minutes de vélo d'Ambatozavavy.",
    combien: "40 établissements (je l'ai compté en longeant la plage).",
    aujourdhui: 'Le cuisinier va à la plage le matin, ou achète du congelé.',
    prixAujourdhui: "De 15 000 à 20 000 Ar le kg selon le poisson (je l'ai demandé).",
    decideur: 'Le cuisinier choisit, le patron paie.'
  },
  pv: {
    pour: 'les restaurants de la côte ouest',
    qui: 'servent du poisson chaque jour',
    propose: 'du poisson du matin, livré en glacière avant 11 h',
    quiBenefice: "évite au cuisinier d'aller à la plage",
    contrairement: "l'achat sur la plage ou au congelé"
  },
  pourquoiMoi: "Fils de pêcheur d'Ambatozavavy ; je connais les pêcheurs et je sais choisir le poisson ; un vélo déjà à moi."
};
