/**
 * Page d'équilibrage des soldes familiaux
 * Placeholder pour la visualisation et gestion des soldes entre membres
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Users } from 'lucide-react';
import { useRequireAuth } from '../hooks/useRequireAuth';

const FamilyBalancePage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading: isAuthLoading, isAuthenticated } = useRequireAuth();

  // État de chargement de l'authentification
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Vérification de l'authentification...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/family')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Équilibrage</h1>
              <p className="text-sm text-gray-600">Visualisez et gérez les soldes entre membres</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ArrowRightLeft className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Équilibrage des soldes
          </h2>
          <p className="text-gray-600 mb-8">
            Cette fonctionnalité sera bientôt disponible.
          </p>
          <button
            onClick={() => navigate('/family')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamilyBalancePage;


