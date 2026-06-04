/** Exports centralisés des services du module gestion-eau. */
export * as eauSync from './eauSync';
export * as eauRoleService from './eauRoleService';
export * as eauConfigService from './eauConfigService';
export * as eauCompteurService from './eauCompteurService';
export * as eauReleveService from './eauReleveService';
export * as eauBilanService from './eauBilanService';
export * as eauFactureService from './eauFactureService';
export * as eauCompteClientService from './eauCompteClientService';
export * as eauDemandeService from './eauDemandeService';
export * as eauEnrollmentService from './eauEnrollmentService';
export { getCurrentUserIdSafe, getCurrentUserIdSync } from './eauAuth';
