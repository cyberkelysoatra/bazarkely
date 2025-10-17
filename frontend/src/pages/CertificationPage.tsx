/**
 * Certification Page Component for BazarKELY
 * Full page view showing comprehensive certification details
 * Replaces the previous modal implementation
 */

import React from 'react';
import { 
  Trophy, 
  Crown, 
  Star, 
  Medal, 
  Award, 
  ChevronLeft, 
  CheckCircle, 
  Lock,
  Target,
  TrendingUp,
  BookOpen,
  Users,
  MapPin,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCertificationStore } from '../store/certificationStore';
import LeaderboardComponent from '../components/Leaderboard/LeaderboardComponent';
// TODO: Uncomment after CertificateDisplay component is created
// import CertificateDisplay from '../components/Certification/CertificateDisplay';
import type { CertificationLevel, Badge, QuizProgress } from '../types/certification';

const CertificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentLevel, 
    totalQuestionsAnswered, 
    correctAnswers, 
    detailedProfile, 
    levelProgress,
    badges,
    certifications,
    practiceTracking
  } = useCertificationStore();

  // Calculate scores for display
  const quizScore = Math.min(40, Math.floor((correctAnswers / Math.max(1, totalQuestionsAnswered)) * 40));
  const practiceScore = practiceTracking.practiceScore;
  const profileScore = detailedProfile.firstName ? 15 : 0; // Simplified profile completion score
  const totalScore = quizScore + practiceScore + profileScore;

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
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Certification Financière</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Current Level Badge */}
        <div className={`p-6 rounded-xl border-2 ${levelBgColor}`}>
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-full ${levelBgColor}`}>
              <LevelIcon className={`w-12 h-12 ${levelColor}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                Niveau {currentLevel} - {currentLevelData.name}
              </h2>
              <p className="text-gray-600 mb-3">{currentLevelData.description}</p>
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-purple-600">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Progression vers le niveau suivant</h3>
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
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques du Quiz</h3>
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
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Badges Obtenus</h3>
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
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tous les Niveaux</h3>
          <div className="space-y-3">
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
                    p-4 rounded-lg border-2 transition-all
                    ${isCurrent ? levelBgClass + ' ring-2 ring-purple-500' : 'bg-gray-50 border-gray-200'}
                    ${isUnlocked ? 'opacity-100' : 'opacity-50'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {isUnlocked ? (
                      <LevelIconComponent className={`w-6 h-6 ${levelColorClass}`} />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-400" />
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

        {/* TODO: Uncomment after CertificateDisplay component is created
        Certificates Section */}
        {/* {certifications.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Medal className="w-6 h-6 text-yellow-600 mr-3" />
              Certificats Obtenus
            </h3>
            <CertificateDisplay />
          </div>
        )} */}

        {/* Leaderboard Section */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Trophy className="w-6 h-6 text-yellow-600 mr-3" />
            Classement Général
          </h3>
          
          {/* Privacy Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Protection de la Vie Privée
                </h4>
                <p className="text-sm text-blue-800">
                  Tous les noms d'utilisateur sont automatiquement anonymisés avec des pseudonymes. 
                  Vos vrais noms et informations personnelles ne sont jamais affichés dans le classement 
                  pour protéger votre confidentialité.
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Component */}
          <LeaderboardComponent />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center space-x-4 pt-6">
          <button
            onClick={() => navigate('/profile-completion')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Compléter le Profil
          </button>
          <button
            onClick={() => navigate('/education')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Formation Financière
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificationPage;
