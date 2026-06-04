/**
 * Module gestion-eau — Export centralisé.
 * Distribution d'eau d'une copropriété : bassin (~280 m³) → villas/golf/communs,
 * relevés multi-quotidiens, détection d'anomalies/fuites (stock attendu vs mesuré) + NRW.
 * Offline-first (Dexie dédiée GestionEauDB) + sync Supabase idempotente (upsert id client).
 */

// Contexte & provider
export { GestionEauProvider, useGestionEau, GestionEauContext } from './context';

// Gardes & routes
export { GestionEauRoute, EauRoleProtectedRoute, GestionEauRoutes } from './components';

// Base locale
export { eauDb, EAU_TABLES } from './db/gestionEauDb';

// Types
export * from './types/gestionEau';

// Services (namespaces)
export * as services from './services';
