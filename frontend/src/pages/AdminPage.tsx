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
  Trophy,
  LogIn,
  Activity,
  Moon,
  Ghost,
  UserX,
  Clock,
  ArrowDownUp
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import adminService, { ERREUR_SESSION } from '../services/adminService';
import type {
  AdminUser,
  AdminUserEtat,
  AdminActivite,
  AdminSeriePoint,
  AdminAccessState
} from '../services/adminService';
import { useAppStore } from '../stores/appStore';

/** Libellés + couleurs des pastilles d'état. */
const ETAT_LABELS: Record<AdminUserEtat, { label: string; classes: string }> = {
  actif: { label: 'Actif', classes: 'bg-green-100 text-green-800' },
  dormant: { label: 'Dormant', classes: 'bg-amber-100 text-amber-800' },
  'jamais-revenu': { label: 'Jamais revenu', classes: 'bg-slate-200 text-slate-700' },
  fantome: { label: 'Fantôme', classes: 'bg-gray-100 text-gray-500' }
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activite, setActivite] = useState<AdminActivite | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessState, setAccessState] = useState<AdminAccessState | null>(null);
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

  // Vérifier l'accès admin (offline-first : aucune redirection muette)
  useEffect(() => {
    const checkAdminAccess = async () => {
      const etat = await adminService.getAccessState();
      setAccessState(etat);

      if (etat === 'no-session') {
        console.warn('🚫 Aucune session lisible pour l\'administration');
        setLoading(false);
        return;
      }

      if (etat === 'denied') {
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

      // Charger les utilisateurs, les statistiques et l'activité en parallèle
      const [usersResponse, statsResponse, activiteResponse] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getUserStats(),
        adminService.getActivite()
      ]);

      // Le serveur refuse faute de jeton valide : l'app parait connectee (cache local)
      // alors que la session est morte. On le dit clairement au lieu d'afficher une erreur vague.
      const sessionMorte = [usersResponse, statsResponse, activiteResponse]
        .some((r) => !r.success && r.error === ERREUR_SESSION);
      if (sessionMorte) {
        console.warn('🚫 Session serveur expirée pendant le chargement administrateur');
        setAccessState('no-session');
        return;
      }

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

      if (activiteResponse.success) {
        setActivite(activiteResponse.data || null);
      } else {
        console.warn('⚠️ Activité indisponible:', activiteResponse.error);
        setActivite(null);
      }

    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      setError(getErrorMessage(error, 'chargement des données'));
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

  /** Date courte (sans heure), pour les colonnes compactes du tableau. */
  const formatDateCourte = (dateString: string | null) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { year: '2-digit', month: 'short', day: 'numeric' });
  };

  /** Mois « 2025-10 » → « oct. 25 » pour les axes des courbes. */
  const formatMois = (mois: string) => {
    const [annee, m] = mois.split('-');
    if (!annee || !m) return mois;
    const d = new Date(Number(annee), Number(m) - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  };

  const serieVide = (serie: AdminSeriePoint[]) =>
    serie.length === 0 || serie.every((p) => !p.valeur);

  // ---- Écran « session expirée » (plus de redirection muette) ----
  if (!loading && accessState === 'no-session') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Session expirée</h1>
          <p className="text-sm text-gray-600 mb-5">
            Session expirée, reconnecte-toi pour accéder à l'administration.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Se reconnecter</span>
          </button>
        </div>
      </div>
    );
  }

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

  const diag = activite?.diagnosticLastLogin;
  const lastLoginDouteux = !!diag && (diag.nuls + diag.egalCreation) > 0;

  const indicateurs = activite
    ? [
        { cle: 'inscrits', label: 'Inscrits', valeur: activite.indicateurs.inscrits, Icone: Users, couleur: 'text-blue-600' },
        { cle: 'actifs7', label: 'Actifs 7 j', valeur: activite.indicateurs.actifs7, Icone: Activity, couleur: 'text-green-600' },
        { cle: 'actifs30', label: 'Actifs 30 j', valeur: activite.indicateurs.actifs30, Icone: Activity, couleur: 'text-emerald-600' },
        { cle: 'dormants', label: 'Dormants', valeur: activite.indicateurs.dormants, Icone: Moon, couleur: 'text-amber-600' },
        { cle: 'jamais', label: 'Jamais revenus', valeur: activite.indicateurs.jamaisRevenus, Icone: UserX, couleur: 'text-slate-600' },
        { cle: 'fantomes', label: 'Fantômes', valeur: activite.indicateurs.fantomes, Icone: Ghost, couleur: 'text-gray-500' }
      ]
    : [];

  const totauxCohortes = (activite?.cohortes || []).reduce(
    (acc, c) => ({
      inscrits: acc.inscrits + c.inscrits,
      m1: acc.m1 + c.m1,
      m2: acc.m2 + c.m2,
      m3: acc.m3 + c.m3
    }),
    { inscrits: 0, m1: 0, m2: 0, m3: 0 }
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 pb-20 overflow-x-hidden">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
            <p className="text-gray-600 text-sm">Gestion des utilisateurs et données</p>
          </div>
        </div>

        {/* Alertes */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm break-words">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm break-words">{success}</p>
          </div>
        )}
      </div>

      {/* ---------- BANDEAU D'ACTIVITÉ ---------- */}
      {activite && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Activité
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {indicateurs.map(({ cle, label, valeur, Icone, couleur }) => (
              <div key={cle} className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Icone className={`w-4 h-4 flex-shrink-0 ${couleur}`} />
                  <span className="text-xs font-medium text-gray-600 truncate">{label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{valeur}</p>
              </div>
            ))}
          </div>

          {lastLoginDouteux && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900 min-w-0">
                <p className="font-medium">Indicateurs de connexion peu fiables</p>
                <p className="break-words">
                  {diag!.egalCreation + diag!.nuls} compte(s) sur {diag!.total} ont une date de dernière
                  connexion nulle ou identique à leur inscription : la colonne n'est pas mise à jour à
                  chaque connexion. « Actifs 7 j / 30 j » et « Dormants » sont donc à lire avec réserve ;
                  les dates non exploitables sont affichées « inconnue ». Le nombre de transactions et la
                  date de la dernière transaction restent, eux, fiables.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- COURBES ---------- */}
      {activite && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Inscriptions par mois</h3>
            {serieVide(activite.inscriptionsParMois) ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-center text-gray-400">
                <Users className="w-8 h-8 mb-2 text-gray-300" />
                <p className="text-sm">Aucune inscription depuis octobre 2025</p>
              </div>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activite.inscriptionsParMois} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mois" tickFormatter={formatMois} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                    <Tooltip
                      isAnimationActive={false}
                      labelFormatter={(v) => formatMois(String(v))}
                      formatter={(v: any) => [v, 'Inscriptions']}
                    />
                    <Line
                      type="monotone"
                      dataKey="valeur"
                      name="Inscriptions"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Transactions par mois</h3>
            {serieVide(activite.transactionsParMois) ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-center text-gray-400">
                <BarChart3 className="w-8 h-8 mb-2 text-gray-300" />
                <p className="text-sm">Aucune transaction depuis octobre 2025</p>
              </div>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activite.transactionsParMois} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mois" tickFormatter={formatMois} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                    <Tooltip
                      isAnimationActive={false}
                      labelFormatter={(v) => formatMois(String(v))}
                      formatter={(v: any) => [v, 'Transactions']}
                    />
                    <Line
                      type="monotone"
                      dataKey="valeur"
                      name="Transactions"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- RÉTENTION PAR COHORTE ---------- */}
      {activite && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Rétention par cohorte</h3>
            <p className="text-xs text-gray-500 mt-1">
              Inscrits ayant saisi au moins une transaction le 1<sup>er</sup>, 2<sup>e</sup> ou 3<sup>e</sup> mois
              suivant leur inscription.
            </p>
          </div>
          {activite.cohortes.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Aucune cohorte à afficher</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2 font-medium">Mois</th>
                    <th className="px-2 py-2 font-medium text-right">Inscrits</th>
                    <th className="px-2 py-2 font-medium text-right">M+1</th>
                    <th className="px-2 py-2 font-medium text-right">M+2</th>
                    <th className="px-3 py-2 font-medium text-right">M+3</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activite.cohortes.map((c) => (
                    <tr key={c.cohorte}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{formatMois(c.cohorte)}</td>
                      <td className="px-2 py-2 text-right font-medium text-gray-900">{c.inscrits}</td>
                      <td className="px-2 py-2 text-right text-gray-700">{c.m1}</td>
                      <td className="px-2 py-2 text-right text-gray-700">{c.m2}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{c.m3}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold text-gray-900">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-2 py-2 text-right">{totauxCohortes.inscrits}</td>
                    <td className="px-2 py-2 text-right">{totauxCohortes.m1}</td>
                    <td className="px-2 py-2 text-right">{totauxCohortes.m2}</td>
                    <td className="px-3 py-2 text-right">{totauxCohortes.m3}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Statistiques globales */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600 truncate">Utilisateurs</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>

          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600 truncate">Transactions</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalTransactions}</p>
          </div>

          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600 truncate">Comptes</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalAccounts}</p>
          </div>

          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <BarChart3 className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600 truncate">Budgets</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalBudgets}</p>
          </div>

          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Crown className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600 truncate">Objectifs</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.totalGoals}</p>
          </div>
        </div>
      )}

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 min-w-0 truncate">
              Utilisateurs ({users.length})
            </h2>
            <button
              onClick={loadData}
              className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700 transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualiser</span>
            </button>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <ArrowDownUp className="w-3 h-3 flex-shrink-0" />
            <span>Triés par dernière transaction, de la plus récente à la plus ancienne</span>
          </p>
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
              const etat = ETAT_LABELS[user.etat];
              return (
                <div key={user.id} className="border-b border-gray-200 last:border-b-0">
                  {/* Card Header - Clickable */}
                  <div
                    className="p-3 sm:p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleCardClick(user.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start space-x-3">
                          {/* User Avatar */}
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <h3 className="font-medium text-gray-900 truncate max-w-[10rem] sm:max-w-none">
                                {user.username}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${etat.classes}`}>
                                {etat.label}
                              </span>
                              {user.isCurrentUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Vous
                                </span>
                              )}
                              {user.role === 'admin' && !user.isCurrentUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Admin
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1 min-w-0">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>

                            {/* Données d'usage */}
                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                              <div className="flex items-center space-x-1 min-w-0">
                                <BarChart3 className="w-3 h-3 flex-shrink-0 text-green-600" />
                                <span className="truncate">
                                  {user.transactionsCount} transaction{user.transactionsCount > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <Clock className="w-3 h-3 flex-shrink-0 text-emerald-600" />
                                <span className="truncate">
                                  Dernière tx : {formatDateCourte(user.lastTransactionAt)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <LogIn className="w-3 h-3 flex-shrink-0 text-blue-600" />
                                <span className="truncate">
                                  Connexion : {user.lastLoginInconnu ? 'inconnue' : formatDateCourte(user.last_login_at)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0">
                                <Calendar className="w-3 h-3 flex-shrink-0 text-purple-600" />
                                <span className="truncate">
                                  Inscrit : {formatDateCourte(user.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 min-w-0 col-span-2">
                                <RefreshCw className="w-3 h-3 flex-shrink-0 text-gray-400" />
                                <span className="truncate">
                                  Modifié : {formatDateCourte(user.updated_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center flex-shrink-0">
                        {user.isCurrentUser ? (
                          <span className="text-xs text-gray-400 px-1">Vous</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(user.id);
                            }}
                            disabled={deleting === user.id}
                            aria-label={`Supprimer ${user.username}`}
                            className="flex items-center space-x-1 px-2 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === user.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-3 sm:px-4 pb-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                                  <div className="flex items-center min-w-0">
                                    <Target className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" />
                                    <h5 className="text-sm font-medium text-gray-900 truncate">Fond d'urgence</h5>
                                  </div>
                                  <Trophy className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                </div>

                                <div className="flex items-center justify-between text-sm text-gray-700 mb-3 gap-2">
                                  <span className="font-medium truncate">{formatAriary(emergencyFundGoal.currentAmount)}</span>
                                  <span className="font-medium truncate">{formatAriary(emergencyFundGoal.targetAmount)}</span>
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
                              <p className="text-xl font-bold text-gray-900 mb-1 break-words">
                                {formatCurrency(user.monthlyIncome)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {user.monthlyIncome ? 'Revenus du mois en cours' : 'Aucune donnée disponible'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-gray-400 break-all">
                        Dernière synchronisation : {user.last_sync ? formatDate(user.last_sync) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Note sur la suppression d'utilisateurs */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-yellow-800 min-w-0">
          <p className="font-medium">Note importante sur la suppression d'utilisateurs</p>
          <p className="break-words">La suppression des données publiques est automatique. Si la suppression de auth.users échoue (erreur 403), un nettoyage manuel via le Dashboard Supabase peut être requis.</p>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 sm:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 break-words">
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
