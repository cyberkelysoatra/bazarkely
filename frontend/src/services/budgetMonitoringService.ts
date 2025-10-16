/**
 * Budget Monitoring Service - BazarKELY
 * Service de surveillance continue des budgets avec alertes intelligentes
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import { detectSpendingDeviation } from './budgetIntelligenceService.ts';
import type { DeviationAlert, CategoryBudgets } from './budgetIntelligenceService.ts';
import { useAppStore } from '../stores/appStore';
import type { Transaction } from '../types/index.js';

/**
 * Interface pour un élément d'historique d'alerte
 */
export interface AlertHistoryItem {
  readonly id: string;
  readonly alert: DeviationAlert;
  readonly timestamp: Date;
  readonly status: 'read' | 'unread';
  readonly priority: number;
}

/**
 * Interface pour la configuration du monitoring
 */
interface MonitoringConfig {
  readonly checkIntervalHours: number;
  readonly checkHours: readonly number[];
  readonly maxAlertHistoryDays: number;
  readonly criticalSeverityThreshold: number;
  readonly warningSeverityThreshold: number;
}

/**
 * Configuration par défaut du monitoring
 */
const DEFAULT_CONFIG: MonitoringConfig = {
  checkIntervalHours: 6, // Vérification toutes les 6 heures
  checkHours: [6, 12, 18], // 6h, 12h, 18h
  maxAlertHistoryDays: 30,
  criticalSeverityThreshold: 90, // 90% du budget consommé
  warningSeverityThreshold: 80, // 80% du budget consommé
};

/**
 * Clés de catégories essentielles (priorité élevée)
 */
const ESSENTIAL_CATEGORIES: readonly (keyof CategoryBudgets)[] = [
  'Alimentation',
  'Logement',
  'Transport',
  'Santé',
  'Éducation'
] as const;

/**
 * Clés de catégories non-essentielles (priorité faible)
 */
const NON_ESSENTIAL_CATEGORIES: readonly (keyof CategoryBudgets)[] = [
  'Loisirs',
  'Habillement',
  'Communication'
] as const;

/**
 * Clé de stockage localStorage pour l'historique des alertes
 */
const ALERT_HISTORY_KEY = 'bazarkely_alert_history';

/**
 * Vérifie si l'heure actuelle correspond aux heures de vérification programmées
 * @param checkHours - Heures de vérification (0-23)
 * @returns true si l'heure actuelle est dans la liste
 */
const isCheckTime = (checkHours: readonly number[]): boolean => {
  const currentHour = new Date().getHours();
  return checkHours.includes(currentHour);
};

/**
 * Vérifie si une alerte est un doublon basé sur la catégorie et la date
 * @param newAlert - Nouvelle alerte à vérifier
 * @param existingAlerts - Alertes existantes
 * @returns true si l'alerte est un doublon
 */
const isDuplicateAlert = (
  newAlert: DeviationAlert,
  existingAlerts: readonly AlertHistoryItem[]
): boolean => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return existingAlerts.some(existingAlert => {
    const alertTime = new Date(existingAlert.timestamp);
    return (
      existingAlert.alert.category === newAlert.category &&
      alertTime > twentyFourHoursAgo &&
      existingAlert.status === 'unread'
    );
  });
};

/**
 * Calcule la priorité d'une alerte basée sur sa gravité et sa catégorie
 * @param alert - Alerte de déviation
 * @returns Priorité de 1 (faible) à 5 (critique)
 */
export const calculateAlertPriority = (alert: DeviationAlert): number => {
  let priority = 1; // Priorité de base

  // Priorité basée sur la gravité
  switch (alert.severity) {
    case 'critical':
      priority += 4; // 5 total
      break;
    case 'warning':
      priority += 2; // 3 total
      break;
    case 'normal':
      priority += 0; // 1 total
      break;
    default:
      priority += 0;
  }

  // Priorité basée sur le pourcentage de déviation
  if (alert.percentage_consumed > 95) {
    priority += 1;
  } else if (alert.percentage_consumed > 85) {
    priority += 0.5;
  }

  // Priorité basée sur la catégorie
  if (ESSENTIAL_CATEGORIES.includes(alert.category as keyof CategoryBudgets)) {
    priority += 1; // Catégories essentielles
  } else if (NON_ESSENTIAL_CATEGORIES.includes(alert.category as keyof CategoryBudgets)) {
    priority -= 0.5; // Catégories non-essentielles
  }

  // Arrondir et limiter entre 1 et 5
  return Math.min(5, Math.max(1, Math.round(priority)));
};

