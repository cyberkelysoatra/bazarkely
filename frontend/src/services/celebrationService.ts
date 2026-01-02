/**
 * Celebration Service - BazarKELY
 * Service de gestion des célébrations de jalons pour les objectifs d'épargne
 * Gère la détection, le stockage et la récupération des célébrations de jalons
 * 
 * @version 1.0
 * @date 2025-01-XX
 * @author BazarKELY Team
 */

import { db } from '../lib/database';

// Milestone percentages to celebrate
export const MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;
export type MilestoneThreshold = typeof MILESTONE_THRESHOLDS[number];

// Celebration record for a goal
export interface GoalCelebration {
  goalId: string;
  goalName: string;
  milestonesCompleted: MilestoneThreshold[];
  lastCelebratedAt: string; // ISO date
  updatedAt: string;
}

// Milestone info for display
export interface MilestoneInfo {
  threshold: MilestoneThreshold;
  title: string;
  message: string;
  emoji: string;
  badgeColor: string;
  badgeIcon: string; // lucide icon name
}

// Pending celebration to show
export interface PendingCelebration {
  goalId: string;
  goalName: string;
  milestone: MilestoneThreshold;
  currentAmount: number;
  targetAmount: number;
  milestoneInfo: MilestoneInfo;
}

// Milestone info constants
export const MILESTONE_INFO: Record<MilestoneThreshold, MilestoneInfo> = {
  25: {
    threshold: 25,
    title: 'Premier quart atteint !',
    message: 'Excellent début ! Vous avez atteint 25% de votre objectif.',
    emoji: '🌱',
    badgeColor: 'bg-blue-500',
    badgeIcon: 'Sprout'
  },
  50: {
    threshold: 50,
    title: 'À mi-chemin !',
    message: 'Bravo ! Vous êtes à la moitié de votre objectif.',
    emoji: '⭐',
    badgeColor: 'bg-yellow-500',
    badgeIcon: 'Star'
  },
  75: {
    threshold: 75,
    title: 'Presque là !',
    message: 'Incroyable ! Plus que 25% pour atteindre votre objectif.',
    emoji: '🚀',
    badgeColor: 'bg-purple-500',
    badgeIcon: 'Rocket'
  },
  100: {
    threshold: 100,
    title: 'Objectif atteint !',
    message: 'Félicitations ! Vous avez atteint votre objectif d\'épargne !',
    emoji: '🏆',
    badgeColor: 'bg-green-500',
    badgeIcon: 'Trophy'
  }
};

// Storage key for localStorage fallback
const STORAGE_KEY = 'bazarkely_goal_celebrations';

/**
 * Get all celebrations from storage (IndexedDB first, then localStorage fallback)
 */
async function getCelebrationsFromStorage(): Promise<GoalCelebration[]> {
  try {
    // Try IndexedDB first via Dexie
    if (db.goalCelebrations) {
      const celebrations = await db.goalCelebrations.toArray();
      if (celebrations && celebrations.length > 0) {
        console.log(`🎉 [CelebrationService] 📊 ${celebrations.length} célébration(s) récupérée(s) depuis IndexedDB`);
        return celebrations;
      }
    }
  } catch (error) {
    console.warn('🎉 [CelebrationService] ⚠️ IndexedDB not available, using localStorage:', error);
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const celebrations = JSON.parse(stored) as GoalCelebration[];
      console.log(`🎉 [CelebrationService] 📊 ${celebrations.length} célébration(s) récupérée(s) depuis localStorage`);
      return celebrations;
    }
  } catch (error) {
    console.error('🎉 [CelebrationService] ❌ Erreur lors de la lecture depuis localStorage:', error);
  }
  
  return [];
}

/**
 * Save celebration to storage (IndexedDB + localStorage backup)
 */
async function saveCelebrationToStorage(celebration: GoalCelebration): Promise<void> {
  try {
    // Save to IndexedDB
    if (db.goalCelebrations) {
      await db.goalCelebrations.put(celebration);
      console.log(`🎉 [CelebrationService] 💾 Célébration sauvegardée dans IndexedDB pour l'objectif ${celebration.goalId}`);
    }
  } catch (error) {
    console.warn('🎉 [CelebrationService] ⚠️ IndexedDB save failed, using localStorage:', error);
  }
  
  // Always save to localStorage as backup
  try {
    const celebrations = await getCelebrationsFromStorage();
    const existingIndex = celebrations.findIndex(c => c.goalId === celebration.goalId);
    
    if (existingIndex >= 0) {
      celebrations[existingIndex] = celebration;
    } else {
      celebrations.push(celebration);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(celebrations));
    console.log(`🎉 [CelebrationService] 💾 Célébration sauvegardée dans localStorage pour l'objectif ${celebration.goalId}`);
  } catch (error) {
    console.error('🎉 [CelebrationService] ❌ Erreur lors de la sauvegarde dans localStorage:', error);
  }
}

