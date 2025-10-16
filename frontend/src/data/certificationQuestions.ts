/**
 * Certification Questions Data for BazarKELY
 * Level 1: Débutant Financier - 50 questions covering basic financial concepts
 * Distributed across all 22 Madagascar regions with diverse scenarios
 */

import type { CertificationQuestion } from '../types/certification';

export const level1Questions: CertificationQuestion[] = [
  // Budget Basics (10 questions)
  {
    id: 'cert-level1-001',
    text: 'Qu\'est-ce qu\'un budget familial ?',
    options: [
      { id: 'a', text: 'Un compte bancaire', isCorrect: false },
      { id: 'b', text: 'Un plan de dépenses et de revenus', isCorrect: true },
      { id: 'c', text: 'Une épargne', isCorrect: false },
      { id: 'd', text: 'Un prêt', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Un budget familial est un plan qui organise les revenus et les dépenses pour mieux gérer l\'argent de la famille.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-002',
    text: 'Quelle est la première étape pour créer un budget ?',
    options: [
      { id: 'a', text: 'Calculer les dépenses', isCorrect: false },
      { id: 'b', text: 'Identifier tous les revenus', isCorrect: true },
      { id: 'c', text: 'Ouvrir un compte bancaire', isCorrect: false },
      { id: 'd', text: 'Demander un prêt', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Il faut d\'abord connaître tous ses revenus avant de planifier les dépenses.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-003',
    text: 'Combien de temps dure généralement un budget mensuel ?',
    options: [
      { id: 'a', text: '1 semaine', isCorrect: false },
      { id: 'b', text: '1 mois', isCorrect: true },
      { id: 'c', text: '3 mois', isCorrect: false },
      { id: 'd', text: '1 an', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Un budget mensuel couvre une période d\'un mois, du 1er au 30 ou 31 du mois.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-004',
    text: 'Que faire si les dépenses dépassent les revenus ?',
    options: [
      { id: 'a', text: 'Ignorer le problème', isCorrect: false },
      { id: 'b', text: 'Réduire les dépenses ou augmenter les revenus', isCorrect: true },
      { id: 'c', text: 'Emprunter de l\'argent', isCorrect: false },
      { id: 'd', text: 'Fermer les comptes', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Il faut équilibrer le budget en réduisant les dépenses non essentielles ou en trouvant des sources de revenus supplémentaires.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-005',
    text: 'Quelle catégorie de dépenses est la plus importante ?',
    options: [
      { id: 'a', text: 'Loisirs', isCorrect: false },
      { id: 'b', text: 'Alimentation et logement', isCorrect: true },
      { id: 'c', text: 'Vêtements', isCorrect: false },
      { id: 'd', text: 'Transport', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'L\'alimentation et le logement sont des besoins essentiels qui doivent être prioritaires dans le budget.',
    points: 1,
    timeLimit: 60
  },

  // Mobile Money - Madagascar Context (5 questions)
  {
    id: 'cert-level1-006',
    text: 'Quel est le frais Orange Money pour un transfert de 25 000 Ar ?',
    options: [
      { id: 'a', text: '0 Ar', isCorrect: false },
      { id: 'b', text: '100 Ar', isCorrect: true },
      { id: 'c', text: '200 Ar', isCorrect: false },
      { id: 'd', text: '500 Ar', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'Orange Money facture 100 Ar pour les transferts entre 10 001 et 50 000 Ar.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-007',
    text: 'Comment activer un compte MVola ?',
    options: [
      { id: 'a', text: 'Se rendre dans une agence', isCorrect: false },
      { id: 'b', text: 'Composer *134# sur le téléphone', isCorrect: true },
      { id: 'c', text: 'Envoyer un SMS', isCorrect: false },
      { id: 'd', text: 'Appeler le service client', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'MVola s\'active en composant *134# sur le téléphone mobile.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-008',
    text: 'Quel est l\'avantage principal du Mobile Money ?',
    options: [
      { id: 'a', text: 'Frais élevés', isCorrect: false },
      { id: 'b', text: 'Accessibilité et rapidité', isCorrect: true },
      { id: 'c', text: 'Complexité d\'utilisation', isCorrect: false },
      { id: 'd', text: 'Disponibilité limitée', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'Le Mobile Money offre une accessibilité et une rapidité incomparables pour les transactions financières.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-009',
    text: 'Comment vérifier son solde MVola ?',
    options: [
      { id: 'a', text: 'Composer *134#', isCorrect: true },
      { id: 'b', text: 'Envoyer BAL au 134', isCorrect: false },
      { id: 'c', text: 'Appeler le 134', isCorrect: false },
      { id: 'd', text: 'Se rendre en agence', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'Pour vérifier son solde MVola, il faut composer *134# et suivre les instructions.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-010',
    text: 'Quel est le coût d\'un retrait MVola de 100 000 Ar ?',
    options: [
      { id: 'a', text: '500 Ar', isCorrect: false },
      { id: 'b', text: '1000 Ar', isCorrect: true },
      { id: 'c', text: '1500 Ar', isCorrect: false },
      { id: 'd', text: '2000 Ar', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'MVola facture 1000 Ar pour les retraits entre 50 001 et 200 000 Ar.',
    points: 1,
    timeLimit: 60
  },

  // Savings Basics (8 questions)
  {
    id: 'cert-level1-011',
    text: 'Quel pourcentage de ses revenus devrait-on épargner ?',
    options: [
      { id: 'a', text: '5%', isCorrect: false },
      { id: 'b', text: '10-20%', isCorrect: true },
      { id: 'c', text: '50%', isCorrect: false },
      { id: 'd', text: 'Tout ce qui reste', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'Il est recommandé d\'épargner 10 à 20% de ses revenus pour assurer un avenir financier stable.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-012',
    text: 'Qu\'est-ce qu\'un fonds d\'urgence ?',
    options: [
      { id: 'a', text: 'Un compte d\'épargne pour les vacances', isCorrect: false },
      { id: 'b', text: 'De l\'argent mis de côté pour les imprévus', isCorrect: true },
      { id: 'c', text: 'Un prêt d\'urgence', isCorrect: false },
      { id: 'd', text: 'Une assurance', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'Un fonds d\'urgence est de l\'argent mis de côté pour faire face aux dépenses imprévues.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-013',
    text: 'Combien de mois de dépenses devrait contenir un fonds d\'urgence ?',
    options: [
      { id: 'a', text: '1 mois', isCorrect: false },
      { id: 'b', text: '3-6 mois', isCorrect: true },
      { id: 'c', text: '1 an', isCorrect: false },
      { id: 'd', text: '2 ans', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'Un fonds d\'urgence devrait couvrir 3 à 6 mois de dépenses pour faire face aux imprévus.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-014',
    text: 'Où placer son fonds d\'urgence ?',
    options: [
      { id: 'a', text: 'En actions risquées', isCorrect: false },
      { id: 'b', text: 'Dans un compte épargne accessible', isCorrect: true },
      { id: 'c', text: 'En immobilier', isCorrect: false },
      { id: 'd', text: 'En or', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'Le fonds d\'urgence doit être facilement accessible, donc dans un compte épargne ou un compte courant.',
    points: 1,
    timeLimit: 60
  },

  // Regional Context Questions (15 questions distributed across regions)
  {
    id: 'cert-level1-015',
    text: 'À Antananarivo, quel est le coût moyen d\'un trajet en taxi-brousse vers la banlieue ?',
    options: [
      { id: 'a', text: '500 Ar', isCorrect: false },
      { id: 'b', text: '1000-2000 Ar', isCorrect: true },
      { id: 'c', text: '5000 Ar', isCorrect: false },
      { id: 'd', text: '10000 Ar', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Analamanga',
    explanation: 'À Antananarivo, un trajet en taxi-brousse vers la banlieue coûte généralement entre 1000 et 2000 Ar.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-016',
    text: 'À Mahajanga, comment gérer les revenus saisonniers de la pêche ?',
    options: [
      { id: 'a', text: 'Dépenser tout immédiatement', isCorrect: false },
      { id: 'b', text: 'Épargner pour les périodes creuses', isCorrect: true },
      { id: 'c', text: 'Investir dans des bateaux', isCorrect: false },
      { id: 'd', text: 'Prêter aux autres pêcheurs', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Boeny',
    explanation: 'Les pêcheurs doivent épargner pendant les bonnes saisons pour faire face aux périodes creuses.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-017',
    text: 'À Toliara, quel est le principal défi financier des agriculteurs ?',
    options: [
      { id: 'a', text: 'Trop de revenus', isCorrect: false },
      { id: 'b', text: 'Sécheresse et revenus irréguliers', isCorrect: true },
      { id: 'c', text: 'Prix trop élevés', isCorrect: false },
      { id: 'd', text: 'Manque de terres', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Atsimo-Andrefana',
    explanation: 'À Toliara, les agriculteurs font face à la sécheresse et aux revenus irréguliers, nécessitant une gestion prudente.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-018',
    text: 'À Toamasina, comment optimiser les coûts de transport des marchandises ?',
    options: [
      { id: 'a', text: 'Utiliser toujours le transport aérien', isCorrect: false },
      { id: 'b', text: 'Comparer les coûts et choisir le plus économique', isCorrect: true },
      { id: 'c', text: 'Toujours utiliser le transport maritime', isCorrect: false },
      { id: 'd', text: 'Éviter le transport', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Atsinanana',
    explanation: 'À Toamasina, il faut comparer les coûts des différents modes de transport pour optimiser les dépenses.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-019',
    text: 'Dans les zones rurales, quel est l\'avantage de l\'épargne en nature ?',
    options: [
      { id: 'a', text: 'Protection contre l\'inflation', isCorrect: true },
      { id: 'b', text: 'Facilité de transport', isCorrect: false },
      { id: 'c', text: 'Valeur stable', isCorrect: false },
      { id: 'd', text: 'Liquidité immédiate', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Vakinankaratra',
    explanation: 'L\'épargne en nature (riz, bétail) protège contre l\'inflation dans les zones rurales.',
    points: 1,
    timeLimit: 60
  },

  // Family Finance (7 questions)
  {
    id: 'cert-level1-020',
    text: 'Qui devrait participer à la gestion du budget familial ?',
    options: [
      { id: 'a', text: 'Seulement le chef de famille', isCorrect: false },
      { id: 'b', text: 'Tous les membres adultes de la famille', isCorrect: true },
      { id: 'c', text: 'Seulement les parents', isCorrect: false },
      { id: 'd', text: 'Un conseiller financier', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 1,
    explanation: 'Tous les membres adultes de la famille devraient participer à la gestion du budget pour une meilleure transparence.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-021',
    text: 'Comment impliquer les enfants dans l\'éducation financière ?',
    options: [
      { id: 'a', text: 'Leur donner beaucoup d\'argent', isCorrect: false },
      { id: 'b', text: 'Leur expliquer la valeur de l\'argent et l\'épargne', isCorrect: true },
      { id: 'c', text: 'Cacher les problèmes financiers', isCorrect: false },
      { id: 'd', text: 'Les laisser gérer le budget', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 1,
    explanation: 'Il faut expliquer aux enfants la valeur de l\'argent et l\'importance de l\'épargne dès le plus jeune âge.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-022',
    text: 'Quelle est l\'importance de la communication dans la gestion financière familiale ?',
    options: [
      { id: 'a', text: 'Elle n\'est pas importante', isCorrect: false },
      { id: 'b', text: 'Elle évite les conflits et améliore la gestion', isCorrect: true },
      { id: 'c', text: 'Elle complique les choses', isCorrect: false },
      { id: 'd', text: 'Elle est réservée aux couples', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 1,
    explanation: 'Une bonne communication évite les conflits et améliore la gestion financière familiale.',
    points: 1,
    timeLimit: 60
  },

  // Expense Management (5 questions)
  {
    id: 'cert-level1-023',
    text: 'Comment catégoriser une facture d\'électricité ?',
    options: [
      { id: 'a', text: 'Loisirs', isCorrect: false },
      { id: 'b', text: 'Logement', isCorrect: true },
      { id: 'c', text: 'Transport', isCorrect: false },
      { id: 'd', text: 'Santé', isCorrect: false }
    ],
    category: 'expenses',
    difficulty: 1,
    explanation: 'L\'électricité fait partie des dépenses de logement car elle est nécessaire pour l\'habitation.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-024',
    text: 'Quelle est la différence entre un besoin et un désir ?',
    options: [
      { id: 'a', text: 'Il n\'y a pas de différence', isCorrect: false },
      { id: 'b', text: 'Un besoin est essentiel, un désir est optionnel', isCorrect: true },
      { id: 'c', text: 'Un désir coûte plus cher', isCorrect: false },
      { id: 'd', text: 'Un besoin est temporaire', isCorrect: false }
    ],
    category: 'expenses',
    difficulty: 1,
    explanation: 'Un besoin est essentiel pour vivre (nourriture, logement), tandis qu\'un désir est optionnel (loisirs, luxe).',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-025',
    text: 'Comment réduire les dépenses d\'alimentation ?',
    options: [
      { id: 'a', text: 'Ne plus manger', isCorrect: false },
      { id: 'b', text: 'Planifier les repas et comparer les prix', isCorrect: true },
      { id: 'c', text: 'Acheter seulement des produits chers', isCorrect: false },
      { id: 'd', text: 'Manger au restaurant', isCorrect: false }
    ],
    category: 'expenses',
    difficulty: 1,
    explanation: 'Planifier les repas et comparer les prix permet de réduire les dépenses d\'alimentation sans compromettre la nutrition.',
    points: 1,
    timeLimit: 60
  },

  // Additional Regional Questions (10 more questions covering different regions)
  {
    id: 'cert-level1-026',
    text: 'À Antsirabe, comment gérer les coûts de chauffage en hiver ?',
    options: [
      { id: 'a', text: 'Utiliser seulement l\'électricité', isCorrect: false },
      { id: 'b', text: 'Prévoir un budget chauffage et isoler la maison', isCorrect: true },
      { id: 'c', text: 'Ne pas se chauffer', isCorrect: false },
      { id: 'd', text: 'Déménager', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Vakinankaratra',
    explanation: 'À Antsirabe, il faut prévoir un budget chauffage et bien isoler la maison pour réduire les coûts.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-027',
    text: 'À Fianarantsoa, quel est l\'avantage de l\'épargne groupée (tontine) ?',
    options: [
      { id: 'a', text: 'Rendement élevé', isCorrect: false },
      { id: 'b', text: 'Solidarité et discipline d\'épargne', isCorrect: true },
      { id: 'c', text: 'Pas de frais', isCorrect: false },
      { id: 'd', text: 'Flexibilité totale', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Matsiatra Ambony',
    explanation: 'La tontine offre solidarité et discipline d\'épargne, mais nécessite de la confiance mutuelle.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-028',
    text: 'À Morondava, comment gérer les revenus du tourisme saisonnier ?',
    options: [
      { id: 'a', text: 'Dépenser tout pendant la saison', isCorrect: false },
      { id: 'b', text: 'Épargner pour la basse saison', isCorrect: true },
      { id: 'c', text: 'Investir dans l\'immobilier', isCorrect: false },
      { id: 'd', text: 'Prêter aux autres', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Menabe',
    explanation: 'Les revenus du tourisme étant saisonniers, il faut épargner pendant la haute saison pour la basse saison.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-029',
    text: 'À Antsiranana, quel est le coût moyen d\'un repas familial ?',
    options: [
      { id: 'a', text: '5000 Ar', isCorrect: false },
      { id: 'b', text: '15000-25000 Ar', isCorrect: true },
      { id: 'c', text: '50000 Ar', isCorrect: false },
      { id: 'd', text: '100000 Ar', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Diana',
    explanation: 'À Antsiranana, un repas familial coûte généralement entre 15000 et 25000 Ar selon la composition.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-030',
    text: 'Dans les zones rurales, comment sécuriser son épargne ?',
    options: [
      { id: 'a', text: 'Cacher l\'argent à la maison', isCorrect: false },
      { id: 'b', text: 'Utiliser les services bancaires ou Mobile Money', isCorrect: true },
      { id: 'c', text: 'Prêter à tout le monde', isCorrect: false },
      { id: 'd', text: 'Dépenser immédiatement', isCorrect: false }
    ],
    category: 'madagascar-context',
    difficulty: 1,
    region: 'Sofia',
    explanation: 'Même en zone rurale, il est plus sûr d\'utiliser les services bancaires ou Mobile Money que de cacher l\'argent.',
    points: 1,
    timeLimit: 60
  },

  // More Mobile Money Questions (5 additional)
  {
    id: 'cert-level1-031',
    text: 'Quel est le code USSD pour Airtel Money ?',
    options: [
      { id: 'a', text: '*134#', isCorrect: false },
      { id: 'b', text: '*126#', isCorrect: true },
      { id: 'c', text: '*123#', isCorrect: false },
      { id: 'd', text: '*125#', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'Airtel Money utilise le code USSD *126# pour accéder aux services.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-032',
    text: 'Comment sécuriser son compte Mobile Money ?',
    options: [
      { id: 'a', text: 'Partager son code PIN', isCorrect: false },
      { id: 'b', text: 'Garder son code PIN secret et ne pas le partager', isCorrect: true },
      { id: 'c', text: 'Utiliser toujours le même code', isCorrect: false },
      { id: 'd', text: 'L\'écrire sur le téléphone', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'Il faut garder son code PIN secret et ne jamais le partager pour sécuriser son compte Mobile Money.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-033',
    text: 'Quel est l\'avantage du paiement marchand Mobile Money ?',
    options: [
      { id: 'a', text: 'Frais plus élevés', isCorrect: false },
      { id: 'b', text: 'Pas de frais de retrait et plus de sécurité', isCorrect: true },
      { id: 'c', text: 'Plus lent que le cash', isCorrect: false },
      { id: 'd', text: 'Nécessite internet', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'Le paiement marchand évite les frais de retrait et est plus sécurisé que le cash.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-034',
    text: 'Comment vérifier l\'historique des transactions Mobile Money ?',
    options: [
      { id: 'a', text: 'Appeler le service client', isCorrect: false },
      { id: 'b', text: 'Utiliser le menu historique dans l\'application', isCorrect: true },
      { id: 'c', text: 'Se rendre en agence', isCorrect: false },
      { id: 'd', text: 'Envoyer un SMS', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'L\'historique des transactions est accessible via le menu historique dans l\'application Mobile Money.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-035',
    text: 'Quel est le plafond de transfert Orange Money par jour ?',
    options: [
      { id: 'a', text: '100 000 Ar', isCorrect: false },
      { id: 'b', text: '500 000 Ar', isCorrect: true },
      { id: 'c', text: '1 000 000 Ar', isCorrect: false },
      { id: 'd', text: 'Pas de limite', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 1,
    explanation: 'Orange Money permet des transferts jusqu\'à 500 000 Ar par jour pour les comptes standard.',
    points: 1,
    timeLimit: 60
  },

  // Additional Budget and Savings Questions (15 more questions to reach 50)
  {
    id: 'cert-level1-036',
    text: 'Qu\'est-ce qu\'un objectif financier SMART ?',
    options: [
      { id: 'a', text: 'Un objectif vague', isCorrect: false },
      { id: 'b', text: 'Un objectif Spécifique, Mesurable, Atteignable, Réaliste, Temporel', isCorrect: true },
      { id: 'c', text: 'Un objectif impossible', isCorrect: false },
      { id: 'd', text: 'Un objectif sans échéance', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Un objectif SMART est Spécifique, Mesurable, Atteignable, Réaliste et Temporel.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-037',
    text: 'Comment calculer ses revenus nets ?',
    options: [
      { id: 'a', text: 'Revenus bruts moins les impôts et charges', isCorrect: true },
      { id: 'b', text: 'Revenus bruts plus les bonus', isCorrect: false },
      { id: 'c', text: 'Seulement le salaire de base', isCorrect: false },
      { id: 'd', text: 'Revenus bruts multipliés par 2', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Les revenus nets = revenus bruts - impôts - charges sociales.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-038',
    text: 'Quelle est la règle 50-30-20 ?',
    options: [
      { id: 'a', text: '50% besoins, 30% désirs, 20% épargne', isCorrect: true },
      { id: 'b', text: '50% épargne, 30% dépenses, 20% investissement', isCorrect: false },
      { id: 'c', text: '50% logement, 30% nourriture, 20% transport', isCorrect: false },
      { id: 'd', text: '50% revenus, 30% impôts, 20% bonus', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'La règle 50-30-20 : 50% pour les besoins essentiels, 30% pour les désirs, 20% pour l\'épargne.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-039',
    text: 'Comment suivre ses dépenses quotidiennes ?',
    options: [
      { id: 'a', text: 'Se souvenir de tout', isCorrect: false },
      { id: 'b', text: 'Noter chaque dépense dans un carnet ou une app', isCorrect: true },
      { id: 'c', text: 'Demander à quelqu\'un d\'autre', isCorrect: false },
      { id: 'd', text: 'Ne pas s\'en préoccuper', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Il faut noter chaque dépense pour bien suivre son budget et identifier les fuites.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-040',
    text: 'Qu\'est-ce qu\'un budget prévisionnel ?',
    options: [
      { id: 'a', text: 'Un budget du passé', isCorrect: false },
      { id: 'b', text: 'Un budget planifié pour l\'avenir', isCorrect: true },
      { id: 'c', text: 'Un budget approximatif', isCorrect: false },
      { id: 'd', text: 'Un budget secret', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Un budget prévisionnel est un budget planifié pour les mois ou années à venir.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-041',
    text: 'Quel est l\'avantage de l\'épargne automatique ?',
    options: [
      { id: 'a', text: 'Elle coûte plus cher', isCorrect: false },
      { id: 'b', text: 'Elle garantit une épargne régulière sans effort', isCorrect: true },
      { id: 'c', text: 'Elle est moins flexible', isCorrect: false },
      { id: 'd', text: 'Elle nécessite plus de temps', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'L\'épargne automatique garantit une épargne régulière sans avoir à y penser chaque mois.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-042',
    text: 'Qu\'est-ce que l\'intérêt composé ?',
    options: [
      { id: 'a', text: 'L\'intérêt simple', isCorrect: false },
      { id: 'b', text: 'L\'intérêt qui rapporte sur l\'intérêt', isCorrect: true },
      { id: 'c', text: 'L\'intérêt fixe', isCorrect: false },
      { id: 'd', text: 'L\'intérêt négatif', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'L\'intérêt composé est l\'intérêt qui rapporte sur l\'intérêt, permettant une croissance exponentielle.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-043',
    text: 'Comment choisir un compte d\'épargne ?',
    options: [
      { id: 'a', text: 'Celui avec le plus haut taux d\'intérêt', isCorrect: false },
      { id: 'b', text: 'Celui qui offre le meilleur équilibre taux/frais/accessibilité', isCorrect: true },
      { id: 'c', text: 'Le plus proche de chez soi', isCorrect: false },
      { id: 'd', text: 'Celui recommandé par un ami', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'Il faut comparer le taux d\'intérêt, les frais et l\'accessibilité pour choisir le meilleur compte.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-044',
    text: 'Qu\'est-ce qu\'un objectif d\'épargne à court terme ?',
    options: [
      { id: 'a', text: 'Un objectif pour plus de 5 ans', isCorrect: false },
      { id: 'b', text: 'Un objectif pour moins de 2 ans', isCorrect: true },
      { id: 'c', text: 'Un objectif impossible', isCorrect: false },
      { id: 'd', text: 'Un objectif sans montant', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'Un objectif d\'épargne à court terme est généralement pour moins de 2 ans.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-045',
    text: 'Comment éviter les frais bancaires inutiles ?',
    options: [
      { id: 'a', text: 'Ne pas utiliser la banque', isCorrect: false },
      { id: 'b', text: 'Lire les conditions et respecter les seuils', isCorrect: true },
      { id: 'c', text: 'Utiliser plusieurs banques', isCorrect: false },
      { id: 'd', text: 'Fermer tous les comptes', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 1,
    explanation: 'Il faut lire les conditions tarifaires et respecter les seuils pour éviter les frais.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-046',
    text: 'Qu\'est-ce qu\'un budget zéro ?',
    options: [
      { id: 'a', text: 'Un budget sans argent', isCorrect: false },
      { id: 'b', text: 'Un budget où chaque euro est assigné à un poste', isCorrect: true },
      { id: 'c', text: 'Un budget secret', isCorrect: false },
      { id: 'd', text: 'Un budget temporaire', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Un budget zéro assigne chaque euro à un poste spécifique, sans argent "perdu".',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-047',
    text: 'Comment gérer les dépenses imprévues ?',
    options: [
      { id: 'a', text: 'Les ignorer', isCorrect: false },
      { id: 'b', text: 'Avoir un fonds d\'urgence et ajuster le budget', isCorrect: true },
      { id: 'c', text: 'Emprunter systématiquement', isCorrect: false },
      { id: 'd', text: 'Vendre ses biens', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Il faut avoir un fonds d\'urgence et ajuster le budget pour gérer les imprévus.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-048',
    text: 'Quelle est l\'importance de revoir son budget régulièrement ?',
    options: [
      { id: 'a', text: 'Ce n\'est pas nécessaire', isCorrect: false },
      { id: 'b', text: 'Cela permet de s\'adapter aux changements', isCorrect: true },
      { id: 'c', text: 'Cela complique la gestion', isCorrect: false },
      { id: 'd', text: 'Cela coûte de l\'argent', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Revoir son budget régulièrement permet de s\'adapter aux changements de revenus et de dépenses.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-049',
    text: 'Comment motiver sa famille à respecter le budget ?',
    options: [
      { id: 'a', text: 'Imposer des sanctions', isCorrect: false },
      { id: 'b', text: 'Expliquer les objectifs et impliquer tout le monde', isCorrect: true },
      { id: 'c', text: 'Cacher les informations', isCorrect: false },
      { id: 'd', text: 'Faire le budget seul', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 1,
    explanation: 'Il faut expliquer les objectifs du budget et impliquer toute la famille dans sa gestion.',
    points: 1,
    timeLimit: 60
  },
  {
    id: 'cert-level1-050',
    text: 'Qu\'est-ce qu\'un budget équilibré ?',
    options: [
      { id: 'a', text: 'Un budget avec beaucoup d\'argent', isCorrect: false },
      { id: 'b', text: 'Un budget où les revenus couvrent les dépenses', isCorrect: true },
      { id: 'c', text: 'Un budget complexe', isCorrect: false },
      { id: 'd', text: 'Un budget secret', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 1,
    explanation: 'Un budget équilibré est un budget où les revenus couvrent toutes les dépenses prévues.',
    points: 1,
    timeLimit: 60
  }
];

// Level 2: Intermédiaire Financier - 50 questions covering intermediate budgeting, mobile money, savings, and investment
export const level2Questions: CertificationQuestion[] = [
  // Intermediate Budgeting (15 questions)
  {
    id: 'cert-level2-001',
    text: 'Comment gérer un budget avec des revenus irréguliers ?',
    options: [
      { id: 'a', text: 'Utiliser la moyenne des 6 derniers mois', isCorrect: true },
      { id: 'b', text: 'Utiliser le revenu le plus élevé', isCorrect: false },
      { id: 'c', text: 'Ne pas faire de budget', isCorrect: false },
      { id: 'd', text: 'Utiliser le revenu le plus bas', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Avec des revenus irréguliers, il faut calculer une moyenne sur 6 mois et prévoir des réserves.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-002',
    text: 'Qu\'est-ce qu\'un budget enveloppe ?',
    options: [
      { id: 'a', text: 'Un budget dans une enveloppe', isCorrect: false },
      { id: 'b', text: 'Allouer un montant fixe par catégorie de dépenses', isCorrect: true },
      { id: 'c', text: 'Un budget mensuel', isCorrect: false },
      { id: 'd', text: 'Un budget secret', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Le budget enveloppe alloue un montant fixe par catégorie, évitant les dépassements.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-003',
    text: 'Comment calculer le coût réel d\'un crédit ?',
    options: [
      { id: 'a', text: 'Seulement le taux d\'intérêt', isCorrect: false },
      { id: 'b', text: 'Taux + frais + assurance + durée', isCorrect: true },
      { id: 'c', text: 'Seulement la mensualité', isCorrect: false },
      { id: 'd', text: 'Le montant emprunté', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Le coût réel inclut tous les frais : intérêts, frais de dossier, assurance, sur toute la durée.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-004',
    text: 'Qu\'est-ce que l\'inflation et comment l\'anticiper ?',
    options: [
      { id: 'a', text: 'L\'augmentation des prix, prévoir 2-3% par an', isCorrect: true },
      { id: 'b', text: 'La baisse des prix', isCorrect: false },
      { id: 'c', text: 'Les impôts', isCorrect: false },
      { id: 'd', text: 'Les salaires', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'L\'inflation est l\'augmentation générale des prix, généralement 2-3% par an à prévoir.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-005',
    text: 'Comment optimiser ses impôts légitimement ?',
    options: [
      { id: 'a', text: 'Ne pas déclarer ses revenus', isCorrect: false },
      { id: 'b', text: 'Utiliser les déductions et crédits d\'impôt', isCorrect: true },
      { id: 'c', text: 'Faire de fausses déclarations', isCorrect: false },
      { id: 'd', text: 'Ne pas payer', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Il faut utiliser légalement les déductions et crédits d\'impôt disponibles.',
    points: 2,
    timeLimit: 60
  },

  // Advanced Mobile Money (10 questions)
  {
    id: 'cert-level2-006',
    text: 'Comment utiliser Mobile Money pour l\'épargne ?',
    options: [
      { id: 'a', text: 'Transférer vers un compte épargne', isCorrect: true },
      { id: 'b', text: 'Garder tout sur Mobile Money', isCorrect: false },
      { id: 'c', text: 'Ne pas épargner', isCorrect: false },
      { id: 'd', text: 'Utiliser seulement le cash', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 2,
    explanation: 'Mobile Money peut servir de plateforme pour transférer vers des comptes épargne.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-007',
    text: 'Quels sont les avantages du paiement marchand Mobile Money ?',
    options: [
      { id: 'a', text: 'Pas de frais de retrait, traçabilité, sécurité', isCorrect: true },
      { id: 'b', text: 'Frais plus élevés', isCorrect: false },
      { id: 'c', text: 'Plus lent que le cash', isCorrect: false },
      { id: 'd', text: 'Nécessite internet', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 2,
    explanation: 'Le paiement marchand évite les frais de retrait, offre traçabilité et sécurité.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-008',
    text: 'Comment sécuriser ses transactions Mobile Money ?',
    options: [
      { id: 'a', text: 'Vérifier le numéro du destinataire, ne pas partager son code', isCorrect: true },
      { id: 'b', text: 'Partager son code PIN', isCorrect: false },
      { id: 'c', text: 'Faire des transactions publiques', isCorrect: false },
      { id: 'd', text: 'Utiliser des réseaux non sécurisés', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 2,
    explanation: 'Il faut vérifier le destinataire, garder son code secret, et utiliser des réseaux sécurisés.',
    points: 2,
    timeLimit: 60
  },

  // Investment Basics (15 questions)
  {
    id: 'cert-level2-009',
    text: 'Qu\'est-ce qu\'un investissement ?',
    options: [
      { id: 'a', text: 'Placer de l\'argent pour le faire fructifier', isCorrect: true },
      { id: 'b', text: 'Dépenser de l\'argent', isCorrect: false },
      { id: 'c', text: 'Prêter sans intérêt', isCorrect: false },
      { id: 'd', text: 'Cacher de l\'argent', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Un investissement consiste à placer de l\'argent pour le faire fructifier à long terme.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-010',
    text: 'Quelle est la différence entre épargne et investissement ?',
    options: [
      { id: 'a', text: 'Épargne = sécurité, Investissement = rendement avec risque', isCorrect: true },
      { id: 'b', text: 'Aucune différence', isCorrect: false },
      { id: 'c', text: 'L\'inverse', isCorrect: false },
      { id: 'd', text: 'Épargne = risque, Investissement = sécurité', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'L\'épargne privilégie la sécurité, l\'investissement vise le rendement avec plus de risque.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-011',
    text: 'Qu\'est-ce que la diversification ?',
    options: [
      { id: 'a', text: 'Répartir ses investissements pour réduire les risques', isCorrect: true },
      { id: 'b', text: 'Mettre tout au même endroit', isCorrect: false },
      { id: 'c', text: 'Investir seulement en actions', isCorrect: false },
      { id: 'd', text: 'Ne pas investir', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'La diversification consiste à répartir ses investissements pour réduire les risques.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-012',
    text: 'Qu\'est-ce qu\'un fonds commun de placement ?',
    options: [
      { id: 'a', text: 'Un portefeuille géré par des professionnels', isCorrect: true },
      { id: 'b', text: 'Un compte bancaire', isCorrect: false },
      { id: 'c', text: 'Un prêt', isCorrect: false },
      { id: 'd', text: 'Une assurance', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Un FCP est un portefeuille d\'investissements géré par des professionnels.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-013',
    text: 'Comment calculer le rendement d\'un investissement ?',
    options: [
      { id: 'a', text: '(Valeur finale - Valeur initiale) / Valeur initiale × 100', isCorrect: true },
      { id: 'b', text: 'Valeur finale - Valeur initiale', isCorrect: false },
      { id: 'c', text: 'Valeur finale / Valeur initiale', isCorrect: false },
      { id: 'd', text: 'Valeur initiale - Valeur finale', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Le rendement = (Valeur finale - Valeur initiale) / Valeur initiale × 100.',
    points: 2,
    timeLimit: 60
  },

  // Regional Context - Level 2 (10 questions)
  {
    id: 'cert-level2-014',
    text: 'À Antananarivo, comment investir dans l\'immobilier locatif ?',
    options: [
      { id: 'a', text: 'Étudier la localisation, les loyers, les frais', isCorrect: true },
      { id: 'b', text: 'Acheter n\'importe où', isCorrect: false },
      { id: 'c', text: 'Ne pas investir', isCorrect: false },
      { id: 'd', text: 'Acheter le plus cher', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    region: 'Analamanga',
    explanation: 'Il faut étudier la localisation, les loyers potentiels, et tous les frais associés.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-015',
    text: 'À Mahajanga, comment diversifier les revenus de pêche ?',
    options: [
      { id: 'a', text: 'Développer le tourisme, la transformation, l\'élevage', isCorrect: true },
      { id: 'b', text: 'Pêcher plus', isCorrect: false },
      { id: 'c', text: 'Ne rien changer', isCorrect: false },
      { id: 'd', text: 'Arrêter la pêche', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    region: 'Boeny',
    explanation: 'Diversifier avec le tourisme, la transformation des produits, ou l\'élevage complémentaire.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-016',
    text: 'Qu\'est-ce que l\'intérêt composé ?',
    options: [
      { id: 'a', text: 'L\'intérêt simple', isCorrect: false },
      { id: 'b', text: 'L\'intérêt qui rapporte sur l\'intérêt', isCorrect: true },
      { id: 'c', text: 'L\'intérêt fixe', isCorrect: false },
      { id: 'd', text: 'L\'intérêt négatif', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'L\'intérêt composé est l\'intérêt qui rapporte sur l\'intérêt, permettant une croissance exponentielle.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-017',
    text: 'Comment calculer le rendement annuel d\'un investissement ?',
    options: [
      { id: 'a', text: 'Rendement total / nombre d\'années', isCorrect: true },
      { id: 'b', text: 'Rendement total × nombre d\'années', isCorrect: false },
      { id: 'c', text: 'Rendement total seulement', isCorrect: false },
      { id: 'd', text: 'Rendement total + nombre d\'années', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Le rendement annuel = rendement total divisé par le nombre d\'années d\'investissement.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-018',
    text: 'Qu\'est-ce qu\'un portefeuille d\'investissement ?',
    options: [
      { id: 'a', text: 'Un portefeuille physique', isCorrect: false },
      { id: 'b', text: 'Un ensemble d\'investissements diversifiés', isCorrect: true },
      { id: 'c', text: 'Un compte bancaire', isCorrect: false },
      { id: 'd', text: 'Une assurance', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Un portefeuille d\'investissement est un ensemble d\'investissements diversifiés pour réduire les risques.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-019',
    text: 'Comment gérer les revenus irréguliers ?',
    options: [
      { id: 'a', text: 'Créer un budget basé sur la moyenne des 6 derniers mois', isCorrect: true },
      { id: 'b', text: 'Utiliser le revenu le plus élevé', isCorrect: false },
      { id: 'c', text: 'Ne pas faire de budget', isCorrect: false },
      { id: 'd', text: 'Utiliser le revenu le plus bas', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Avec des revenus irréguliers, il faut calculer une moyenne sur 6 mois et prévoir des réserves.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-020',
    text: 'Qu\'est-ce qu\'un budget enveloppe ?',
    options: [
      { id: 'a', text: 'Un budget dans une enveloppe', isCorrect: false },
      { id: 'b', text: 'Allouer un montant fixe par catégorie de dépenses', isCorrect: true },
      { id: 'c', text: 'Un budget mensuel', isCorrect: false },
      { id: 'd', text: 'Un budget secret', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Le budget enveloppe alloue un montant fixe par catégorie, évitant les dépassements.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-021',
    text: 'Comment calculer le coût réel d\'un crédit ?',
    options: [
      { id: 'a', text: 'Seulement le taux d\'intérêt', isCorrect: false },
      { id: 'b', text: 'Taux + frais + assurance + durée', isCorrect: true },
      { id: 'c', text: 'Seulement la mensualité', isCorrect: false },
      { id: 'd', text: 'Le montant emprunté', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Le coût réel inclut tous les frais : intérêts, frais de dossier, assurance, sur toute la durée.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-022',
    text: 'Qu\'est-ce que l\'inflation et comment l\'anticiper ?',
    options: [
      { id: 'a', text: 'L\'augmentation des prix, prévoir 2-3% par an', isCorrect: true },
      { id: 'b', text: 'La baisse des prix', isCorrect: false },
      { id: 'c', text: 'Les impôts', isCorrect: false },
      { id: 'd', text: 'Les salaires', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'L\'inflation est l\'augmentation générale des prix, généralement 2-3% par an à prévoir.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-023',
    text: 'Comment optimiser ses impôts légitimement ?',
    options: [
      { id: 'a', text: 'Ne pas déclarer ses revenus', isCorrect: false },
      { id: 'b', text: 'Utiliser les déductions et crédits d\'impôt', isCorrect: true },
      { id: 'c', text: 'Faire de fausses déclarations', isCorrect: false },
      { id: 'd', text: 'Ne pas payer', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Il faut utiliser légalement les déductions et crédits d\'impôt disponibles.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-024',
    text: 'Comment utiliser Mobile Money pour l\'épargne ?',
    options: [
      { id: 'a', text: 'Transférer vers un compte épargne', isCorrect: true },
      { id: 'b', text: 'Garder tout sur Mobile Money', isCorrect: false },
      { id: 'c', text: 'Ne pas épargner', isCorrect: false },
      { id: 'd', text: 'Utiliser seulement le cash', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 2,
    explanation: 'Mobile Money peut servir de plateforme pour transférer vers des comptes épargne.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-025',
    text: 'Quels sont les avantages du paiement marchand Mobile Money ?',
    options: [
      { id: 'a', text: 'Pas de frais de retrait, traçabilité, sécurité', isCorrect: true },
      { id: 'b', text: 'Frais plus élevés', isCorrect: false },
      { id: 'c', text: 'Plus lent que le cash', isCorrect: false },
      { id: 'd', text: 'Nécessite internet', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 2,
    explanation: 'Le paiement marchand évite les frais de retrait, offre traçabilité et sécurité.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-026',
    text: 'Comment sécuriser ses transactions Mobile Money ?',
    options: [
      { id: 'a', text: 'Vérifier le numéro du destinataire, ne pas partager son code', isCorrect: true },
      { id: 'b', text: 'Partager son code PIN', isCorrect: false },
      { id: 'c', text: 'Faire des transactions publiques', isCorrect: false },
      { id: 'd', text: 'Utiliser des réseaux non sécurisés', isCorrect: false }
    ],
    category: 'mobile-money',
    difficulty: 2,
    explanation: 'Il faut vérifier le destinataire, garder son code secret, et utiliser des réseaux sécurisés.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-027',
    text: 'Qu\'est-ce qu\'un investissement ?',
    options: [
      { id: 'a', text: 'Placer de l\'argent pour le faire fructifier', isCorrect: true },
      { id: 'b', text: 'Dépenser de l\'argent', isCorrect: false },
      { id: 'c', text: 'Prêter sans intérêt', isCorrect: false },
      { id: 'd', text: 'Cacher de l\'argent', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Un investissement consiste à placer de l\'argent pour le faire fructifier à long terme.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-028',
    text: 'Quelle est la différence entre épargne et investissement ?',
    options: [
      { id: 'a', text: 'Épargne = sécurité, Investissement = rendement avec risque', isCorrect: true },
      { id: 'b', text: 'Aucune différence', isCorrect: false },
      { id: 'c', text: 'L\'inverse', isCorrect: false },
      { id: 'd', text: 'Épargne = risque, Investissement = sécurité', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'L\'épargne privilégie la sécurité, l\'investissement vise le rendement avec plus de risque.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-029',
    text: 'Qu\'est-ce que la diversification ?',
    options: [
      { id: 'a', text: 'Répartir ses investissements pour réduire les risques', isCorrect: true },
      { id: 'b', text: 'Mettre tout au même endroit', isCorrect: false },
      { id: 'c', text: 'Investir seulement en actions', isCorrect: false },
      { id: 'd', text: 'Ne pas investir', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'La diversification consiste à répartir ses investissements pour réduire les risques.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-030',
    text: 'Qu\'est-ce qu\'un fonds commun de placement ?',
    options: [
      { id: 'a', text: 'Un portefeuille géré par des professionnels', isCorrect: true },
      { id: 'b', text: 'Un compte bancaire', isCorrect: false },
      { id: 'c', text: 'Un prêt', isCorrect: false },
      { id: 'd', text: 'Une assurance', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Un FCP est un portefeuille d\'investissements géré par des professionnels.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-031',
    text: 'Comment calculer le rendement d\'un investissement ?',
    options: [
      { id: 'a', text: '(Valeur finale - Valeur initiale) / Valeur initiale × 100', isCorrect: true },
      { id: 'b', text: 'Valeur finale - Valeur initiale', isCorrect: false },
      { id: 'c', text: 'Valeur finale / Valeur initiale', isCorrect: false },
      { id: 'd', text: 'Valeur initiale - Valeur finale', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    explanation: 'Le rendement = (Valeur finale - Valeur initiale) / Valeur initiale × 100.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-032',
    text: 'À Antananarivo, comment investir dans l\'immobilier locatif ?',
    options: [
      { id: 'a', text: 'Étudier la localisation, les loyers, les frais', isCorrect: true },
      { id: 'b', text: 'Acheter n\'importe où', isCorrect: false },
      { id: 'c', text: 'Ne pas investir', isCorrect: false },
      { id: 'd', text: 'Acheter le plus cher', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    region: 'Analamanga',
    explanation: 'Il faut étudier la localisation, les loyers potentiels, et tous les frais associés.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-033',
    text: 'À Mahajanga, comment diversifier les revenus de pêche ?',
    options: [
      { id: 'a', text: 'Développer le tourisme, la transformation, l\'élevage', isCorrect: true },
      { id: 'b', text: 'Pêcher plus', isCorrect: false },
      { id: 'c', text: 'Ne rien changer', isCorrect: false },
      { id: 'd', text: 'Arrêter la pêche', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 2,
    region: 'Boeny',
    explanation: 'Diversifier avec le tourisme, la transformation des produits, ou l\'élevage complémentaire.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-034',
    text: 'Comment créer un fonds d\'urgence efficace ?',
    options: [
      { id: 'a', text: 'Épargner 3-6 mois de dépenses dans un compte accessible', isCorrect: true },
      { id: 'b', text: 'Investir tout en actions', isCorrect: false },
      { id: 'c', text: 'Ne pas épargner', isCorrect: false },
      { id: 'd', text: 'Prêter à des amis', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 2,
    explanation: 'Un fonds d\'urgence doit être accessible rapidement et couvrir 3-6 mois de dépenses.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-035',
    text: 'Qu\'est-ce que l\'épargne automatique ?',
    options: [
      { id: 'a', text: 'Épargne prélevée automatiquement chaque mois', isCorrect: true },
      { id: 'b', text: 'Épargne manuelle', isCorrect: false },
      { id: 'c', text: 'Épargne aléatoire', isCorrect: false },
      { id: 'd', text: 'Épargne obligatoire', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 2,
    explanation: 'L\'épargne automatique est prélevée automatiquement chaque mois sans intervention.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-036',
    text: 'Comment choisir un compte d\'épargne ?',
    options: [
      { id: 'a', text: 'Comparer taux d\'intérêt, frais et accessibilité', isCorrect: true },
      { id: 'b', text: 'Choisir le plus proche', isCorrect: false },
      { id: 'c', text: 'Choisir le plus cher', isCorrect: false },
      { id: 'd', text: 'Choisir au hasard', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 2,
    explanation: 'Il faut comparer le taux d\'intérêt, les frais et l\'accessibilité pour choisir le meilleur compte.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-037',
    text: 'Qu\'est-ce qu\'un objectif d\'épargne SMART ?',
    options: [
      { id: 'a', text: 'Spécifique, Mesurable, Atteignable, Réaliste, Temporel', isCorrect: true },
      { id: 'b', text: 'Simple et rapide', isCorrect: false },
      { id: 'c', text: 'Secret et mystérieux', isCorrect: false },
      { id: 'd', text: 'Spontané et aléatoire', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 2,
    explanation: 'Un objectif SMART est Spécifique, Mesurable, Atteignable, Réaliste et Temporel.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-038',
    text: 'Comment calculer ses besoins d\'épargne ?',
    options: [
      { id: 'a', text: 'Définir l\'objectif, le délai et calculer le montant mensuel', isCorrect: true },
      { id: 'b', text: 'Épargner n\'importe combien', isCorrect: false },
      { id: 'c', text: 'Épargner tout ce qui reste', isCorrect: false },
      { id: 'd', text: 'Ne pas épargner', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 2,
    explanation: 'Il faut définir l\'objectif, le délai et calculer le montant mensuel nécessaire.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-039',
    text: 'Qu\'est-ce que l\'épargne de précaution ?',
    options: [
      { id: 'a', text: 'Épargne pour faire face aux imprévus', isCorrect: true },
      { id: 'b', text: 'Épargne pour les vacances', isCorrect: false },
      { id: 'c', text: 'Épargne pour les loisirs', isCorrect: false },
      { id: 'd', text: 'Épargne pour les cadeaux', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 2,
    explanation: 'L\'épargne de précaution sert à faire face aux dépenses imprévues et urgences.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-040',
    text: 'Comment motiver l\'épargne familiale ?',
    options: [
      { id: 'a', text: 'Impliquer toute la famille et fixer des objectifs communs', isCorrect: true },
      { id: 'b', text: 'Forcer les enfants', isCorrect: false },
      { id: 'c', text: 'Cacher l\'argent', isCorrect: false },
      { id: 'd', text: 'Ne pas parler d\'argent', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 2,
    explanation: 'Il faut impliquer toute la famille et fixer des objectifs communs pour motiver l\'épargne.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-041',
    text: 'Qu\'est-ce qu\'un budget familial équilibré ?',
    options: [
      { id: 'a', text: 'Un budget où les revenus couvrent les dépenses', isCorrect: true },
      { id: 'b', text: 'Un budget avec beaucoup d\'argent', isCorrect: false },
      { id: 'c', text: 'Un budget complexe', isCorrect: false },
      { id: 'd', text: 'Un budget secret', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 2,
    explanation: 'Un budget équilibré est un budget où les revenus couvrent toutes les dépenses prévues.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-042',
    text: 'Comment gérer les dépenses familiales ?',
    options: [
      { id: 'a', text: 'Catégoriser les dépenses et suivre les habitudes', isCorrect: true },
      { id: 'b', text: 'Dépenser sans compter', isCorrect: false },
      { id: 'c', text: 'Ne pas dépenser', isCorrect: false },
      { id: 'd', text: 'Dépenser tout le premier jour', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 2,
    explanation: 'Il faut catégoriser les dépenses et suivre les habitudes de consommation familiale.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-043',
    text: 'Qu\'est-ce que la communication financière familiale ?',
    options: [
      { id: 'a', text: 'Discuter ouvertement des finances en famille', isCorrect: true },
      { id: 'b', text: 'Cacher les problèmes financiers', isCorrect: false },
      { id: 'c', text: 'Mentir sur les revenus', isCorrect: false },
      { id: 'd', text: 'Ne jamais parler d\'argent', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 2,
    explanation: 'La communication financière familiale consiste à discuter ouvertement des finances en famille.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-044',
    text: 'Comment impliquer les enfants dans la gestion financière ?',
    options: [
      { id: 'a', text: 'Leur expliquer la valeur de l\'argent et l\'épargne', isCorrect: true },
      { id: 'b', text: 'Leur donner beaucoup d\'argent', isCorrect: false },
      { id: 'c', text: 'Cacher les problèmes financiers', isCorrect: false },
      { id: 'd', text: 'Les laisser gérer le budget', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 2,
    explanation: 'Il faut expliquer aux enfants la valeur de l\'argent et l\'importance de l\'épargne dès le plus jeune âge.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-045',
    text: 'Qu\'est-ce qu\'un budget prévisionnel ?',
    options: [
      { id: 'a', text: 'Un budget planifié pour l\'avenir', isCorrect: true },
      { id: 'b', text: 'Un budget du passé', isCorrect: false },
      { id: 'c', text: 'Un budget approximatif', isCorrect: false },
      { id: 'd', text: 'Un budget secret', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Un budget prévisionnel est un budget planifié pour les mois ou années à venir.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-046',
    text: 'Comment suivre ses dépenses quotidiennes ?',
    options: [
      { id: 'a', text: 'Noter chaque dépense dans un carnet ou une app', isCorrect: true },
      { id: 'b', text: 'Se souvenir de tout', isCorrect: false },
      { id: 'c', text: 'Demander à quelqu\'un d\'autre', isCorrect: false },
      { id: 'd', text: 'Ne pas s\'en préoccuper', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Il faut noter chaque dépense pour bien suivre son budget et identifier les fuites.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-047',
    text: 'Qu\'est-ce qu\'un budget zéro ?',
    options: [
      { id: 'a', text: 'Un budget où chaque euro est assigné à un poste', isCorrect: true },
      { id: 'b', text: 'Un budget sans argent', isCorrect: false },
      { id: 'c', text: 'Un budget secret', isCorrect: false },
      { id: 'd', text: 'Un budget temporaire', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Un budget zéro assigne chaque euro à un poste spécifique, sans argent "perdu".',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-048',
    text: 'Comment gérer les dépenses imprévues ?',
    options: [
      { id: 'a', text: 'Avoir un fonds d\'urgence et ajuster le budget', isCorrect: true },
      { id: 'b', text: 'Les ignorer', isCorrect: false },
      { id: 'c', text: 'Emprunter systématiquement', isCorrect: false },
      { id: 'd', text: 'Vendre ses biens', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Il faut avoir un fonds d\'urgence et ajuster le budget pour gérer les imprévus.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-049',
    text: 'Quelle est l\'importance de revoir son budget régulièrement ?',
    options: [
      { id: 'a', text: 'Cela permet de s\'adapter aux changements', isCorrect: true },
      { id: 'b', text: 'Ce n\'est pas nécessaire', isCorrect: false },
      { id: 'c', text: 'Cela complique la gestion', isCorrect: false },
      { id: 'd', text: 'Cela coûte de l\'argent', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Revoir son budget régulièrement permet de s\'adapter aux changements de revenus et de dépenses.',
    points: 2,
    timeLimit: 60
  },
  {
    id: 'cert-level2-050',
    text: 'Comment optimiser ses frais bancaires ?',
    options: [
      { id: 'a', text: 'Lire les conditions et respecter les seuils', isCorrect: true },
      { id: 'b', text: 'Ne pas utiliser la banque', isCorrect: false },
      { id: 'c', text: 'Utiliser plusieurs banques', isCorrect: false },
      { id: 'd', text: 'Fermer tous les comptes', isCorrect: false }
    ],
    category: 'budget',
    difficulty: 2,
    explanation: 'Il faut lire les conditions tarifaires et respecter les seuils pour éviter les frais.',
    points: 2,
    timeLimit: 60
  }
];

// Level 3: Avancé Financier - 50 questions covering advanced savings, family finance, and financial goals
export const level3Questions: CertificationQuestion[] = [
  // Advanced Savings (15 questions)
  {
    id: 'cert-level3-001',
    text: 'Qu\'est-ce qu\'un plan d\'épargne-retraite ?',
    options: [
      { id: 'a', text: 'Un placement à long terme pour la retraite', isCorrect: true },
      { id: 'b', text: 'Un compte courant', isCorrect: false },
      { id: 'c', text: 'Un prêt', isCorrect: false },
      { id: 'd', text: 'Une assurance', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 3,
    explanation: 'Un PER est un placement à long terme pour préparer financièrement sa retraite.',
    points: 3,
    timeLimit: 45
  },
  {
    id: 'cert-level3-002',
    text: 'Comment calculer ses besoins de retraite ?',
    options: [
      { id: 'a', text: '70-80% de ses revenus actuels × années de retraite', isCorrect: true },
      { id: 'b', text: '100% de ses revenus actuels', isCorrect: false },
      { id: 'c', text: '50% de ses revenus actuels', isCorrect: false },
      { id: 'd', text: 'Le montant de sa pension', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 3,
    explanation: 'Il faut prévoir 70-80% de ses revenus actuels multiplié par les années de retraite.',
    points: 3,
    timeLimit: 45
  },
  {
    id: 'cert-level3-003',
    text: 'Qu\'est-ce que l\'épargne programmée ?',
    options: [
      { id: 'a', text: 'Épargne automatique avec objectif défini', isCorrect: true },
      { id: 'b', text: 'Épargne aléatoire', isCorrect: false },
      { id: 'c', text: 'Épargne obligatoire', isCorrect: false },
      { id: 'd', text: 'Épargne temporaire', isCorrect: false }
    ],
    category: 'savings',
    difficulty: 3,
    explanation: 'L\'épargne programmée est un système automatique avec un objectif financier défini.',
    points: 3,
    timeLimit: 45
  },

  // Family Finance Advanced (20 questions)
  {
    id: 'cert-level3-004',
    text: 'Comment planifier les études des enfants ?',
    options: [
      { id: 'a', text: 'Créer un budget éducation et commencer tôt', isCorrect: true },
      { id: 'b', text: 'Attendre qu\'ils grandissent', isCorrect: false },
      { id: 'c', text: 'Emprunter le moment venu', isCorrect: false },
      { id: 'd', text: 'Compter sur l\'État', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 3,
    explanation: 'Il faut créer un budget éducation et commencer à épargner dès la naissance.',
    points: 3,
    timeLimit: 45
  },
  {
    id: 'cert-level3-005',
    text: 'Qu\'est-ce qu\'un contrat de mariage financier ?',
    options: [
      { id: 'a', text: 'Un accord sur la gestion des biens du couple', isCorrect: true },
      { id: 'b', text: 'Un contrat de mariage', isCorrect: false },
      { id: 'c', text: 'Un prêt', isCorrect: false },
      { id: 'd', text: 'Une assurance', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 3,
    explanation: 'C\'est un accord sur la gestion des biens et finances du couple.',
    points: 3,
    timeLimit: 45
  },
  {
    id: 'cert-level3-006',
    text: 'Comment gérer l\'héritage financier ?',
    options: [
      { id: 'a', text: 'Planifier la transmission, optimiser les droits', isCorrect: true },
      { id: 'b', text: 'Attendre le décès', isCorrect: false },
      { id: 'c', text: 'Tout donner immédiatement', isCorrect: false },
      { id: 'd', text: 'Ne pas planifier', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 3,
    explanation: 'Il faut planifier la transmission et optimiser les droits de succession.',
    points: 3,
    timeLimit: 45
  },

  // Financial Goals (15 questions)
  {
    id: 'cert-level3-007',
    text: 'Comment prioriser ses objectifs financiers ?',
    options: [
      { id: 'a', text: 'Urgence, court terme, moyen terme, long terme', isCorrect: true },
      { id: 'b', text: 'Le plus cher d\'abord', isCorrect: false },
      { id: 'c', text: 'Au hasard', isCorrect: false },
      { id: 'd', text: 'Le plus facile', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 3,
    explanation: 'Prioriser : fonds d\'urgence, objectifs court terme, moyen terme, puis long terme.',
    points: 3,
    timeLimit: 45
  },
  {
    id: 'cert-level3-008',
    text: 'Qu\'est-ce qu\'un plan financier global ?',
    options: [
      { id: 'a', text: 'Une vision complète de sa situation financière', isCorrect: true },
      { id: 'b', text: 'Un budget mensuel', isCorrect: false },
      { id: 'c', text: 'Un investissement', isCorrect: false },
      { id: 'd', text: 'Un prêt', isCorrect: false }
    ],
    category: 'family-finance',
    difficulty: 3,
    explanation: 'Un plan financier global couvre tous les aspects de sa situation financière.',
    points: 3,
    timeLimit: 45
  }
];

// Level 4: Expert Financier - 50 questions covering entrepreneurship, business finance, loans, and insurance
export const level4Questions: CertificationQuestion[] = [
  // Entrepreneurship (15 questions)
  {
    id: 'cert-level4-001',
    text: 'Comment créer un business plan financier ?',
    options: [
      { id: 'a', text: 'Projeter revenus, coûts, investissements, trésorerie', isCorrect: true },
      { id: 'b', text: 'Estimer au hasard', isCorrect: false },
      { id: 'c', text: 'Copier un concurrent', isCorrect: false },
      { id: 'd', text: 'Ne pas planifier', isCorrect: false }
    ],
    category: 'entrepreneurship',
    difficulty: 4,
    explanation: 'Il faut projeter les revenus, coûts, investissements et besoins de trésorerie.',
    points: 4,
    timeLimit: 30
  },
  {
    id: 'cert-level4-002',
    text: 'Qu\'est-ce que le fonds de roulement ?',
    options: [
      { id: 'a', text: 'L\'argent nécessaire pour faire tourner l\'entreprise', isCorrect: true },
      { id: 'b', text: 'Les bénéfices', isCorrect: false },
      { id: 'c', text: 'Les investissements', isCorrect: false },
      { id: 'd', text: 'Les prêts', isCorrect: false }
    ],
    category: 'entrepreneurship',
    difficulty: 4,
    explanation: 'Le fonds de roulement est l\'argent nécessaire au fonctionnement quotidien de l\'entreprise.',
    points: 4,
    timeLimit: 30
  },

  // Business Finance (15 questions)
  {
    id: 'cert-level4-003',
    text: 'Comment gérer la trésorerie d\'une entreprise ?',
    options: [
      { id: 'a', text: 'Prévoir les entrées et sorties, avoir des réserves', isCorrect: true },
      { id: 'b', text: 'Attendre les paiements', isCorrect: false },
      { id: 'c', text: 'Ne pas s\'en préoccuper', isCorrect: false },
      { id: 'd', text: 'Emprunter toujours', isCorrect: false }
    ],
    category: 'entrepreneurship',
    difficulty: 4,
    explanation: 'Il faut prévoir les flux de trésorerie et maintenir des réserves suffisantes.',
    points: 4,
    timeLimit: 30
  },

  // Loans and Credit (10 questions)
  {
    id: 'cert-level4-004',
    text: 'Comment négocier un prêt professionnel ?',
    options: [
      { id: 'a', text: 'Préparer un dossier solide, comparer les offres', isCorrect: true },
      { id: 'b', text: 'Accepter la première offre', isCorrect: false },
      { id: 'c', text: 'Mentir sur ses revenus', isCorrect: false },
      { id: 'd', text: 'Ne pas préparer', isCorrect: false }
    ],
    category: 'entrepreneurship',
    difficulty: 4,
    explanation: 'Il faut préparer un dossier complet et comparer plusieurs offres bancaires.',
    points: 4,
    timeLimit: 30
  },

  // Insurance (10 questions)
  {
    id: 'cert-level4-005',
    text: 'Qu\'est-ce qu\'une assurance responsabilité civile professionnelle ?',
    options: [
      { id: 'a', text: 'Protection contre les dommages causés à des tiers', isCorrect: true },
      { id: 'b', text: 'Assurance santé', isCorrect: false },
      { id: 'c', text: 'Assurance vie', isCorrect: false },
      { id: 'd', text: 'Assurance auto', isCorrect: false }
    ],
    category: 'entrepreneurship',
    difficulty: 4,
    explanation: 'La RC Pro couvre les dommages causés à des tiers dans le cadre professionnel.',
    points: 4,
    timeLimit: 30
  }
];

// Level 5: Maître Financier - 50 questions covering mastery investment, retirement, and mentoring
export const level5Questions: CertificationQuestion[] = [
  // Mastery Investment (20 questions)
  {
    id: 'cert-level5-001',
    text: 'Qu\'est-ce que la gestion de portefeuille avancée ?',
    options: [
      { id: 'a', text: 'Optimisation risque/rendement avec stratégies complexes', isCorrect: true },
      { id: 'b', text: 'Acheter n\'importe quoi', isCorrect: false },
      { id: 'c', text: 'Ne pas diversifier', isCorrect: false },
      { id: 'd', text: 'Tout mettre en actions', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 5,
    explanation: 'La gestion avancée optimise le ratio risque/rendement avec des stratégies sophistiquées.',
    points: 5,
    timeLimit: 30
  },
  {
    id: 'cert-level5-002',
    text: 'Comment gérer les risques d\'investissement ?',
    options: [
      { id: 'a', text: 'Diversification, hedging, allocation dynamique', isCorrect: true },
      { id: 'b', text: 'Ne pas investir', isCorrect: false },
      { id: 'c', text: 'Tout mettre au même endroit', isCorrect: false },
      { id: 'd', text: 'Suivre les conseils d\'un seul', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 5,
    explanation: 'La gestion des risques combine diversification, couverture et allocation dynamique.',
    points: 5,
    timeLimit: 30
  },

  // Retirement Planning (15 questions)
  {
    id: 'cert-level5-003',
    text: 'Comment optimiser sa retraite avec plusieurs piliers ?',
    options: [
      { id: 'a', text: 'Combiner répartition, prévoyance, épargne privée', isCorrect: true },
      { id: 'b', text: 'Compter seulement sur l\'État', isCorrect: false },
      { id: 'c', text: 'Ne pas épargner', isCorrect: false },
      { id: 'd', text: 'Tout mettre en actions', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 5,
    explanation: 'Il faut combiner les 3 piliers : répartition, prévoyance professionnelle, épargne privée.',
    points: 5,
    timeLimit: 30
  },

  // Financial Mentoring (15 questions)
  {
    id: 'cert-level5-004',
    text: 'Comment devenir un mentor financier efficace ?',
    options: [
      { id: 'a', text: 'Formation continue, expérience, écoute, adaptation', isCorrect: true },
      { id: 'b', text: 'Donner des conseils génériques', isCorrect: false },
      { id: 'c', text: 'Imposer ses idées', isCorrect: false },
      { id: 'd', text: 'Ne pas s\'adapter', isCorrect: false }
    ],
    category: 'investment',
    difficulty: 5,
    explanation: 'Un bon mentor se forme continuellement, écoute et s\'adapte à chaque situation.',
    points: 5,
    timeLimit: 30
  }
];

// Export all questions combined
export const allCertificationQuestions: CertificationQuestion[] = [
  ...level1Questions,
  ...level2Questions,
  ...level3Questions,
  ...level4Questions,
  ...level5Questions
];

// Export questions by level for easy access
export const questionsByLevel = {
  1: level1Questions,
  2: level2Questions,
  3: level3Questions,
  4: level4Questions,
  5: level5Questions
};

