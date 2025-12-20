import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsConstructionModule } from '../../../hooks/useIsConstructionModule';
import { useUsernameDisplay } from '../../../hooks/useUsernameDisplay';
import { useCertificationStore } from '../../../store/certificationStore';
import LevelBadge from '../../Certification/LevelBadge';
import { UserMenuDropdown } from './UserMenuDropdown';

interface HeaderBudgetActionsProps {
  className?: string;
}

// Level name mapping
const LEVEL_NAMES: Record<number, string> = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Avancé',
  4: 'Expert',
};

/**
 * HeaderBudgetActions - Assembly of Budget-specific header elements
 * Contains LevelBadge and UserMenuDropdown, only visible in Budget module
 */
export function HeaderBudgetActions({ className = '' }: HeaderBudgetActionsProps) {
  const navigate = useNavigate();
  const isConstructionModule = useIsConstructionModule();
  const showUsername = useUsernameDisplay();
  
  const {
    currentLevel,
    totalQuestionsAnswered,
    correctAnswers,
    detailedProfile,
    practiceTracking,
  } = useCertificationStore();

  // Calculate scores (memoized for performance)
  const { levelName, totalScore } = useMemo(() => {
    const quizScore = Math.min(40, Math.floor((correctAnswers / Math.max(1, totalQuestionsAnswered)) * 40));
    const practiceScore = practiceTracking?.practiceScore || 0;
    const profileScore = detailedProfile?.firstName ? 15 : 0;
    
    return {
      levelName: LEVEL_NAMES[currentLevel] || 'Maître',
      totalScore: Math.min(115, quizScore + practiceScore + profileScore),
    };
  }, [currentLevel, correctAnswers, totalQuestionsAnswered, practiceTracking?.practiceScore, detailedProfile?.firstName]);

  // Don't render in Construction module
  if (isConstructionModule) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Level Badge */}
      <LevelBadge
        onClick={() => navigate('/certification')}
        currentLevel={currentLevel}
        levelName={levelName}
        totalScore={totalScore}
      />
      
      {/* User Menu Dropdown */}
      <UserMenuDropdown showUsername={showUsername} />
    </div>
  );
}

export default HeaderBudgetActions;

