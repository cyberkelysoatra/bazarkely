/**
 * Service de gestion des catégories de transactions avec pattern offline-first
 * Utilise localStorage comme cache local et Supabase pour la synchronisation
 * NOTE: Les catégories sont des données de référence qui ne changent pas souvent
 *       Utilisation de localStorage au lieu d'IndexedDB car pas de store dédié
 */

import { supabase } from '../lib/supabase';

/**
 * Interface pour une catégorie de transaction
 */
export interface TransactionCategory {
  id: string;
  name: string;
  label: string;
  type: 'income' | 'expense' | 'both';
  icon: string | null;
  color: string | null;
  bg_color: string | null;
  sort_order: number;
}

/**
 * Clés pour le stockage local
 */
const STORAGE_KEY_CATEGORIES = 'bazarkely_categories';
const STORAGE_KEY_CATEGORIES_BY_TYPE = 'bazarkely_categories_by_type';
const STORAGE_KEY_CATEGORIES_TIMESTAMP = 'bazarkely_categories_timestamp';

/**
 * Durée de validité du cache (24 heures)
 */
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

/**
 * Récupère toutes les catégories depuis le cache local
 */
function getCategoriesFromCache(): TransactionCategory[] | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    const timestamp = localStorage.getItem(STORAGE_KEY_CATEGORIES_TIMESTAMP);
    
    if (!cached || !timestamp) {
      return null;
    }

    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > CACHE_DURATION) {
      console.log('📂 [CategoryService] ⏰ Cache expiré, suppression');
      localStorage.removeItem(STORAGE_KEY_CATEGORIES);
      localStorage.removeItem(STORAGE_KEY_CATEGORIES_TIMESTAMP);
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error('📂 [CategoryService] ❌ Erreur lors de la lecture du cache:', error);
    return null;
  }
}

/**
 * Sauvegarde les catégories dans le cache local
 */
function saveCategoriesToCache(categories: TransactionCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    localStorage.setItem(STORAGE_KEY_CATEGORIES_TIMESTAMP, Date.now().toString());
    console.log(`📂 [CategoryService] 💾 ${categories.length} catégorie(s) sauvegardée(s) dans le cache`);
  } catch (error) {
    console.error('📂 [CategoryService] ❌ Erreur lors de la sauvegarde du cache:', error);
    // Ne pas faire échouer l'opération si le cache échoue
  }
}

/**
 * Récupère toutes les catégories actives, ordonnées par sort_order (OFFLINE-FIRST PATTERN)
 * 1. Essaie le cache local d'abord (toujours disponible)
 * 2. Si cache vide/expiré et online, fetch depuis Supabase
 * 3. Cache les résultats dans localStorage
 * @returns Promise<TransactionCategory[]> - Liste des catégories actives
 */
export async function getCategories(): Promise<TransactionCategory[]> {
  try {
    // STEP 1: Essayer le cache local d'abord (offline-first)
    console.log('📂 [CategoryService] 💾 Récupération des catégories depuis le cache...');
    const cachedCategories = getCategoriesFromCache();
    
    if (cachedCategories && cachedCategories.length > 0) {
      console.log(`📂 [CategoryService] ✅ ${cachedCategories.length} catégorie(s) récupérée(s) depuis le cache`);
      return cachedCategories;
    }

    // STEP 2: Cache vide/expiré, essayer Supabase si online
    if (!navigator.onLine) {
      console.warn('📂 [CategoryService] ⚠️ Mode offline et cache vide, retour d\'un tableau vide');
      return [];
    }

    console.log('📂 [CategoryService] 🌐 Cache vide, récupération depuis Supabase...');
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('id, name, label, type, icon, color, bg_color, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('📂 [CategoryService] ❌ Erreur lors de la récupération des catégories depuis Supabase:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    // STEP 3: Mapper et sauvegarder dans le cache
    const categories: TransactionCategory[] = data.map((category) => ({
      id: category.id,
      name: category.name,
      label: category.label,
      type: category.type as 'income' | 'expense' | 'both',
      icon: category.icon,
      color: category.color,
      bg_color: category.bg_color,
      sort_order: category.sort_order
    }));

    if (categories.length > 0) {
      saveCategoriesToCache(categories);
    }

    console.log(`📂 [CategoryService] ✅ ${categories.length} catégorie(s) récupérée(s) depuis Supabase`);
    return categories;
  } catch (error) {
    console.error('📂 [CategoryService] ❌ Erreur lors de la récupération des catégories:', error);
    // En cas d'erreur, essayer de retourner le cache même expiré
    try {
      const cached = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (cached) {
        const categories = JSON.parse(cached);
        console.log(`📂 [CategoryService] ⚠️ Retour de ${categories.length} catégorie(s) depuis le cache après erreur`);
        return categories;
      }
    } catch (fallbackError) {
      console.error('📂 [CategoryService] ❌ Erreur lors du fallback cache:', fallbackError);
    }
    return [];
  }
}

/**
 * Récupère les catégories filtrées par type depuis le cache local
 */
function getCategoriesByTypeFromCache(type: 'income' | 'expense'): TransactionCategory[] | null {
  try {
    const cacheKey = `${STORAGE_KEY_CATEGORIES_BY_TYPE}_${type}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.error('📂 [CategoryService] ❌ Erreur lors de la lecture du cache par type:', error);
    return null;
  }
}

/**
 * Sauvegarde les catégories filtrées par type dans le cache local
 */
function saveCategoriesByTypeToCache(type: 'income' | 'expense', categories: TransactionCategory[]): void {
  try {
    const cacheKey = `${STORAGE_KEY_CATEGORIES_BY_TYPE}_${type}`;
    localStorage.setItem(cacheKey, JSON.stringify(categories));
  } catch (error) {
    console.error('📂 [CategoryService] ❌ Erreur lors de la sauvegarde du cache par type:', error);
  }
}

/**
 * Récupère les catégories filtrées par type (income ou expense) (OFFLINE-FIRST PATTERN)
 * Inclut également les catégories de type 'both'
 * 1. Essaie le cache local d'abord
 * 2. Si cache vide et online, fetch depuis Supabase
 * 3. Cache les résultats dans localStorage
 * @param type - Type de transaction ('income' ou 'expense')
 * @returns Promise<TransactionCategory[]> - Liste des catégories filtrées par type
 */
export async function getCategoriesByType(type: 'income' | 'expense'): Promise<TransactionCategory[]> {
  try {
    // STEP 1: Essayer le cache local d'abord (offline-first)
    console.log(`📂 [CategoryService] 💾 Récupération des catégories de type ${type} depuis le cache...`);
    const cachedCategories = getCategoriesByTypeFromCache(type);
    
    if (cachedCategories && cachedCategories.length > 0) {
      console.log(`📂 [CategoryService] ✅ ${cachedCategories.length} catégorie(s) de type ${type} récupérée(s) depuis le cache`);
      return cachedCategories;
    }

    // STEP 2: Cache vide, essayer Supabase si online
    if (!navigator.onLine) {
      console.warn(`📂 [CategoryService] ⚠️ Mode offline et cache vide, tentative avec toutes les catégories...`);
      // Essayer de filtrer depuis toutes les catégories en cache
      const allCached = getCategoriesFromCache();
      if (allCached) {
        const filtered = allCached.filter(cat => cat.type === type || cat.type === 'both');
        if (filtered.length > 0) {
          console.log(`📂 [CategoryService] ✅ ${filtered.length} catégorie(s) filtrée(s) depuis le cache complet`);
          return filtered;
        }
      }
      return [];
    }

    console.log(`📂 [CategoryService] 🌐 Cache vide, récupération depuis Supabase pour type ${type}...`);
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('id, name, label, type, icon, color, bg_color, sort_order')
      .eq('is_active', true)
      .or(`type.eq.${type},type.eq.both`)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error(`📂 [CategoryService] ❌ Erreur lors de la récupération des catégories de type ${type} depuis Supabase:`, error);
      return [];
    }

    if (!data) {
      return [];
    }

    // STEP 3: Mapper et sauvegarder dans le cache
    const categories: TransactionCategory[] = data.map((category) => ({
      id: category.id,
      name: category.name,
      label: category.label,
      type: category.type as 'income' | 'expense' | 'both',
      icon: category.icon,
      color: category.color,
      bg_color: category.bg_color,
      sort_order: category.sort_order
    }));

    if (categories.length > 0) {
      saveCategoriesByTypeToCache(type, categories);
      // Aussi mettre à jour le cache complet si nécessaire
      const allCached = getCategoriesFromCache();
      if (!allCached || allCached.length === 0) {
        // Si le cache complet est vide, on peut le remplir avec toutes les catégories
        // Mais on ne le fait pas ici pour éviter un double fetch
      }
    }

    console.log(`📂 [CategoryService] ✅ ${categories.length} catégorie(s) de type ${type} récupérée(s) depuis Supabase`);
    return categories;
  } catch (error) {
    console.error(`📂 [CategoryService] ❌ Erreur lors de la récupération des catégories de type ${type}:`, error);
    // En cas d'erreur, essayer de retourner le cache même expiré
    try {
      const allCached = getCategoriesFromCache();
      if (allCached) {
        const filtered = allCached.filter(cat => cat.type === type || cat.type === 'both');
        if (filtered.length > 0) {
          console.log(`📂 [CategoryService] ⚠️ Retour de ${filtered.length} catégorie(s) filtrée(s) depuis le cache après erreur`);
          return filtered;
        }
      }
    } catch (fallbackError) {
      console.error('📂 [CategoryService] ❌ Erreur lors du fallback cache:', fallbackError);
    }
    return [];
  }
}







