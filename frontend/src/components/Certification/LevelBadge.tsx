/**
 * Level Badge Component for BazarKELY
 * Ultra-compact Duolingo-style badge with circular progress indicator
 * Shows 5-segment progress ring representing 10-question milestones within level
 */

import React, { useState, useEffect } from 'react';
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
  const [progressAngle, setProgressAngle] = useState<number>(0);
  const [markerStates, setMarkerStates] = useState<boolean[]>([false, false, false, false, false]);

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

  // Calculate progress angle for inner continuous ring (0-360 degrees)
  const calculateProgressAngle = (level: number): number => {
    try {
      const stored = localStorage.getItem('bazarkely-quiz-questions-completed');
      const completedQuestions = stored ? JSON.parse(stored) : [];
      
      // Filter questions for current level (e.g., cert-level1- for level 1)
      const levelPrefix = `cert-level${level}-`;
      const levelQuestions = completedQuestions.filter((id: string) => 
        id.startsWith(levelPrefix)
      );
      
      const completedCount = levelQuestions.length;
      const totalQuestions = 50; // 50 questions per level
      
      // Calculate angle as percentage of 360 degrees
      const progressPercentage = Math.min(100, (completedCount / totalQuestions) * 100);
      return (progressPercentage / 100) * 360;
    } catch (error) {
      console.error('Error calculating progress angle:', error);
      return 0;
    }
  };

  // Calculate which outer milestone markers are active
  const calculateMarkerStates = (level: number): boolean[] => {
    try {
      const stored = localStorage.getItem('bazarkely-quiz-questions-completed');
      const completedQuestions = stored ? JSON.parse(stored) : [];
      
      // Filter questions for current level
      const levelPrefix = `cert-level${level}-`;
      const levelQuestions = completedQuestions.filter((id: string) => 
        id.startsWith(levelPrefix)
      );
      
      const completedCount = levelQuestions.length;
      
      // Each marker represents 10 questions (10, 20, 30, 40, 50)
      const markers: boolean[] = [];
      for (let i = 1; i <= 5; i++) {
        const milestoneThreshold = i * 10;
        markers.push(completedCount >= milestoneThreshold);
      }
      
      return markers;
    } catch (error) {
      console.error('Error calculating marker states:', error);
      return [false, false, false, false, false];
    }
  };

  // Update progress angle and marker states when component mounts or level changes
  useEffect(() => {
    const angle = calculateProgressAngle(currentLevel);
    const markers = calculateMarkerStates(currentLevel);
    setProgressAngle(angle);
    setMarkerStates(markers);
  }, [currentLevel]);



  const Icon = getLevelIcon(currentLevel);
  const innerRadius = 20; // Inner progress ring radius
  const outerRadius = 26; // Outer marker ring radius
  const strokeWidth = 5; // Progress ring stroke width
  const markerRadius = 3.5; // Individual marker radius
  
  // Calculate progress ring properties
  const circumference = 2 * Math.PI * innerRadius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progressAngle / 360) * circumference;
  
  // Hardcoded marker positions for pixel-perfect alignment
  // Calculated manually for 56x56 viewBox with center at 28,28 and radius 24px
  const markerPositions = [
    { cx: 28, cy: 52 },     // Marker 1: Bottom center (perfect vertical alignment)
    { cx: 5.18, cy: 35.42 }, // Marker 2: Bottom-left
    { cx: 13.89, cy: 8.58 }, // Marker 3: Top-left
    { cx: 42.11, cy: 8.58 }, // Marker 4: Top-right
    { cx: 50.82, cy: 35.42 } // Marker 5: Bottom-right
  ];

  return (
    <button
      onClick={onClick}
      className="
        w-14 h-14 flex items-center justify-center
        hover:scale-105 active:scale-95 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        group relative
      "
      title={`Niveau ${currentLevel} - ${levelName}: ${totalScore}/${maxScore} pts`}
    >
      {/* SVG Dual-Ring System - Sophisticated Premium Design */}
      <svg
        className="w-full h-full"
        viewBox="0 0 56 56"
        style={{ transform: 'rotate(-90deg)' }} // Start from top (12 o'clock)
      >
        {/* Background circle for the badge */}
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="url(#badgeGradient)"
        />
        
        {/* Subtle background circle */}
        <circle
          cx="28"
          cy="28"
          r="22"
          fill="#f3f4f6"
          opacity="0.3"
        />
        
        {/* Inner continuous progress ring */}
        <circle
          cx="28"
          cy="28"
          r={innerRadius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.4))'
          }}
        />
        
        {/* Outer milestone markers - hardcoded positions for pixel-perfect alignment */}
        {markerPositions.map((position, index) => {
          const isActive = markerStates[index];
          
          return (
            <circle
              key={`marker-${index}`}
              cx={position.cx}
              cy={position.cy}
              r={markerRadius}
              fill={isActive ? '#8b5cf6' : '#9ca3af'}
              className={`transition-all duration-500 ${
                isActive ? 'opacity-100' : 'opacity-40'
              }`}
              style={{
                filter: isActive ? 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.6))' : 'none'
              }}
            />
          );
        })}
        
        {/* Gradient definitions */}
        <defs>
          <radialGradient id="badgeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>

      {/* Icon and Level Number - Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <Icon className="w-5 h-5 text-white mb-0.5" />
        <span className="text-xs font-bold text-white leading-none">
          {currentLevel}
        </span>
      </div>
    </button>
  );
};

export default LevelBadge;

