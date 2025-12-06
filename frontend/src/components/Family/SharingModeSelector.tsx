import React from 'react';
import { Eye, EyeOff, Lock, Share2 } from 'lucide-react';

export type SharingMode = 'selective' | 'share_all';

interface SharingModeSelectorProps {
  currentMode: SharingMode;
  onChange: (mode: SharingMode) => void;
  disabled?: boolean;
  className?: string;
}

const SharingModeSelector: React.FC<SharingModeSelectorProps> = ({
  currentMode,
  onChange,
  disabled = false,
  className = '',
}) => {
  const modes: Array<{
    value: SharingMode;
    title: string;
    description: string;
    icon: React.ReactNode;
    details: string[];
  }> = [
    {
      value: 'selective',
      title: 'Sélectif',
      description: 'Vos transactions sont privées par défaut',
      icon: <Lock className="w-5 h-5" />,
      details: [
        'Vous choisissez manuellement quelles transactions partager',
        'Plus de contrôle sur votre confidentialité',
        'Idéal pour gérer vos finances personnelles',
      ],
    },
    {
      value: 'share_all',
      title: 'Tout partager',
      description: 'Vos transactions sont partagées par défaut',
      icon: <Share2 className="w-5 h-5" />,
      details: [
        'Toutes vos transactions sont automatiquement partagées',
        'Vous pouvez masquer certaines transactions si besoin',
        'Idéal pour une transparence totale en famille',
      ],
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Mode de partage
        </h3>
        <p className="text-xs text-gray-600">
          Choisissez comment vos transactions sont partagées avec votre famille
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modes.map((mode) => {
          const isSelected = currentMode === mode.value;
          const isDisabled = disabled;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => !isDisabled && onChange(mode.value)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected
                  ? 'border-purple-600 bg-purple-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              `}
              aria-pressed={isSelected}
              aria-label={`Mode ${mode.title}`}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Icon */}
              <div
                className={`
                  mb-3 inline-flex items-center justify-center w-10 h-10 rounded-lg
                  ${isSelected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}
                `}
              >
                {mode.icon}
              </div>

              {/* Title */}
              <h4
                className={`
                  text-sm font-semibold mb-1
                  ${isSelected ? 'text-purple-900' : 'text-gray-900'}
                `}
              >
                {mode.title}
              </h4>

              {/* Description */}
              <p
                className={`
                  text-xs mb-3
                  ${isSelected ? 'text-purple-700' : 'text-gray-600'}
                `}
              >
                {mode.description}
              </p>

              {/* Details list */}
              <ul className="space-y-1.5">
                {mode.details.map((detail, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span
                      className={`
                        mt-0.5 flex-shrink-0
                        ${isSelected ? 'text-purple-600' : 'text-gray-400'}
                      `}
                    >
                      •
                    </span>
                    <span
                      className={isSelected ? 'text-purple-700' : 'text-gray-600'}
                    >
                      {detail}
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Info text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note :</strong> Vous pouvez changer ce mode à tout moment dans les paramètres.
          Les transactions déjà partagées ne seront pas affectées.
        </p>
      </div>
    </div>
  );
};

export default SharingModeSelector;

