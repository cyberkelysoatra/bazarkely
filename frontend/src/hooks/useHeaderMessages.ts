import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCertificationStore } from '../store/certificationStore';
import { useAppStore } from '../stores/appStore';
import apiService from '../services/apiService';
import { questions } from '../components/Quiz/QuizQuestionPopup';
import { level1Questions } from '../data/certificationQuestions';
import { Target, Brain, Lightbulb, BookOpen, Sparkles } from 'lucide-react';
import { useIsConstructionModule } from './useIsConstructionModule';

type MessageType = 'motivational' | 'priority_question' | 'quiz' | 'quiz_question' | 'quiz_progress' | 'priority-questionnaire';

export interface InteractiveMessage {
  text: string;
  type: MessageType;
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
  questionId?: string;
}

export interface UseHeaderMessagesReturn {
  messages: InteractiveMessage[];
  currentMessage: number;
  isVisible: boolean;
  showTooltip: boolean;
  setShowTooltip: (show: boolean) => void;
  showQuizPopup: boolean;
  setShowQuizPopup: (show: boolean) => void;
  currentQuizId: string;
  setCurrentQuizId: (id: string) => void;
  completedQuizIds: string[];
  setCompletedQuizIds: (ids: string[]) => void;
  isPriorityQuestionnaireBannerDismissed: boolean;
  handlePriorityQuestionnaireBannerDismiss: () => void;
}

// Quiz question configs
const QUIZ_QUESTIONS = [
  { text: "Coiffeur va où ?", id: 'hairdresser' },
  { text: "Abonnement salle ?", id: 'gym' },
  { text: "Netflix c'est quoi ?", id: 'netflix' },
  { text: "Maquillage = ?", id: 'makeup' },
  { text: "Cadeau famille ?", id: 'family-gift' },
  { text: "Fournitures scolaires ?", id: 'school-supplies' },
  { text: "Facture internet ?", id: 'internet' }
];

/**
 * Hook to manage interactive messages in Header banner
 * Handles message generation, cycling, and quiz/questionnaire states
 */
