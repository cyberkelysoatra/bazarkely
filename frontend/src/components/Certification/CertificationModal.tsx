/**
 * Certification Modal Component for BazarKELY
 * Shows comprehensive certification details including level, scores, progress, and badges
 */

import React from 'react';
import { 
  Trophy, 
  Crown, 
  Star, 
  Medal, 
  Award, 
  X, 
  CheckCircle, 
  Lock,
  Target,
  TrendingUp,
  BookOpen,
  Users,
  MapPin
} from 'lucide-react';
import Modal from '../UI/Modal';
import type { CertificationLevel, Badge, QuizProgress } from '../../types/certification';

interface CertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  totalScore: number;
  quizScore: number;
  practiceScore: number;
  profileScore: number;
  levelProgress: Record<string, any>;
  badges: Badge[];
  certifications: any[];
}

const CertificationModal: React.FC<CertificationModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
  totalScore,
  quizScore,
  practiceScore,
  profileScore,
  levelProgress,
  badges,
  certifications
}) => {
  // Define all 5 certification levels
  const certificationLevels: CertificationLevel[] = [
    {
      id: 'level-1',
      name: 'Débutant',
      description: 'Connaissances de base en éducation financière',
      requiredQuestions: 50,
      badgeIcon: 'Star',
      color: 'amber',
      unlockThreshold: 0
    },
    {
      id: 'level-2',
      name: 'Intermédiaire',
      description: 'Compétences financières intermédiaires',
      requiredQuestions: 50,
      badgeIcon: 'Medal',
      color: 'gray',
      unlockThreshold: 23
    },
    {
      id: 'level-3',
      name: 'Avancé',
      description: 'Expertise financière avancée',
      requiredQuestions: 50,
      badgeIcon: 'Star',
      color: 'yellow',
      unlockThreshold: 46
    },
    {
      id: 'level-4',
      name: 'Expert',
      description: 'Maîtrise experte des finances personnelles',
      requiredQuestions: 50,
      badgeIcon: 'Crown',
      color: 'gray',
      unlockThreshold: 69
    },
    {
      id: 'level-5',
      name: 'Maître',
      description: 'Maître en éducation financière',
      requiredQuestions: 50,
      badgeIcon: 'Crown',
      color: 'yellow',
      unlockThreshold: 92
    }
  ];

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1: return Star;
      case 2: return Medal;
      case 3: return Star;
      case 4: return Crown;
      case 5: return Crown;
      default: return Trophy;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'text-amber-600';
      case 2: return 'text-gray-600';
      case 3: return 'text-yellow-600';
      case 4: return 'text-gray-500';
      case 5: return 'text-yellow-600';
      default: return 'text-purple-600';
    }
  };

  const getLevelBgColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-amber-50 border-amber-200';
      case 2: return 'bg-gray-50 border-gray-200';
      case 3: return 'bg-yellow-50 border-yellow-200';
      case 4: return 'bg-gray-50 border-gray-200';
      case 5: return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-purple-50 border-purple-200';
    }
  };

  const currentLevelData = certificationLevels[currentLevel - 1];
  const nextLevelData = currentLevel < 5 ? certificationLevels[currentLevel] : null;
  const progressToNext = nextLevelData ? 
    Math.min(100, ((totalScore - currentLevelData.unlockThreshold) / (nextLevelData.unlockThreshold - currentLevelData.unlockThreshold)) * 100) : 100;

  const LevelIcon = getLevelIcon(currentLevel);
  const levelColor = getLevelColor(currentLevel);
  const levelBgColor = getLevelBgColor(currentLevel);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Certification Financière</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Current Level Badge */}
        <div className={`p-6 rounded-xl border-2 mb-6 ${levelBgColor}`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${levelBgColor}`}>
              <LevelIcon className={`w-8 h-8 ${levelColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                Niveau {currentLevel} - {currentLevelData.name}
              </h3>
              <p className="text-gray-600 mb-2">{currentLevelData.description}</p>
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-purple-600">
                  {totalScore}/115 points
                </span>
                {nextLevelData && (
                  <span className="text-sm text-gray-500">
                    {nextLevelData.unlockThreshold - totalScore} points jusqu'au niveau suivant
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Quiz Théorique</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{quizScore}/40</div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(quizScore / 40) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900">Pratique</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{practiceScore}/60</div>
            <div className="w-full bg-green-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(practiceScore / 60) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Profil</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{profileScore}/15</div>
            <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(profileScore / 15) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress to Next Level */}
        {nextLevelData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Progression vers le niveau suivant</h4>
              <span className="text-sm text-gray-600">{Math.round(progressToNext)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Niveau {currentLevel + 1} - {nextLevelData.name} ({nextLevelData.unlockThreshold} points requis)
            </p>
          </div>
        )}

        {/* Quiz Statistics */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Statistiques du Quiz</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Questions Niveau {currentLevel}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {levelProgress[`level-${currentLevel}`]?.questionsAnswered || 0}/50
              </div>
              <div className="text-sm text-gray-600">
                {levelProgress[`level-${currentLevel}`]?.correctAnswers || 0} correctes
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Progression</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {levelProgress[`level-${currentLevel}`]?.progressPercentage || 0}%
              </div>
              <div className="text-sm text-gray-600">
                {levelProgress[`level-${currentLevel}`]?.isCompleted ? 'Terminé' : 'En cours'}
              </div>
            </div>
          </div>
        </div>

        {/* Badges Earned */}
        {badges.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Badges Obtenus</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {badges.map((badge, index) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <Award className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900">{badge.name}</div>
                  <div className="text-xs text-gray-600">{badge.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Levels Overview */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Tous les Niveaux</h4>
          <div className="space-y-2">
            {certificationLevels.map((level, index) => {
              const levelNum = index + 1;
              const isUnlocked = totalScore >= level.unlockThreshold;
              const isCurrent = levelNum === currentLevel;
              const LevelIconComponent = getLevelIcon(levelNum);
              const levelColorClass = getLevelColor(levelNum);
              const levelBgClass = getLevelBgColor(levelNum);

              return (
                <div
                  key={level.id}
                  className={`
                    p-3 rounded-lg border-2 transition-all
                    ${isCurrent ? levelBgClass + ' ring-2 ring-purple-500' : 'bg-gray-50 border-gray-200'}
                    ${isUnlocked ? 'opacity-100' : 'opacity-50'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {isUnlocked ? (
                      <LevelIconComponent className={`w-5 h-5 ${levelColorClass}`} />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          Niveau {levelNum} - {level.name}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            Actuel
                          </span>
                        )}
                        {isUnlocked && !isCurrent && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{level.description}</p>
                      <p className="text-xs text-gray-500">
                        {level.unlockThreshold} points requis
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CertificationModal;


