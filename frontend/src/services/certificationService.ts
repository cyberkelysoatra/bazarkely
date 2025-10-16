/**
 * Certification Service for BazarKELY
 * Handles certification scoring, level progression, and question management
 */

import type { 
  CertificationScore, 
  LevelProgress, 
  GeolocationValidation,
  GPSLocation,
  UserGeolocation,
  CertificationLevel,
  PracticeMultiplier,
  ResponseTimeBonus
} from '../types/certification';

/**
 * Calculate total certification score based on quiz, practice, and profile scores
 * @param quizScore - Quiz score (0-40)
 * @param practiceScore - Practice behavior score (0-60)
 * @param profileScore - Profile completion score (0-15)
 * @returns Total score out of 115
 */
export const calculateCertificationScore = (
  quizScore: number,
  practiceScore: number,
  profileScore: number
): CertificationScore => {
  const totalScore = Math.min(115, quizScore + practiceScore + profileScore);
  const level = Math.min(5, Math.floor(totalScore / 23) + 1); // 23 points per level
  const progressPercentage = Math.round((totalScore % 23) / 23 * 100);

  return {
    quizScore: Math.min(40, Math.max(0, quizScore)),
    practiceScore: Math.min(60, Math.max(0, practiceScore)),
    profileScore: Math.min(15, Math.max(0, profileScore)),
    totalScore,
    level,
    progressPercentage
  };
};

/**
 * Calculate level progress percentage
 * @param currentLevel - Current certification level (1-5)
 * @param questionsAnswered - Number of questions answered in current level
 * @param correctAnswers - Number of correct answers in current level
 * @returns Progress percentage (0-100)
 */
export const calculateLevelProgress = (
  currentLevel: number,
  questionsAnswered: number,
  correctAnswers: number
): number => {
  if (questionsAnswered === 0) return 0;
  
  const maxQuestions = 50; // 50 questions per level
  const progressFromQuestions = Math.min(100, (questionsAnswered / maxQuestions) * 100);
  const accuracyBonus = correctAnswers > 0 ? (correctAnswers / questionsAnswered) * 10 : 0;
  
  return Math.min(100, Math.round(progressFromQuestions + accuracyBonus));
};

/**
 * Determine next level based on current score and practice multiplier
 * @param currentScore - Current total score
 * @param practiceMultiplier - Practice behavior multiplier (0.5-3.0)
 * @returns Next level number or null if max level reached
 */
export const determineNextLevel = (
  currentScore: number,
  practiceMultiplier: number
): number | null => {
  const adjustedScore = currentScore * practiceMultiplier;
  const nextLevel = Math.floor(adjustedScore / 23) + 1;
  
  return nextLevel <= 5 ? nextLevel : null;
};

/**
 * Get failed questions to recycle to next level (legacy function)
 * @param levelNumber - Level number (1-5)
 * @param answeredQuestions - Array of answered question IDs
 * @param failedThreshold - Failure threshold percentage (default 90%)
 * @returns Array of failed question IDs
 */
export const getFailedQuestionsLegacy = (
  levelNumber: number,
  answeredQuestions: string[],
  failedThreshold: number = 90
): string[] => {
  // This would typically query a database or question service
  // For now, return empty array as placeholder
  // In real implementation, would check question results against threshold
  return [];
};

/**
 * Check if a level is unlocked based on 90% accuracy threshold
 * @param level - Level number (1-5)
 * @returns Promise<boolean> - Whether level is unlocked
 */
export const checkLevelUnlocked = async (level: number): Promise<boolean> => {
  try {
    const stored = localStorage.getItem('bazarkely-quiz-questions-completed');
    const completedQuestions = stored ? JSON.parse(stored) : [];
    const levelPrefix = `cert-level${level}-`;
    const levelQuestions = completedQuestions.filter((id: string) =>
      id.startsWith(levelPrefix)
    );
    
    // Check if we have question attempts stored
    const attemptsKey = `bazarkely-quiz-attempts-level${level}`;
    const attempts = localStorage.getItem(attemptsKey);
    
    if (!attempts) return false;
    
    const questionAttempts = JSON.parse(attempts);
    const totalAttempts = Object.keys(questionAttempts).length;
    const correctAttempts = Object.values(questionAttempts).filter((attempt: any) => 
      attempt.isCorrect
    ).length;
    
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
    return accuracy >= 90;
  } catch (error) {
    console.error('Error checking level unlock:', error);
    return false;
  }
};

