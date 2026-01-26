import React from 'react';
import { cn } from '../../utils/cn';

// Type for Lucide icons (consistent with other components in codebase)
type LucideIcon = React.ComponentType<{
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
}>;

export interface ResponsiveStatCardProps {
  gradient?: string;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  onIconClick?: (e: React.MouseEvent) => void;
  className?: string;
}

const ResponsiveStatCard: React.FC<ResponsiveStatCardProps> = ({
  gradient = 'from-blue-500 to-blue-600',
  icon: Icon,
  label,
  value,
  onClick,
  onIconClick,
  className
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        `bg-gradient-to-br ${gradient} rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`,
        // Responsive padding
        'p-4 md:p-6 lg:p-8',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-sm font-medium',
          // Responsive text color based on gradient
          gradient.includes('blue') && 'text-blue-100',
          gradient.includes('green') && 'text-green-100',
          gradient.includes('red') && 'text-red-100',
          gradient.includes('yellow') && 'text-yellow-100',
          gradient.includes('purple') && 'text-purple-100'
        )}>
          {label}
        </h3>
        <div
          onClick={onIconClick}
          className={cn(
            'w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors',
            onIconClick && 'cursor-pointer hover:bg-white/30'
          )}
        >
          <Icon className={cn(
            // Responsive icon size
            'w-5 h-5 md:w-6 md:h-7 text-white'
          )} />
        </div>
      </div>
      <div className={cn(
        // Responsive text size
        'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white whitespace-nowrap'
      )}>
        {value}
      </div>
    </div>
  );
};

export default ResponsiveStatCard;
