import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Brain } from 'lucide-react';
import Modal from '../UI/Modal';

interface QuizOption {
  text: string;
  correct: boolean;
}

interface QuizQuestion {
  id: string;
  shortText: string;
  fullQuestion: string;
  options: QuizOption[];
  explanation: string;
}

interface QuizQuestionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  onNextQuestion?: (nextQuestionId: string) => void;
}

export const questions: QuizQuestion[] = [
  {
    id: 'hairdresser',
    shortText: 'Coiffeur va où ?',
    fullQuestion: 'Dans quelle catégorie classer une visite chez le coiffeur ?',
    options: [
      { text: 'Vêtements', correct: true },
      { text: 'Santé', correct: false },
      { text: 'Loisirs', correct: false }
    ],
    explanation: 'Correct ! Le coiffeur fait partie des soins personnels et de l\'apparence, donc de la catégorie "Vêtements".'
  },
  {
    id: 'gym',
    shortText: 'Abonnement salle ?',
    fullQuestion: 'Un abonnement à la salle de sport appartient à quelle catégorie ?',
    options: [
      { text: 'Santé', correct: true },
      { text: 'Loisirs', correct: false },
      { text: 'Éducation', correct: false }
    ],
    explanation: 'Correct ! L\'abonnement à la salle de sport est un investissement dans votre santé physique.'
  },
  {
    id: 'netflix',
    shortText: 'Netflix c\'est quoi ?',
    fullQuestion: 'Un abonnement Netflix doit être classé dans quelle catégorie ?',
    options: [
      { text: 'Loisirs', correct: true },
      { text: 'Communication', correct: false },
      { text: 'Éducation', correct: false }
    ],
    explanation: 'Correct ! Netflix est un service de divertissement, donc de la catégorie "Loisirs".'
  },
  {
    id: 'makeup',
    shortText: 'Maquillage = ?',
    fullQuestion: 'Les produits de maquillage appartiennent à quelle catégorie ?',
    options: [
      { text: 'Vêtements', correct: true },
      { text: 'Santé', correct: false },
      { text: 'Loisirs', correct: false }
    ],
    explanation: 'Correct ! Le maquillage fait partie des soins de beauté et de l\'apparence, donc "Vêtements".'
  },
  {
    id: 'family-gift',
    shortText: 'Cadeau famille ?',
    fullQuestion: 'Un cadeau offert à un membre de la famille va dans quelle catégorie ?',
    options: [
      { text: 'Solidarité', correct: true },
      { text: 'Loisirs', correct: false },
      { text: 'Vêtements', correct: false }
    ],
    explanation: 'Correct ! Les cadeaux familiaux expriment la solidarité et l\'entraide familiale.'
  },
  {
    id: 'school-supplies',
    shortText: 'Fournitures scolaires ?',
    fullQuestion: 'Les fournitures scolaires des enfants appartiennent à quelle catégorie ?',
    options: [
      { text: 'Éducation', correct: true },
      { text: 'Loisirs', correct: false },
      { text: 'Autres', correct: false }
    ],
    explanation: 'Correct ! Les fournitures scolaires sont directement liées à l\'éducation des enfants.'
  },
  {
    id: 'internet',
    shortText: 'Facture internet ?',
    fullQuestion: 'Une facture d\'internet et de téléphone va dans quelle catégorie ?',
    options: [
      { text: 'Communication', correct: true },
      { text: 'Loisirs', correct: false },
      { text: 'Éducation', correct: false }
    ],
    explanation: 'Correct ! Internet et téléphone sont des services de télécommunication.'
  },
  // Financial Education Quiz Questions
  {
    id: 'quiz-financial-1',
    shortText: 'Fonds d\'urgence ?',
    fullQuestion: 'Quel est le pourcentage recommandé pour votre fonds d\'urgence ?',
    options: [
      { text: '1-2 mois de dépenses', correct: false },
      { text: '3-6 mois de dépenses', correct: true },
      { text: '6-12 mois de dépenses', correct: false }
    ],
    explanation: 'Un fonds d\'urgence de 3-6 mois de dépenses est recommandé pour faire face aux imprévus sans compromettre vos objectifs financiers.'
  },
  {
    id: 'quiz-financial-2',
    shortText: 'Règle d\'or budget ?',
    fullQuestion: 'Quelle est la règle d\'or pour gérer un budget familial ?',
    options: [
      { text: 'Dépenser tout ce qu\'on gagne', correct: false },
      { text: 'Épargner 10% de ses revenus', correct: false },
      { text: 'Dépenser moins que ce qu\'on gagne', correct: true }
    ],
    explanation: 'La règle d\'or est de dépenser moins que ce qu\'on gagne, ce qui permet d\'épargner et d\'investir pour l\'avenir.'
  },
  {
    id: 'quiz-financial-3',
    shortText: 'Suivre dépenses ?',
    fullQuestion: 'Quel est l\'avantage principal de suivre ses dépenses ?',
    options: [
      { text: 'Gagner plus d\'argent', correct: false },
      { text: 'Identifier où va l\'argent', correct: true },
      { text: 'Éviter de payer des impôts', correct: false }
    ],
    explanation: 'Suivre ses dépenses permet d\'identifier où va l\'argent et d\'ajuster ses habitudes de consommation en conséquence.'
  },
  {
    id: 'quiz-financial-4',
    shortText: 'Méthode épargne ?',
    fullQuestion: 'Quelle méthode est la plus efficace pour épargner ?',
    options: [
      { text: 'Épargner ce qui reste à la fin du mois', correct: false },
      { text: 'Épargner en premier, avant les dépenses', correct: true },
      { text: 'Épargner seulement les gros montants', correct: false }
    ],
    explanation: 'La méthode "payer d\'abord soi-même" consiste à épargner en premier, avant de dépenser, garantissant ainsi une épargne régulière.'
  },
  {
    id: 'quiz-financial-5',
    shortText: 'Réviser budget ?',
    fullQuestion: 'Quel est le meilleur moment pour réviser son budget ?',
    options: [
      { text: 'Une fois par an', correct: false },
      { text: 'Mensuellement', correct: true },
      { text: 'Quand on a des problèmes financiers', correct: false }
    ],
    explanation: 'Un budget doit être révisé mensuellement pour s\'adapter aux changements de revenus, de dépenses et d\'objectifs.'
  },
  {
    id: 'quiz-financial-6',
    shortText: 'Orange Money frais ?',
    fullQuestion: 'Quel est le frais Orange Money pour un transfert de 50 000 Ar ?',
    options: [
      { text: '0 Ar', correct: false },
      { text: '100 Ar', correct: false },
      { text: '200 Ar', correct: true }
    ],
    explanation: 'Orange Money facture 200 Ar pour les transferts entre 50 001 et 200 000 Ar.'
  },
  {
    id: 'quiz-financial-7',
    shortText: 'Mobile Money avantage ?',
    fullQuestion: 'Quel est l\'avantage principal du Mobile Money ?',
    options: [
      { text: 'Frais élevés', correct: false },
      { text: 'Accessibilité et rapidité', correct: true },
      { text: 'Complexité d\'utilisation', correct: false }
    ],
    explanation: 'Le Mobile Money offre une accessibilité et une rapidité incomparables pour les transactions financières, même dans les zones rurales.'
  },
  {
    id: 'quiz-financial-8',
    shortText: 'Fonds urgence minimum ?',
    fullQuestion: 'Quel est le montant minimum recommandé pour un fonds d\'urgence ?',
    options: [
      { text: '1 mois de dépenses', correct: false },
      { text: '3 mois de dépenses', correct: true },
      { text: '6 mois de dépenses', correct: false }
    ],
    explanation: 'Un fonds d\'urgence de 3-6 mois de dépenses est recommandé pour couvrir les imprévus sans compromettre vos objectifs.'
  },
  {
    id: 'quiz-financial-9',
    shortText: 'Placer fonds urgence ?',
    fullQuestion: 'Où doit être placé votre fonds d\'urgence ?',
    options: [
      { text: 'En actions risquées', correct: false },
      { text: 'Dans un compte épargne accessible', correct: true },
      { text: 'En immobilier', correct: false }
    ],
    explanation: 'Le fonds d\'urgence doit être facilement accessible, donc dans un compte épargne ou un compte courant.'
  },
  {
    id: 'quiz-financial-10',
    shortText: 'Utiliser fonds urgence ?',
    fullQuestion: 'Quand utiliser son fonds d\'urgence ?',
    options: [
      { text: 'Pour des achats non essentiels', correct: false },
      { text: 'Pour des vacances', correct: false },
      { text: 'En cas d\'urgence réelle uniquement', correct: true }
    ],
    explanation: 'Le fonds d\'urgence ne doit être utilisé que pour de vraies urgences : perte d\'emploi, urgence médicale, réparation urgente.'
  }
];