/**
 * Get celebrated milestones for a goal
 * 
 * @param goalId - ID de l'objectif
 * @returns Liste des jalons célébrés
 */
export async function getCelebratedMilestones(goalId: string): Promise<MilestoneThreshold[]> {
  try {
    const celebrations = await getCelebrationsFromStorage();
    const goalCelebration = celebrations.find(c => c.goalId === goalId);
    return goalCelebration?.milestonesCompleted || [];
  } catch (error) {
    console.error(`🎉 [CelebrationService] ❌ Erreur lors de la récupération des jalons célébrés pour ${goalId}:`, error);
    return [];
  }
}

/**
 * Check if a specific milestone was celebrated
 * 
 * @param goalId - ID de l'objectif
 * @param milestone - Seuil du jalon à vérifier
 * @returns true si le jalon a été célébré
 */
export async function isMilestoneCelebrated(goalId: string, milestone: MilestoneThreshold): Promise<boolean> {
  const celebrated = await getCelebratedMilestones(goalId);
  return celebrated.includes(milestone);
}

/**
 * Calculate current milestone based on progress
 * 
 * @param currentAmount - Montant actuel
 * @param targetAmount - Montant cible
 * @returns Le jalon le plus élevé atteint, ou null si aucun
 */
export function calculateCurrentMilestone(currentAmount: number, targetAmount: number): MilestoneThreshold | null {
  if (targetAmount <= 0) return null;
  const percentage = (currentAmount / targetAmount) * 100;
  
  // Find the highest milestone reached
  const reached = MILESTONE_THRESHOLDS.filter(threshold => percentage >= threshold);
  return reached.length > 0 ? reached[reached.length - 1] : null;
}

/**
 * Get all reached but uncelebrated milestones
 * 
 * @param goalId - ID de l'objectif
 * @param currentAmount - Montant actuel
 * @param targetAmount - Montant cible
 * @returns Liste des jalons atteints mais non célébrés
 */
export async function getUncelebratedMilestones(
  goalId: string, 
  currentAmount: number, 
  targetAmount: number
): Promise<MilestoneThreshold[]> {
  console.log(`🎉 [CelebrationService] getUncelebratedMilestones called for goal ${goalId}`);
  console.log(`🎉 [CelebrationService]   - currentAmount: ${currentAmount} (type: ${typeof currentAmount})`);
  console.log(`🎉 [CelebrationService]   - targetAmount: ${targetAmount} (type: ${typeof targetAmount})`);
  
  if (targetAmount <= 0) {
    console.log(`🎉 [CelebrationService] ⚠️ targetAmount is ${targetAmount}, returning empty array`);
    return [];
  }
  
  const percentage = (currentAmount / targetAmount) * 100;
  console.log(`🎉 [CelebrationService]   - calculated percentage: ${percentage.toFixed(2)}%`);
  
  const reachedMilestones = MILESTONE_THRESHOLDS.filter(threshold => percentage >= threshold);
  console.log(`🎉 [CelebrationService]   - reached milestones:`, reachedMilestones);
  
  const celebratedMilestones = await getCelebratedMilestones(goalId);
  console.log(`🎉 [CelebrationService]   - already celebrated milestones:`, celebratedMilestones);
  
  const uncelebrated = reachedMilestones.filter(m => !celebratedMilestones.includes(m));
  console.log(`🎉 [CelebrationService]   - uncelebrated milestones:`, uncelebrated);
  
  return uncelebrated;
}

/**
 * Check and return pending celebration (highest uncelebrated milestone)
 * 
 * @param goalId - ID de l'objectif
 * @param goalName - Nom de l'objectif
 * @param currentAmount - Montant actuel
 * @param targetAmount - Montant cible
 * @returns Célébration en attente ou null si aucune
 */
