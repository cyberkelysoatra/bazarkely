/**
 * RecommendationWidget Component - BazarKELY
 * Widget de recommandations pour le dashboard
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  Target,
  ThumbsUp,
  ThumbsDown,
  Coins,
  Sparkles
} from 'lucide-react';
import Button from '../UI/Button';
import useRecommendations from '../../hooks/useRecommendations';
import type { Recommendation } from '../../services/recommendationEngineService';
import type { ActiveChallenge } from '../../services/challengeService';

/**
 * Mapping des thèmes vers les emojis
 */
const THEME_EMOJIS: Record<string, string> = {
  savings: '💰',
  expense_reduction: '📉',
  budget_optimization: '📊',
  education: '📚',
  mobile_money: '📱'
};

/**
 * Mapping des priorités vers les couleurs
 */
const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600',
  medium: 'text-orange-600',
  low: 'text-blue-600'
};

/**
 * Composant RecommendationWidget
 */
const RecommendationWidget: React.FC = () => {
  const navigate = useNavigate();
  const {
    recommendations,
    activeChallenges,
    isLoading,
    likeRecommendation,
    dislikeRecommendation,
    getRecommendationStats
  } = useRecommendations();

  const [isChallengesExpanded, setIsChallengesExpanded] = useState(false);
  const [likedRecommendation, setLikedRecommendation] = useState<string | null>(null);
  const [dislikedRecommendation, setDislikedRecommendation] = useState<string | null>(null);

  // Obtenir la meilleure recommandation
  const topRecommendation = recommendations.length > 0 
    ? recommendations.sort((a, b) => b.relevance_score - a.relevance_score)[0]
    : null;

  // Obtenir les 2 défis les plus urgents
  const upcomingChallenges = activeChallenges
    .sort((a, b) => a.end_date.getTime() - b.end_date.getTime())
    .slice(0, 2);

  // Statistiques
  const stats = getRecommendationStats();

  const handleLike = (recommendationId: string) => {
    setLikedRecommendation(recommendationId);
    setDislikedRecommendation(null);
    likeRecommendation(recommendationId);
  };

  const handleDislike = (recommendationId: string) => {
    setDislikedRecommendation(recommendationId);
    setLikedRecommendation(null);
    dislikeRecommendation(recommendationId);
  };

  const handleViewRecommendation = (recommendationId: string) => {
    navigate(`/recommendations?recommendation=${recommendationId}`);
  };

  const handleViewAllRecommendations = () => {
    navigate('/recommendations');
  };

  const handleViewPriorityQuestions = () => {
    navigate('/priority-questions');
  };

  // État de chargement
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 h-96 max-w-md animate-pulse">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-purple-200 rounded"></div>
            <div className="h-6 bg-purple-200 rounded w-40"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-purple-200 rounded w-full"></div>
            <div className="h-4 bg-purple-200 rounded w-3/4"></div>
          </div>
          <div className="h-20 bg-purple-200 rounded"></div>
          <div className="h-8 bg-purple-200 rounded"></div>
        </div>
      </div>
    );
  }

  // État vide
  if (!topRecommendation) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 h-96 max-w-md hover:shadow-md transition-all duration-200">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Recommandation du Jour</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Lightbulb className="w-8 h-8 text-purple-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-700 mb-2">
            Aucune recommandation disponible
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            Complétez vos questions prioritaires pour recevoir des conseils personnalisés
          </p>
          <Button
            onClick={handleViewPriorityQuestions}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            Répondre aux Questions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 h-96 max-w-md hover:shadow-md transition-all duration-200">
      {/* En-tête avec points totaux */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Recommandation du Jour</h3>
        </div>
        <div className="flex items-center space-x-1 text-yellow-600">
          <Trophy className="w-5 h-5" />
          <span className="text-sm font-bold">
            {stats.total_received > 0 ? stats.total_received.toLocaleString() : '0'}
          </span>
        </div>
      </div>

      {/* Recommandation principale */}
      <div className="mb-4">
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{THEME_EMOJIS[topRecommendation.theme] || '💡'}</span>
              <span className={`text-xs font-medium ${PRIORITY_COLORS[topRecommendation.priority]}`}>
                {topRecommendation.priority === 'high' ? 'Haute' :
                 topRecommendation.priority === 'medium' ? 'Moyenne' : 'Basse'} priorité
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {topRecommendation.relevance_score}%
            </span>
          </div>
          
          <h4 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">
            {topRecommendation.title}
          </h4>
          
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {topRecommendation.description}
          </p>

          {topRecommendation.estimated_impact && (
            <div className="flex items-center space-x-1 mb-2">
              <Coins className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-800">
                {topRecommendation.estimated_impact}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleLike(topRecommendation.id)}
                className={`p-1 rounded transition-colors ${
                  likedRecommendation === topRecommendation.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="J'aime cette recommandation"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDislike(topRecommendation.id)}
                className={`p-1 rounded transition-colors ${
                  dislikedRecommendation === topRecommendation.id
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                }`}
                title="Je n'aime pas cette recommandation"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => handleViewRecommendation(topRecommendation.id)}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              En savoir plus
            </button>
          </div>
        </div>
      </div>

      {/* Section des défis */}
      <div className="mb-4">
        <button
          onClick={() => setIsChallengesExpanded(!isChallengesExpanded)}
          className="flex items-center justify-between w-full text-left hover:bg-purple-100 rounded-lg p-2 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-800">
              Défis en Cours ({upcomingChallenges.length})
            </span>
          </div>
          {isChallengesExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isChallengesExpanded ? 'max-h-96' : 'max-h-0'
        }`}>
          <div className="space-y-2 mt-2">
            {upcomingChallenges.length > 0 ? (
              upcomingChallenges.map((challenge) => {
                const timeRemaining = Math.ceil((challenge.end_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const progressColor = challenge.progress >= 70 ? 'bg-green-500' : 
                                    challenge.progress >= 30 ? 'bg-yellow-500' : 'bg-red-500';
                
                return (
                  <div key={challenge.id} className="bg-white rounded-lg p-2 border border-purple-100">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-xs font-medium text-gray-800 truncate">
                        {challenge.challenge.title}
                      </h5>
                      <div className="flex items-center space-x-1 text-yellow-600">
                        <Trophy className="w-3 h-3" />
                        <span className="text-xs font-bold">
                          {challenge.challenge.points_reward.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
                          style={{ width: `${Math.min(100, Math.max(0, challenge.progress))}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 min-w-0">
                        {challenge.progress}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {timeRemaining} jour{timeRemaining > 1 ? 's' : ''} restant{timeRemaining > 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-xs">Gagnez {challenge.challenge.points_reward.toLocaleString()} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Aucun défi actif</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bouton d'action principal */}
      <Button
        onClick={handleViewAllRecommendations}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm py-2"
      >
        Voir Toutes les Recommandations
      </Button>
    </div>
  );
};

export default RecommendationWidget;
