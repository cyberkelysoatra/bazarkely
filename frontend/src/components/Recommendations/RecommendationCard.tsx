/**
 * RecommendationCard Component - BazarKELY
 * Composant de carte pour afficher les recommandations financières
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import * as React from 'react';
import { useState } from 'react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  X, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle,
  Coins
} from 'lucide-react';
import Card from '../UI/Card';
import type { Recommendation } from '../../services/recommendationEngineService';

/**
 * Interface des props pour RecommendationCard
 */
export interface RecommendationCardProps {
  readonly recommendation: Recommendation;
  readonly onLike: (id: string) => void;
  readonly onDislike: (id: string) => void;
  readonly onDismiss: (id: string) => void;
  readonly showActions?: boolean;
}

/**
 * Mapping des thèmes vers les emojis et labels français
 */
const THEME_MAPPING: Record<string, { emoji: string; label: string }> = {
  savings: { emoji: '💰', label: 'Épargne' },
  expense_reduction: { emoji: '📉', label: 'Réduction' },
  budget_optimization: { emoji: '📊', label: 'Budget' },
  education: { emoji: '📚', label: 'Éducation' },
  mobile_money: { emoji: '📱', label: 'Mobile Money' }
};

/**
 * Mapping des priorités vers les couleurs de bordure
 */
const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-red-500',
  medium: 'border-orange-500',
  low: 'border-blue-500'
};

/**
 * Fonction utilitaire pour formater le temps relatif
 */
const timeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  } else if (diffInHours > 0) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  } else {
    return 'Il y a quelques minutes';
  }
};

/**
 * Composant RecommendationCard
 */
const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onLike,
  onDislike,
  onDismiss,
  showActions = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

  const themeInfo = THEME_MAPPING[recommendation.theme] || { emoji: '💡', label: 'Conseil' };
  const priorityColor = PRIORITY_COLORS[recommendation.priority] || 'border-gray-500';
  const isHighScore = recommendation.relevance_score >= 80;

  const handleLike = () => {
    if (!isDisliked) {
      setIsLiked(!isLiked);
      onLike(recommendation.id);
    }
  };

  const handleDislike = () => {
    if (!isLiked) {
      setIsDisliked(!isDisliked);
      onDislike(recommendation.id);
    }
  };

  const handleDismiss = () => {
    if (window.confirm('Êtes-vous sûr de vouloir ignorer cette recommandation ?')) {
      onDismiss(recommendation.id);
    }
  };

  return (
    <Card className={`border-l-4 ${priorityColor} hover:scale-105 hover:shadow-lg transition-all duration-200 group`}>
      <div className="p-6">
        {/* En-tête avec badge de thème et score */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">{themeInfo.emoji}</span>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                {themeInfo.label}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
              {recommendation.title}
            </h3>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {isHighScore && (
              <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {recommendation.relevance_score}%
              </div>
            )}
            <span className="text-xs text-gray-500">
              {timeAgo(recommendation.created_at)}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-700 mb-4 leading-relaxed">
          {recommendation.description}
        </p>

        {/* Impact estimé */}
        {recommendation.estimated_impact && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-green-800">
                {recommendation.estimated_impact}
              </span>
            </div>
          </div>
        )}

        {/* Étapes d'action expandables */}
        {recommendation.actionable_steps.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors group"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Masquer les étapes' : 'Afficher les étapes'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 transition-transform duration-200" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform duration-200" />
              )}
              <span>Étapes d'action ({recommendation.actionable_steps.length})</span>
            </button>
            
            {isExpanded && (
              <div className="mt-3 space-y-2 animate-fadeIn">
                {recommendation.actionable_steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLike}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isLiked 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title="J'aime cette recommandation"
                aria-label="J'aime cette recommandation"
              >
                <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleDislike}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isDisliked 
                    ? 'text-red-600 bg-red-50' 
                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                }`}
                title="Je n'aime pas cette recommandation"
                aria-label="Je n'aime pas cette recommandation"
              >
                <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
              </button>
            </div>
            
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
              title="Ignorer cette recommandation"
              aria-label="Ignorer cette recommandation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecommendationCard;