const QuizQuestionPopup: React.FC<QuizQuestionPopupProps> = ({ isOpen, onClose, questionId }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  
  // Track initialization to prevent double opening issue
  // Note: React Strict Mode in development causes intentional double mount
  // This is normal behavior and will not occur in production build
  const isInitialized = useRef(false);
  const isMounted = useRef(true);

  // Reset isMounted flag on every component mount
  useEffect(() => {
    const timestamp = Date.now();
    isMounted.current = true;
    console.log(`[QuizQuestionPopup] Component mounted - setting isMounted to true at ${timestamp}`);
  }, []);

  // Handle external question changes (from props)
  useEffect(() => {
    const timestamp = Date.now();
    // Debug logs commented out - React Strict Mode in development causes intentional double mount
    // This is normal behavior and will not occur in production build
    // console.log(`[QuizQuestionPopup] useEffect[questionId] triggered at ${timestamp}`, {
    //   questionId,
    //   isInitialized: isInitialized.current,
    //   isMounted: isMounted.current
    // });

    if (!isMounted.current) {
      // console.log(`[QuizQuestionPopup] Component unmounted, skipping state update at ${timestamp}`);
      return;
    }

    if (questionId && !isInitialized.current) {
      console.log(`[QuizQuestionPopup] Initializing with questionId: ${questionId} at ${timestamp}`);
      
      setCurrentQuestionId(questionId);
      const question = questions.find(q => q.id === questionId);
      setCurrentQuestion(question || null);
      setSelectedAnswer(null);
      setShowFeedback(false);
      
      isInitialized.current = true;
      console.log(`[QuizQuestionPopup] Initialization completed at ${timestamp}`);
    }
  }, [questionId]);

  // Handle internal question changes (when moving to next question)
  useEffect(() => {
    const timestamp = Date.now();
    // Debug logs commented out - React Strict Mode in development causes intentional double mount
    // This is normal behavior and will not occur in production build
    // console.log(`[QuizQuestionPopup] useEffect[currentQuestionId] triggered at ${timestamp}`, {
    //   currentQuestionId,
    //   questionId,
    //   isInitialized: isInitialized.current,
    //   isMounted: isMounted.current
    // });

    if (!isMounted.current) {
      // console.log(`[QuizQuestionPopup] Component unmounted, skipping state update at ${timestamp}`);
      return;
    }

    if (currentQuestionId && currentQuestionId !== questionId && isInitialized.current) {
      console.log(`[QuizQuestionPopup] Loading next question: ${currentQuestionId} at ${timestamp}`);
      
      const question = questions.find(q => q.id === currentQuestionId);
      setCurrentQuestion(question || null);
      setSelectedAnswer(null);
      setShowFeedback(false);
      
      console.log(`[QuizQuestionPopup] Next question loaded successfully at ${timestamp}`);
    }
  }, [currentQuestionId, questionId]);

  // Cleanup effect to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      console.log(`[QuizQuestionPopup] Component cleanup - setting isMounted to false`);
      isMounted.current = false;
    };
  }, []);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;

    console.log('🔄 Starting handleNextQuestion for question:', currentQuestion.id);

    // Save current question as completed
    const completedQuestions = JSON.parse(localStorage.getItem('bazarkely-quiz-questions-completed') || '[]');
    if (!completedQuestions.includes(currentQuestion.id)) {
      completedQuestions.push(currentQuestion.id);
      localStorage.setItem('bazarkely-quiz-questions-completed', JSON.stringify(completedQuestions));
      console.log('✅ Question saved to localStorage:', currentQuestion.id, 'Completed questions:', completedQuestions);
    }

    // Find all unanswered questions
    const unansweredQuestions = questions.filter(question => !completedQuestions.includes(question.id));
    console.log('📋 Unanswered questions found:', unansweredQuestions.length, 'out of', questions.length);

    if (unansweredQuestions.length > 0) {
      // Select the first unanswered question
      const nextQuestion = unansweredQuestions[0];
      console.log('➡️ Loading next question:', nextQuestion.id);
      
      // Update current question state
      setCurrentQuestionId(nextQuestion.id);
      setCurrentQuestion(nextQuestion);
      setSelectedAnswer(null);
      setShowFeedback(false);
      
      console.log('🎯 Next question loaded successfully, popup remains open');
    } else {
      console.log('🏁 No more unanswered questions, closing popup');
      // Reset initialization flag to allow reopening
      isInitialized.current = false;
      onClose();
    }
  };

  const handleClose = () => {
    const timestamp = Date.now();
    console.log(`[QuizQuestionPopup] handleClose called at ${timestamp}`);
    
    if (currentQuestion && selectedAnswer) {
      // Mark question as completed only if answer was selected
      const completedQuestions = JSON.parse(localStorage.getItem('bazarkely-quiz-questions-completed') || '[]');
      if (!completedQuestions.includes(currentQuestion.id)) {
        completedQuestions.push(currentQuestion.id);
        localStorage.setItem('bazarkely-quiz-questions-completed', JSON.stringify(completedQuestions));
        console.log('✅ Quiz question completed and saved:', currentQuestion.id, 'Completed questions:', completedQuestions);
      }
    }
    
    // Reset initialization flag to allow reopening
    isInitialized.current = false;
    console.log(`[QuizQuestionPopup] Reset initialization flag at ${timestamp}`);
    
    onClose();
  };

  if (!currentQuestion) return null;

  const selectedOption = currentQuestion.options.find(opt => opt.text === selectedAnswer);
  const isCorrect = selectedOption?.correct || false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Quiz Financier"
      size="md"
    >
      <div className="p-6">
        {/* Question Header */}
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {currentQuestion.fullQuestion}
          </h3>
        </div>

        {/* Answer Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                selectedAnswer === option.text
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <input
                type="radio"
                name="quiz-answer"
                value={option.text}
                checked={selectedAnswer === option.text}
                onChange={() => handleAnswerSelect(option.text)}
                className="sr-only"
                disabled={showFeedback}
              />
              <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                selectedAnswer === option.text
                  ? 'border-purple-500'
                  : 'border-gray-300'
              }`}>
                {selectedAnswer === option.text && (
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                )}
              </div>
              <span className="text-gray-700">{option.text}</span>
            </label>
          ))}
        </div>

        {/* Feedback Panel */}
        {showFeedback && (
          <div className={`p-4 rounded-lg mb-6 ${
            isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className={`font-medium ${
                  isCorrect ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isCorrect ? 'Correct !' : 'Incorrect'}
                </p>
                <p className={`text-sm mt-1 ${
                  isCorrect ? 'text-green-700' : 'text-red-700'
                }`}>
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {selectedAnswer ? 'Enregistrer et fermer' : 'Fermer'}
          </button>
          {showFeedback && (
            <button
              onClick={handleNextQuestion}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Enregistrer et continuer
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default QuizQuestionPopup;
