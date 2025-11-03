/**
 * Utilitaires pour les transactions récurrentes
 * Phase 2: Fonctions de validation, formatage et calcul
 */

import type { RecurringTransaction, RecurringTransactionCreate, RecurrenceFrequency } from '../types/recurring';
import type { TransactionCategory } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Formate la description de récurrence en français
 * 
 * @param recurring Transaction récurrente
 * @returns Description formatée (ex: "Tous les lundis", "Le 15 de chaque mois")
 */
export function formatRecurrenceDescription(recurring: RecurringTransaction): string {
  const frequencyLabels: Record<RecurrenceFrequency, string> = {
    daily: 'Quotidien',
    weekly: 'Hebdomadaire',
    monthly: 'Mensuel',
    quarterly: 'Trimestriel',
    yearly: 'Annuel'
  };

  let description = frequencyLabels[recurring.frequency];

  if (recurring.frequency === 'weekly' && recurring.dayOfWeek !== null) {
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    description = `Tous les ${dayNames[recurring.dayOfWeek]}`;
  } else if (['monthly', 'quarterly', 'yearly'].includes(recurring.frequency) && recurring.dayOfMonth !== null) {
    if (recurring.dayOfMonth === 31) {
      description = `${description} (dernier jour)`;
    } else {
      description = `Le ${recurring.dayOfMonth} de chaque ${recurring.frequency === 'monthly' ? 'mois' : recurring.frequency === 'quarterly' ? 'trimestre' : 'année'}`;
    }
  }

  if (recurring.endDate) {
    const endDateStr = recurring.endDate.toLocaleDateString('fr-FR');
    description += ` jusqu'au ${endDateStr}`;
  }

  return description;
}

/**
 * Formate un label pour la prochaine occurrence
 * 
 * @param date Date de la prochaine occurrence
 * @returns Label formaté (ex: "Demain", "Dans 3 jours", "Le 15/01/2024")
 */
export function getNextOccurrenceLabel(date: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Aujourd'hui";
  } else if (diffDays === 1) {
    return "Demain";
  } else if (diffDays === -1) {
    return "Hier";
  } else if (diffDays > 1 && diffDays <= 7) {
    return `Dans ${diffDays} jours`;
  } else if (diffDays < -1 && diffDays >= -7) {
    return `Il y a ${Math.abs(diffDays)} jours`;
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}

/**
 * Formate la fréquence en français
 * 
 * @param frequency Fréquence de récurrence
 * @returns Label français
 */
export function formatFrequency(frequency: RecurrenceFrequency): string {
  const labels: Record<RecurrenceFrequency, string> = {
    daily: 'Quotidien',
    weekly: 'Hebdomadaire',
    monthly: 'Mensuel',
    quarterly: 'Trimestriel',
    yearly: 'Annuel'
  };
  return labels[frequency];
}

/**
 * Valide les données d'une transaction récurrente
 * 
 * @param data Données à valider
 * @returns Résultat de validation avec liste d'erreurs
 */