export async function checkForPendingCelebration(
  goalId: string,
  goalName: string,
  currentAmount: number,
  targetAmount: number
): Promise<PendingCelebration | null> {
  try {
    console.log(`🎉 [CelebrationService] checkForPendingCelebration called`);
    console.log(`🎉 [CelebrationService]   - goalId: ${goalId}`);
    console.log(`🎉 [CelebrationService]   - goalName: ${goalName}`);
    console.log(`🎉 [CelebrationService]   - currentAmount: ${currentAmount} (type: ${typeof currentAmount})`);
    console.log(`🎉 [CelebrationService]   - targetAmount: ${targetAmount} (type: ${typeof targetAmount})`);
    
    // Ensure values are numbers
    const numCurrentAmount = typeof currentAmount === 'string' ? parseFloat(currentAmount) : currentAmount;
    const numTargetAmount = typeof targetAmount === 'string' ? parseFloat(targetAmount) : targetAmount;
    
    if (isNaN(numCurrentAmount) || isNaN(numTargetAmount)) {
      console.error(`🎉 [CelebrationService] ❌ Invalid number values: currentAmount=${currentAmount}, targetAmount=${targetAmount}`);
      return null;
    }
    
    const uncelebrated = await getUncelebratedMilestones(goalId, numCurrentAmount, numTargetAmount);
    console.log(`🎉 [CelebrationService]   - uncelebrated milestones result:`, uncelebrated);
    
    if (uncelebrated.length === 0) {
      console.log(`🎉 [CelebrationService]   - No uncelebrated milestones found, returning null`);
      return null;
    }
    
    // Return the highest uncelebrated milestone
    const highestMilestone = uncelebrated[uncelebrated.length - 1];
    console.log(`🎉 [CelebrationService] 🎊 Célébration en attente pour l'objectif ${goalId}: ${highestMilestone}%`);
    
    const pendingCelebration: PendingCelebration = {
      goalId,
      goalName,
      milestone: highestMilestone,
      currentAmount: numCurrentAmount,
      targetAmount: numTargetAmount,
      milestoneInfo: MILESTONE_INFO[highestMilestone]
    };
    
    console.log(`🎉 [CelebrationService] ✅ Returning pending celebration:`, pendingCelebration);
    return pendingCelebration;
  } catch (error) {
    console.error(`🎉 [CelebrationService] ❌ Erreur lors de la vérification des célébrations en attente:`, error);
    return null;
  }
}

/**
 * Mark milestone as celebrated
 * 
 * @param goalId - ID de l'objectif
 * @param goalName - Nom de l'objectif
 * @param milestone - Seuil du jalon à marquer comme célébré
 */
export async function markMilestoneAsCelebrated(
  goalId: string,
  goalName: string,
  milestone: MilestoneThreshold
): Promise<void> {
  try {
    const celebrations = await getCelebrationsFromStorage();
    const existing = celebrations.find(c => c.goalId === goalId);
    
    const now = new Date().toISOString();
    
    if (existing) {
      if (!existing.milestonesCompleted.includes(milestone)) {
        existing.milestonesCompleted.push(milestone);
        existing.milestonesCompleted.sort((a, b) => a - b);
      }
      existing.goalName = goalName; // Update name in case it changed
      existing.lastCelebratedAt = now;
      existing.updatedAt = now;
      await saveCelebrationToStorage(existing);
    } else {
      const newCelebration: GoalCelebration = {
        goalId,
        goalName,
        milestonesCompleted: [milestone],
        lastCelebratedAt: now,
        updatedAt: now
      };
      await saveCelebrationToStorage(newCelebration);
    }
    
    console.log(`🎉 [CelebrationService] ✅ Jalon ${milestone}% marqué comme célébré pour l'objectif ${goalId}`);
  } catch (error) {
    console.error(`🎉 [CelebrationService] ❌ Erreur lors du marquage du jalon comme célébré:`, error);
    throw error;
  }
}

/**
 * Get milestone info for display
 * 
 * @param milestone - Seuil du jalon
 * @returns Informations du jalon pour l'affichage
 */
export function getMilestoneInfo(milestone: MilestoneThreshold): MilestoneInfo {
  return MILESTONE_INFO[milestone];
}

/**
 * Get all milestone badges for a goal (for display on cards)
 * 
 * @param goalId - ID de l'objectif
 * @returns Liste des badges de jalons célébrés
 */
export async function getGoalBadges(goalId: string): Promise<MilestoneInfo[]> {
  try {
    const celebrated = await getCelebratedMilestones(goalId);
    return celebrated.map(m => MILESTONE_INFO[m]);
  } catch (error) {
    console.error(`🎉 [CelebrationService] ❌ Erreur lors de la récupération des badges pour ${goalId}:`, error);
    return [];
  }
}

// Export default service object
const celebrationService = {
  getCelebratedMilestones,
  isMilestoneCelebrated,
  calculateCurrentMilestone,
  getUncelebratedMilestones,
  checkForPendingCelebration,
  markMilestoneAsCelebrated,
  getMilestoneInfo,
  getGoalBadges,
  MILESTONE_THRESHOLDS,
  MILESTONE_INFO
};

export default celebrationService;

// Explicit re-exports to ensure all types are properly exported
export type { MilestoneThreshold, GoalCelebration, MilestoneInfo, PendingCelebration };

