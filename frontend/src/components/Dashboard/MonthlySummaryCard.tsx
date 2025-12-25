/**
 * Composant de résumé mensuel pour familles diaspora
 * Affiche un résumé des transactions mensuelles avec support multi-devises
 */

import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { CurrencyDisplay } from '../Currency';

interface MonthlySummaryCardProps {
  className?: string;
  displayCurrency?: 'MGA' | 'EUR';
}

const MonthlySummaryCard: React.FC<MonthlySummaryCardProps> = ({ 
  className = '', 
  displayCurrency = 'MGA' 
}) => {
  // TODO: Implémenter la logique de récupération des données mensuelles
  // Pour l'instant, composant de base pour éviter l'erreur d'export

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Résumé mensuel</h3>
        </div>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Résumé mensuel pour familles diaspora
        </p>
        {/* TODO: Ajouter les statistiques mensuelles ici */}
      </div>
    </div>
  );
};

export default MonthlySummaryCard;
