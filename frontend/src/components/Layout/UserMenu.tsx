import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { User, Settings, LogOut, Shield, Download, Trash2 } from 'lucide-react';
import usePWAInstall from '../../hooks/usePWAInstall';
import type { User as UserType } from '../../types';

interface UserMenuProps {
  user: UserType | null;
  isAdmin: boolean;
  onLogout: () => void;
  showUsername?: boolean;
}

const UserMenu = React.memo<UserMenuProps>(({ user, isAdmin, onLogout, showUsername = false }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isInstallable, isInstalled, install, uninstall } = usePWAInstall();

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  const handleLogoutClick = async (event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher la propagation vers le gestionnaire de clic extérieur
    await onLogout();
    handleMenuClose();
  };

  const handleSettingsClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher la propagation vers le gestionnaire de clic extérieur
    console.log('Paramètres cliqués');
    handleMenuClose();
    navigate('/settings');
  };

  const handleAdminClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher la propagation vers le gestionnaire de clic extérieur
    console.log('Admin cliqué');
    handleMenuClose();
    // Navigation vers la page admin
    navigate('/admin');
  };

  const handlePWAInstallClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      if (isInstalled) {
        await uninstall();
      } else {
        await install();
      }
      handleMenuClose();
    } catch (error) {
      console.error('Erreur PWA:', error);
    }
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
    <>
      {/* Menu utilisateur */}
      <div 
        className="user-menu-container flex items-center space-x-3 bg-purple-500/40 backdrop-blur-sm rounded-xl p-3 border border-purple-300/50 shadow-lg cursor-pointer hover:bg-purple-500/50 transition-all duration-200 relative"
        onClick={handleMenuToggle}
      >
        <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center border border-white/60">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="hidden sm:block">
          {showUsername && (
            <span className="text-white font-semibold text-sm">{user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase() : 'Utilisateur'}</span>
          )}
        </div>
        <div className="text-purple-100">
          {isMenuOpen ? '▲' : '▼'}
        </div>
      </div>

      {/* Menu déroulant des actions */}
      {isMenuOpen && (
        <div className="dropdown-menu absolute top-full right-0 mt-2 bg-purple-500/80 backdrop-blur-sm rounded-xl p-3 border border-purple-300/50 shadow-lg z-50 min-w-[200px]">
          <div className="flex flex-col space-y-2">
            {/* NEW USER IDENTIFICATION SECTION - Compte actif */}
            <div className="bg-purple-400/20 border border-purple-300/30 rounded-lg p-3 mb-2">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-purple-200" />
                <div className="flex flex-col">
                  <span className="text-xs text-purple-200 font-medium">Compte actif:</span>
                  <span className="text-sm text-purple-50 font-semibold">
                    {user?.detailedProfile?.firstName || user?.username || 'Utilisateur'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Bouton PWA Install/Uninstall - PREMIER ÉLÉMENT */}
            {isInstallable && (
              <button 
                className="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 text-white hover:bg-white/10"
                onClick={handlePWAInstallClick}
              >
                {isInstalled ? (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Désinstaller l'application</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span className="text-sm font-medium">Installer l'application</span>
                  </>
                )}
              </button>
            )}
            
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
    </>
  );
});

UserMenu.displayName = 'UserMenu';

export default UserMenu;