export function useHeaderMessages(): UseHeaderMessagesReturn {
  const navigate = useNavigate();
  const isConstructionModule = useIsConstructionModule();
  const { user } = useAppStore();
  const { currentLevel } = useCertificationStore();
  
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showQuizPopup, setShowQuizPopup] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string>('');
  const [completedQuizIds, setCompletedQuizIds] = useState<string[]>([]);
  const [isPriorityQuestionnaireBannerDismissed, setIsPriorityQuestionnaireBannerDismissed] = useState(false);
  const [hasBudgets, setHasBudgets] = useState(false);

  // Load completed quiz questions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bazarkely-quiz-questions-completed');
      if (stored) {
        const completed = JSON.parse(stored);
        setCompletedQuizIds(Array.isArray(completed) ? completed : []);
      }
    } catch (error) {
      console.error('Error loading completed quiz questions:', error);
      setCompletedQuizIds([]);
    }
  }, []);

  // Load priority questionnaire banner dismissal state
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bazarkely_priority_questionnaire_banner_dismissed');
      if (stored) {
        setIsPriorityQuestionnaireBannerDismissed(JSON.parse(stored) === true);
      }
    } catch (error) {
      console.error('Error loading banner dismissal state:', error);
      setIsPriorityQuestionnaireBannerDismissed(false);
    }
  }, []);

  // Check if user has budgets
  useEffect(() => {
    if (isConstructionModule || !user?.id) {
      setHasBudgets(false);
      return;
    }
    
    const checkUserBudgets = async () => {
      try {
        const budgets = await apiService.getBudgets();
        setHasBudgets(Boolean(budgets.success && budgets.data && budgets.data.length > 0));
      } catch (error) {
        console.error('Error checking user budgets:', error);
        setHasBudgets(false);
      }
    };
    
    checkUserBudgets();
  }, [user?.id, isConstructionModule]);

  const hasCompletedPriorityQuestions = useMemo(() => 
    Boolean(user?.preferences?.priorityAnswers && Object.keys(user.preferences.priorityAnswers).length > 0),
    [user?.preferences?.priorityAnswers]
  );

  const baseMessages: InteractiveMessage[] = useMemo(() => [
    {
      text: "Gérez votre budget familial en toute simplicité",
      type: 'motivational',
      action: () => { setShowTooltip(true); setTimeout(() => setShowTooltip(false), 2000); },
      icon: Lightbulb
    },
    {
      text: "Chaque économie compte pour votre avenir",
      type: 'motivational',
      action: () => { setShowTooltip(true); setTimeout(() => setShowTooltip(false), 2000); },
      icon: Lightbulb
    }
  ], []);

  const priorityQuestionMessage: InteractiveMessage = useMemo(() => ({
    text: "Définissez vos priorités financières",
    type: 'priority_question' as MessageType,
    action: () => navigate('/priority-questions'),
    icon: Target
  }), [navigate]);

  const quizMessage: InteractiveMessage = useMemo(() => ({
    text: "Testez vos connaissances financières",
    type: 'quiz',
    action: () => {
      const financialQuizQuestions = questions.filter(q => q.id.startsWith('quiz-financial-'));
      const unansweredFinancial = financialQuizQuestions.find(q => !completedQuizIds.includes(q.id));
      if (unansweredFinancial) {
        setCurrentQuizId(unansweredFinancial.id);
        setShowQuizPopup(true);
        console.log('🎯 Opening financial quiz question:', unansweredFinancial.id);
      } else {
        console.log('✅ All financial quiz questions completed!');
      }
    },
    icon: Brain
  }), [completedQuizIds]);

  const quizQuestionMessages: InteractiveMessage[] = useMemo(() => 
    QUIZ_QUESTIONS.map(({ text, id }) => ({
      text,
      type: 'quiz_question' as MessageType,
      action: () => { setCurrentQuizId(id); setShowQuizPopup(true); },
      icon: Brain,
      questionId: id
    })),
    []
  );

  const allFinancialQuizCompleted = useMemo(() => {
    const financialQuizQuestions = questions.filter(q => q.id.startsWith('quiz-financial-'));
    return financialQuizQuestions.every(q => completedQuizIds.includes(q.id));
  }, [completedQuizIds]);

  const quizProgress = useMemo(() => {
    const level1CompletedQuestions = completedQuizIds.filter(id => id.startsWith('cert-level1-'));
    const completedCount = level1CompletedQuestions.length;
    return {
      completed: completedCount,
      total: level1Questions.length,
      text: `Quiz Niveau ${currentLevel}: ${completedCount}/${level1Questions.length} questions complétées`
    };
  }, [completedQuizIds, currentLevel]);

  const quizProgressMessage: InteractiveMessage = useMemo(() => ({
    text: quizProgress.text,
    type: 'quiz' as MessageType,
    action: () => navigate('/profile-completion'),
    icon: BookOpen
  }), [quizProgress.text, navigate]);

  const priorityQuestionnaireMessage: InteractiveMessage = useMemo(() => ({
    text: "Complétez le questionnaire de priorités pour des budgets encore plus personnalisés",
    type: 'priority-questionnaire' as MessageType,
    action: () => navigate('/priority-questions'),
    icon: Sparkles
  }), [navigate]);

  const messages = useMemo<InteractiveMessage[]>(() => {
    if (isConstructionModule) return [];

    return [
      ...baseMessages,
      ...(hasCompletedPriorityQuestions ? [] : [priorityQuestionMessage]),
      ...(allFinancialQuizCompleted ? [] : [quizMessage]),
      ...(quizProgress.completed > 0 ? [quizProgressMessage] : []),
      ...(hasBudgets && !hasCompletedPriorityQuestions && !isPriorityQuestionnaireBannerDismissed ? [priorityQuestionnaireMessage] : []),
      ...quizQuestionMessages.filter(msg => {
        if (msg.type === 'quiz_question' && msg.questionId) {
          const isCompleted = completedQuizIds.includes(msg.questionId);
          if (isCompleted) console.log('🚫 Filtering out completed quiz question:', msg.questionId);
          return !isCompleted;
        }
        return true;
      })
    ].filter((message): message is InteractiveMessage => message !== undefined);
  }, [
    isConstructionModule, baseMessages, hasCompletedPriorityQuestions, priorityQuestionMessage,
    allFinancialQuizCompleted, quizMessage, quizProgress, quizProgressMessage,
    hasBudgets, isPriorityQuestionnaireBannerDismissed, priorityQuestionnaireMessage,
    quizQuestionMessages, completedQuizIds
  ]);

  useEffect(() => {
    if (messages.length > 0 && currentMessage >= messages.length) {
      setCurrentMessage(0);
    }
  }, [messages.length, currentMessage]);

  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentMessage((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 1000);
    }, 6000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const handlePriorityQuestionnaireBannerDismiss = useCallback(() => {
    try {
      localStorage.setItem('bazarkely_priority_questionnaire_banner_dismissed', 'true');
      setIsPriorityQuestionnaireBannerDismissed(true);
    } catch (error) {
      console.error('Error dismissing priority questionnaire banner:', error);
    }
  }, []);

  return {
    messages,
    currentMessage,
    isVisible,
    showTooltip,
    setShowTooltip,
    showQuizPopup,
    setShowQuizPopup,
    currentQuizId,
    setCurrentQuizId,
    completedQuizIds,
    setCompletedQuizIds,
    isPriorityQuestionnaireBannerDismissed,
    handlePriorityQuestionnaireBannerDismiss
  };
}

export default useHeaderMessages;
