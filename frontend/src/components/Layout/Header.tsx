import { useAppStore } from '../../stores/appStore';
import { Bell, User, Settings, LogOut, Wifi, WifiOff, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../../services/apiService';
import adminService from '../../services/adminService';

const Header = () => {
  const { user, logout } = useAppStore();
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const messages = [
    "Gérez votre budget familial en toute simplicité",
    "Voici un aperçu de vos finances"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      
      // Change le message après la fade out
      setTimeout(() => {
        setCurrentMessage((prev) => (prev + 1) % messages.length);
        // Fade in
        setIsVisible(true);
      }, 1000); // Délai de 1000ms (1 seconde) pour le changement
    }, 6000); // Change toutes les 6 secondes

    return () => clearInterval(interval);
  }, [messages.length]);

  // Vérifier le statut de connexion API
  useEffect(() => {
    const checkConnection = async () => {
      const status = await apiService.getServerStatus();
      setIsOnline(status.online);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Vérifier toutes les 30 secondes

    return () => clearInterval(interval);
  }, []);

  // Vérifier les privilèges admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.email) {
        const adminStatus = await adminService.isAdmin();
        setIsAdmin(adminStatus);
      }
    };

    checkAdminStatus();
  }, [user?.email]);

  const handleLogout = async () => {
    try {
      console.log('🚪 Déconnexion depuis le header...');
      await logout();
      console.log('✅ Déconnexion depuis le header réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion depuis le header:', error);
    }
  };

  const handleLogoutClick = async (event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher la propagation vers le gestionnaire de clic extérieur
    await handleLogout();
    handleMenuClose();
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  const handleSettingsClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher la propagation vers le gestionnaire de clic extérieur
    console.log('Paramètres cliqués');
    // Pour l'instant, on peut rediriger vers une page de paramètres ou ouvrir un modal
    // Ici on ferme le menu et on peut ajouter d'autres fonctionnalités
    handleMenuClose();
    // TODO: Implémenter la navigation vers les paramètres ou l'ouverture d'un modal
  };

  const handleAdminClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher la propagation vers le gestionnaire de clic extérieur
    console.log('Admin cliqué');
    handleMenuClose();
    // Navigation vers la page admin
    window.location.href = '/admin';
  };

  // Fermer le menu en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen) {
        const target = event.target as HTMLElement;
        // Vérifier si le clic est à l'extérieur du menu ET du conteneur utilisateur
        if (!target.closest('.user-menu-container') && !target.closest('.dropdown-menu')) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="backdrop-blur-md bg-gradient-to-r from-purple-900/80 to-purple-800/80 border-b border-purple-300/50 shadow-lg shadow-purple-500/20 sticky top-0 z-40">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/40 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/50">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                BazarKELY
              </h1>
              <p className="text-sm text-purple-100 font-medium drop-shadow-sm">Budget familial Madagascar</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <Link 
              to="/notification-preferences"
              className="p-3 text-purple-100 hover:text-white hover:bg-purple-500/20 rounded-xl transition-all duration-200 relative group backdrop-blur-sm"
            >
              <Bell className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
              <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white shadow-lg"></span>
            </Link>

            {/* Menu utilisateur */}
            <div 
              className="user-menu-container flex items-center space-x-3 bg-purple-500/40 backdrop-blur-sm rounded-xl p-3 border border-purple-300/50 shadow-lg cursor-pointer hover:bg-purple-500/50 transition-all duration-200 relative"
              onClick={handleMenuToggle}
            >
              <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center border border-white/60">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-white font-semibold text-sm">{user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase() : 'Utilisateur'}</span>
                <div className="text-xs text-purple-200">Madagascar</div>
              </div>
              <div className="text-purple-100">
                {isMenuOpen ? '▲' : '▼'}
              </div>
            </div>

            {/* Menu déroulant des actions */}
            {isMenuOpen && (
              <div className="dropdown-menu absolute top-full right-0 mt-2 bg-purple-500/80 backdrop-blur-sm rounded-xl p-3 border border-purple-300/50 shadow-lg z-50 min-w-[200px]">
                <div className="flex flex-col space-y-2">
                  {/* Indicateur de sauvegarde complet */}
                  <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-300/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-100">Sauvegarde Cloud</span>
                      <Link 
                        to="/backup-management"
                        className="text-xs text-purple-200 hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuClose();
                        }}
                      >
                        Gérer
                      </Link>
                    </div>
                    {/* BackupStatusIndicator supprimé - architecture simplifiée */}
                  </div>
                  <button 
                    className="flex items-center space-x-3 p-3 text-purple-100 hover:text-white hover:bg-purple-500/20 rounded-xl transition-all duration-200 backdrop-blur-sm w-full text-left"
                    onClick={handleSettingsClick}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">Paramètres</span>
                  </button>
                  {isAdmin && (
                    <button 
                      className="flex items-center space-x-3 p-3 text-purple-100 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 backdrop-blur-sm w-full text-left"
                      onClick={handleAdminClick}
                    >
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">Administration</span>
                    </button>
                  )}
                  <button 
                    onClick={handleLogoutClick}
                    className="flex items-center space-x-3 p-3 text-purple-100 hover:text-white hover:bg-red-500/30 rounded-xl transition-all duration-200 backdrop-blur-sm w-full text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Déconnexion</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Informations utilisateur */}
        {user && (
          <div className="mt-4 text-sm text-white bg-purple-500/40 backdrop-blur-sm rounded-xl p-4 border border-purple-300/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Bonjour, {user.username?.charAt(0).toUpperCase() + user.username?.slice(1).toLowerCase()} !</span>
                <span className={`text-purple-100 ml-2 transition-opacity duration-1000 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {messages[currentMessage]}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                       {isOnline ? (
                         <Wifi className="w-4 h-4 text-green-500" />
                       ) : (
                         <WifiOff className="w-4 h-4 text-red-500" />
                       )}
                <span className="text-xs text-purple-100">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
