/**
 * Badge pour indiquer une transaction récurrente
 * Composant réutilisable pour afficher l'indicateur de récurrence
 */

import { Repeat } from 'lucide-react';

interface RecurringBadgeProps {
  size?: 'sm' | 'md';
  variant?: 'default' | 'compact';
  onClick?: () => void;
  className?: string;
}

const RecurringBadge: React.FC<RecurringBadgeProps> = ({
  size = 'sm',
  variant = 'default',
  onClick,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  };

  const baseClasses = 'inline-flex items-center gap-1 px-2 py-0.5 font-medium bg-blue-100 text-blue-800 rounded-full';
  
  if (variant === 'compact') {
    return (
      <span 
        className={`${baseClasses} ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:bg-blue-200 transition-colors' : ''} ${className}`}
        onClick={onClick}
        title="Transaction récurrente"
        aria-label="Transaction récurrente"
      >
        <Repeat className={sizeClasses[size]} />
      </span>
    );
  }

  return (
    <span 
      className={`${baseClasses} ${textClasses[size]} ${onClick ? 'cursor-pointer hover:bg-blue-200 transition-colors' : ''} ${className}`}
      onClick={onClick}
      title="Transaction récurrente"
      aria-label="Transaction récurrente"
    >
      <Repeat className={sizeClasses[size]} />
      <span>Récurrent</span>
    </span>
  );
};

export default RecurringBadge;