export function validateRecurringData(data: RecurringTransactionCreate): ValidationResult {
  const errors: string[] = [];

  // Validation du montant
  if (!data.amount || data.amount <= 0) {
    errors.push('Le montant doit être supérieur à 0');
  }

  // Validation de la description
  if (!data.description || data.description.trim().length === 0) {
    errors.push('La description est requise');
  }

  // Validation de la catégorie
  if (!data.category || data.category.trim().length === 0) {
    errors.push('La catégorie est requise');
  }

  // Validation de la date de début
  if (!data.startDate || !(data.startDate instanceof Date) || isNaN(data.startDate.getTime())) {
    errors.push('La date de début est invalide');
  }

  // Validation de la date de fin
  if (data.endDate && data.endDate <= data.startDate) {
    errors.push('La date de fin doit être postérieure à la date de début');
  }

  // Validation du jour du mois
  if (data.dayOfMonth !== null && data.dayOfMonth !== undefined) {
    if (!validateDayOfMonth(data.dayOfMonth)) {
      errors.push('Le jour du mois doit être entre 1 et 31');
    }
  }

  // Validation du jour de la semaine
  if (data.dayOfWeek !== null && data.dayOfWeek !== undefined) {
    if (!validateDayOfWeek(data.dayOfWeek)) {
      errors.push('Le jour de la semaine doit être entre 0 (dimanche) et 6 (samedi)');
    }
  }

  // Validation de la cohérence fréquence / jour
  if (data.frequency === 'weekly' && data.dayOfWeek === null) {
    errors.push('Le jour de la semaine est requis pour une récurrence hebdomadaire');
  }

  if (['monthly', 'quarterly', 'yearly'].includes(data.frequency) && data.dayOfMonth === null) {
    errors.push('Le jour du mois est requis pour une récurrence mensuelle/trimestrielle/annuelle');
  }

  if (data.frequency === 'daily' && (data.dayOfWeek !== null || data.dayOfMonth !== null)) {
    errors.push('Les jours spécifiques ne sont pas nécessaires pour une récurrence quotidienne');
  }

  // Validation de notifyBeforeDays
  if (data.notifyBeforeDays < 0) {
    errors.push('Le nombre de jours de notification avant doit être positif');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valide une plage de dates
 * 
 * @param startDate Date de début
 * @param endDate Date de fin (optionnelle)
 * @returns true si valide
 */
export function validateDateRange(startDate: Date, endDate?: Date | null): boolean {
  if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
    return false;
  }

  if (endDate && (endDate instanceof Date) && !isNaN(endDate.getTime())) {
    return endDate > startDate;
  }

  return true;
}

/**
 * Valide un jour du mois (1-31)
 * 
 * @param day Jour du mois
 * @returns true si valide
 */
export function validateDayOfMonth(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

/**
 * Valide un jour de la semaine (0-6)
 * 
 * @param day Jour de la semaine (0=dimanche, 6=samedi)
 * @returns true si valide
 */
export function validateDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

/**
 * Calcule le nombre total d'occurrences d'une transaction récurrente
 * 
 * @param recurring Transaction récurrente
 * @returns Nombre total d'occurrences ou null si sans fin
 */
export function calculateTotalOccurrences(recurring: RecurringTransaction): number | null {
  if (!recurring.endDate) {
    return null; // Sans fin
  }

  const start = new Date(recurring.startDate);
  const end = new Date(recurring.endDate);
  let count = 0;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    count++;
    
    // Calculer la prochaine occurrence (simplifié)
    switch (recurring.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
  }

  return count;
}

/**
 * Calcule le nombre d'occurrences restantes
 * 
 * @param recurring Transaction récurrente
 * @returns Nombre d'occurrences restantes ou null si sans fin
 */
export function getRemainingOccurrences(recurring: RecurringTransaction): number | null {
  if (!recurring.endDate) {
    return null; // Sans fin
  }

  const now = new Date();
  if (now > recurring.endDate) {
    return 0; // Terminé
  }

  const total = calculateTotalOccurrences(recurring);
  if (total === null) {
    return null;
  }

  // Calculer les occurrences déjà passées
  const start = new Date(recurring.startDate);
  let count = 0;
  let currentDate = new Date(start);

  while (currentDate <= now && currentDate <= recurring.endDate) {
    count++;
    
    switch (recurring.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
  }

  return Math.max(0, total - count);
}

/**
 * Calcule les N prochaines occurrences
 * 
 * @param recurring Transaction récurrente
 * @param n Nombre d'occurrences à calculer
 * @returns Tableau de dates
 */
export function getNextNOccurrences(recurring: RecurringTransaction, n: number): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(recurring.nextGenerationDate || recurring.startDate);
  const endDate = recurring.endDate;

  for (let i = 0; i < n; i++) {
    if (endDate && currentDate > endDate) {
      break; // Fin de la récurrence
    }

    occurrences.push(new Date(currentDate));

    // Calculer la prochaine occurrence
    switch (recurring.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        // Ajuster le jour du mois si nécessaire
        if (recurring.dayOfMonth !== null) {
          const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          currentDate.setDate(Math.min(recurring.dayOfMonth, lastDay));
        }
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3);
        if (recurring.dayOfMonth !== null) {
          const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          currentDate.setDate(Math.min(recurring.dayOfMonth, lastDay));
        }
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        if (recurring.dayOfMonth !== null) {
          const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          currentDate.setDate(Math.min(recurring.dayOfMonth, lastDay));
        }
        break;
    }
  }

  return occurrences;
}

/**
 * Calcule la prochaine date de génération à partir d'une date de référence
 * Gère les cas limites: fin de mois, années bissextiles, etc.
 * 
 * @param frequency Fréquence de récurrence
 * @param fromDate Date de référence
 * @param dayOfMonth Jour du mois (1-31, optionnel)
 * @param dayOfWeek Jour de la semaine (0-6, optionnel)
 * @returns Date de la prochaine occurrence
 */
export function calculateNextDateFromDate(
  frequency: RecurrenceFrequency,
  fromDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: number
): Date {
  const nextDate = new Date(fromDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      if (dayOfWeek !== undefined && dayOfWeek !== null) {
        // Trouver le prochain jour de la semaine spécifié
        const currentDay = nextDate.getDay();
        let daysToAdd = dayOfWeek - currentDay;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Semaine suivante
        }
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      } else {
        // Utiliser le jour de fromDate
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;

    case 'monthly':
      if (dayOfMonth !== undefined && dayOfMonth !== null) {
        // Avancer d'un mois
        nextDate.setMonth(nextDate.getMonth() + 1);
        
        // Ajuster le jour du mois
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        const targetDay = dayOfMonth === 31 ? lastDay : Math.min(dayOfMonth, lastDay);
        nextDate.setDate(targetDay);
      } else {
        // Utiliser le même jour du mois suivant
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;

    case 'quarterly':
      if (dayOfMonth !== undefined && dayOfMonth !== null) {
        // Avancer de 3 mois
        nextDate.setMonth(nextDate.getMonth() + 3);
        
        // Ajuster le jour du mois
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        const targetDay = dayOfMonth === 31 ? lastDay : Math.min(dayOfMonth, lastDay);
        nextDate.setDate(targetDay);
      } else {
        // Utiliser le même jour du trimestre suivant
        nextDate.setMonth(nextDate.getMonth() + 3);
      }
      break;

    case 'yearly':
      if (dayOfMonth !== undefined && dayOfMonth !== null) {
        // Avancer d'un an
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        // Ajuster le jour du mois (gérer le 29 février pour les années bissextiles)
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        const targetDay = dayOfMonth === 31 ? lastDay : Math.min(dayOfMonth, lastDay);
        nextDate.setDate(targetDay);
      } else {
        // Utiliser le même jour de l'année suivante
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
  }

  return nextDate;
}

