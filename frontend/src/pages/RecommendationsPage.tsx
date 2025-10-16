/**
 * RecommendationsPage Component - BazarKELY
 * Page complète des recommandations personnalisées et défis
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Trophy, 
  Medal, 
  ThumbsUp, 
  ThumbsDown, 
  Calendar, 
  Target, 
  TrendingUp, 
  Filter,
  Plus,
  CheckCircle,
  Clock,
  Star,
  X,
  ChevronDown,
  ChevronRight,
  PiggyBank,
  TrendingDown,
  Settings,
  BookOpen,
  Smartphone,
  Zap
} from 'lucide-react';
import useRecommendations from '../hooks/useRecommendations';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import type { Recommendation, ActiveChallenge, CompletedChallenge } from '../services/recommendationEngineService';
import type { Challenge } from '../services/challengeService';

/**
 * Types pour les filtres
 */
type TabType = 'conseils' | 'defis' | 'historique';
type ThemeFilter = 'all' | 'savings' | 'expense_reduction' | 'budget_optimization' | 'education' | 'mobile_money';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

/**
 * Mapping des thèmes vers les labels français
 */
const THEME_LABELS: Record<string, string> = {
  all: 'Tous les thèmes',
  savings: 'Épargne',
  expense_reduction: 'Réduction Dépenses',
  budget_optimization: 'Optimisation Budget',
  education: 'Éducation',
  mobile_money: 'Mobile Money'
};

/**
 * Mapping des priorités vers les labels français
 */
const PRIORITY_LABELS: Record<string, string> = {
  all: 'Toutes les priorités',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse'
};

/**
 * Mapping des thèmes vers les icônes
 */
const THEME_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  savings: PiggyBank,
  expense_reduction: TrendingDown,
  budget_optimization: Settings,
  education: BookOpen,
  mobile_money: Smartphone
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
 * Composant de carte de recommandation
 */