/**
 * Sauvegarde l'historique des alertes dans localStorage
 * @param alerts - Tableau des alertes à sauvegarder
 */
const saveAlertHistoryToStorage = (alerts: readonly AlertHistoryItem[]): void => {
  try {
    const serialized = JSON.stringify(alerts.map(alert => ({
      ...alert,
      timestamp: alert.timestamp.toISOString()
    })));
    localStorage.setItem(ALERT_HISTORY_KEY, serialized);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'historique des alertes:', error);
  }
};

/**
 * Charge l'historique des alertes depuis localStorage
 * @returns Tableau des alertes ou tableau vide en cas d'erreur
 */
const loadAlertHistoryFromStorage = (): AlertHistoryItem[] => {
  try {
    const stored = localStorage.getItem(ALERT_HISTORY_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
  } catch (error) {
    console.error('Erreur lors du chargement de l\'historique des alertes:', error);
    return [];
  }
};

/**
 * Nettoie les alertes anciennes (plus de 30 jours)
 * @param alerts - Tableau des alertes à nettoyer
 * @returns Tableau nettoyé
 */
const cleanOldAlerts = (alerts: readonly AlertHistoryItem[]): AlertHistoryItem[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_CONFIG.maxAlertHistoryDays);

  return alerts.filter(alert => new Date(alert.timestamp) > cutoffDate);
};

/**
 * Obtient l'historique des alertes trié par date (plus récent en premier)
 * @returns Tableau des alertes triées
 */
