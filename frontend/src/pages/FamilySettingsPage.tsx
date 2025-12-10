/**
 * Page de paramètres du groupe familial
 * Placeholder pour la gestion des paramètres du groupe
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Users, Save, Percent } from 'lucide-react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useFamily } from '../contexts/FamilyContext';
import { useAppStore } from '../stores/appStore';
import { getFamilyGroupMembers } from '../services/familyGroupService';
import { toast } from 'react-hot-toast';

const FamilySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading: isAuthLoading, isAuthenticated } = useRequireAuth();
  const { activeFamilyGroup } = useFamily();
  const { user } = useAppStore();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [reimbursementRate, setReimbursementRate] = useState<number>(100);
  const [isSaving, setIsSaving] = useState(false);
  
  // Load current user's role and reimbursement rate
  useEffect(() => {
    const loadUserRoleAndRate = async () => {
      if (!activeFamilyGroup || !user) {
        setIsLoadingRole(false);
        return;
      }
      
      try {
        // Get family members to check role
        const members = await getFamilyGroupMembers(activeFamilyGroup.id);
        const currentMember = members.find(m => m.userId === user.id);
        
        if (currentMember) {
          setIsAdmin(currentMember.role === 'admin');
        }
        
        // Load reimbursement rate from localStorage
        const storedRate = localStorage.getItem(`bazarkely_family_${activeFamilyGroup.id}_reimbursement_rate`);
        if (storedRate) {
          setReimbursementRate(parseInt(storedRate, 10));
        } else {
          // Default to 100%
          setReimbursementRate(100);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du rôle:', error);
      } finally {
        setIsLoadingRole(false);
      }
    };
    
    loadUserRoleAndRate();
  }, [activeFamilyGroup, user]);
  
  const handleSaveRate = async () => {
    if (!activeFamilyGroup) return;
    
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem(`bazarkely_family_${activeFamilyGroup.id}_reimbursement_rate`, reimbursementRate.toString());
      toast.success('Taux de remboursement sauvegardé');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

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
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Paramètres du groupe</h1>
              <p className="text-sm text-gray-600">Gérez les paramètres de votre groupe familial</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Reimbursement Settings Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Percent className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Paramètres de remboursement</h2>
                <p className="text-sm text-gray-500">Configurez le taux de remboursement par défaut</p>
              </div>
            </div>
            
            {isLoadingRole ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taux de remboursement par défaut
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Pourcentage du montant demandé lors d'une demande de remboursement
                  </p>
                  
                  {isAdmin ? (
                    <div className="space-y-3">
                      <select
                        value={reimbursementRate}
                        onChange={(e) => setReimbursementRate(parseInt(e.target.value, 10))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                      >
                        <option value={100}>100% - Montant complet</option>
                        <option value={75}>75% - Trois quarts</option>
                        <option value={50}>50% - Moitié</option>
                        <option value={25}>25% - Quart</option>
                      </select>
                      
                      <button
                        onClick={handleSaveRate}
                        disabled={isSaving}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Sauvegarde...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Sauvegarder</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Seul l'administrateur du groupe peut modifier ce paramètre.
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        Taux actuel: {reimbursementRate}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Back button */}
          <button
            onClick={() => navigate('/family')}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamilySettingsPage;


