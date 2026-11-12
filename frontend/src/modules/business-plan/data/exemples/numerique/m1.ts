// FIX'NOSY example, module 1 (source step 2).
import type { Plan } from '../../../types';

export const m1: Partial<Plan['m1']> = {
  consequences: 'Ventes perdues pendant des jours ; argent dépensé pour des réparations qui lâchent ; téléphones rachetés trop tôt.',
  probleme: 'Les vendeurs du marché dont le téléphone sert à vendre (Mvola, WhatsApp) perdent des ventes quand il tombe en panne, et ne savent pas à qui le confier.',
  causes: 'Réparateurs de rue sans garantie ; pièces de qualité introuvables sur place (cause sur laquelle le projet agit) ; réparation longue à Antananarivo.',
  client: {
    qui: 'Vendeurs du marché de Hell-Ville dont le téléphone sert à vendre ; jeunes et étudiants.',
    ou: "Au marché et autour, à 5 minutes à pied de l'atelier.",
    combien: "Environ 600 téléphones en panne par mois à Hell-Ville (je l'estime : 3 réparateurs de rue en font chacun environ 200, je l'ai demandé à 2 d'entre eux).",
    aujourdhui: "Le confie à un réparateur de rue, ou l'envoie à Antananarivo.",
    prixAujourdhui: "De 15 000 à 30 000 Ar la réparation (je l'ai demandé à 5 vendeurs).",
    decideur: "Le vendeur décide et paie ; pour un jeune, c'est souvent un parent qui paie."
  },
  pv: {
    pour: 'les vendeurs de Hell-Ville',
    qui: 'ont besoin de leur téléphone pour vendre',
    propose: 'une réparation en une heure avec une pièce garantie 3 mois',
    quiBenefice: 'leur évite de perdre des jours de ventes',
    contrairement: 'les réparateurs de rue sans garantie'
  },
  pourquoiMoi: "2 ans de réparations pour mes amis et ma famille ; une formation en électronique ; un cousin qui m'envoie des pièces depuis Antananarivo."
};
