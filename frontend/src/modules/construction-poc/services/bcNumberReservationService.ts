/**
 * Service de gestion des réservations de numéros BC (Bon de Commande)
 * Gère la réservation, confirmation et libération de numéros au format "AA/NNN"
 */

import { supabase } from '../../../lib/supabase';
import { getAuthenticatedUserId } from './authHelpers';
import type { ServiceResult } from '../types/construction';

/**
 * Interface pour une réservation de numéro BC
 * Correspond à la structure de la table poc_bc_number_reservations
 */
export interface BCNumberReservation {
  id: string; // UUID
  company_id: string;
  year_prefix: string; // 2 caractères, ex: "25"
  sequence_number: number;
  full_number: string; // Format "AA/NNN", ex: "25/052"
  order_type: 'BCI' | 'BCE';
  reserved_by: string; // UUID de l'utilisateur
  reserved_at: string; // ISO timestamp
  confirmed_at: string | null; // ISO timestamp ou null
  released_at: string | null; // ISO timestamp ou null
  purchase_order_id: string | null; // UUID du bon de commande ou null
}

/**
 * Résultat d'une suggestion de numéro disponible
 */
export interface NextAvailableNumber {
  yearPrefix: string;
  sequenceNumber: number;
  fullNumber: string;
}

/**
 * Résultat d'une réservation
 */
export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  fullNumber?: string;
  error?: string;
}

/**
 * Résultat du parsing d'un numéro complet
 */
export interface ParsedNumber {
  yearPrefix: string;
  sequenceNumber: number;
}

/**
 * Service de gestion des réservations de numéros BC
 */
