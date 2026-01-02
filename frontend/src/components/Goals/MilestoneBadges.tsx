import React from 'react';
import { Sprout, Star, Rocket, Trophy } from 'lucide-react';
import type { MilestoneThreshold } from '../../services/celebrationService';

interface MilestoneBadgesProps {
  celebratedMilestones: MilestoneThreshold[];
  size?: 'sm' | 'md';
}

const MilestoneBadges: React.FC<MilestoneBadgesProps> = ({ 
  celebratedMilestones, 
  size = 'sm' 
}) => {
  if (celebratedMilestones.length === 0) return null;
  
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const badgeSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  
  const getBadgeConfig = (milestone: MilestoneThreshold) => {
    switch (milestone) {
      case 25: return { icon: Sprout, color: 'bg-blue-500', title: '25% atteint' };
      case 50: return { icon: Star, color: 'bg-yellow-500', title: '50% atteint' };
      case 75: return { icon: Rocket, color: 'bg-purple-500', title: '75% atteint' };
      case 100: return { icon: Trophy, color: 'bg-green-500', title: '100% atteint' };
    }
  };
  
  return (
    <div className="flex items-center gap-1">
      {celebratedMilestones.map(milestone => {
        const config = getBadgeConfig(milestone);
        const Icon = config.icon;
        return (
          <div
            key={milestone}
            className={`${badgeSize} rounded-full ${config.color} flex items-center justify-center`}
            title={config.title}
          >
            <Icon className={`${iconSize} text-white`} />
          </div>
        );
      })}
    </div>
  );
};

export default MilestoneBadges;

