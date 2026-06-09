import { useEffect, useRef, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS, CONSTRUCTION_NAV_ITEMS, GESTION_EAU_NAV_ITEMS } from '../../constants';
import { Home, Wallet, ArrowUpDown, PieChart, Target, Users, LayoutDashboard, ShoppingCart, Package, Warehouse, PlusCircle, Gauge, TrendingUp, Network, FileText, Droplet, Receipt, Waves } from 'lucide-react';
import { useModuleSwitcher } from '../../contexts/ModuleSwitcherContext';
import { ConstructionContext } from '../../modules/construction-poc/context';
import { canAccessBCI } from '../../modules/construction-poc/utils/rolePermissions';
import { GestionEauContext } from '../../modules/gestion-eau/context';

/*
 * SPACING CHANGES MADE FOR COMPACT BOTTOM NAV:
 * - Container padding: py-4 → py-2 → py-1.5 (16px → 8px → 6px vertical)
 * - Icon size: w-6 h-6 → w-5 h-5 → w-[18px] h-[18px] (24px → 20px → 18px)
 * - Text margin: mt-2 → mt-1 (8px → 4px) - preserved for readability
 * - Icon container padding: p-3 → p-2 → p-1.5 (12px → 8px → 6px) in CSS
 * - Estimated height reduction: 80-90px → 55-65px → 48-56px
 */

const iconMap = {
  // BazarKELY icons
  Home,
  Wallet,
  ArrowUpDown,
  PieChart,
  Target,
  Users,
  // Construction POC icons
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  PlusCircle,
  // Gestion Eau (AHUVI) icons
  Gauge,
  TrendingUp,
  Network,
  FileText,
  Droplet,
  Receipt,
  Waves
};

const BottomNav = () => {
  const {
    isSwitcherMode,
    activeModule,
    availableModules,
    setActiveModule,
    setSwitcherMode
  } = useModuleSwitcher();
  const navRef = useRef<HTMLElement>(null);
  
  // Get user role for BCI access control (AGENT 11)
  // Use useContext directly to safely check if ConstructionProvider exists
  const constructionContext = useContext(ConstructionContext);
  const userRole = constructionContext?.userRole || null;
  const showBCIItems = activeModule?.id === 'construction'
    ? canAccessBCI(userRole)
    : true; // Show all items if not in Construction module

  // Gestion Eau : rôles (admin/releveur/client, cumulables) pour filtrer la nav du module.
  // useContext direct → ne plante pas si le provider n'est pas monté.
  const eauContext = useContext(GestionEauContext);
  const eauRoles = eauContext?.roles ?? null;
  const isEauModule = activeModule?.id === 'gestion-eau';

  // Click-outside detection to exit switcher mode
  useEffect(() => {
    if (!isSwitcherMode) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Check if click is outside the nav element
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        // Exit switcher mode when clicking outside
        setSwitcherMode(false);
      }
    };

    // Add event listener with a small delay to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSwitcherMode, setSwitcherMode]);

  /**
   * Handle module switch
   */
  const handleModuleSwitch = (moduleId: string) => {
    // Si on est déjà dans ce module, fermer juste le mode switcher
    if (activeModule?.id === moduleId) {
      setSwitcherMode(false);
      return;
    }

    // Changer de module
    setActiveModule(moduleId);
    // setActiveModule ferme déjà le mode switcher automatiquement
  };

  /**
   * Render navigation mode (shows BazarKELY or Construction items based on active module)
   */
  const renderNavigationMode = () => {
    // Select navigation items based on active module.
    // Construction → CONSTRUCTION_NAV_ITEMS, Gestion Eau → GESTION_EAU_NAV_ITEMS (rôle-filtrés),
    // sinon BazarKELY.
    let navItems: ReadonlyArray<{ path: string; icon: string; label: string }> =
      activeModule?.id === 'construction'
        ? CONSTRUCTION_NAV_ITEMS
        : isEauModule
        ? GESTION_EAU_NAV_ITEMS.filter(
            (it) => !it.roles || it.roles.some((r) => eauRoles?.[r])
          )
        : BOTTOM_NAV_ITEMS;

    // Filtre BCI (Construction)
    if (activeModule?.id === 'construction' && !showBCIItems) {
      // Filter out BCI-related navigation items if user doesn't have access
      navItems = navItems.filter(item => {
        // Hide "Commandes" (orders) and "Nouvelle commande" (new-order) for unauthorized roles
        return item.path !== '/construction/orders' && item.path !== '/construction/new-order';
      });
    }

    // Garde-fou : jamais plus de 6 boutons dans la barre (cumul de rôles rare).
    if (navItems.length > 6) navItems = navItems.slice(0, 6);

    // Thème actif : vert AHUVI en mode eau, bleu sinon.
    const activeBg = isEauModule ? 'bg-ahuvi-forest' : 'bg-blue-600';
    const hoverBg = isEauModule ? 'hover:bg-ahuvi-50' : 'hover:bg-blue-50';
    const activeText = isEauModule ? 'text-ahuvi-forest' : 'text-blue-600';

    return (
      <nav 
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl z-50 safe-area-inset overscroll-none lg:hidden"
      >
        <div className="flex items-center justify-around py-1.5 animate-in fade-in duration-300">
          {navItems.map((item) => {
            const IconComponent = iconMap[item.icon as keyof typeof iconMap];
            // Routes "racine" (dashboard eau, espace client) → match exact pour ne pas
            // rester actives sur leurs sous-routes (ex. /gestion-eau/client/factures).
            const exact = item.path === '/gestion-eau' || item.path === '/gestion-eau/client';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={exact}
                className={({ isActive }) =>
                  `mobile-nav-item ${isActive ? 'active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-3 rounded-xl transition-all duration-300 ${isActive ? `${activeBg} shadow-lg scale-110` : `${hoverBg} hover:scale-105`}`}>
                      <IconComponent className={`w-[18px] h-[18px] transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <span className={`text-xs font-semibold mt-1 transition-colors duration-200 ${isActive ? activeText : 'text-slate-600'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    );
  };

  /**
   * Render switcher mode (shows all available modules with active indicator)
   */
  const renderSwitcherMode = () => {
    // Filter out the active module to show only available alternatives
    const nonActiveModules = availableModules.filter(module => module.id !== activeModule?.id);
    
    return (
      <nav 
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl z-50 safe-area-inset overscroll-none lg:hidden"
      >
        <div className="flex items-center justify-around py-1.5 animate-in fade-in duration-300">
          {nonActiveModules.map((module) => {
            return (
              <button
                key={module.id}
                onClick={() => handleModuleSwitch(module.id)}
                className="mobile-nav-item"
                aria-label={`Sélectionner ${module.name}`}
              >
                <div className="p-3 rounded-xl transition-all duration-300 hover:bg-blue-50 hover:scale-105">
                  <span className="text-xl leading-none" role="img" aria-label={module.name}>
                    {module.icon}
                  </span>
                </div>
                <span className="text-xs font-semibold mt-1 transition-colors duration-200 text-slate-600">
                  {module.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  };

  // Render based on current mode
  return isSwitcherMode ? renderSwitcherMode() : renderNavigationMode();
};

export default BottomNav;
