import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useIsConstructionModule } from '../../../hooks/useIsConstructionModule';
import { useUsernameDisplay } from '../../../hooks/useUsernameDisplay';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { useHeaderMessages } from '../../../hooks/useHeaderMessages';
import { useAppStore } from '../../../stores/appStore';
import { InteractiveMessages } from './InteractiveMessages';
import QuizQuestionPopup from '../../Quiz/QuizQuestionPopup';

interface HeaderUserBannerProps {
  className?: string;
}

/**
 * HeaderUserBanner - User info banner with greeting, messages, and status
 * Only visible in Budget module
 */
export function HeaderUserBanner({ className = '' }: HeaderUserBannerProps) {
  const isConstructionModule = useIsConstructionModule();
  const showUsername = useUsernameDisplay();
  const isOnline = useOnlineStatus();
  const { user } = useAppStore();
  
  const {
    messages,
    currentMessage,
    isVisible,
    showTooltip,
    showQuizPopup,
    setShowQuizPopup,
    currentQuizId,
    setCurrentQuizId,
    completedQuizIds,
    setCompletedQuizIds,
    handlePriorityQuestionnaireBannerDismiss,
  } = useHeaderMessages();

  // Don't render in Construction module
  if (isConstructionModule) {
    return null;
  }

  // Format username: capitalize first letter
  const formatUsername = (name?: string): string => {
    if (!name) return 'Utilisateur';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const handleQuizPopupClose = () => {
    setShowQuizPopup(false);
    setCurrentQuizId('');
    // Reload completed quiz IDs from localStorage
    try {
      const stored = localStorage.getItem('bazarkely-quiz-questions-completed');
      const completed = stored ? JSON.parse(stored) : [];
      setCompletedQuizIds(Array.isArray(completed) ? completed : []);
    } catch (error) {
      console.error('Error reloading completed quiz IDs:', error);
    }
  };

  return (
    <>
      {/* User Banner */}
      {user && (
        <div className={`
          mt-4 
          bg-gradient-to-r from-purple-500/40 to-purple-600/30
          backdrop-blur-sm 
          rounded-xl 
          p-4 
          border border-purple-300/50 
          shadow-lg shadow-purple-500/10
          ${className}
        `}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Greeting and Messages */}
            <div className="flex-1 min-w-0">
              {/* Greeting */}
              {showUsername && (
                <span className="
                  font-semibold text-white 
                  text-sm sm:text-base
                  whitespace-nowrap
                ">
                  Bonjour, {formatUsername(user.username)} !
                </span>
              )}
              
              {/* Interactive Messages */}
              {messages.length > 0 && (
                <InteractiveMessages
                  messages={messages}
                  isOnline={isOnline}
                  userName={user?.username}
                  onPriorityQuestionnaireDismiss={handlePriorityQuestionnaireBannerDismiss}
                />
              )}
            </div>

            {/* Right: Online Status */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-purple-100 whitespace-nowrap">
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Question Popup */}
      {showQuizPopup && (
        <QuizQuestionPopup
          key={currentQuizId || 'quiz-popup'}
          isOpen={showQuizPopup}
          onClose={handleQuizPopupClose}
          questionId={currentQuizId}
        />
      )}
    </>
  );
}

export default HeaderUserBanner;

