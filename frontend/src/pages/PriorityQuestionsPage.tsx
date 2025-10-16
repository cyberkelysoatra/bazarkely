import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Target, 
  TrendingUp, 
  Users, 
  Wallet, 
  PiggyBank, 
  BookOpen, 
  Smartphone, 
  CreditCard,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import apiService from '../services/apiService';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

// TypeScript interfaces
interface AnswerOption {
  id: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Question {
  id: string;
  title: string;
  description: string;
  options: AnswerOption[];
}

const PriorityQuestionsPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAppStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Priority questions with Madagascar-specific context
  const questions: Question[] = [
    {
      id: 'financial_goals_short',
      title: 'Objectifs financiers à court terme',
      description: 'Quel est votre principal objectif financier pour les 6 prochains mois ?',
      options: [
        { id: 'emergency_fund', text: 'Créer un fonds d\'urgence', icon: PiggyBank },
        { id: 'debt_payment', text: 'Rembourser des dettes', icon: CreditCard },
        { id: 'daily_expenses', text: 'Équilibrer les dépenses quotidiennes', icon: Wallet },
        { id: 'small_purchase', text: 'Financer un achat important', icon: Target }
      ]
    },
    {
      id: 'financial_goals_long',
      title: 'Objectifs financiers à long terme',
      description: 'Quel est votre objectif financier principal pour les 2-5 prochaines années ?',
      options: [
        { id: 'house_purchase', text: 'Acheter une maison', icon: Target },
        { id: 'education_fund', text: 'Financer l\'éducation des enfants', icon: BookOpen },
        { id: 'business_start', text: 'Créer une entreprise', icon: TrendingUp },
        { id: 'retirement', text: 'Préparer la retraite', icon: PiggyBank }
      ]
    },
    {
      id: 'spending_habits',
      title: 'Habitudes de dépenses',
      description: 'Comment décririez-vous vos habitudes de dépenses ?',
      options: [
        { id: 'planned', text: 'Très planifiées et réfléchies', icon: Target },
        { id: 'mostly_planned', text: 'Généralement planifiées', icon: Wallet },
        { id: 'mixed', text: 'Un mélange de planifié et d\'impulsif', icon: TrendingUp },
        { id: 'impulsive', text: 'Souvent impulsives', icon: CreditCard }
      ]
    },
    {
      id: 'income_type',
      title: 'Type de revenus',
      description: 'Quel type de revenus avez-vous ?',
      options: [
        { id: 'fixed_salary', text: 'Salaire fixe mensuel', icon: Wallet },
        { id: 'variable_salary', text: 'Salaire variable', icon: TrendingUp },
        { id: 'business_income', text: 'Revenus d\'entreprise', icon: Target },
        { id: 'multiple_sources', text: 'Plusieurs sources de revenus', icon: PiggyBank }
      ]
    },
    {
      id: 'monthly_income',
      title: 'Revenus mensuels',
      description: 'Quelle est votre fourchette de revenus mensuels en Ariary ?',
      options: [
        { id: 'under_500k', text: 'Moins de 500 000 Ar', icon: Wallet },
        { id: '500k_1m', text: '500 000 - 1 000 000 Ar', icon: TrendingUp },
        { id: '1m_2m', text: '1 000 000 - 2 000 000 Ar', icon: Target },
        { id: 'over_2m', text: 'Plus de 2 000 000 Ar', icon: PiggyBank }
      ]
    },
    {
      id: 'family_situation',
      title: 'Situation familiale',
      description: 'Combien de personnes dépendez de vos revenus ?',
      options: [
        { id: 'just_me', text: 'Moi seul(e)', icon: Users },
        { id: 'couple', text: 'Couple (2 personnes)', icon: Users },
        { id: 'small_family', text: 'Petite famille (3-4 personnes)', icon: Users },
        { id: 'large_family', text: 'Grande famille (5+ personnes)', icon: Users }
      ]
    },
    {
      id: 'savings_priority',
      title: 'Priorité d\'épargne',
      description: 'Quelle importance accordez-vous à l\'épargne ?',
      options: [
        { id: 'low', text: 'Faible priorité', icon: Wallet },
        { id: 'medium', text: 'Priorité modérée', icon: TrendingUp },
        { id: 'high', text: 'Haute priorité', icon: Target },
        { id: 'critical', text: 'Priorité absolue', icon: PiggyBank }
      ]
    },
    {
      id: 'budget_flexibility',
      title: 'Flexibilité budgétaire',
      description: 'Comment gérez-vous votre budget ?',
      options: [
        { id: 'strict', text: 'Budget très strict', icon: Target },
        { id: 'moderate', text: 'Budget modéré', icon: Wallet },
        { id: 'flexible', text: 'Budget flexible', icon: TrendingUp },
        { id: 'no_budget', text: 'Pas de budget défini', icon: CreditCard }
      ]
    },
    {
      id: 'financial_education',
      title: 'Niveau d\'éducation financière',
      description: 'Comment évaluez-vous vos connaissances financières ?',
      options: [
        { id: 'beginner', text: 'Débutant', icon: BookOpen },
        { id: 'intermediate', text: 'Intermédiaire', icon: TrendingUp },
        { id: 'advanced', text: 'Avancé', icon: Target },
        { id: 'expert', text: 'Expert', icon: PiggyBank }
      ]
    },
    {
      id: 'mobile_money_usage',
      title: 'Utilisation du Mobile Money',
      description: 'À quelle fréquence utilisez-vous les services Mobile Money ?',
      options: [
        { id: 'daily', text: 'Quotidiennement', icon: Smartphone },
        { id: 'weekly', text: 'Hebdomadairement', icon: Smartphone },
        { id: 'monthly', text: 'Mensuellement', icon: Smartphone },
        { id: 'rarely', text: 'Rarement', icon: Wallet }
      ]
    }
  ];

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const hasAnswer = selectedAnswers[currentQuestion.id] !== undefined;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answerId
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrevious = () => {
    if (isFirstQuestion) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentQuestionIndex(prev => prev - 1);
      setIsTransitioning(false);
    }, 300);
  };

  const handleComplete = async () => {
    try {
      if (!user) {
        toast.error('Utilisateur non connecté. Veuillez vous reconnecter.');
        return;
      }

      // Préparer les nouvelles préférences avec les réponses du questionnaire
      const updatedPreferences = {
        ...user.preferences,
        priorityAnswers: selectedAnswers
      };

      console.log('💾 Sauvegarde des réponses du questionnaire vers Supabase...', {
        userId: user.id,
        priorityAnswers: selectedAnswers
      });

      // Appel API pour sauvegarder en base de données Supabase
      const result = await apiService.updateUserPreferences(user.id, updatedPreferences);

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde en base de données');
      }

      // Mettre à jour le store local avec les données retournées par Supabase
      if (result.data) {
        setUser(result.data);
        console.log('✅ Préférences sauvegardées et store local mis à jour');
      }

      // Afficher le message de succès
      toast.success('Vos préférences ont été sauvegardées avec succès !', {
        duration: 4000,
        icon: '✅'
      });

      // Naviguer vers le dashboard après un délai
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des préférences:', error);
      
      // Message d'erreur détaillé
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur lors de la sauvegarde. Veuillez réessayer.';
      
      toast.error(errorMessage, {
        duration: 5000,
        icon: '❌'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Questions de Priorité
                </h1>
                <p className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} sur {questions.length}
                </p>
              </div>
            </div>

            <div className="w-10"></div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progression</span>
            <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="px-4">
        <div className="max-w-2xl mx-auto">
          <div 
            className={`transition-all duration-300 ease-in-out ${
              isTransitioning ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'
            }`}
          >
            {/* Question Header */}
            <Card className="mb-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentQuestion.title}
                </h2>
                <p className="text-gray-600 text-lg">
                  {currentQuestion.description}
                </p>
              </div>
            </Card>

            {/* Answer Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswers[currentQuestion.id] === option.id;
                const IconComponent = option.icon;
                
                return (
                  <Card
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                      isSelected 
                        ? 'border-2 border-blue-600 bg-blue-50 shadow-lg scale-105' 
                        : 'border border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="p-6 text-center">
                      <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <p className={`font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {option.text}
                      </p>
                      {isSelected && (
                        <div className="mt-2">
                          <CheckCircle className="w-5 h-5 text-blue-600 mx-auto" />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex space-x-4">
              <Button
                variant="secondary"
                onClick={handlePrevious}
                disabled={isFirstQuestion}
                className="flex-1"
                icon={ChevronLeft}
              >
                Précédent
              </Button>
              
              {isLastQuestion ? (
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  disabled={!hasAnswer}
                  className="flex-1"
                  icon={CheckCircle}
                >
                  Terminer
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={!hasAnswer}
                  className="flex-1"
                  icon={ChevronRight}
                >
                  Suivant
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriorityQuestionsPage;