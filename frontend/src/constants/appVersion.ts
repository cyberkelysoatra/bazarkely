export const APP_VERSION = '2.0.3';
export const APP_BUILD_DATE = '2025-12-25';

export type VersionEntry = {
  version: string;
  date: string;
  changes: string[];
  type: 'major' | 'minor' | 'patch' | 'hotfix';
};

export const VERSION_HISTORY: VersionEntry[] = [
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


