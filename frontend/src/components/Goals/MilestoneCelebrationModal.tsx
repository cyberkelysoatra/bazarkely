import React, { useEffect, useState, useCallback } from 'react';
import { X, Sprout, Star, Rocket, Trophy } from 'lucide-react';
import type { PendingCelebration, MilestoneThreshold } from '../../services/celebrationService';

interface MilestoneCelebrationModalProps {
  celebration: PendingCelebration;
  onClose: () => void;
  onCelebrated: () => void;
}

// Confetti particle component
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
}

const CONFETTI_COLORS = ['#9333ea', '#22c55e', '#eab308', '#3b82f6', '#ef4444', '#ec4899'];

const MilestoneCelebrationModal: React.FC<MilestoneCelebrationModalProps> = ({
  celebration,
  onClose,
  onCelebrated
}) => {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [badgeScale, setBadgeScale] = useState(0);
  
  // Get icon component based on milestone
  const getIcon = (milestone: MilestoneThreshold) => {
    const iconProps = { className: 'w-12 h-12 text-white' };
    switch (milestone) {
      case 25: return <Sprout {...iconProps} />;
      case 50: return <Star {...iconProps} />;
      case 75: return <Rocket {...iconProps} />;
      case 100: return <Trophy {...iconProps} />;
    }
  };
  
  // Generate confetti particles
  const generateConfetti = useCallback(() => {
    const particles: ConfettiParticle[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: 2 + Math.random() * 3
      });
    }
    setConfetti(particles);
  }, []);
  
  // Animate confetti
  useEffect(() => {
    generateConfetti();
    
    // Badge pop-in animation
    setTimeout(() => setBadgeScale(1), 100);
    
    // Animate confetti falling
    const interval = setInterval(() => {
      setConfetti(prev => prev.map(p => ({
        ...p,
        y: p.y + p.velocityY,
        x: p.x + p.velocityX,
        rotation: p.rotation + 5
      })).filter(p => p.y < 120));
    }, 50);
    
    // Auto-regenerate confetti
    const regenInterval = setInterval(generateConfetti, 2000);
    
    return () => {
      clearInterval(interval);
      clearInterval(regenInterval);
    };
  }, [generateConfetti]);
  
  const handleClose = () => {
    onCelebrated();
    onClose();
  };
  
  const { milestoneInfo, goalName, milestone, currentAmount, targetAmount } = celebration;
  const percentage = Math.round((currentAmount / targetAmount) * 100);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-sm"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)`,
              transition: 'none'
            }}
          />
        ))}
      </div>
      
      {/* Modal content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        
        {/* Header with gradient */}
        <div className={`pt-8 pb-6 px-6 text-center ${
          milestone === 25 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
          milestone === 50 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
          milestone === 75 ? 'bg-gradient-to-br from-purple-400 to-purple-600' :
          'bg-gradient-to-br from-green-400 to-green-600'
        }`}>
          {/* Animated badge */}
          <div 
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-4"
            style={{
              transform: `scale(${badgeScale})`,
              transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className={`flex items-center justify-center w-20 h-20 rounded-full ${milestoneInfo.badgeColor}`}>
              {getIcon(milestone)}
            </div>
          </div>
          
          {/* Emoji */}
          <div className="text-5xl mb-2">{milestoneInfo.emoji}</div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-white">{milestoneInfo.title}</h2>
        </div>
        
        {/* Body */}
        <div className="p-6 text-center">
          {/* Goal name */}
          <p className="text-gray-500 text-sm mb-2">{goalName}</p>
          
          {/* Progress */}
          <div className="mb-4">
            <div className="text-4xl font-bold text-gray-800 mb-1">{percentage}%</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-1000 ${
                  milestone === 25 ? 'bg-blue-500' :
                  milestone === 50 ? 'bg-yellow-500' :
                  milestone === 75 ? 'bg-purple-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
          
          {/* Message */}
          <p className="text-gray-600 mb-6">{milestoneInfo.message}</p>
          
          {/* Continue button */}
          <button
            onClick={handleClose}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 ${
              milestone === 25 ? 'bg-blue-500' :
              milestone === 50 ? 'bg-yellow-500' :
              milestone === 75 ? 'bg-purple-500' :
              'bg-green-500'
            }`}
          >
            Continuer 🎉
          </button>
        </div>
      </div>
    </div>
  );
};

export default MilestoneCelebrationModal;