export const getAlertHistory = (): AlertHistoryItem[] => {
  const store = useAppStore.getState();
  const storedAlerts = loadAlertHistoryFromStorage();
  
  // Fusionner les alertes du store et du localStorage
  const allAlerts = [...(store.alerts || []), ...storedAlerts];
  
  // Nettoyer les doublons et les anciennes alertes
  const uniqueAlerts = allAlerts.filter((alert, index, self) => 
    index === self.findIndex(a => a.id === alert.id)
  );
  
  const cleanedAlerts = cleanOldAlerts(uniqueAlerts);
  
  // Sauvegarder les alertes nettoyées
  if (cleanedAlerts.length !== allAlerts.length) {
    saveAlertHistoryToStorage(cleanedAlerts);
  }
  
  // Trier par date décroissante
  return cleanedAlerts.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Marque une alerte comme lue
 * @param alertId - ID de l'alerte à marquer
 */
export const markAlertAsRead = (alertId: string): void => {
  const store = useAppStore.getState();
  const alerts = store.alerts || [];
  
  const updatedAlerts = alerts.map(alert => 
    alert.id === alertId 
      ? { ...alert, status: 'read' as const }
      : alert
  );
  
  store.setAlerts(updatedAlerts);
  saveAlertHistoryToStorage(updatedAlerts);
};

/**
 * Supprime une alerte de l'historique
 * @param alertId - ID de l'alerte à supprimer
 */
export const dismissAlert = (alertId: string): void => {
  const store = useAppStore.getState();
  const alerts = store.alerts || [];
  
  const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
  
  store.setAlerts(updatedAlerts);
  saveAlertHistoryToStorage(updatedAlerts);
};

/**
 * Ajoute une nouvelle alerte au store
 * @param alert - Alerte de déviation
 * @param showToast - Afficher une notification toast
 */
const addAlertToStore = (alert: DeviationAlert, showToast: boolean = false): void => {
  const store = useAppStore.getState();
  const alerts = store.alerts || [];
  
  const newAlertItem: AlertHistoryItem = {
    id: crypto.randomUUID(),
    alert,
    timestamp: new Date(),
    status: 'unread',
    priority: calculateAlertPriority(alert)
  };
  
  const updatedAlerts = [...alerts, newAlertItem];
  store.setAlerts(updatedAlerts);
  saveAlertHistoryToStorage(updatedAlerts);
  
  if (showToast) {
    // Import dynamique pour éviter les problèmes de SSR
    import('react-hot-toast').then(({ toast }) => {
      const severityEmoji = alert.severity === 'critical' ? '🚨' : '⚠️';
      toast(`${severityEmoji} Déviation budgétaire détectée: ${alert.category}`, {
        duration: 5000,
        icon: severityEmoji
      });
    }).catch(() => {
      // Fallback si react-hot-toast n'est pas disponible
      console.warn(`Alerte budgétaire: ${alert.category} - ${alert.severity}`);
    });
  }
};

/**
 * Effectue une vérification des déviations budgétaires
 * @param showToast - Afficher les notifications toast
 */
const performDeviationCheck = async (showToast: boolean = false): Promise<void> => {
  try {
    const store = useAppStore.getState();
    const user = store.user;
    
    if (!user) {
      console.log('Aucun utilisateur connecté, vérification des déviations ignorée');
      return;
    }
    
    // Récupérer les budgets actifs
    const activeBudgets = user.preferences?.activeBudgets || user.preferences?.intelligentBudgets;
    if (!activeBudgets) {
      console.log('Aucun budget actif trouvé, vérification des déviations ignorée');
      return;
    }
    
    // Récupérer les transactions du mois actuel
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Simuler la récupération des transactions (à adapter selon votre implémentation)
    const transactions: Transaction[] = [];
    
    // Détecter les déviations
    const deviations = detectSpendingDeviation(transactions, activeBudgets);
    
    // Filtrer seulement les alertes significatives
    const significantAlerts = deviations.filter(deviation => 
      deviation.severity === 'critical' || deviation.severity === 'warning'
    );
    
    if (significantAlerts.length === 0) {
      console.log('Aucune déviation significative détectée');
      return;
    }
    
    // Récupérer l'historique des alertes existantes
    const existingAlerts = getAlertHistory();
    
    // Ajouter les nouvelles alertes (éviter les doublons)
    for (const alert of significantAlerts) {
      if (!isDuplicateAlert(alert, existingAlerts)) {
        addAlertToStore(alert, showToast);
        console.log(`Nouvelle alerte ajoutée: ${alert.category} - ${alert.severity}`);
      }
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification des déviations:', error);
  }
};

/**
 * Configure la surveillance continue des budgets
 * @param config - Configuration optionnelle du monitoring
 * @returns Fonction de nettoyage pour arrêter la surveillance
 */
export const scheduleMonitoring = (config: Partial<MonitoringConfig> = {}): (() => void) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('Démarrage de la surveillance des budgets...');
  
  // Vérification immédiate si c'est l'heure appropriée
  if (isCheckTime(finalConfig.checkHours)) {
    performDeviationCheck(true);
  }
  
  // Configuration de l'intervalle de vérification
  const intervalId = setInterval(() => {
    if (isCheckTime(finalConfig.checkHours)) {
      performDeviationCheck(true);
    } else {
      // Vérification silencieuse hors des heures programmées
      performDeviationCheck(false);
    }
  }, finalConfig.checkIntervalHours * 60 * 60 * 1000); // Conversion en millisecondes
  
  // Fonction de nettoyage
  return () => {
    console.log('Arrêt de la surveillance des budgets');
    clearInterval(intervalId);
  };
};

/**
 * Démarre la surveillance des budgets avec la configuration par défaut
 * @returns Fonction de nettoyage
 */
export const startBudgetMonitoring = (): (() => void) => {
  return scheduleMonitoring();
};

/**
 * Arrête la surveillance des budgets
 * @param cleanupFunction - Fonction de nettoyage retournée par startBudgetMonitoring
 */
export const stopBudgetMonitoring = (cleanupFunction: () => void): void => {
  cleanupFunction();
};

/**
 * Force une vérification immédiate des déviations
 * @param showToast - Afficher les notifications toast
 */
export const forceDeviationCheck = async (showToast: boolean = true): Promise<void> => {
  console.log('Vérification forcée des déviations budgétaires...');
  await performDeviationCheck(showToast);
};

/**
 * Obtient les statistiques des alertes
 * @returns Statistiques des alertes
 */
export const getAlertStatistics = () => {
  const alerts = getAlertHistory();
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return {
    total: alerts.length,
    unread: alerts.filter(a => a.status === 'unread').length,
    critical: alerts.filter(a => a.alert.severity === 'critical').length,
    warning: alerts.filter(a => a.alert.severity === 'warning').length,
    last24Hours: alerts.filter(a => new Date(a.timestamp) > last24Hours).length,
    last7Days: alerts.filter(a => new Date(a.timestamp) > last7Days).length,
    byCategory: alerts.reduce((acc, alert) => {
      const category = alert.alert.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
};
