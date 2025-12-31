import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, Shield, LogOut, Download, Trash2 } from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import usePWAInstall from '../../../hooks/usePWAInstall';
import adminService from '../../../services/adminService';

interface UserMenuDropdownProps {
  showUsername: boolean;
  className?: string;
}

/**
 * UserMenuDropdown - Budget module user menu with account info, PWA, settings, admin, logout
 * Features modern glassmorphism design with smooth animations
 */
export function UserMenuDropdown({ showUsername, className = '' }: UserMenuDropdownProps) {
  const user = useAppStore(state => state.user);
  const logout = useAppStore(state => state.logout);
  const navigate = useNavigate();
  const { isInstallable, isInstalled, install, uninstall } = usePWAInstall();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.email) {
        const adminStatus = await adminService.isAdmin();
        setIsAdmin(adminStatus);
      }
    };
    checkAdminStatus();
  }, [user?.email]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen) {
        const target = event.target as HTMLElement;
        // Check if click is outside menu AND user container
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

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Déconnexion depuis le menu utilisateur...');
      await logout();
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
  };

  const handleLogoutClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await handleLogout();
    handleMenuClose();
  };

  const handleSettingsClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Paramètres cliqués');
    handleMenuClose();
    navigate('/settings');
  };

  const handleAdminClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Admin cliqué');
    handleMenuClose();
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

  const displayName = user?.detailedProfile?.firstName || user?.username || 'Utilisateur';
  const capitalizedUsername = user?.username 
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase()
    : 'Utilisateur';

  return (
    <div className={`relative ${className}`}>
      {/* User menu button */}
      <div 
        className="user-menu-container flex items-center space-x-3 bg-purple-500/40 backdrop-blur-sm rounded-xl p-3 border border-purple-300/50 shadow-lg cursor-pointer hover:bg-purple-500/50 transition-all duration-200 relative"
        onClick={handleMenuToggle}
      >
        <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center border border-white/60 hover:bg-white/60 transition-colors">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="hidden sm:block">
          {showUsername && (
            <span className="text-white font-semibold text-sm">{capitalizedUsername}</span>
          )}
        </div>
        <div className="text-purple-100 transition-transform duration-200">
          {isMenuOpen ? '▲' : '▼'}
        </div>
      </div>

      {/* Dropdown menu with smooth animation */}
      {isMenuOpen && (
        <div className="dropdown-menu absolute top-full right-0 mt-2 bg-purple-500/80 backdrop-blur-sm rounded-xl p-3 border border-purple-300/50 shadow-lg z-50 min-w-[200px] animate-[fadeIn_0.2s_ease-out]">
          <div className="flex flex-col space-y-2">
            {/* User identification section */}
            <div className="bg-purple-400/20 border border-purple-300/30 rounded-lg p-3 mb-2">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-purple-200" />
                <div className="flex flex-col">
                  <span className="text-xs text-purple-200 font-medium">Compte actif:</span>
                  <span className="text-sm text-purple-50 font-semibold">{displayName}</span>
                </div>
              </div>
            </div>
            
            {/* PWA Install/Uninstall button */}
            {isInstallable && (
              <button 
                className="w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 text-white hover:bg-white/10 hover:scale-[1.02]"
                onClick={handlePWAInstallClick}
              >
                {isInstalled ? (
                  <>
                    <Trash2 className="w-5 h-5 transition-transform hover:scale-110" />
                    <span className="text-sm font-medium">Désinstaller l'application</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 transition-transform hover:scale-110" />
                    <span className="text-sm font-medium">Installer l'application</span>
                  </>
                )}
              </button>
            )}
            
            {/* Cloud backup section */}
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
            </div>
            
            {/* Settings button */}
            <button 
              className="flex items-center space-x-3 p-3 text-purple-100 hover:text-white hover:bg-purple-500/20 rounded-xl transition-all duration-200 backdrop-blur-sm w-full text-left group"
              onClick={handleSettingsClick}
            >
              <Settings className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">Paramètres</span>
            </button>
            
            {/* Admin button (only if admin) */}
            {isAdmin && (
              <button 
                className="flex items-center space-x-3 p-3 text-purple-100 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 backdrop-blur-sm w-full text-left group"
                onClick={handleAdminClick}
              >
                <Shield className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium">Administration</span>
              </button>
            )}
            
            {/* Logout button */}
            <button 
              onClick={handleLogoutClick}
              className="flex items-center space-x-3 p-3 text-purple-100 hover:text-white hover:bg-red-500/30 rounded-xl transition-all duration-200 backdrop-blur-sm w-full text-left group"
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenuDropdown;







