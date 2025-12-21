import React, { useState } from 'react';
import { Wifi, WifiOff, ChevronRight } from 'lucide-react';

// Types pour les messages interactifs
type MessageType = 'motivational' | 'priority_question' | 'quiz' | 'quiz_question' | 'priority-questionnaire';

export interface InteractiveMessage {
  id?: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  type: MessageType;
  action?: () => void;
  questionId?: string;
}

interface InteractiveMessagesProps {
  messages: InteractiveMessage[];
  currentMessage: number;
  isVisible: boolean;
  isOnline: boolean;
  userName?: string;
  onPriorityQuestionnaireDismiss?: () => void;
}

const InteractiveMessages: React.FC<InteractiveMessagesProps> = React.memo(({ 
  messages,
  currentMessage,
  isVisible,
  isOnline, 
  userName,
  onPriorityQuestionnaireDismiss 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Gérer le clic sur les messages motivationnels pour afficher le tooltip
  const handleMessageClick = () => {
    const currentMsg = messages[currentMessage];
    if (currentMsg?.action) {
      if (currentMsg.type === 'motivational') {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
      }
      currentMsg.action();
    }
  };

  // Ne rien afficher si aucun message
  if (messages.length === 0) {
    return null;
  }

  const currentMsg = messages[currentMessage];
  if (!currentMsg) {
    return null;
  }

  return (
    <div className="flex items-center justify-between flex-nowrap overflow-hidden">
      <div>
        <div className="relative">
          {/* Vérification de sécurité pour le rendu des messages */}
          <div className="flex items-center space-x-2">
            <span 
              onClick={handleMessageClick}
              className={`text-purple-100 ml-2 whitespace-nowrap overflow-hidden transition-all duration-1000 ease-in-out cursor-pointer hover:bg-purple-500/20 hover:bg-opacity-80 px-3 py-1 rounded-lg flex items-center space-x-2 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            >
              <span>{currentMsg.text}</span>
              {(() => {
                const IconComponent = currentMsg.icon;
                return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
              })()}
              <ChevronRight className="w-3 h-3" />
            </span>
            {/* Close button for priority questionnaire banner */}
            {currentMsg.type === 'priority-questionnaire' && onPriorityQuestionnaireDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPriorityQuestionnaireDismiss();
                }}
                className="text-purple-200 hover:text-white transition-colors p-1 rounded-full hover:bg-purple-500/20"
                title="Fermer"
              >
                <span className="text-sm font-bold">×</span>
              </button>
            )}
          </div>
          
          {/* Tooltip pour les messages motivationnels */}
          {showTooltip && currentMsg.type === 'motivational' && (
            <div className="absolute top-full left-0 mt-2 bg-white text-gray-800 text-xs px-3 py-2 rounded-lg shadow-lg border z-50 whitespace-nowrap">
              💡 Conseil : Cliquez pour plus d'inspiration !
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className="text-xs text-purple-100 whitespace-nowrap">
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>
    </div>
  );
});

InteractiveMessages.displayName = 'InteractiveMessages';

export default InteractiveMessages;

