import { useEffect, useRef, useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS, CONSTRUCTION_NAV_ITEMS, GESTION_EAU_NAV_ITEMS } from '../../constants';
import { Home, Wallet, ArrowUpDown, PieChart, Target, Users, LayoutDashboard, ShoppingCart, Package, Warehouse, PlusCircle, Gauge, TrendingUp, Network, FileText, Droplet, Receipt, Waves, GripVertical, Check } from 'lucide-react';
import { useModuleSwitcher, type Module } from '../../contexts/ModuleSwitcherContext';
import { ConstructionContext } from '../../modules/construction-poc/context';
import { canAccessBCI } from '../../modules/construction-poc/utils/rolePermissions';
import { GestionEauContext } from '../../modules/gestion-eau/context';
import { useAppStore } from '../../stores/appStore';
import apiService from '../../services/apiService';
import { orderModules } from '../../utils/moduleOrder';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Élément triable d'un module en mode « réorganiser » (glisser-déposer @dnd-kit).
 * L'élément entier sert de poignée de prise (listeners) ; un repère GripVertical
 * et l'anneau sur le module actif rendent l'affordance lisible.
 */
const SortableModuleItem = ({ module, isActive }: { module: Module; isActive: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mobile-nav-item flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing ${isDragging ? 'z-10' : ''}`}
      aria-label={`Déplacer ${module.name}`}
    >
      <div className={`relative p-3 rounded-xl bg-slate-50 ${isActive ? 'ring-2 ring-blue-400' : ''}`}>
        <span className="text-xl leading-none" role="img" aria-label={module.name}>
          {module.icon}
        </span>
        <GripVertical className="absolute -top-1 -right-1 w-3 h-3 text-slate-400" />
      </div>
      <span className="text-xs font-semibold mt-1 text-slate-600">{module.name}</span>
    </div>
  );
};

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

  // Utilisateur (Zustand) : source de l'ordre personnalisé des modules, persisté
  // localement et synchronisé via preferences.moduleOrder.
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const orderedModules = orderModules(availableModules, user?.preferences?.moduleOrder);

  // Sous-mode « réorganiser » (glisser-déposer) du switcher.
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Détection d'appui long pour entrer en réorganisation (tap court = bascule).
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 8 } })
  );

  // Toujours sortir de la réorganisation quand on quitte le mode switcher.
  useEffect(() => {
    if (!isSwitcherMode) setIsReorderMode(false);
  }, [isSwitcherMode]);

  // Repartir d'un drapeau d'appui long propre hors réorganisation : évite qu'un
  // appui long (qui a ouvert la réorganisation sans clic consommateur, le bouton
  // ayant été démonté) ne fasse avaler le tap suivant (souris ou clavier).
  useEffect(() => {
    if (!isReorderMode) longPressFired.current = false;
  }, [isReorderMode]);

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleModulePointerDown = (e: React.PointerEvent) => {
    longPressFired.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    cancelLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setIsReorderMode(true);
    }, 400);
  };

  const handleModulePointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);
    if (dx > 10 || dy > 10) cancelLongPress();
  };

  /**
   * Persiste un nouvel ordre de modules : d'abord optimiste local (instantané,
   * hors-ligne, persisté par Zustand), puis synchro Supabase best-effort sans
   * jamais bloquer l'UI ni écraser les autres préférences.
   */
  const persistModuleOrder = async (moduleOrder: string[]) => {
    if (!user) return;
    const merged = { ...user.preferences, moduleOrder };
    setUser({ ...user, preferences: merged }); // optimiste local
    try {
      const result = await apiService.updateUserPreferences(user.id, merged);
      if (result.success && result.data) setUser(result.data);
    } catch {
      // Hors-ligne / réseau bloqué : l'ordre local reste appliqué, repartira au
      // prochain changement en ligne.
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = orderedModules.map((m) => m.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    persistModuleOrder(arrayMove(ids, oldIndex, newIndex));
  };
  
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
        // Exit switcher mode (and reorder sub-mode) when clicking outside
        setIsReorderMode(false);
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
    // Mode « réorganiser » : tous les modules (actif inclus) en liste triable.
    if (isReorderMode) {
      const ids = orderedModules.map((m) => m.id);
      return (
        <nav
          ref={navRef}
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl z-50 safe-area-inset overscroll-none lg:hidden"
        >
          <div className="flex flex-col animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-2 px-3 pt-1.5 pb-0.5">
              <span className="text-[11px] leading-tight text-slate-500">
                Glissez les modules pour les ranger. Touchez ailleurs pour terminer.
              </span>
              <button
                onClick={() => setIsReorderMode(false)}
                className="flex items-center gap-1 flex-shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                aria-label="Terminer la réorganisation"
              >
                <Check className="w-3.5 h-3.5" />
                Terminé
              </button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-nowrap items-center gap-1 overflow-x-auto px-2 py-1.5">
                  {orderedModules.map((module) => (
                    <SortableModuleItem
                      key={module.id}
                      module={module}
                      isActive={module.id === activeModule?.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </nav>
      );
    }

    // Mode switcher normal : alternatives (module actif masqué), tap = bascule,
    // appui long = entrée en réorganisation. Rangée défilante horizontalement.
    const nonActiveModules = orderedModules.filter((module) => module.id !== activeModule?.id);

    return (
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl z-50 safe-area-inset overscroll-none lg:hidden"
      >
        <div className="flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-around flex-nowrap overflow-x-auto py-1.5">
            {nonActiveModules.map((module) => (
              <button
                key={module.id}
                onClick={() => {
                  if (longPressFired.current) {
                    longPressFired.current = false;
                    return; // l'appui long a déjà ouvert la réorganisation
                  }
                  handleModuleSwitch(module.id);
                }}
                onPointerDown={handleModulePointerDown}
                onPointerMove={handleModulePointerMove}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                className="mobile-nav-item flex-shrink-0 select-none"
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
            ))}
          </div>
          <div className="pb-0.5 text-center text-[10px] text-slate-400">
            Appui long pour réorganiser
          </div>
        </div>
      </nav>
    );
  };

  // Render based on current mode
  return isSwitcherMode ? renderSwitcherMode() : renderNavigationMode();
};

export default BottomNav;