class BCNumberReservationService {
  /**
   * Obtient le prochain numéro disponible pour une entreprise
   * @param companyId - ID de l'entreprise
   * @param orderType - Type de commande ('BCI' ou 'BCE')
   * @param yearPrefix - Préfixe d'année optionnel (2 chiffres, ex: "25"). Si non fourni, utilise l'année courante
   * @returns ServiceResult avec le prochain numéro suggéré
   */
  async getNextAvailableNumber(
    companyId: string,
    orderType: 'BCI' | 'BCE',
    yearPrefix?: string
  ): Promise<ServiceResult<NextAvailableNumber>> {
    try {
      // Si yearPrefix non fourni, utiliser l'année courante (2 derniers chiffres)
      const finalYearPrefix = yearPrefix || new Date().getFullYear().toString().slice(-2);

      // Appeler la fonction RPC Supabase
      const { data, error } = await supabase.rpc('get_next_bc_number', {
        p_company_id: companyId,
        p_order_type: orderType,
        p_year_prefix: finalYearPrefix
      } as any);

      if (error) {
        return {
          success: false,
          error: `Erreur lors de la récupération du prochain numéro: ${error.message}`
        };
      }

      if (data === null || data === undefined) {
        return {
          success: false,
          error: 'Aucune donnée retournée par la fonction get_next_bc_number'
        };
      }

      // La fonction RPC retourne un INTEGER (sequence_number)
      const nextNum = data as number;
      
      // Construire le numéro complet avec le format "AA/NNN"
      const fullNumber = this.formatFullNumber(finalYearPrefix, nextNum);

      return {
        success: true,
        data: {
          yearPrefix: finalYearPrefix,
          sequenceNumber: nextNum,
          fullNumber: fullNumber
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        error: `Erreur lors de la récupération du prochain numéro: ${errorMessage}`
      };
    }
  }

  /**
   * Réserve un numéro BC pour une entreprise
   * @param companyId - ID de l'entreprise
   * @param orderType - Type de commande ('BCI' ou 'BCE')
   * @param yearPrefix - Préfixe d'année (2 chiffres, ex: "25")
   * @param sequenceNumber - Numéro de séquence
   * @returns ReservationResult avec l'ID de réservation et le numéro complet
   */
  async reserveNumber(
    companyId: string,
    orderType: 'BCI' | 'BCE',
    yearPrefix: string,
    sequenceNumber: number
  ): Promise<ReservationResult> {
    try {
      // Vérifier l'authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;

      // Appeler la fonction RPC Supabase
      const { data, error } = await supabase.rpc('reserve_bc_number', {
        p_company_id: companyId,
        p_order_type: orderType,
        p_year_prefix: yearPrefix,
        p_sequence_number: sequenceNumber,
        p_reserved_by: userId
      } as any);

      if (error) {
        return {
          success: false,
          error: `Erreur lors de la réservation: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Aucune donnée retournée par la fonction reserve_bc_number'
        };
      }

      // La fonction RPC retourne un JSON avec {success, message, reservation_id, full_number}
      const result = data as {
        success: boolean;
        message: string;
        reservation_id: string | null;
        full_number: string | null;
      };

      if (!result.success) {
        return {
          success: false,
          error: result.message || 'Erreur lors de la réservation'
        };
      }

      return {
        success: true,
        reservationId: result.reservation_id || undefined,
        fullNumber: result.full_number || undefined
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        error: `Erreur lors de la réservation: ${errorMessage}`
      };
    }
  }

  /**
   * Libère une réservation de numéro BC
   * @param reservationId - ID de la réservation à libérer
   * @returns true si la libération a réussi, false sinon
   */
  async releaseReservation(reservationId: string): Promise<boolean> {
    try {
      // Appeler la fonction RPC Supabase
      const { error } = await supabase.rpc('release_bc_number', {
        p_reservation_id: reservationId
      } as any);

      if (error) {
        return false;
      }

      return true;
    } catch (error: unknown) {
      return false;
    }
  }

  /**
   * Confirme une réservation et l'associe à un bon de commande
   * @param reservationId - ID de la réservation à confirmer
   * @param purchaseOrderId - ID du bon de commande à associer
   * @returns true si la confirmation a réussi, false sinon
   */
  async confirmReservation(reservationId: string, purchaseOrderId: string): Promise<boolean> {
    try {
      // Appeler la fonction RPC Supabase
      const { error } = await supabase.rpc('confirm_bc_number', {
        p_reservation_id: reservationId,
        p_purchase_order_id: purchaseOrderId
      } as any);

      if (error) {
        return false;
      }

      return true;
    } catch (error: unknown) {
      return false;
    }
  }

  /**
   * Parse un numéro complet au format "AA/NNN" en composants
   * @param fullNumber - Numéro complet au format "AA/NNN" (ex: "25/052")
   * @returns Objet avec yearPrefix et sequenceNumber, ou null si le format est invalide
   */
  parseFullNumber(fullNumber: string): ParsedNumber | null {
    // Valider le format avec regex: 2 chiffres, slash, 3 chiffres
    const pattern = /^(\d{2})\/(\d{3})$/;
    const match = fullNumber.match(pattern);

    if (!match) {
      return null;
    }

    const yearPrefix = match[1];
    const sequenceNumber = parseInt(match[2], 10);

    // Vérifier que le parsing a réussi
    if (isNaN(sequenceNumber)) {
      return null;
    }

    return {
      yearPrefix,
      sequenceNumber
    };
  }

  /**
   * Formate un numéro BC au format "AA/NNN" avec zéro-padding
   * @param yearPrefix - Préfixe d'année (2 chiffres, ex: "25")
   * @param sequenceNumber - Numéro de séquence
   * @returns Numéro formaté (ex: "25/052")
   */
  formatFullNumber(yearPrefix: string, sequenceNumber: number): string {
    // S'assurer que le préfixe a exactement 2 caractères
    const paddedYearPrefix = yearPrefix.padStart(2, '0').slice(-2);
    
    // S'assurer que le numéro de séquence a 3 chiffres avec zéro-padding
    const paddedSequence = String(sequenceNumber).padStart(3, '0');

    return `${paddedYearPrefix}/${paddedSequence}`;
  }

  /**
   * Valide le format d'un numéro BC
   * @param input - Chaîne à valider
   * @returns true si le format correspond à "AA/NNN" (2 chiffres, slash, 3 chiffres), false sinon
   */
  validateNumberFormat(input: string): boolean {
    const pattern = /^\d{2}\/\d{3}$/;
    return pattern.test(input);
  }

  /**
   * Auto-formate une entrée utilisateur
   * Si l'utilisateur tape "25052", convertit en "25/052"
   * @param input - Entrée brute
   * @returns Format AA/NNN ou input original si invalide
   */
  autoFormatInput(input: string): string {
    // Retirer tous les caractères non numériques
    const digitsOnly = input.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      return '';
    }
    
    // Si 5 chiffres ou plus, formater en AA/NNN
    if (digitsOnly.length >= 5) {
      const yearPrefix = digitsOnly.slice(0, 2);
      const sequenceNumber = parseInt(digitsOnly.slice(2, 5), 10);
      return this.formatFullNumber(yearPrefix, sequenceNumber);
    }
    
    // Si moins de 5 chiffres, retourner tel quel (en cours de saisie)
    return digitsOnly;
  }

  /**
   * Récupère toutes les réservations pour une entreprise
   * @param companyId - ID de l'entreprise
   * @param includeReleased - Si true, inclut les réservations libérées. Si false, exclut les réservations libérées. Par défaut: false
   * @returns ServiceResult avec la liste des réservations
   */
  async getReservationsByCompany(
    companyId: string,
    includeReleased: boolean = false
  ): Promise<ServiceResult<BCNumberReservation[]>> {
    try {
      // Construire la requête
      let query = supabase
        .from('poc_bc_number_reservations')
        .select('*')
        .eq('company_id', companyId)
        .order('reserved_at', { ascending: false });

      // Filtrer les réservations libérées si includeReleased est false
      if (!includeReleased) {
        query = query.is('released_at', null);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Erreur lors de la récupération des réservations: ${error.message}`
        };
      }

      // Mapper les données vers l'interface BCNumberReservation
      const reservations: BCNumberReservation[] = (data || []).map((row: any) => ({
        id: row.id,
        company_id: row.company_id,
        year_prefix: row.year_prefix,
        sequence_number: row.sequence_number,
        full_number: row.full_number,
        order_type: row.order_type as 'BCI' | 'BCE',
        reserved_by: row.reserved_by,
        reserved_at: row.reserved_at,
        confirmed_at: row.confirmed_at || null,
        released_at: row.released_at || null,
        purchase_order_id: row.purchase_order_id || null
      }));

      return {
        success: true,
        data: reservations
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        error: `Erreur lors de la récupération des réservations: ${errorMessage}`
      };
    }
  }
}

// Export d'une instance unique du service (singleton pattern)
const bcNumberReservationService = new BCNumberReservationService();

// Exports nommés pour toutes les fonctions et interfaces
export const getNextAvailableNumber = bcNumberReservationService.getNextAvailableNumber.bind(bcNumberReservationService);
export const reserveNumber = bcNumberReservationService.reserveNumber.bind(bcNumberReservationService);
export const releaseReservation = bcNumberReservationService.releaseReservation.bind(bcNumberReservationService);
export const confirmReservation = bcNumberReservationService.confirmReservation.bind(bcNumberReservationService);
export const parseFullNumber = bcNumberReservationService.parseFullNumber.bind(bcNumberReservationService);
export const formatFullNumber = bcNumberReservationService.formatFullNumber.bind(bcNumberReservationService);
export const validateNumberFormat = bcNumberReservationService.validateNumberFormat.bind(bcNumberReservationService);
export const autoFormatInput = bcNumberReservationService.autoFormatInput.bind(bcNumberReservationService);
export const getReservationsByCompany = bcNumberReservationService.getReservationsByCompany.bind(bcNumberReservationService);

// Export par défaut de l'instance du service
export default bcNumberReservationService;
