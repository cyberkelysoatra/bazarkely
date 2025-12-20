import React from 'react';
import { ChevronRight, X } from 'lucide-react';

/**
 * Type for interactive message
 */
export interface InteractiveMessage {
  text: string;
  type: 'motivational' | 'priority_question' | 'quiz' | 'quiz_question' | 'quiz_progress' | 'priority-questionnaire';
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
  questionId?: string;
}

/**
 * Props for InteractiveMessages component
 */
interface InteractiveMessagesProps {
  messages: InteractiveMessage[];
  currentMessage: number;
  isVisible: boolean;
  showTooltip: boolean;
  onDismissBanner: () => void;
  className?: string;
}

/**
 * InteractiveMessages - Displays cycling messages with fade animation
 * 
 * Features:
 * - Smooth fade in/out transitions
 * - Click handling for message actions
 * - Close button for priority questionnaire messages
 * - Tooltip for motivational messages
 * 
 * @param messages - Array of messages to display
 * @param currentMessage - Index of currently displayed message
 * @param isVisible - Whether message should be visible (for fade animation)
 * @param showTooltip - Whether to show tooltip for motivational messages
 * @param onDismissBanner - Callback for dismissing priority questionnaire banner
 * @param className - Additional CSS classes
 */
export function InteractiveMessages({
  messages,
  currentMessage,
  isVisible,
  showTooltip,
  onDismissBanner,
  className = ''
}: InteractiveMessagesProps) {
  // Early return if no messages
  if (messages.length === 0 || !messages[currentMessage]) {
    return null;
  }

  const message = messages[currentMessage];
  const IconComponent = message.icon;

  return (
    <div className={`relative ${className}`}>
      {/* Message display with fade */}
      <div 
        onClick={message.action}
        className={`
          flex items-center gap-2 
          px-3 py-1.5 
          rounded-lg
          cursor-pointer
          hover:bg-purple-500/20
          transition-all duration-300
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}
        `}
      >
        <span className="text-purple-100 text-sm whitespace-nowrap">
          {message.text}
        </span>
        {IconComponent && <IconComponent className="w-4 h-4 text-purple-200" />}
        <ChevronRight className="w-3 h-3 text-purple-200" />
        
        {/* Close button for priority questionnaire */}
        {message.type === 'priority-questionnaire' && (
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              onDismissBanner(); 
            }}
            className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
            title="Fermer"
            aria-label="Fermer le message"
          >
            <X className="w-3 h-3 text-purple-200 hover:text-white" />
          </button>
        )}
      </div>
      
      {/* Tooltip for motivational messages */}
      {showTooltip && message.type === 'motivational' && (
        <div className="
          absolute top-full left-0 mt-2 
          bg-white text-gray-800 
          text-xs px-3 py-2 
          rounded-lg shadow-lg 
          border border-gray-100
          z-50 whitespace-nowrap
          animate-fadeIn
        ">
          💡 Conseil : Cliquez pour plus d'inspiration !
        </div>
      )}
    </div>
  );
}

export default InteractiveMessages;

