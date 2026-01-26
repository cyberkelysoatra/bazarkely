import React from 'react';
import { cn } from '../../utils/cn';

export interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}

const maxWidthClasses = {
  sm: 'xl:max-w-sm',
  md: 'xl:max-w-md',
  lg: 'xl:max-w-lg',
  xl: 'xl:max-w-xl',
  '2xl': 'xl:max-w-2xl',
  '7xl': 'xl:max-w-7xl',
  full: 'xl:max-w-full'
};

const DashboardContainer: React.FC<DashboardContainerProps> = ({
  children,
  className,
  maxWidth = '7xl'
}) => {
  return (
    <div
      className={cn(
        // Mobile-first base styles
        'p-4 pb-20 space-y-4',
        // Tablet styles
        'md:px-8 md:space-y-6',
        // Desktop styles
        'lg:px-12',
        // Max width and centering for large screens
        maxWidthClasses[maxWidth],
        'xl:mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
};

export default DashboardContainer;
