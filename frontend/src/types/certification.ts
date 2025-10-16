/**
 * Certification system types for BazarKELY
 * Comprehensive financial education certification with 5 levels and 250 questions
 */

export interface CertificationLevel {
  id: string;
  name: string;
  description: string;
  requiredQuestions: number;
  badgeIcon: string;
  color: string;
  unlockThreshold: number; // Total questions needed to unlock
}

export interface QuizProgress {
  currentLevel: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  levelProgress: Record<string, number>; // levelId -> progress percentage
  badges: string[];
  certifications: string[];
  profileCompleteness: number; // 0-100 percentage
}

export interface UserDetailedProfile {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // ISO date string
  age?: number; // Calculated automatically
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'other';
  spouse?: {
    name?: string;
    age?: number;
    occupation?: string;
  };
  numberOfChildren?: number;
  children?: Array<{
    name?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    schoolLevel?: 'preschool' | 'primary' | 'secondary' | 'university';
  }>;
  otherDependents?: Array<{
    name?: string;
    relationship?: string;
    age?: number;
  }>;
  occupation?: string;
  employer?: string;
  employmentStatus?: 'employed' | 'self-employed' | 'unemployed' | 'student' | 'retired';
}

export interface UserGeolocation {
  region: string; // One of 22 Madagascar regions
  district?: string;
  commune?: string;
  habitatType: 'urban' | 'periurban' | 'rural_town' | 'rural_village' | 'isolated';
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeolocationValidation {
  isCoherent: boolean;
  confidence: number; // 0-100
  suggestedRegion?: string;
}

export interface CertificationQuestion {
  id: string;
  text: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  category: 'budget' | 'savings' | 'expenses' | 'mobile-money' | 'madagascar-context' | 'family-finance' | 'investment' | 'entrepreneurship';
  difficulty: number; // 1-5
  region?: string; // Madagascar region for context-specific questions
  explanation: string;
  points: number;
  timeLimit: number; // in seconds
}

export interface CertificationScore {
  quizScore: number; // 0-40
  practiceScore: number; // 0-60
  profileScore: number; // 0-15
  totalScore: number; // 0-115
  level: number;
  progressPercentage: number;
}

export interface LevelProgress {
  levelId: string;
  questionsAnswered: number;
  correctAnswers: number;
  progressPercentage: number;
  isCompleted: boolean;
  unlockedAt?: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: Date;
  level: number;
}

export interface Certification {
  id: string;
  levelId: string;
  levelName: string;
  earnedAt: Date;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number; // in seconds
  isActive: boolean;
}

export interface PracticeMultiplier {
  level: number;
  multiplier: number;
  description: string;
}

export interface ResponseTimeBonus {
  level: number;
  maxBonus: number;
  timeThresholds: Array<{
    maxTime: number; // in seconds
    bonus: number;
  }>;
}

// Madagascar regions for geolocation validation
export const MADAGASCAR_REGIONS = [
  'Analamanga',
  'Vakinankaratra',
  'Itasy',
  'Bongolava',
  'Vatovavy-Fitovinany',
  'Atsimo-Atsinanana',
  'Ihorombe',
  'Atsimo-Andrefana',
  'Androy',
  'Anosy',
  'Atsinanana',
  'Alaotra-Mangoro',
  'Boeny',
  'Sofia',
  'Betsiboka',
  'Melaky',
  'Diana',
  'Sava',
  'Atsimo-Andrefana',
  'Menabe',
  'Amoron\'i Mania',
  'Matsiatra Ambony'
] as const;

export type MadagascarRegion = typeof MADAGASCAR_REGIONS[number];

// Default certification levels
export const CERTIFICATION_LEVELS: CertificationLevel[] = [
  {
    id: 'level-1',
    name: 'Débutant Financier',
    description: 'Concepts financiers de base et gestion quotidienne',
    requiredQuestions: 50,
    badgeIcon: 'Award',
    color: '#10B981',
    unlockThreshold: 0
  },
  {
    id: 'level-2',
    name: 'Planificateur Budgétaire',
    description: 'Planification et optimisation des budgets familiaux',
    requiredQuestions: 50,
    badgeIcon: 'Target',
    color: '#3B82F6',
    unlockThreshold: 50
  },
  {
    id: 'level-3',
    name: 'Épargnant Avancé',
    description: 'Stratégies d\'épargne et d\'investissement',
    requiredQuestions: 50,
    badgeIcon: 'Star',
    color: '#8B5CF6',
    unlockThreshold: 100
  },
  {
    id: 'level-4',
    name: 'Expert Financier',
    description: 'Gestion financière complexe et stratégies avancées',
    requiredQuestions: 50,
    badgeIcon: 'Medal',
    color: '#F59E0B',
    unlockThreshold: 150
  },
  {
    id: 'level-5',
    name: 'Maître Financier',
    description: 'Maîtrise complète de la gestion financière familiale',
    requiredQuestions: 50,
    badgeIcon: 'Crown',
    color: '#EF4444',
    unlockThreshold: 200
  }
];

