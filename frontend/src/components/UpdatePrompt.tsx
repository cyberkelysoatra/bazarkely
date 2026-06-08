/**
 * Pilote de mise à jour du Service Worker — mise à jour 100% AUTOMATIQUE.
 *
 * Ce composant n'affiche plus aucun bandeau : il monte simplement le hook
 * `useServiceWorkerUpdate`, qui détecte une nouvelle version, l'active (le SW fait
 * `skipWaiting` à l'install + purge les anciens caches) puis recharge la page
 * automatiquement. L'utilisateur n'a AUCUNE manipulation à faire ; un toast discret
 * « Application mise à jour ✅ » confirme après le rechargement. Les données et la file
 * de synchronisation hors-ligne ne sont jamais touchées.
 */

import React from 'react';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

const UpdatePrompt: React.FC = () => {
  // Monte le pilote d'auto-mise-à-jour (détection + activation + purge + rechargement).
  useServiceWorkerUpdate();
  return null;
};

export default UpdatePrompt;

