/**
 * Get failed questions for a specific level
 * @param level - Level number (1-5)
 * @returns Promise<string[]> - Array of failed question IDs
 */
export const getFailedQuestions = async (level: number): Promise<string[]> => {
  try {
    const attemptsKey = `bazarkely-quiz-attempts-level${level}`;
    const attempts = localStorage.getItem(attemptsKey);
    
    if (!attempts) return [];
    
    const questionAttempts = JSON.parse(attempts);
    const failedQuestions = Object.entries(questionAttempts)
      .filter(([_, attempt]: [string, any]) => !attempt.isCorrect)
      .map(([questionId, _]) => questionId);
    
    return failedQuestions;
  } catch (error) {
    console.error('Error getting failed questions:', error);
    return [];
  }
};

/**
 * Calculate response time bonus based on time ratio
 * @param timeElapsed - Time taken in milliseconds
 * @param timeLimit - Time limit in milliseconds
 * @returns Bonus points (0-3)
 */
export const calculateResponseTimeBonus = (timeElapsed: number, timeLimit: number): number => {
  const timeRatio = timeElapsed / timeLimit;
  
  if (timeRatio <= 0.25) return 3; // First 25% of time
  if (timeRatio <= 0.50) return 2; // 25-50% of time
  if (timeRatio <= 0.75) return 1; // 50-75% of time
  return 0; // Over 75% of time
};

/**
 * Update question attempt in localStorage
 * @param questionId - Question ID
 * @param selectedOption - Selected option ID
 * @param timeElapsed - Time taken in milliseconds
 * @param isCorrect - Whether answer is correct
 */
export const updateQuestionAttempt = (
  questionId: string,
  selectedOption: string,
  timeElapsed: number,
  isCorrect: boolean
): void => {
  try {
    const level = questionId.split('-')[1].replace('level', '');
    const attemptsKey = `bazarkely-quiz-attempts-level${level}`;
    
    const existingAttempts = localStorage.getItem(attemptsKey);
    const attempts = existingAttempts ? JSON.parse(existingAttempts) : {};
    
    attempts[questionId] = {
      selectedOption,
      timeElapsed,
      isCorrect,
      timestamp: Date.now()
    };
    
    localStorage.setItem(attemptsKey, JSON.stringify(attempts));
    
    // Also update the completed questions list
    const completedKey = 'bazarkely-quiz-questions-completed';
    const completed = localStorage.getItem(completedKey);
    const completedQuestions = completed ? JSON.parse(completed) : [];
    
    if (!completedQuestions.includes(questionId)) {
      completedQuestions.push(questionId);
      localStorage.setItem(completedKey, JSON.stringify(completedQuestions));
    }
  } catch (error) {
    console.error('Error updating question attempt:', error);
  }
};


/**
 * Validate geolocation coherence between declared and GPS location
 * @param declaredRegion - User's declared region
 * @param district - User's declared district (optional)
 * @param gpsLocation - GPS coordinates
 * @returns Geolocation validation result
 */
export const validateGeolocation = (
  declaredRegion: string,
  district: string | undefined,
  gpsLocation: GPSLocation
): GeolocationValidation => {
  try {
    // Basic validation - in real implementation would use reverse geocoding
    const isCoherent = gpsLocation.accuracy <= 100; // 100m accuracy threshold
    const confidence = isCoherent ? Math.max(50, 100 - gpsLocation.accuracy) : 0;
    
    return {
      isCoherent,
      confidence,
      suggestedRegion: isCoherent ? declaredRegion : undefined
    };
  } catch (error) {
    console.error('Error validating geolocation:', error);
    return {
      isCoherent: false,
      confidence: 0
    };
  }
};

/**
 * Calculate practice score based on financial behaviors
 * @param behaviors - Object containing various financial behaviors
 * @returns Practice score (0-60)
 */