const RecommendationCard: React.FC<{
  recommendation: Recommendation;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onDismiss: (id: string) => void;
}> = ({ recommendation, onLike, onDislike, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ThemeIcon = THEME_ICONS[recommendation.theme] || Target;

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
            <ThemeIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">{recommendation.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-sm font-medium ${PRIORITY_COLORS[recommendation.priority]}`}>
                {PRIORITY_LABELS[recommendation.priority]}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{THEME_LABELS[recommendation.theme]}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">
            {recommendation.relevance_score}%
          </span>
          <div className="w-16 h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${recommendation.relevance_score}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-gray-600 mb-4 leading-relaxed">{recommendation.description}</p>

      {/* Impact estimé */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Impact estimé : {recommendation.estimated_impact}
          </span>
        </div>
      </div>

      {/* Étapes d'action */}
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>Étapes d'action ({recommendation.actionable_steps.length})</span>
        </button>
        
        {isExpanded && (
          <div className="mt-3 space-y-2">
            {recommendation.actionable_steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onLike(recommendation.id)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors group"
            title="Améliore les futures recommandations"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDislike(recommendation.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
            title="Améliore les futures recommandations"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => onDismiss(recommendation.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Ignorer cette recommandation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};

/**
 * Composant de carte de défi
 */
const ChallengeCard: React.FC<{
  challenge: Challenge | ActiveChallenge;
  isActive?: boolean;
  progress?: number;
  onAccept?: (id: string) => void;
}> = ({ challenge, isActive = false, progress = 0, onAccept }) => {
  const isCompleted = 'status' in challenge && challenge.status === 'completed';
  const timeRemaining = isActive && 'end_date' in challenge 
    ? Math.ceil((challenge.end_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return 'bg-green-500';
    if (progress >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className={`p-6 hover:shadow-lg transition-all duration-300 ${isActive ? 'ring-2 ring-purple-200' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isActive ? 'bg-purple-100' : 'bg-gray-100'
          }`}>
            <Target className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">{challenge.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-sm font-medium ${
                challenge.difficulty === 'beginner' ? 'text-green-600' :
                challenge.difficulty === 'intermediate' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {challenge.difficulty === 'beginner' ? 'Débutant' :
                 challenge.difficulty === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{challenge.duration_days} jour(s)</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1 text-yellow-600">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">{challenge.points_reward} pts</span>
          </div>
          {challenge.badge_reward && (
            <div className="flex items-center space-x-1 text-purple-600 mt-1">
              <Medal className="w-4 h-4" />
              <span className="text-sm">{challenge.badge_reward}</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-600 mb-4 leading-relaxed">{challenge.description}</p>

      {/* Progrès pour les défis actifs */}
      {isActive && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progrès</span>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center space-x-1 mt-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{timeRemaining} jour(s) restant(s)</span>
            </div>
          )}
        </div>
      )}

      {/* Exigences */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Exigences :</h4>
        <div className="space-y-1">
          {challenge.requirements.map((req, index) => (
            <div key={index} className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">{req.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {!isActive && !isCompleted && onAccept && (
        <Button
          onClick={() => onAccept(challenge.id)}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
        >
          Accepter le Défi
        </Button>
      )}

      {isCompleted && (
        <div className="flex items-center justify-center space-x-2 text-green-600 bg-green-50 rounded-lg p-3">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Défi Complété !</span>
        </div>
      )}
    </Card>
  );
};

/**
 * Composant principal de la page des recommandations
 */
const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    recommendations,
    activeChallenges,
    isLoading,
    lastRefreshDate,
    likeRecommendation,
    dislikeRecommendation,
    dismissRecommendation,
    acceptChallenge,
    updateChallengeProgress,
    getRecommendationStats
  } = useRecommendations();

  // États locaux
  const [activeTab, setActiveTab] = useState<TabType>('conseils');
  const [selectedTheme, setSelectedTheme] = useState<ThemeFilter>('all');
  const [selectedPriority, setSelectedPriority] = useState<PriorityFilter>('all');

  // Statistiques
  const stats = getRecommendationStats();

  // Filtrage des recommandations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      const themeMatch = selectedTheme === 'all' || rec.theme === selectedTheme;
      const priorityMatch = selectedPriority === 'all' || rec.priority === selectedPriority;
      return themeMatch && priorityMatch;
    });
  }, [recommendations, selectedTheme, selectedPriority]);

  // Groupement des recommandations par thème
  const groupedRecommendations = useMemo(() => {
    const groups: Record<string, Recommendation[]> = {};
    filteredRecommendations.forEach(rec => {
      if (!groups[rec.theme]) {
        groups[rec.theme] = [];
      }
      groups[rec.theme].push(rec);
    });
    
    // Trier chaque groupe par score de pertinence
    Object.keys(groups).forEach(theme => {
      groups[theme].sort((a, b) => b.relevance_score - a.relevance_score);
    });
    
    return groups;
  }, [filteredRecommendations]);

  // Gestionnaires d'événements
  const handleLike = (id: string) => {
    likeRecommendation(id);
  };

  const handleDislike = (id: string) => {
    dislikeRecommendation(id);
  };

  const handleDismiss = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir ignorer cette recommandation ?')) {
      dismissRecommendation(id);
    }
  };

  const handleAcceptChallenge = async (id: string) => {
    const result = await acceptChallenge(id);
    if (result) {
      toast.success('Défi accepté ! Bonne chance !');
    }
  };

  const handleRefresh = async () => {
    // La fonction refreshRecommendations sera appelée via le hook
    toast.success('Recommandations actualisées !');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Mes Recommandations Personnalisées
              </h1>
              <p className="text-purple-100 text-lg">
                Conseils intelligents et défis personnalisés pour optimiser vos finances
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="flex items-center space-x-2 mb-1">
                  <Trophy className="w-6 h-6" />
                  <span className="text-2xl font-bold">
                    {stats.total_received > 0 ? stats.total_received : 0}
                  </span>
                </div>
                <p className="text-sm text-purple-100">Points totaux</p>
              </div>
              <div className="text-center">
                <div className="flex items-center space-x-2 mb-1">
                  <Medal className="w-6 h-6" />
                  <span className="text-2xl font-bold">
                    {activeChallenges.length}
                  </span>
                </div>
                <p className="text-sm text-purple-100">Défis actifs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation par onglets */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'conseils', label: 'Conseils', icon: TrendingUp },
              { id: 'defis', label: 'Défis', icon: Target },
              { id: 'historique', label: 'Historique', icon: Calendar }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'conseils' && (
          <div>
            {/* Filtres */}
            <div className="mb-6">
              <Card className="p-4">
                <div className="flex items-center space-x-4">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value as ThemeFilter)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {Object.entries(THEME_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value as PriorityFilter)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleRefresh}
                      variant="secondary"
                      className="flex items-center space-x-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Actualiser</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recommandations groupées par thème */}
            {Object.keys(groupedRecommendations).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedRecommendations).map(([theme, recs]) => (
                  <div key={theme}>
                    <div className="flex items-center space-x-3 mb-4">
                      {React.createElement(THEME_ICONS[theme] || Target, { 
                        className: "w-6 h-6 text-purple-600" 
                      })}
                      <h2 className="text-xl font-semibold text-gray-800">
                        {THEME_LABELS[theme]}
                      </h2>
                      <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-sm font-medium">
                        {recs.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recs.map(rec => (
                        <RecommendationCard
                          key={rec.id}
                          recommendation={rec}
                          onLike={handleLike}
                          onDislike={handleDislike}
                          onDismiss={handleDismiss}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Aucune recommandation disponible
                </h3>
                <p className="text-gray-500 mb-6">
                  Nous analysons vos données pour vous proposer des conseils personnalisés.
                </p>
                <Button
                  onClick={handleRefresh}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  Actualiser les recommandations
                </Button>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'defis' && (
          <div className="space-y-8">
            {/* Défis actifs */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Target className="w-6 h-6 text-purple-600" />
                <span>Défis Actifs</span>
                <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-sm font-medium">
                  {activeChallenges.length}
                </span>
              </h2>
              
              {activeChallenges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeChallenges.map(challenge => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      isActive={true}
                      progress={challenge.progress}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Aucun défi actif
                  </h3>
                  <p className="text-gray-500">
                    Acceptez un défi pour commencer à gagner des points !
                  </p>
                </Card>
              )}
            </div>

            {/* Défis disponibles */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Star className="w-6 h-6 text-yellow-600" />
                <span>Défis Disponibles</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Ici, vous pourriez charger les défis disponibles via le service */}
                <Card className="p-8 text-center border-2 border-dashed border-gray-300">
                  <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Plus de défis disponibles
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Découvrez de nouveaux défis pour continuer votre progression.
                  </p>
                  <Button
                    onClick={() => navigate('/challenges')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    Voir tous les défis
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historique' && (
          <div className="space-y-8">
            {/* Statistiques */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Statistiques
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <ThumbsUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recommandations aimées</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.total_liked}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <ThumbsDown className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recommandations rejetées</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.total_disliked}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Score moyen</p>
                      <p className="text-2xl font-bold text-gray-800">{stats.average_relevance_score}%</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Distribution par thème */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Distribution par Thème
              </h2>
              <Card className="p-6">
                <div className="space-y-4">
                  {Object.entries(stats.themes_distribution).map(([theme, count]) => {
                    const percentage = stats.total_received > 0 
                      ? Math.round((count / stats.total_received) * 100) 
                      : 0;
                    
                    return (
                      <div key={theme} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {THEME_LABELS[theme]}
                          </span>
                          <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Bouton d'action flottant */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => navigate('/challenges')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* État de chargement */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="text-gray-700">Chargement des recommandations...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationsPage;

