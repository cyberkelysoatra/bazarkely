import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCertificationStore } from '../store/certificationStore';
import { checkLevelUnlocked, getFailedQuestions } from '../services/certificationService';
import { 
  Trophy, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  ArrowLeft, 
  RotateCcw,
  Target,
  TrendingUp,
  Award
} from 'lucide-react';

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

const QuizResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLevel, startQuizSession } = useCertificationStore();
  
  const [session, setSession] = useState<QuizSession | null>(null);
  const [isLevelUnlocked, setIsLevelUnlocked] = useState(false);
  const [failedQuestions, setFailedQuestions] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    accuracy: 0,
    totalTimeBonus: 0,
    totalPoints: 0,
    averageTime: 0
  });

  useEffect(() => {
    if (location.state?.session) {
      const quizSession = location.state.session as QuizSession;
      setSession(quizSession);
      calculateStats(quizSession);
      checkLevelProgression(quizSession);
    } else {
      // Redirect if no session data
      navigate('/certification');
    }
  }, [location.state, navigate]);

  const calculateStats = (quizSession: QuizSession) => {
    const answers = quizSession.answers;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const totalQuestions = answers.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const totalTimeBonus = answers.reduce((sum, a) => sum + a.timeBonus, 0);
    const totalPoints = answers.reduce((sum, a) => sum + (a.isCorrect ? 1 : 0) + a.timeBonus, 0);
    const averageTime = answers.length > 0 ? answers.reduce((sum, a) => sum + a.timeElapsed, 0) / answers.length : 0;

    setStats({
      totalQuestions,
      correctAnswers,
      accuracy,
      totalTimeBonus,
      totalPoints,
      averageTime
    });
  };

  const checkLevelProgression = async (quizSession: QuizSession) => {
    const unlocked = await checkLevelUnlocked(quizSession.level);
    setIsLevelUnlocked(unlocked);
    
    const failed = await getFailedQuestions(quizSession.level);
    setFailedQuestions(failed);
  };

  const handleRetryFailed = () => {
    if (session && failedQuestions.length > 0) {
      // Start new quiz session with only failed questions
      const retrySession = {
        level: session.level,
        questionIds: failedQuestions,
        currentIndex: 0,
        startTime: Date.now(),
        answers: []
      };
      
      startQuizSession(retrySession);
      navigate('/quiz', { state: { session: retrySession } });
    }
  };

  const handleRetakeLevel = () => {
    if (session) {
      // Start new quiz session with all level questions
      const retakeSession = {
        level: session.level,
        questionIds: session.questionIds,
        currentIndex: 0,
        startTime: Date.now(),
        answers: []
      };
      
      startQuizSession(retakeSession);
      navigate('/quiz', { state: { session: retakeSession } });
    }
  };

  const handleNextLevel = () => {
    if (session && isLevelUnlocked && session.level < 5) {
      const nextLevel = session.level + 1;
      navigate('/quiz', { search: `?level=${nextLevel}` });
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 90) return <Trophy className="w-6 h-6 text-green-600" />;
    if (accuracy >= 70) return <Target className="w-6 h-6 text-yellow-600" />;
    return <XCircle className="w-6 h-6 text-red-600" />;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/certification')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour à la certification</span>
            </button>
            
            <h1 className="text-xl font-semibold text-gray-900">
              Résultats du Quiz Niveau {session.level}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Results Summary */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {getAccuracyIcon(stats.accuracy)}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {stats.accuracy >= 90 ? 'Excellent !' : stats.accuracy >= 70 ? 'Bien joué !' : 'Continuez vos efforts !'}
            </h2>
            <p className={`text-2xl font-semibold ${getAccuracyColor(stats.accuracy)}`}>
              {stats.accuracy.toFixed(1)}% de réussite
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.correctAnswers}</div>
              <div className="text-sm text-green-700">Bonnes réponses</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{stats.totalQuestions - stats.correctAnswers}</div>
              <div className="text-sm text-red-700">Mauvaises réponses</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{formatTime(stats.averageTime)}</div>
              <div className="text-sm text-blue-700">Temps moyen</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{stats.totalTimeBonus}</div>
              <div className="text-sm text-purple-700">Bonus vitesse</div>
            </div>
          </div>

          {/* Level Progression */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Progression du niveau
            </h3>
            
            {isLevelUnlocked ? (
              <div className="flex items-center space-x-3 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Félicitations !</p>
                  <p>Vous avez débloqué le niveau {session.level + 1} avec {stats.accuracy.toFixed(1)}% de réussite.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-yellow-600">
                <Target className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Presque là !</p>
                  <p>Vous devez atteindre 90% de réussite pour débloquer le niveau suivant.</p>
                  <p className="text-sm mt-1">Vous avez {stats.accuracy.toFixed(1)}% - il vous manque {(90 - stats.accuracy).toFixed(1)}%.</p>
                </div>
              </div>
            )}
          </div>

          {/* Failed Questions */}
          {failedQuestions.length > 0 && (
            <div className="bg-red-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                Questions à revoir
              </h3>
              <p className="text-red-700 mb-4">
                Vous avez {failedQuestions.length} question(s) incorrecte(s) à revoir.
              </p>
              <button
                onClick={handleRetryFailed}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Revoir les questions incorrectes</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {failedQuestions.length > 0 && (
            <button
              onClick={handleRetryFailed}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Revoir les échecs</span>
            </button>
          )}
          
          <button
            onClick={handleRetakeLevel}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Refaire le niveau</span>
          </button>
          
          {isLevelUnlocked && session.level < 5 && (
            <button
              onClick={handleNextLevel}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              <Award className="w-5 h-5" />
              <span>Niveau suivant</span>
            </button>
          )}
          
          <button
            onClick={() => navigate('/certification')}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à la certification</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResultsPage;
