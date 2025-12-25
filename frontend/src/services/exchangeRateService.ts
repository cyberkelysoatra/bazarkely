/**
 * Service de gestion des taux de change
 * Phase 3 - Multi-Currency Diaspora Feature
 * Gère les taux de change EUR/MGA avec mise à jour quotidienne depuis une API externe
 */

import { supabase } from '../lib/supabase';

/**
 * Interface pour un taux de change
 */
export interface ExchangeRate {
  rate: number;
  date: string;
  isToday: boolean;
  source: 'api' | 'manual' | 'cached';
}

/**
 * Constantes de configuration
 */
const API_URL = 'https://api.exchangerate-api.com/v4/latest/EUR';
const DEFAULT_RATE = 4950; // Taux par défaut si API indisponible
const FROM_CURRENCY = 'EUR';
const TO_CURRENCY = 'MGA';

/**
 * Vérifie si une mise à jour du taux est nécessaire
 * Appelle la fonction Supabase needs_rate_update pour vérifier si un taux existe pour aujourd'hui
 * @returns Promise<boolean> - true si une mise à jour est nécessaire, false sinon
 */
export async function checkNeedsUpdate(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('needs_rate_update', {
      from_currency: FROM_CURRENCY,
      to_currency: TO_CURRENCY
    });

    if (error) {
      console.warn('Erreur lors de la vérification de mise à jour du taux:', error);
      // En cas d'erreur, on considère qu'une mise à jour est nécessaire (principe de précaution)
      return true;
    }

    return data === true;
  } catch (error) {
    console.warn('Erreur lors de la vérification de mise à jour du taux:', error);
    return true;
  }
}

/**
 * Récupère le taux de change depuis l'API externe ExchangeRate-API
 * @returns Promise<number | null> - Le taux MGA pour 1 EUR, ou null en cas d'erreur
 */
export async function fetchRateFromAPI(): Promise<number | null> {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    // L'API retourne les taux par rapport à EUR
    // On cherche le taux MGA (Malagasy Ariary)
    if (data.rates && typeof data.rates.MGA === 'number') {
      const rate = data.rates.MGA;
      console.log(`Taux récupéré depuis l'API: 1 EUR = ${rate} MGA`);
      return rate;
    }

    console.warn('Taux MGA non trouvé dans la réponse de l\'API');
    return null;
  } catch (error) {
    console.warn('Erreur lors de la récupération du taux depuis l\'API:', error);
    return null;
  }
}

/**
 * Sauvegarde le taux quotidien dans la base de données
 * Appelle la fonction Supabase insert_daily_rate
 * @param rate - Le taux de change à sauvegarder
 * @param source - La source du taux ('api', 'manual', ou 'cached')
 * @returns Promise<boolean> - true si la sauvegarde a réussi, false sinon
 */
export async function saveDailyRate(rate: number, source: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('insert_daily_rate', {
      from_currency: FROM_CURRENCY,
      to_currency: TO_CURRENCY,
      rate_value: rate,
      rate_source: source
    });

    if (error) {
      console.warn('Erreur lors de la sauvegarde du taux:', error);
      return false;
    }

    console.log(`Taux sauvegardé: ${rate} (source: ${source})`);
    return true;
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde du taux:', error);
    return false;
  }
}

/**
 * Récupère le taux de change pour une date donnée
 * Appelle la fonction Supabase get_exchange_rate
 * @param fromCurrency - Devise source (par défaut 'EUR')
 * @param toCurrency - Devise cible (par défaut 'MGA')
 * @param date - Date au format ISO string (YYYY-MM-DD). Si non fournie, utilise la date du jour
 * @returns Promise<ExchangeRate> - Objet ExchangeRate avec le taux et les métadonnées
 */
export async function getExchangeRate(
  fromCurrency: string = FROM_CURRENCY,
  toCurrency: string = TO_CURRENCY,
  date?: string
): Promise<ExchangeRate> {
  try {
    // Si aucune date n'est fournie, utiliser la date du jour
    const targetDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = targetDate === today;

    const { data, error } = await supabase.rpc('get_exchange_rate', {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate_date: targetDate
    });

    if (error) {
      console.warn('Erreur lors de la récupération du taux:', error);
      // Retourner le taux par défaut en cas d'erreur
      return {
        rate: DEFAULT_RATE,
        date: targetDate,
        isToday,
        source: 'cached'
      };
    }

    if (data && typeof data === 'number') {
      return {
        rate: data,
        date: targetDate,
        isToday,
        source: 'cached'
      };
    }

    // Si aucun taux trouvé pour la date, essayer de récupérer le dernier taux connu
    if (!isToday) {
      // Pour les dates passées, retourner le taux par défaut si non trouvé
      return {
        rate: DEFAULT_RATE,
        date: targetDate,
        isToday: false,
        source: 'cached'
      };
    }

    // Pour aujourd'hui, retourner le taux par défaut
    return {
      rate: DEFAULT_RATE,
      date: targetDate,
      isToday: true,
      source: 'cached'
    };
  } catch (error) {
    console.warn('Erreur lors de la récupération du taux:', error);
    const targetDate = date || new Date().toISOString().split('T')[0];
    return {
      rate: DEFAULT_RATE,
      date: targetDate,
      isToday: targetDate === new Date().toISOString().split('T')[0],
      source: 'cached'
    };
  }
}

/**
 * Initialise le taux quotidien
 * Fonction principale appelée au démarrage de l'application
 * Vérifie si une mise à jour est nécessaire, récupère depuis l'API si besoin, et sauvegarde
 * @returns Promise<ExchangeRate> - Le taux de change actuel (du jour ou en cache)
 */
export async function initializeDailyRate(): Promise<ExchangeRate> {
  try {
    // Vérifier si une mise à jour est nécessaire
    const needsUpdate = await checkNeedsUpdate();

    if (needsUpdate) {
      // Récupérer le taux depuis l'API
      const apiRate = await fetchRateFromAPI();

      if (apiRate !== null && apiRate > 0) {
        // Sauvegarder le taux récupéré depuis l'API
        const saved = await saveDailyRate(apiRate, 'api');
        if (saved) {
          return {
            rate: apiRate,
            date: new Date().toISOString().split('T')[0],
            isToday: true,
            source: 'api'
          };
        }
      }

      // Si l'API a échoué, utiliser le dernier taux connu
      console.warn('Impossible de récupérer le taux depuis l\'API, utilisation du dernier taux connu');
      return await getExchangeRate();
    } else {
      // Pas besoin de mise à jour, récupérer le taux en cache
      return await getExchangeRate();
    }
  } catch (error) {
    console.warn('Erreur lors de l\'initialisation du taux quotidien:', error);
    // Retourner le taux par défaut en cas d'erreur
    return {
      rate: DEFAULT_RATE,
      date: new Date().toISOString().split('T')[0],
      isToday: true,
      source: 'cached'
    };
  }
}

/**
 * Convertit un montant d'une devise à une autre
 * @param amount - Montant à convertir
 * @param fromCurrency - Devise source (par défaut 'EUR')
 * @param toCurrency - Devise cible (par défaut 'MGA')
 * @param date - Date pour le taux de change (optionnel, utilise la date du jour par défaut)
 * @returns Promise<number> - Montant converti
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string = FROM_CURRENCY,
  toCurrency: string = TO_CURRENCY,
  date?: string
): Promise<number> {
  try {
    // Si les devises sont identiques, retourner le montant tel quel
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Récupérer le taux de change
    const exchangeRate = await getExchangeRate(fromCurrency, toCurrency, date);
    const rate = exchangeRate.rate;

    // Convertir le montant
    let convertedAmount: number;
    if (fromCurrency === 'EUR' && toCurrency === 'MGA') {
      // EUR vers MGA: multiplier
      convertedAmount = amount * rate;
    } else if (fromCurrency === 'MGA' && toCurrency === 'EUR') {
      // MGA vers EUR: diviser
      convertedAmount = amount / rate;
    } else {
      // Pour d'autres paires de devises, on pourrait implémenter une conversion via MGA
      // Pour l'instant, on retourne le montant tel quel
      console.warn(`Conversion ${fromCurrency} -> ${toCurrency} non supportée, retour du montant original`);
      return amount;
    }

    // Arrondir selon la devise cible
    if (toCurrency === 'MGA') {
      // MGA: pas de décimales
      return Math.round(convertedAmount);
    } else if (toCurrency === 'EUR') {
      // EUR: 2 décimales
      return Math.round(convertedAmount * 100) / 100;
    }

    return convertedAmount;
  } catch (error) {
    console.warn('Erreur lors de la conversion:', error);
    return amount;
  }
}

/**
 * Formate un montant avec le symbole de la devise et la locale appropriée
 * @param amount - Montant à formater
 * @param currency - Code de la devise ('MGA' ou 'EUR')
 * @returns string - Montant formaté avec symbole
 */
export function formatAmount(amount: number, currency: string): string {
  try {
    if (currency === 'MGA') {
      // MGA: pas de décimales, symbole 'Ar' après
      const formatted = Math.round(amount).toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      return `${formatted} Ar`;
    } else if (currency === 'EUR') {
      // EUR: 2 décimales, symbole '€' avant
      const formatted = amount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return `${formatted} €`;
    }

    // Pour les autres devises, formatage générique
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.warn('Erreur lors du formatage du montant:', error);
    return amount.toString();
  }
}














