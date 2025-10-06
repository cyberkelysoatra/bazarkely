import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  BarChart3,
  User,
  Calendar,
  Mail,
  Crown
} from 'lucide-react';
import adminService from '../services/adminService';
import type { AdminUser } from '../services/adminService';
import { useAppStore } from '../stores/appStore';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalTransactions: number;
    totalAccounts: number;
    totalBudgets: number;
    totalGoals: number;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Vérifier l'accès admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      const isAdmin = await adminService.isAdmin();
      if (!isAdmin) {
        console.warn('🚫 Accès admin refusé pour:', user?.email);
        navigate('/dashboard');
        return;
      }
      
      loadData();
    };

    checkAdminAccess();
  }, [navigate, user?.email]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les utilisateurs et les statistiques en parallèle
      const [usersResponse, statsResponse] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getUserStats()
      ]);

      if (!usersResponse.success) {
        setError(usersResponse.error || 'Erreur lors du chargement des utilisateurs');
        return;
      }

      if (!statsResponse.success) {
        setError(statsResponse.error || 'Erreur lors du chargement des statistiques');
        return;
      }

      setUsers(usersResponse.data || []);
      setStats(statsResponse.data || null);

    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      setDeleting(userId);
      setError(null);
      setSuccess(null);

      const response = await adminService.deleteUser(userId);

      if (!response.success) {
        setError(response.error || 'Erreur lors de la suppression');
        return;
      }

      setSuccess(`Utilisateur ${username} supprimé avec succès`);
      
      // Recharger les données
      await loadData();

    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      setError('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données administrateur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
            <p className="text-gray-600">Gestion des utilisateurs et données</p>
          </div>
        </div>

        {/* Alertes */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{success}</p>
          </div>
        )}
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Utilisateurs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Transactions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Comptes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Budgets</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalBudgets}</p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Objectifs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalGoals}</p>
          </div>
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Utilisateurs ({users.length})</h2>
            <button
              onClick={loadData}
              className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun utilisateur trouvé</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {user.username}
                          </h3>
                          {user.isCurrentUser && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <User className="w-3 h-3 mr-1" />
                              Vous
                            </span>
                          )}
                          {user.role === 'admin' && !user.isCurrentUser && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <Crown className="w-3 h-3 mr-1" />
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Créé le {formatDate(user.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {user.isCurrentUser ? (
                      <span className="text-sm text-gray-400 px-3 py-1">
                        Utilisateur actuel
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(user.id)}
                        disabled={deleting === user.id}
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === user.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700">
                  Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
                  <span className="font-semibold">
                    {users.find(u => u.id === showDeleteConfirm)?.username}
                  </span> ?
                </p>
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Toutes les données associées (transactions, comptes, budgets, objectifs) 
                  seront définitivement supprimées.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const userToDelete = users.find(u => u.id === showDeleteConfirm);
                    if (userToDelete) {
                      handleDeleteUser(userToDelete.id, userToDelete.username);
                    }
                  }}
                  disabled={deleting === showDeleteConfirm}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting === showDeleteConfirm ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