export const calculatePracticeScore = (behaviors: {
  budgetCreation: boolean;
  expenseTracking: boolean;
  savingsGoal: boolean;
  mobileMoneyUsage: boolean;
  familyFinancialPlanning: boolean;
  regularBudgetReview: boolean;
  emergencyFund: boolean;
  debtManagement: boolean;
  investmentKnowledge: boolean;
  financialEducation: boolean;
}): number => {
  let score = 0;
  const maxScore = 60;
  
  // Each behavior worth 6 points
  const behaviorPoints = 6;
  
  Object.values(behaviors).forEach(behavior => {
    if (behavior) score += behaviorPoints;
  });
  
  return Math.min(maxScore, score);
};

/**
 * Get practice multiplier based on user behaviors
 * @param behaviors - Financial behavior indicators
 * @returns Multiplier value (0.5-3.0)
 */
export const getPracticeMultiplier = (behaviors: {
  consistentBudgeting: boolean;
  regularSavings: boolean;
  familyInvolvement: boolean;
  financialEducation: boolean;
  goalAchievement: boolean;
}): number => {
  let multiplier = 1.0;
  
  // Each positive behavior adds 0.2 to multiplier
  Object.values(behaviors).forEach(behavior => {
    if (behavior) multiplier += 0.2;
  });
  
  return Math.min(3.0, Math.max(0.5, multiplier));
};

/**
 * Calculate profile completion score
 * @param profile - User detailed profile
 * @returns Profile score (0-15)
 */
export const calculateProfileScore = (profile: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  spouse?: any;
  children?: any[];
  occupation?: string;
  employer?: string;
  employmentStatus?: string;
  region?: string;
  habitatType?: string;
}): number => {
  let score = 0;
  const maxScore = 15;
  
  // Basic info (5 points)
  if (profile.firstName) score += 1;
  if (profile.lastName) score += 1;
  if (profile.dateOfBirth) score += 1;
  if (profile.gender) score += 1;
  if (profile.maritalStatus) score += 1;
  
  // Family info (4 points)
  if (profile.spouse && profile.maritalStatus === 'married') score += 2;
  if (profile.children && profile.children.length > 0) score += 2;
  
  // Professional info (3 points)
  if (profile.occupation) score += 1;
  if (profile.employer) score += 1;
  if (profile.employmentStatus) score += 1;
  
  // Location info (3 points)
  if (profile.region) score += 2;
  if (profile.habitatType) score += 1;
  
  return Math.min(maxScore, score);
};

/**
 * Get level requirements and thresholds
 * @param levelNumber - Level number (1-5)
 * @returns Level requirements
 */
export const getLevelRequirements = (levelNumber: number): {
  requiredQuestions: number;
  minScore: number;
  maxScore: number;
  description: string;
} => {
  const requirements = {
    1: { requiredQuestions: 50, minScore: 0, maxScore: 23, description: 'Débutant Financier' },
    2: { requiredQuestions: 50, minScore: 23, maxScore: 46, description: 'Planificateur Budgétaire' },
    3: { requiredQuestions: 50, minScore: 46, maxScore: 69, description: 'Épargnant Avancé' },
    4: { requiredQuestions: 50, minScore: 69, maxScore: 92, description: 'Expert Financier' },
    5: { requiredQuestions: 50, minScore: 92, maxScore: 115, description: 'Maître Financier' }
  };
  
  return requirements[levelNumber as keyof typeof requirements] || requirements[1];
};

/**
 * Check if user qualifies for level advancement
 * @param currentLevel - Current level
 * @param totalScore - Total certification score
 * @param questionsAnswered - Total questions answered
 * @returns Whether user can advance to next level
 */
export const canAdvanceLevel = (
  currentLevel: number,
  totalScore: number,
  questionsAnswered: number
): boolean => {
  if (currentLevel >= 5) return false;
  
  const requirements = getLevelRequirements(currentLevel);
  const nextLevelRequirements = getLevelRequirements(currentLevel + 1);
  
  return totalScore >= nextLevelRequirements.minScore && 
         questionsAnswered >= requirements.requiredQuestions;
};

