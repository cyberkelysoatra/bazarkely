/**
 * ChallengeCard Component - BazarKELY
 * Composant de carte pour afficher les défis gamifiés
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import * as React from 'react';
import { useState } from 'react';
import { 
  Target, 
  Calendar, 
  Star, 
  Medal, 
  Sparkles,
  CheckCircle,
  Clock,
  Trophy
} from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import type { Challenge, ActiveChallenge } from '../../services/challengeService';

/**
 * Interface des props pour ChallengeCard
 */
export interface ChallengeCardProps {
  readonly challenge: Challenge | ActiveChallenge;
  readonly isActive?: boolean;
  readonly progress?: number;
  readonly onAccept?: (id: string) => void;
  readonly onViewProgress?: (id: string) => void;
}

/**
 * Mapping des types de défis vers les couleurs de bordure
 */
const TYPE_COLORS: Record<string, string> = {
  daily: 'border-green-500',
  weekly: 'border-blue-500',
  monthly: 'border-purple-500',
  special: 'border-yellow-500'
};

/**
 * Mapping des types de défis vers les labels français
 */
const TYPE_LABELS: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  special: 'Spécial'
};

/**
 * Fonction utilitaire pour calculer le temps restant
 */
const getTimeRemaining = (endDate: Date): string => {
  const now = new Date();
  const diffInMs = endDate.getTime() - now.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} jour${diffInDays > 1 ? 's' : ''} restant${diffInDays > 1 ? 's' : ''}`;
  } else if (diffInHours > 0) {
    return `${diffInHours} heure${diffInHours > 1 ? 's' : ''} restante${diffInHours > 1 ? 's' : ''}`;
  } else {
    return 'Temps écoulé';
  }
};

/**
 * Fonction utilitaire pour obtenir les étoiles de difficulté
 */
const getDifficultyStars = (points: number): { filled: number; total: number } => {
  if (points < 30) {
    return { filled: 1, total: 3 };
  } else if (points < 80) {
    return { filled: 2, total: 3 };
  } else {
    return { filled: 3, total: 3 };
  }
};

/**
 * Fonction utilitaire pour obtenir la couleur de la barre de progrès
 */
const getProgressColor = (progress: number): string => {
  if (progress >= 70) return 'bg-green-500';
  if (progress >= 30) return 'bg-yellow-500';
  return 'bg-red-500';
};

/**
 * Composant ChallengeCard
 */
const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  isActive = false,
  progress = 0,
  onAccept,
  onViewProgress
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Accéder aux propriétés selon le type de challenge
  const challengeData = 'challenge' in challenge ? challenge.challenge : challenge;
  const typeColor = TYPE_COLORS[challengeData.type] || 'border-gray-500';
  const typeLabel = TYPE_LABELS[challengeData.type] || 'Défi';
  const difficultyStars = getDifficultyStars(challengeData.points_reward);
  const isCompleted = 'status' in challenge && challenge.status === 'completed';
  
  const timeRemaining = isActive && 'end_date' in challenge 
    ? getTimeRemaining(challenge.end_date)
    : null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept(challenge.id);
    }
  };

  const handleViewProgress = () => {
    if (onViewProgress) {
      onViewProgress(challenge.id);
    }
  };

  return (
    <Card className={`border-t-4 ${typeColor} hover:scale-105 hover:shadow-lg transition-all duration-200 group`}>
      <div className="p-6">
        {/* En-tête avec type et récompenses */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                {typeLabel}
              </span>
              <span className="text-sm text-gray-500">
                {challengeData.duration_days} jour{challengeData.duration_days > 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
              {challengeData.title}
            </h3>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-1 text-yellow-600">
              <Trophy className="w-4 h-4" />
              <span className="font-bold text-lg">
                {challengeData.points_reward.toLocaleString()}
              </span>
              <span className="text-sm">pts</span>
            </div>
            {challengeData.badge_reward && (
              <div className="flex items-center space-x-1 text-purple-600">
                <Medal className="w-4 h-4" />
                <span className="text-sm font-medium">{challengeData.badge_reward}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description avec expansion */}
        <div className="mb-4">
          <p 
            className={`text-gray-700 leading-relaxed ${
              isDescriptionExpanded ? '' : 'line-clamp-2'
            }`}
            title={challengeData.description}
          >
            {challengeData.description}
          </p>
          {challengeData.description.length > 100 && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium mt-1 transition-colors"
            >
              {isDescriptionExpanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>

        {/* Exigences */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Exigences :</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {challengeData.requirements.map((req, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 truncate" title={req.description}>
                  {req.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Indicateur de difficulté */}
        <div className="mb-4">
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-700 mr-2">Difficulté :</span>
            {Array.from({ length: difficultyStars.total }, (_, index) => (
              <Star
                key={index}
                className={`w-4 h-4 ${
                  index < difficultyStars.filled 
                    ? 'text-yellow-500 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="text-sm text-gray-500 ml-2">
              {challengeData.difficulty === 'beginner' ? 'Facile' :
               challengeData.difficulty === 'intermediate' ? 'Moyen' : 'Difficile'}
            </span>
          </div>
        </div>

        {/* Barre de progrès pour les défis actifs */}
        {isActive && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progrès</span>
              <span className="text-sm font-medium text-gray-700">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            {timeRemaining && (
              <div className="flex items-center space-x-1 mt-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{timeRemaining}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {isActive ? (
            <Button
              onClick={handleViewProgress}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <Target className="w-4 h-4" />
              <span>Voir le progrès</span>
            </Button>
          ) : !isCompleted ? (
            <Button
              onClick={handleAccept}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white flex items-center space-x-2"
            >
              <Target className="w-4 h-4" />
              <span>Accepter le Défi</span>
            </Button>
          ) : (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 rounded-lg p-3">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Défi Complété !</span>
            </div>
          )}

          {/* Tagline motivante */}
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>Gagnez {challengeData.points_reward.toLocaleString()} points !</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ChallengeCard;
