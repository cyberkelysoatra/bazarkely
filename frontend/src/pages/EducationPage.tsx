import { useState } from 'react';
import { BookOpen, Trophy, Star, Clock, CheckCircle, ArrowRight } from 'lucide-react';

const EducationPage = () => {
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  // Données de démonstration
  const userStats = {
    level: 'bronze',
    points: 15,
    streak: 3,
    quizzesCompleted: 8,
    totalQuizzes: 25
  };

  const availableQuizzes = [
    {
      id: '1',
      title: 'Les bases du budget familial',
      description: 'Apprenez les principes fondamentaux de la gestion budgétaire',
      category: 'budget',
      difficulty: 'beginner',
      questions: 5,
      points: 3,
      completed: true,
      score: 80
    },
    {
      id: '2',
      title: 'Mobile Money à Madagascar',
      description: 'Comprenez les frais et avantages des services Mobile Money',
      category: 'mobile_money',
      difficulty: 'intermediate',
      questions: 7,
      points: 5,
      completed: false,
      score: null
    },
    {
      id: '3',
      title: 'Épargne et investissement',
      description: 'Découvrez les stratégies d\'épargne adaptées au contexte malgache',
      category: 'epargne',
      difficulty: 'advanced',
      questions: 10,
      points: 8,
      completed: false,
      score: null
    }
  ];

  const quizQuestions = {
    '1': [
      {
        id: 1,
        question: 'Quelle est la règle 50/30/20 ?',
        options: [
          '50% besoins, 30% envies, 20% épargne',
          '50% revenus, 30% dépenses, 20% économies',
          '50% logement, 30% alimentation, 20% transport',
          '50% fixe, 30% variable, 20% imprévu'
        ],
        correctAnswer: 0,
        explanation: 'La règle 50/30/20 recommande d\'allouer 50% du budget aux besoins essentiels, 30% aux envies et 20% à l\'épargne.'
      },
      {
        id: 2,
        question: 'Qu\'est-ce qu\'un fond d\'urgence ?',
        options: [
          'Un compte pour les vacances',
          'Une réserve de 3-6 mois de dépenses',
          'Un investissement à long terme',
          'Un prêt d\'urgence'
        ],
        correctAnswer: 1,
        explanation: 'Un fond d\'urgence est une réserve financière équivalente à 3-6 mois de dépenses pour faire face aux imprévus.'
      }
    ]
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'bronze': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'gold': return 'text-yellow-500 bg-yellow-100';
      case 'platinum': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'bronze': return 'Bronze';
      case 'silver': return 'Argent';
      case 'gold': return 'Or';
      case 'platinum': return 'Platine';
      default: return 'Débutant';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Débutant';
      case 'intermediate': return 'Intermédiaire';
      case 'advanced': return 'Avancé';
      default: return 'Non défini';
    }
  };

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const calculateScore = (quizId: string) => {
    const questions = quizQuestions[quizId as keyof typeof quizQuestions];
    if (!questions) return 0;

    let correct = 0;
    questions.forEach(question => {
      if (userAnswers[question.id] === question.correctAnswer) {
        correct++;
      }
    });

    return Math.round((correct / questions.length) * 100);
  };

  const startQuiz = (quizId: string) => {
    setSelectedQuiz(quizId);
    setUserAnswers({});
    setShowResults(false);
  };

  const submitQuiz = () => {
    setShowResults(true);
  };

  if (selectedQuiz && !showResults) {
    const questions = quizQuestions[selectedQuiz as keyof typeof quizQuestions] || [];
    const currentQuestion = questions[0]; // Pour la démo, on prend la première question

    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedQuiz(null)}
            className="text-primary-600 hover:text-primary-700"
          >
            ← Retour
          </button>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">Temps illimité</span>
          </div>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Question 1 sur {questions.length}
            </h2>
            <p className="text-gray-600">{currentQuestion.question}</p>
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                  userAnswers[currentQuestion.id] === index
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setSelectedQuiz(null)}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={submitQuiz}
              className="btn-primary"
            >
              Terminer le quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedQuiz && showResults) {
    const score = calculateScore(selectedQuiz);
    const quiz = availableQuizzes.find(q => q.id === selectedQuiz);

    return (
      <div className="p-4 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz terminé !</h2>
          <p className="text-gray-600 mb-4">Votre score : {score}%</p>
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {score >= 80 ? 'Excellent !' : score >= 60 ? 'Bien !' : 'Continuez !'}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Quiz :</span>
              <span className="font-medium">{quiz?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Score :</span>
              <span className="font-medium">{score}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Points gagnés :</span>
              <span className="font-medium text-green-600">+{quiz?.points}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setSelectedQuiz(null)}
          className="btn-primary w-full"
        >
          Retour aux quiz
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Éducation financière</h1>
        <p className="text-gray-600">Apprenez et testez vos connaissances</p>
      </div>

      {/* Statistiques utilisateur */}
      <div className="card-glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vos progrès</h3>
          <Trophy className="w-5 h-5 text-primary-600" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${getLevelColor(userStats.level)}`}>
              <span className="text-lg font-bold">{getLevelLabel(userStats.level).charAt(0)}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{getLevelLabel(userStats.level)}</p>
            <p className="text-xs text-gray-500">Niveau</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-primary-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">{userStats.points}</p>
            <p className="text-xs text-gray-500">Points</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Série actuelle</span>
            <span className="font-medium text-gray-900">{userStats.streak} jours</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Quiz complétés</span>
            <span className="font-medium text-gray-900">
              {userStats.quizzesCompleted} / {userStats.totalQuizzes}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full"
              style={{ width: `${(userStats.quizzesCompleted / userStats.totalQuizzes) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Quiz disponibles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Quiz disponibles</h3>
        
        {availableQuizzes.map((quiz) => (
          <div key={quiz.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{quiz.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{quiz.description}</p>
                
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                    {getDifficultyLabel(quiz.difficulty)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {quiz.questions} questions • {quiz.points} points
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                {quiz.completed ? (
                  <div className="text-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-green-600">{quiz.score}%</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Clock className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-500">Disponible</p>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => startQuiz(quiz.id)}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <span>{quiz.completed ? 'Refaire le quiz' : 'Commencer'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            console.log('Articles');
            // TODO: Implémenter la page des articles éducatifs
            console.log('ℹ️ Page des articles éducatifs en cours de développement');
          }}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Voir les articles éducatifs"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Articles</p>
        </button>

        <button 
          onClick={() => {
            console.log('Badges');
            // TODO: Implémenter la page des badges
            console.log('ℹ️ Page des badges en cours de développement');
          }}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-green-200"
          aria-label="Voir les badges obtenus"
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Badges</p>
        </button>
      </div>
    </div>
  );
};

export default EducationPage;
