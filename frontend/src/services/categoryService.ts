/**
 * Service de gestion des catégories de transactions
 * Récupère les catégories depuis Supabase avec filtrage par type
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
 * Récupère toutes les catégories actives, ordonnées par sort_order
 * @returns Promise<TransactionCategory[]> - Liste des catégories actives
 */
export async function getCategories(): Promise<TransactionCategory[]> {
  try {
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('id, name, label, type, icon, color, bg_color, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('❌ Erreur lors de la récupération des catégories:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((category) => ({
      id: category.id,
      name: category.name,
      label: category.label,
      type: category.type as 'income' | 'expense' | 'both',
      icon: category.icon,
      color: category.color,
      bg_color: category.bg_color,
      sort_order: category.sort_order
    }));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des catégories:', error);
    return [];
  }
}

/**
 * Récupère les catégories filtrées par type (income ou expense)
 * Inclut également les catégories de type 'both'
 * @param type - Type de transaction ('income' ou 'expense')
 * @returns Promise<TransactionCategory[]> - Liste des catégories filtrées par type
 */
export async function getCategoriesByType(type: 'income' | 'expense'): Promise<TransactionCategory[]> {
  try {
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('id, name, label, type, icon, color, bg_color, sort_order')
      .eq('is_active', true)
      .or(`type.eq.${type},type.eq.both`)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error(`❌ Erreur lors de la récupération des catégories de type ${type}:`, error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((category) => ({
      id: category.id,
      name: category.name,
      label: category.label,
      type: category.type as 'income' | 'expense' | 'both',
      icon: category.icon,
      color: category.color,
      bg_color: category.bg_color,
      sort_order: category.sort_order
    }));
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des catégories de type ${type}:`, error);
    return [];
  }
}






