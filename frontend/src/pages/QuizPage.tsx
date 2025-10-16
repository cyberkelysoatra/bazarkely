import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCertificationStore } from '../store/certificationStore';
import { questionsByLevel } from '../data/certificationQuestions';
import { updateQuestionAttempt, calculateResponseTimeBonus } from '../services/certificationService';
import { Clock, Pause, Play, X, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import type { CertificationQuestion } from '../types/certification';

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

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const level = parseInt(searchParams.get('level') || '1');
  const { currentLevel, completeQuizSession } = useCertificationStore();
  
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CertificationQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  // Initialize quiz session
  useEffect(() => {
    if (level >= 1 && level <= 5) {
      const questions = questionsByLevel[level as keyof typeof questionsByLevel];
      const questionIds = questions.map(q => q.id);
      
      const newSession: QuizSession = {
        level,
        questionIds,
        currentIndex: 0,
        startTime: Date.now(),
        answers: []
      };
      
      setSession(newSession);
      setCurrentQuestion(questions[0]);
      setTimeLeft(questions[0].timeLimit);
      setQuestionStartTime(Date.now());
    }
  }, [level]);

  // Timer effect
  useEffect(() => {
    if (!session || !currentQuestion || isPaused || showExplanation) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto-submit
          handleAnswerSubmit(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, currentQuestion, isPaused, showExplanation]);

  const handleAnswerSelect = useCallback((optionId: string) => {
    if (selectedOption || showExplanation) return;
    setSelectedOption(optionId);
  }, [selectedOption, showExplanation]);

  const handleAnswerSubmit = useCallback((optionId: string | null) => {
    if (!session || !currentQuestion) return;

    const timeElapsed = Date.now() - questionStartTime;
    const timeBonus = calculateResponseTimeBonus(timeElapsed, currentQuestion.timeLimit * 1000);
    const isCorrect = optionId ? currentQuestion.options.find(opt => opt.id === optionId)?.isCorrect || false : false;

    const answer = {
      questionId: currentQuestion.id,
      selectedOption: optionId || '',
      isCorrect,
      timeElapsed,
      timeBonus
    };

    // Update question attempt in service
    updateQuestionAttempt(currentQuestion.id, optionId || '', timeElapsed, isCorrect);

    // Update session
    const newAnswers = [...session.answers, answer];
    setSession(prev => prev ? { ...prev, answers: newAnswers } : null);

    setShowExplanation(true);
  }, [session, currentQuestion, questionStartTime]);

  const handleNextQuestion = useCallback(() => {
    if (!session) return;

    const nextIndex = session.currentIndex + 1;
    
    if (nextIndex >= session.questionIds.length) {
      // Quiz completed
      completeQuizSession(session);
      navigate('/quiz-results', { state: { session } });
      return;
    }

    // Move to next question
    const questions = questionsByLevel[session.level as keyof typeof questionsByLevel];
    const nextQuestion = questions[nextIndex];
    
    setSession(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
    setCurrentQuestion(nextQuestion);
    setTimeLeft(nextQuestion.timeLimit);
    setQuestionStartTime(Date.now());
    setSelectedOption(null);
    setShowExplanation(false);
  }, [session, completeQuizSession, navigate]);

  const handlePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleQuit = useCallback(() => {
    if (window.confirm('Êtes-vous sûr de vouloir quitter le quiz ? Vos réponses seront sauvegardées.')) {
      if (session) {
        completeQuizSession(session);
      }
      navigate('/certification');
    }
  }, [session, completeQuizSession, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 10) return 'text-red-500';
    if (timeLeft <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (!session || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  const progress = ((session.currentIndex + 1) / session.questionIds.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleQuit}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
                <span>Quitter</span>
              </button>
              
              <div className="h-6 w-px bg-gray-300"></div>
              
              <h1 className="text-xl font-semibold text-gray-900">
                Quiz Niveau {level}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Timer */}
              <div className={`flex items-center space-x-2 ${getTimeColor()}`}>
                <Clock className="w-5 h-5" />
                <span className="font-mono text-lg font-semibold">
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Pause/Play */}
              <button
                onClick={handlePause}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span>{isPaused ? 'Reprendre' : 'Pause'}</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Question {session.currentIndex + 1} sur {session.questionIds.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              {currentQuestion.text}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                let optionStyle = "w-full p-4 text-left border-2 rounded-lg transition-all duration-200 hover:bg-gray-50";
                
                if (showExplanation) {
                  if (option.isCorrect) {
                    optionStyle += " border-green-500 bg-green-50 text-green-800";
                  } else if (selectedOption === option.id) {
                    optionStyle += " border-red-500 bg-red-50 text-red-800";
                  } else {
                    optionStyle += " border-gray-200 bg-gray-50 text-gray-600";
                  }
                } else if (selectedOption === option.id) {
                  optionStyle += " border-purple-500 bg-purple-50 text-purple-800";
                } else {
                  optionStyle += " border-gray-200 hover:border-purple-300";
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    disabled={showExplanation}
                    className={optionStyle}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        showExplanation 
                          ? option.isCorrect 
                            ? 'border-green-500 bg-green-500' 
                            : selectedOption === option.id 
                              ? 'border-red-500 bg-red-500'
                              : 'border-gray-300'
                          : selectedOption === option.id
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                      }`}>
                        {showExplanation && option.isCorrect && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                        {showExplanation && selectedOption === option.id && !option.isCorrect && (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                        {!showExplanation && selectedOption === option.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="font-medium">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Explication :</h3>
              <p className="text-blue-800">{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {!showExplanation && selectedOption && (
                <p>Cliquez sur "Valider" pour confirmer votre réponse</p>
              )}
            </div>

            <div className="flex space-x-4">
              {!showExplanation ? (
                <button
                  onClick={() => handleAnswerSubmit(selectedOption)}
                  disabled={!selectedOption}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Valider
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                >
                  <span>
                    {session.currentIndex + 1 >= session.questionIds.length ? 'Terminer' : 'Question suivante'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;