import React from 'react';
import { cn } from '../../utils/cn';

export type ResponsiveGridType = 'stats' | 'actions' | 'cards';

export interface ResponsiveGridProps {
  children: React.ReactNode;
  type: ResponsiveGridType;
  className?: string;
}

const gridTypeClasses: Record<ResponsiveGridType, string> = {
  stats: 'grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6',
  actions: 'grid grid-cols-2 gap-4 lg:flex lg:gap-6 lg:justify-center',
  cards: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
};

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  type,
  className
}) => {
  return (
    <div className={cn(gridTypeClasses[type], className)}>
      {children}
    </div>
  );
};

export default ResponsiveGrid;
