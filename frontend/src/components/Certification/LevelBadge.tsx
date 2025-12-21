/**
 * Level Badge Component for BazarKELY
 * Modern neon/gaming style badge with glowing progress circle
 * Shows progression within current level with smooth animations
 */

import React from 'react';
import { Trophy, Crown, Star, Medal } from 'lucide-react';

interface LevelBadgeProps {
  onClick: () => void;
  currentLevel: number;
  levelName: string;
  totalScore: number;
  maxScore?: number;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({
  onClick,
  currentLevel,
  levelName,
  totalScore,
  maxScore = 115
}) => {
  // Get appropriate icon for each level
  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1:
        return Trophy;
      case 2:
        return Star;
      case 3:
        return Medal;
      case 4:
        return Crown;
      case 5:
        return Crown;
      default:
        return Trophy;
    }
  };

  const Icon = getLevelIcon(currentLevel);
  const radius = 30; // Circle radius (increased from 24)
  const strokeWidth = 4; // Progress circle stroke width
  const circumference = 2 * Math.PI * radius;
  const centerX = 36; // Center X coordinate (increased from 28)
  const centerY = 36; // Center Y coordinate (increased from 28)
  
  // Points per level (115 total / 5 levels)
  const POINTS_PER_LEVEL = 23;
  
  // Calculate level thresholds
  const currentLevelThreshold = (currentLevel - 1) * POINTS_PER_LEVEL; // 0, 23, 46, 69, 92
  const nextLevelThreshold = currentLevel * POINTS_PER_LEVEL; // 23, 46, 69, 92, 115
  
  // Progress within current level (0-100%)
  const progressInLevel = totalScore - currentLevelThreshold;
  const progressPercentage = Math.min(100, Math.max(0, (progressInLevel / POINTS_PER_LEVEL) * 100));
  
  // Convert to arc length for stroke-dasharray
  const progressLength = (progressPercentage / 100) * circumference;
  const remainingLength = circumference - progressLength;

  return (
    <button
      onClick={onClick}
      className="
        relative w-[72px] h-[72px] flex items-center justify-center
        hover:scale-105 active:scale-95 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-transparent
        group
      "
      title={`Niveau ${currentLevel} - ${levelName}: ${totalScore}/${maxScore} pts`}
      aria-label={`Niveau ${currentLevel} - ${levelName}`}
    >
      {/* SVG Neon Progress Circle */}
      <svg
        className="w-full h-full absolute inset-0"
        viewBox="0 0 72 72"
        style={{ transform: 'rotate(-90deg)' }} // Start from top (12 o'clock)
      >
        {/* Background circle (dim) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth={strokeWidth}
          className="transition-all duration-300"
        />
        
        {/* Progress arc with bright cyan gradient (glow contained inside circle) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="url(#neonGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${remainingLength}`}
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content with neon glow effects */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Icon with subtle glow */}
        <Icon 
          className="w-7 h-7 text-cyan-400 mb-0.5 transition-all duration-300 group-hover:text-cyan-300" 
        />
        
        {/* Level number with subtle text shadow */}
        <span 
          className="text-sm font-bold text-white leading-none transition-all duration-300 group-hover:text-cyan-100"
          style={{ 
            textShadow: '0 0 4px rgba(6, 182, 212, 0.5)'
          }}
        >
          {currentLevel}
        </span>
      </div>
    </button>
  );
};

export default LevelBadge;

