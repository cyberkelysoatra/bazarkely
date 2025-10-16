/**
 * Certification Store for BazarKELY
 * Manages certification progress, levels, badges, and user profile completion
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  QuizProgress, 
  CertificationLevel, 
  Badge, 
  Certification,
  UserDetailedProfile,
  UserGeolocation,
  LevelProgress,
  CertificationScore
} from '../types/certification';

interface QuizSession {
  level: number;
  questionIds: string[];
  currentIndex: number;
  startTime: number;
  answers: Array<{
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
    timeElapsed: number;
    timeBonus: number;
  }>;
}

interface CertificationState {
  // Progress tracking
  quizProgress: QuizProgress;
  currentLevel: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  
  // User profile
  detailedProfile: UserDetailedProfile;
  geolocation: UserGeolocation;
  
  // Achievements
  badges: Badge[];
  certifications: Certification[];
  
  // Level progress tracking
  levelProgress: Record<string, LevelProgress>;
  
  // Quiz session management
  currentQuizSession: QuizSession | null;
  quizHistory: QuizSession[];
  
  // Settings
  practiceMultiplier: number;
  responseTimeBonus: boolean;
  
  // Actions
  updateQuizProgress: (questionsAnswered: number, correctAnswers: number) => void;
  updateProfile: (profile: Partial<UserDetailedProfile>) => void;
  updateGeolocation: (location: Partial<UserGeolocation>) => void;
  addBadge: (badge: Badge) => void;
  addCertification: (certification: Certification) => void;
  updateLevelProgress: (levelId: string, progress: Partial<LevelProgress>) => void;
  calculateProfileCompleteness: () => number;
  resetProgress: () => void;
  setPracticeMultiplier: (multiplier: number) => void;
  toggleResponseTimeBonus: () => void;
  
  // Quiz session actions
  startQuizSession: (session: QuizSession) => void;
  saveQuestionAnswer: (questionId: string, selectedOption: string, isCorrect: boolean, timeElapsed: number, timeBonus: number) => void;
  completeQuizSession: (session: QuizSession) => void;
}

const initialQuizProgress: QuizProgress = {
  currentLevel: 1,
  totalQuestionsAnswered: 0,
  correctAnswers: 0,
  levelProgress: {},
  badges: [],
  certifications: [],
  profileCompleteness: 0
};

const initialDetailedProfile: UserDetailedProfile = {};

const initialGeolocation: UserGeolocation = {
  region: '',
  habitatType: 'urban'
};

export const useCertificationStore = create<CertificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      quizProgress: initialQuizProgress,
      currentLevel: 1,
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      detailedProfile: initialDetailedProfile,
      geolocation: initialGeolocation,
      badges: [],
      certifications: [],
      levelProgress: {},
      currentQuizSession: null,
      quizHistory: [],
      practiceMultiplier: 1.0,
      responseTimeBonus: true,

      // Actions
      updateQuizProgress: (questionsAnswered: number, correctAnswers: number) => {
        set((state) => {
          const newTotalAnswered = state.totalQuestionsAnswered + questionsAnswered;
          const newCorrectAnswers = state.correctAnswers + correctAnswers;
          const newCurrentLevel = Math.min(5, Math.floor(newTotalAnswered / 50) + 1);
          
          const updatedProgress: QuizProgress = {
            ...state.quizProgress,
            currentLevel: newCurrentLevel,
            totalQuestionsAnswered: newTotalAnswered,
            correctAnswers: newCorrectAnswers,
            levelProgress: {
              ...state.levelProgress,
              [`level-${newCurrentLevel}`]: {
                levelId: `level-${newCurrentLevel}`,
                questionsAnswered: questionsAnswered,
                correctAnswers: correctAnswers,
                progressPercentage: Math.round((correctAnswers / questionsAnswered) * 100),
                isCompleted: questionsAnswered >= 50 && correctAnswers >= 45, // 90% threshold
                unlockedAt: new Date()
              }
            }
          };

          return {
            ...state,
            quizProgress: updatedProgress,
            currentLevel: newCurrentLevel,
            totalQuestionsAnswered: newTotalAnswered,
            correctAnswers: newCorrectAnswers
          };
        });
      },

      updateProfile: (profile: Partial<UserDetailedProfile>) => {
        set((state) => {
          const updatedProfile = { ...state.detailedProfile, ...profile };
          
          // Calculate age if dateOfBirth is provided
          if (profile.dateOfBirth) {
            const birthDate = new Date(profile.dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              updatedProfile.age = age - 1;
            } else {
              updatedProfile.age = age;
            }
          }

          const profileCompleteness = get().calculateProfileCompleteness();
          
          return {
            ...state,
            detailedProfile: updatedProfile,
            quizProgress: {
              ...state.quizProgress,
              profileCompleteness
            }
          };
        });
      },

      updateGeolocation: (location: Partial<UserGeolocation>) => {
        set((state) => ({
          ...state,
          geolocation: { ...state.geolocation, ...location }
        }));
      },

      addBadge: (badge: Badge) => {
        set((state) => {
          const existingBadge = state.badges.find(b => b.id === badge.id);
          if (existingBadge) return state;

          return {
            ...state,
            badges: [...state.badges, badge],
            quizProgress: {
              ...state.quizProgress,
              badges: [...state.quizProgress.badges, badge.id]
            }
          };
        });
      },

      addCertification: (certification: Certification) => {
        set((state) => {
          const existingCert = state.certifications.find(c => c.id === certification.id);
          if (existingCert) return state;

          return {
            ...state,
            certifications: [...state.certifications, certification],
            quizProgress: {
              ...state.quizProgress,
              certifications: [...state.quizProgress.certifications, certification.id]
            }
          };
        });
      },

      updateLevelProgress: (levelId: string, progress: Partial<LevelProgress>) => {
        set((state) => ({
          ...state,
          levelProgress: {
            ...state.levelProgress,
            [levelId]: {
              ...state.levelProgress[levelId],
              ...progress
            }
          }
        }));
      },

      calculateProfileCompleteness: () => {
        const state = get();
        const profile = state.detailedProfile;
        let completeness = 0;
        let totalFields = 0;

        // Basic information (40 points)
        const basicFields = [
          'firstName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus'
        ];
        basicFields.forEach(field => {
          totalFields++;
          if (profile[field as keyof UserDetailedProfile]) completeness++;
        });

        // Family information (30 points)
        if (profile.maritalStatus === 'married' && profile.spouse) {
          totalFields += 3;
          if (profile.spouse.name) completeness++;
          if (profile.spouse.age) completeness++;
          if (profile.spouse.occupation) completeness++;
        }

        if (profile.numberOfChildren && profile.numberOfChildren > 0) {
          totalFields += 2;
          if (profile.children && profile.children.length > 0) completeness++;
          if (profile.children?.some(child => child.name)) completeness++;
        }

        // Professional information (20 points)
        const professionalFields = ['occupation', 'employer', 'employmentStatus'];
        professionalFields.forEach(field => {
          totalFields++;
          if (profile[field as keyof UserDetailedProfile]) completeness++;
        });

        // Geolocation (10 points)
        totalFields += 2;
        if (profile.region) completeness++;
        if (profile.habitatType) completeness++;

        return totalFields > 0 ? Math.round((completeness / totalFields) * 100) : 0;
      },

      resetProgress: () => {
        set({
          quizProgress: initialQuizProgress,
          currentLevel: 1,
          totalQuestionsAnswered: 0,
          correctAnswers: 0,
          detailedProfile: initialDetailedProfile,
          geolocation: initialGeolocation,
          badges: [],
          certifications: [],
          levelProgress: {},
          practiceMultiplier: 1.0,
          responseTimeBonus: true
        });
      },

      setPracticeMultiplier: (multiplier: number) => {
        set({ practiceMultiplier: Math.max(0.5, Math.min(3.0, multiplier)) });
      },

      toggleResponseTimeBonus: () => {
        set((state) => ({ responseTimeBonus: !state.responseTimeBonus }));
      },

      // Quiz session actions
      startQuizSession: (session: QuizSession) => {
        set({ currentQuizSession: session });
      },

      saveQuestionAnswer: (questionId: string, selectedOption: string, isCorrect: boolean, timeElapsed: number, timeBonus: number) => {
        set((state) => {
          if (!state.currentQuizSession) return state;

          const updatedSession = {
            ...state.currentQuizSession,
            answers: [
              ...state.currentQuizSession.answers,
              {
                questionId,
                selectedOption,
                isCorrect,
                timeElapsed,
                timeBonus
              }
            ]
          };

          return {
            ...state,
            currentQuizSession: updatedSession
          };
        });
      },

      completeQuizSession: (session: QuizSession) => {
        set((state) => {
          const correctAnswers = session.answers.filter(a => a.isCorrect).length;
          const totalQuestions = session.answers.length;
          
          // Update overall progress
          const newTotalAnswered = state.totalQuestionsAnswered + totalQuestions;
          const newCorrectAnswers = state.correctAnswers + correctAnswers;
          const newCurrentLevel = Math.min(5, Math.floor(newTotalAnswered / 50) + 1);

          // Add to quiz history
          const updatedHistory = [...state.quizHistory, session];

          return {
            ...state,
            currentQuizSession: null,
            quizHistory: updatedHistory,
            totalQuestionsAnswered: newTotalAnswered,
            correctAnswers: newCorrectAnswers,
            currentLevel: newCurrentLevel,
            quizProgress: {
              ...state.quizProgress,
              currentLevel: newCurrentLevel,
              totalQuestionsAnswered: newTotalAnswered,
              correctAnswers: newCorrectAnswers
            }
          };
        });
      }
    }),
    {
      name: 'bazarkely-certification-progress',
      partialize: (state) => ({
        quizProgress: state.quizProgress,
        currentLevel: state.currentLevel,
        totalQuestionsAnswered: state.totalQuestionsAnswered,
        correctAnswers: state.correctAnswers,
        detailedProfile: state.detailedProfile,
        geolocation: state.geolocation,
        badges: state.badges,
        certifications: state.certifications,
        levelProgress: state.levelProgress,
        quizHistory: state.quizHistory,
        practiceMultiplier: state.practiceMultiplier,
        responseTimeBonus: state.responseTimeBonus
      })
    }
  )
);

