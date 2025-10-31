import { useState, useEffect } from 'react';
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
  Crown,
  Target,
  Trophy
} from 'lucide-react';
import adminService from '../services/adminService';
import adminCleanupService from '../services/adminCleanupService';
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
  const [showCleanupPanel, setShowCleanupPanel] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<{
    totalOrphaned: number;
    lastCleanup: string | null;
    systemHealthy: boolean;
  } | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Fonction pour générer des messages d'erreur spécifiques
  const getErrorMessage = (error: any, context: string): string => {
    if (error?.message?.includes('Access denied')) {
      return 'Accès refusé. Vérifiez vos permissions administrateur.';
    }
    if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
      return 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
    }
    if (error?.message?.includes('timeout')) {
      return 'Délai d\'attente dépassé. Le serveur met trop de temps à répondre.';
    }
    if (error?.message?.includes('Unauthorized')) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    if (error?.message?.includes('Forbidden')) {
      return 'Action interdite. Vous n\'avez pas les droits nécessaires.';
    }
    if (error?.message?.includes('Not Found')) {
      return 'Ressource introuvable. Les données demandées n\'existent pas.';
    }
    if (error?.message?.includes('Internal Server Error')) {
      return 'Erreur serveur interne. Veuillez réessayer dans quelques instants.';
    }
    return `Erreur lors du ${context}. Veuillez réessayer ou contacter le support.`;
  };

  // Handle accordion card click
  const handleCardClick = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  // Format currency for MGA
  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'Non disponible';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format amount in Ariary (Ar) with space separators
  const formatAriary = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' Ar';
  };

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
        setError(getErrorMessage(usersResponse.error, 'chargement des utilisateurs'));
        return;
      }

      if (!statsResponse.success) {
        setError(getErrorMessage(statsResponse.error, 'chargement des statistiques'));
        return;
      }

      setUsers(usersResponse.data || []);
      setStats(statsResponse.data || null);

      // Charger les statistiques de nettoyage
      await loadCleanupStats();

    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      setError(getErrorMessage(error, 'chargement des données'));
    } finally {
      setLoading(false);
    }
  };

  const loadCleanupStats = async () => {
    try {
      setCleanupLoading(true);
      const statsResponse = await adminCleanupService.getCleanupStats();
      
      if (statsResponse.success && statsResponse.data) {
        setCleanupStats({
          totalOrphaned: statsResponse.data.total_orphaned,
          lastCleanup: new Date().toISOString(),
          systemHealthy: statsResponse.data.cleanup_system_healthy
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des statistiques de nettoyage:', error);
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupOrphans = async () => {
    try {
      setCleanupLoading(true);
      setError(null);
      setSuccess(null);

      const cleanupResponse = await adminCleanupService.cleanupOrphanedAuthUsers();

      if (!cleanupResponse.success) {
        setError(getErrorMessage(cleanupResponse.error, 'nettoyage des utilisateurs orphelins'));
        return;
      }

      const result = cleanupResponse.data;
      if (result?.cleanup_summary) {
        const { successful_deletions, failed_deletions } = result.cleanup_summary;
        
        if (successful_deletions > 0) {
          setSuccess(`${successful_deletions} utilisateurs orphelins nettoyés avec succès`);
        }
        
        if (failed_deletions > 0) {
          setError(`${failed_deletions} échecs de nettoyage. Vérifiez les logs pour plus de détails.`);
        }
        
        if (successful_deletions === 0 && failed_deletions === 0) {
          setSuccess('Aucun utilisateur orphelin trouvé. Système propre !');
        }
      }

      // Recharger les statistiques
      await loadCleanupStats();
      
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      setError(getErrorMessage(error, 'nettoyage des utilisateurs orphelins'));
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      setDeleting(userId);
      setError(null);
      setSuccess(null);

      const response = await adminService.deleteUser(userId);

      if (!response.success) {
        setError(getErrorMessage(response.error, 'suppression de l\'utilisateur'));
        return;
      }

      // Check auth.users deletion status
      const data = response.data as any;
      const authUserDeleted = data?.authUserDeleted;
      const authDeletionError = data?.authDeletionError;

      if (authUserDeleted) {
        setSuccess(`Utilisateur ${username} supprimé avec succès (données publiques et auth.users)`);
      } else {
        setSuccess(`Utilisateur ${username} supprimé des données publiques. ${authDeletionError || 'Suppression auth.users échouée - nettoyage manuel requis via Dashboard Supabase.'}`);
      }
      
      // Recharger les données
      await loadData();

    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      setError(getErrorMessage(error, 'suppression de l\'utilisateur'));
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

        {/* Warning about auth.users deletion */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Note importante sur la suppression d'utilisateurs</p>
            <p>La suppression des données publiques est automatique. Si la suppression de auth.users échoue (erreur 403), un nettoyage manuel via le Dashboard Supabase peut être requis.</p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
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
            users.map((user) => {
              const isExpanded = expandedUserId === user.id;
              return (
                <div key={user.id} className="border-b border-gray-200 last:border-b-0">
                  {/* Card Header - Clickable */}
                  <div 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleCardClick(user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {/* User Avatar */}
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden">
                            {user.profilePictureUrl ? (
                              <img 
                                src={user.profilePictureUrl} 
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-purple-600" />
                            )}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(user.id);
                            }}
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

                  {/* Expandable Content */}
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 pb-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Emergency Fund Goal Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <Target className="w-4 h-4 mr-2 text-purple-600" />
                            Objectifs d'épargne
                          </h4>
                          {(() => {
                            // Find the "Fond d'urgence" goal
                            const emergencyFundGoal = user.goals?.find(goal => goal.name === "Fond d'urgence");
                            
                            if (!emergencyFundGoal) {
                              return (
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                  <p className="text-sm text-gray-500 italic text-center">
                                    Aucun objectif d'urgence défini
                                  </p>
                                </div>
                              );
                            }

                            // Calculate progress percentage
                            const progress = emergencyFundGoal.targetAmount > 0 
                              ? Math.min((emergencyFundGoal.currentAmount / emergencyFundGoal.targetAmount) * 100, 100)
                              : 0;

                            return (
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <Target className="w-4 h-4 mr-2 text-purple-600" />
                                    <h5 className="text-sm font-medium text-gray-900">Fond d'urgence</h5>
                                  </div>
                                  <Trophy className="w-5 h-5 text-yellow-500" />
                                </div>
                                
                                <div className="flex items-center justify-between text-sm text-gray-700 mb-3">
                                  <span className="font-medium">{formatAriary(emergencyFundGoal.currentAmount)}</span>
                                  <span className="font-medium">{formatAriary(emergencyFundGoal.targetAmount)}</span>
                                </div>
                                
                                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                                  <div 
                                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {progress.toFixed(1)}% complété
                                  </span>
                                  {emergencyFundGoal.isCompleted && (
                                    <span className="text-xs text-green-600 font-medium">
                                      ✓ Terminé
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Monthly Income Section */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                            Revenus mensuels
                          </h4>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900 mb-1">
                                {formatCurrency(user.monthlyIncome)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {user.monthlyIncome ? 'Revenus du mois en cours' : 'Aucune donnée disponible'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Panneau de Nettoyage des Utilisateurs Orphelins */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowCleanupPanel(!showCleanupPanel)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Nettoyage des Utilisateurs Orphelins
                </h2>
                <p className="text-sm text-gray-600">
                  Gestion des entrées auth.users sans données publiques correspondantes
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {cleanupStats && (
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {cleanupStats.totalOrphaned} orphelins
                  </div>
                  <div className={`text-xs ${cleanupStats.systemHealthy ? 'text-green-600' : 'text-yellow-600'}`}>
                    {cleanupStats.systemHealthy ? 'Système sain' : 'Nettoyage recommandé'}
                  </div>
                </div>
              )}
              <RefreshCw className={`w-4 h-4 text-gray-400 transition-transform ${showCleanupPanel ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>

        {showCleanupPanel && (
          <div className="p-4 space-y-4">
            {/* Information Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 mb-1">
                    Qu'est-ce qu'un utilisateur orphelin ?
                  </p>
                  <p className="text-yellow-700">
                    Un utilisateur orphelin est une entrée dans auth.users qui n'a pas de données 
                    correspondantes dans public.users. Cela peut arriver lors de suppressions partielles 
                    dues à des limitations de permissions.
                  </p>
                </div>
              </div>
            </div>

            {/* Statistiques */}
            {cleanupStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Utilisateurs Orphelins</div>
                  <div className="text-2xl font-bold text-gray-900">{cleanupStats.totalOrphaned}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">État du Système</div>
                  <div className={`text-sm font-medium ${cleanupStats.systemHealthy ? 'text-green-600' : 'text-yellow-600'}`}>
                    {cleanupStats.systemHealthy ? '✅ Sain' : '⚠️ Nettoyage requis'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Dernière Vérification</div>
                  <div className="text-sm text-gray-900">
                    {cleanupStats.lastCleanup ? new Date(cleanupStats.lastCleanup).toLocaleString('fr-FR') : 'Jamais'}
                  </div>
                </div>
              </div>
            )}

            {/* Boutons d'Action */}
            <div className="flex space-x-3">
              <button
                onClick={loadCleanupStats}
                disabled={cleanupLoading}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${cleanupLoading ? 'animate-spin' : ''}`} />
                <span>Vérifier Orphelins</span>
              </button>
              
              <button
                onClick={handleCleanupOrphans}
                disabled={cleanupLoading}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span>{cleanupLoading ? 'Nettoyage...' : 'Nettoyer Maintenant'}</span>
              </button>
            </div>

            {/* Message d'Information */}
            <div className="text-xs text-gray-500 text-center">
              Le nettoyage automatique s'exécute après chaque suppression d'utilisateur. 
              Utilisez ce panneau pour un nettoyage manuel ou une vérification.
            </div>
          </div>
        )}
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
