export const APP_VERSION = '2.3.0';
export const APP_BUILD_DATE = '2025-12-31';

export type VersionEntry = {
  version: string;
  date: string;
  changes: string[];
  type: 'major' | 'minor' | 'patch' | 'hotfix';
};

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '2.3.0',
    date: '2025-12-31',
    type: 'minor',
    changes: [
      'Correction GoalsPage - chargement via goalService au lieu d\'IndexedDB direct',
      'Nouveau composant GoalModal pour création/édition d\'objectifs',
      'Nouveau service savingsService pour liaison Goals ↔ Comptes épargne',
      'Extension schéma: linked_account_id, auto_sync dans goals',
      'Extension schéma: linked_goal_id, interest_rate, is_savings_account dans accounts',
      'IndexedDB version 9 avec nouveaux index pour liaison goals-accounts',
      'CRUD complet sur la page Objectifs d\'épargne'
    ]
  },
  {
    version: '2.2.0',
    date: '2025-12-31',
    type: 'minor',
    changes: [
      'Page Statistiques Budget (/budgets/statistics) avec comparaison multi-années',
      'Hook useMultiYearBudgetData pour agrégation données multi-années',
      'Détection catégories problématiques avec sévérité (low/medium/high/critical)',
      'Barres de progression bicolores (vert budget respecté, orange dépassement)',
      'Affichage "Dépassé: -XXX Ar" pour budgets en dépassement',
      'Correction icône épargne (PiggyBank)',
      'Correction champ montant édition transaction récurrente'
    ]
  },
  {
    version: '2.1.0',
    date: '2025-12-29',
    type: 'minor',
    changes: [
      'Ajout vue budget annuelle avec toggle Mensuel/Annuel',
      'Graphique barres comparatif Budget vs Dépensé sur 12 mois',
      'Cartes catégories avec données agrégées annuelles',
      'Indicateurs de conformité budgétaire (Bon/Attention/Dépassé)',
      'Navigation vers transactions filtrées par année'
    ]
  },
  {
    version: '2.0.6',
    date: '2025-12-26',
    changes: [
      'Fix: Navigation au clic sur transactions récentes du dashboard'
    ],
    type: 'patch'
  },
  {
    version: '2.0.5',
    date: '2025-12-25',
    changes: [
      'Correction affichage Résumé mensuel (Revenus, Dépenses, Solde net)'
    ],
    type: 'patch'
  },
  {
    version: '2.0.4',
    date: '2025-12-25',
    changes: [
      'Intégration visuelle parfaite barre de statut et header'
    ],
    type: 'patch'
  },
  {
    version: '2.0.3',
    date: '2025-12-25',
    changes: [
      'Couleur barre de statut harmonisée avec le header',
      'Configuration PWA pour correspondance visuelle parfaite'
    ],
    type: 'patch'
  },
  {
    version: '2.0.2',
    date: '2025-12-25',
    changes: [
      'Ajout du système de gestion des versions',
      'Page dédiée pour afficher la version et les mises à jour',
      'Bouton de mise à jour dans le menu utilisateur',
      'Correction du Service Worker pour mises à jour contrôlées'
    ],
    type: 'patch'
  },
  {
    version: '2.0.1',
    date: '2025-12-22',
    changes: [
      'PWA Phase 3 - Synchronisation prioritaire',
      'Optimisation du header et messages rotatifs',
      'Correction du LevelBadge modernisé',
      'Amélioration de la compatibilité Safari'
    ],
    type: 'patch'
  },
  {
    version: '2.0.0',
    date: '2025-12-21',
    changes: [
      'PWA installable sur mobile Android et iOS',
      'Mode hors-ligne complet avec IndexedDB',
      'Synchronisation automatique des données',
      'Support multi-devises MGA/EUR',
      'Dashboard avec résumé mensuel',
      'Gestion familiale et remboursements'
    ],
    type: 'major'
  },
  {
    version: '1.0.0',
    date: '2025-01-12',
    changes: [
      'Version initiale de BazarKELY',
      'Gestion des transactions et comptes',
      'Catégorisation des dépenses',
      'Objectifs d\'épargne'
    ],
    type: 'major'
  }
];

export const getLatestVersion = (): string => APP_VERSION;

export const hasNewVersion = (installedVersion: string): boolean => {
  const installed = installedVersion.split('.').map(Number);
  const latest = APP_VERSION.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (latest[i] > installed[i]) return true;
    if (latest[i] < installed[i]) return false;
  }
  return false;
};


