import { useAppStore } from '../../stores/appStore';
import { Bell, User, Settings, LogOut, Wifi, WifiOff, Shield, Download, Trash2, ChevronRight, Target, Brain, Lightbulb, BookOpen, Sparkles } from 'lucide-react';
import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../services/apiService';
import adminService from '../../services/adminService';
import usePWAInstall from '../../hooks/usePWAInstall';
import QuizQuestionPopup, { questions } from '../Quiz/QuizQuestionPopup';
import { useCertificationStore } from '../../store/certificationStore';
import LevelBadge from '../Certification/LevelBadge';
import { level1Questions } from '../../data/certificationQuestions';
import { useModuleSwitcher } from '../../contexts/ModuleSwitcherContext';
import { ConstructionContext } from '../../modules/construction-poc/context/ConstructionContext';
import { MemberRole } from '../../modules/construction-poc/types/construction';

// Types pour les messages interactifs
type MessageType = 'motivational' | 'priority_question' | 'quiz' | 'quiz_question' | 'priority-questionnaire';

interface InteractiveMessage {
  text: string;
  type: MessageType;
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
  questionId?: string; // For quiz questions
}

const Header = () => {
  const { user, logout } = useAppStore();
  const { toggleSwitcherMode, isSwitcherMode, activeModule } = useModuleSwitcher();
  const location = useLocation();
  
  // DEBUG: Log activeModule to identify correct id value
  console.log('🔍 [Header Debug] activeModule:', activeModule);
  console.log('🔍 [Header Debug] activeModule?.id:', activeModule?.id);
  console.log('🔍 [Header Debug] activeModule?.name:', activeModule?.name);
  console.log('🔍 [Header Debug] location.pathname:', location.pathname);
  console.log('🔍 [Header Debug] isSwitcherMode:', isSwitcherMode);
  
  // FIX: Use pathname as primary source of truth to avoid race condition
  // When activeModule is null on first render, pathname ensures correct detection
  // Construction module detection: check pathname first, then activeModule as fallback
  const isConstructionModule = location.pathname.includes('/construction')
    || activeModule?.id === 'construction'
    || activeModule?.id === 'construction-poc';
  
  console.log('🔍 [Header Debug] isConstructionModule:', isConstructionModule);
  
  // Get Construction context only when in Construction module
  const constructionContext = useContext(ConstructionContext);
  const constructionRole = isConstructionModule && constructionContext 
    ? constructionContext.userRole 
    : null;
  const activeCompany = isConstructionModule && constructionContext
    ? constructionContext.activeCompany
    : null;
  const { 
    currentLevel, 
    totalQuestionsAnswered, 
    correctAnswers, 
    detailedProfile, 
    geolocation,
    levelProgress,
    badges,
    certifications,
    practiceTracking
  } = useCertificationStore();

  // Calculate scores for display
  const quizScore = Math.min(40, Math.floor((correctAnswers / Math.max(1, totalQuestionsAnswered)) * 40));
  const practiceScore = practiceTracking.practiceScore;
  const profileScore = detailedProfile.firstName ? 15 : 0; // Simplified profile completion score
  const navigate = useNavigate();
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [logoRipple, setLogoRipple] = useState(false);
  
  // Role simulation dropdown state (Admin only)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  
  // DAILY SESSION 6AM RESET - Username visibility state
  const [showUsername, setShowUsername] = useState(false);
  
  // Quiz popup state
  const [showQuizPopup, setShowQuizPopup] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string>('');
  const [completedQuizIds, setCompletedQuizIds] = useState<string[]>([]);
  
  // Priority questionnaire banner state
  const [isPriorityQuestionnaireBannerDismissed, setIsPriorityQuestionnaireBannerDismissed] = useState(false);
  
  
  // Hook PWA pour l'installation/désinstallation
  const { isInstallable, isInstalled, install, uninstall } = usePWAInstall();

  // Vérifier si l'utilisateur a complété le questionnaire de priorités
  const hasCompletedPriorityQuestions = user?.preferences?.priorityAnswers && 
    Object.keys(user.preferences.priorityAnswers).length > 0;

  // Load completed quiz questions from localStorage
  useEffect(() => {
    const loadCompletedQuizIds = () => {
      try {
        const stored = localStorage.getItem('bazarkely-quiz-questions-completed');
        if (stored) {
          const completed = JSON.parse(stored);
          setCompletedQuizIds(Array.isArray(completed) ? completed : []);
        }
      } catch (error) {
        console.error('Error loading completed quiz questions:', error);
        setCompletedQuizIds([]);
      }
    };
    
    loadCompletedQuizIds();
  }, []);

  // Load priority questionnaire banner dismissal state from localStorage
  useEffect(() => {
    const loadBannerDismissalState = () => {
      try {
        const stored = localStorage.getItem('bazarkely_priority_questionnaire_banner_dismissed');
        if (stored) {
          const dismissed = JSON.parse(stored);
          setIsPriorityQuestionnaireBannerDismissed(dismissed === true);
        }
      } catch (error) {
        console.error('Error loading priority questionnaire banner dismissal state:', error);
        setIsPriorityQuestionnaireBannerDismissed(false);
      }
    };
    
    loadBannerDismissalState();
  }, []);

  // Messages interactifs avec cycle intelligent - construction sécurisée
  const baseMessages: InteractiveMessage[] = [
    // 2 messages motivationnels
    {
      text: "Gérez votre budget familial en toute simplicité",
      type: 'motivational',
      action: () => {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
      },
      icon: Lightbulb
    },
    {
      text: "Chaque économie compte pour votre avenir",
      type: 'motivational',
      action: () => {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2000);
      },
      icon: Lightbulb
    }
  ];

  // Message questionnaire conditionnel
  const priorityQuestionMessage: InteractiveMessage = {
    text: "Définissez vos priorités financières",
    type: 'priority_question' as MessageType,
    action: () => navigate('/priority-questions'),
    icon: Target
  };

  // Message quiz
  const quizMessage: InteractiveMessage = {
    text: "Testez vos connaissances financières",
    type: 'quiz',
    action: () => {
      // Find first unanswered financial quiz question
      const financialQuizQuestions = questions.filter(q => q.id.startsWith('quiz-financial-'));
      const unansweredFinancial = financialQuizQuestions.find(q => !completedQuizIds.includes(q.id));
      
      if (unansweredFinancial) {
        setCurrentQuizId(unansweredFinancial.id);
        setShowQuizPopup(true);
        console.log('🎯 Opening financial quiz question:', unansweredFinancial.id);
      } else {
        console.log('✅ All financial quiz questions completed!');
        // Could show a toast or message that all questions are completed
      }
    },
    icon: Brain
  };

  // Quiz question messages
  const quizQuestionMessages: InteractiveMessage[] = [
    {
      text: "Coiffeur va où ?",
      type: 'quiz_question' as MessageType,
      action: () => {
        setCurrentQuizId('hairdresser');
        setShowQuizPopup(true);
      },
      icon: Brain,
      questionId: 'hairdresser'
    },
    {
      text: "Abonnement salle ?",
      type: 'quiz_question' as MessageType,
      action: () => {
        setCurrentQuizId('gym');
        setShowQuizPopup(true);
      },
      icon: Brain,
      questionId: 'gym'
    },
    {
      text: "Netflix c'est quoi ?",
      type: 'quiz_question' as MessageType,
      action: () => {
        setCurrentQuizId('netflix');
        setShowQuizPopup(true);
      },
      icon: Brain,
      questionId: 'netflix'
    },
    {
      text: "Maquillage = ?",
      type: 'quiz_question' as MessageType,
      action: () => {
        setCurrentQuizId('makeup');
        setShowQuizPopup(true);
      },
      icon: Brain,
      questionId: 'makeup'
    },
    {
      text: "Cadeau famille ?",
      type: 'quiz_question' as MessageType,
      action: () => {
        setCurrentQuizId('family-gift');
        setShowQuizPopup(true);
      },
      icon: Brain,
      questionId: 'family-gift'
    },
    {
      text: "Fournitures scolaires ?",
      type: 'quiz_question' as MessageType,
      action: () => {
        setCurrentQuizId('school-supplies');
        setShowQuizPopup(true);
      },
      icon: Brain,
      questionId: 'school-supplies'
    },
    {
      text: "Facture internet ?",
      type: 'quiz_question' as MessageType,
      action: () => {
        setCurrentQuizId('internet');
        setShowQuizPopup(true);
      },
      icon: Brain,
      questionId: 'internet'
    }
  ];

  // Check if all financial quiz questions are completed
  const financialQuizQuestions = questions.filter(q => q.id.startsWith('quiz-financial-'));
  const allFinancialQuizCompleted = financialQuizQuestions.every(q => completedQuizIds.includes(q.id));

  // Calculate quiz progress for current level
  const calculateQuizProgress = () => {
    const level1CompletedQuestions = completedQuizIds.filter(id => id.startsWith('cert-level1-'));
    const totalLevel1Questions = level1Questions.length;
    const completedCount = level1CompletedQuestions.length;
    
    return {
      completed: completedCount,
      total: totalLevel1Questions,
      text: `Quiz Niveau ${currentLevel}: ${completedCount}/${totalLevel1Questions} questions complétées`
    };
  };

  const quizProgress = calculateQuizProgress();

  // Quiz progress message
  const quizProgressMessage: InteractiveMessage = {
    text: quizProgress.text,
    type: 'quiz' as MessageType,
    action: () => navigate('/profile-completion'),
    icon: BookOpen
  };

  // Priority questionnaire banner message
  const priorityQuestionnaireMessage: InteractiveMessage = {
    text: "Complétez le questionnaire de priorités pour des budgets encore plus personnalisés",
    type: 'priority-questionnaire' as MessageType,
    action: () => navigate('/priority-questions'),
    icon: Sparkles
  };

  // Check if user has budgets (for priority questionnaire banner)
  const [hasBudgets, setHasBudgets] = useState(false);
  
  useEffect(() => {
    // Skip budget check in Construction module (optimization)
    if (isConstructionModule) return;
    
    const checkUserBudgets = async () => {
      if (!user?.id) {
        setHasBudgets(false);
        return;
      }
      
      try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        const budgets = await apiService.getBudgets();
        setHasBudgets(Boolean(budgets.success && budgets.data && budgets.data.length > 0));
      } catch (error) {
        console.error('Error checking user budgets:', error);
        setHasBudgets(false);
      }
    };
    
    checkUserBudgets();
  }, [user?.id, isConstructionModule]);

  // Early return: Skip banner message generation in Construction module for performance optimization
  // Construction finale du tableau messages avec filtrage des undefined
  const messages: InteractiveMessage[] = isConstructionModule ? [] : [
    ...baseMessages,
    ...(hasCompletedPriorityQuestions ? [] : [priorityQuestionMessage]),
    // Only show quiz message if not all financial questions are completed
    ...(allFinancialQuizCompleted ? [] : [quizMessage]),
    // Add quiz progress message
    ...(quizProgress.completed > 0 ? [quizProgressMessage] : []),
    // Priority questionnaire banner - show only if user has budgets but hasn't completed questionnaire and banner not dismissed
    ...(hasBudgets && !hasCompletedPriorityQuestions && !isPriorityQuestionnaireBannerDismissed ? [priorityQuestionnaireMessage] : []),
    // Filter out completed quiz questions
    ...quizQuestionMessages.filter(msg => {
      if (msg.type === 'quiz_question' && msg.questionId) {
        const isCompleted = completedQuizIds.includes(msg.questionId);
        if (isCompleted) {
          console.log('🚫 Filtering out completed quiz question:', msg.questionId);
        }
        return !isCompleted;
      }
      return true;
    })
  ].filter((message): message is InteractiveMessage => message !== undefined);

  // Debug: Log current messages for quiz questions
  console.log('📋 Current banner messages:', messages.filter(m => m.type === 'quiz_question').map(m => ({ text: m.text, questionId: m.questionId })));

  // Helper function to check daily session with 6 AM threshold
  const checkDailySession = () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Calculate daily period: 6 AM to 6 AM next day
      // If current hour < 6, consider it previous day period
      const isPreviousDay = currentHour < 6;
      const sessionDate = isPreviousDay 
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const sessionKey = `bazarkely-username-display-session-${sessionDate.toDateString()}`;
      const stored = localStorage.getItem(sessionKey);
      
      if (!stored) {
        // New daily session - show username and store session
        localStorage.setItem(sessionKey, 'true');
        return true;
      }
      
      // Session already exists for this day period - hide username
      return false;
    } catch (error) {
      console.error('Error checking daily session:', error);
      // Fallback: show username if localStorage fails
      return true;
    }
  };

  // Initialize username visibility based on daily session
  useEffect(() => {
    const shouldShow = checkDailySession();
    setShowUsername(shouldShow);
    
    if (shouldShow) {
      // 60 SECOND VISIBILITY TIMER - Hide username after 60 seconds
      const timer = setTimeout(() => {
        setShowUsername(false);
        
        // Mark as shown for current day period
        try {
          const now = new Date();
          const currentHour = now.getHours();
          const isPreviousDay = currentHour < 6;
          const sessionDate = isPreviousDay 
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            : new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          const sessionKey = `bazarkely-username-display-session-${sessionDate.toDateString()}`;
          localStorage.setItem(sessionKey, 'shown');
        } catch (error) {
          console.error('Error updating session status:', error);
        }
      }, 60000); // 60 seconds
      
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // S'assurer que currentMessage est dans les limites du tableau
    if (messages.length > 0 && currentMessage >= messages.length) {
      setCurrentMessage(0);
    }
  }, [messages.length, currentMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Vérifier que le tableau messages n'est pas vide
      if (messages.length === 0) return;
      
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

  const handlePriorityQuestionnaireBannerDismiss = () => {
    try {
      localStorage.setItem('bazarkely_priority_questionnaire_banner_dismissed', 'true');
      setIsPriorityQuestionnaireBannerDismissed(true);
    } catch (error) {
      console.error('Error dismissing priority questionnaire banner:', error);
    }
  };

  // Helper function to get role display name
  const getRoleDisplayName = (role: MemberRole | null): string => {
    if (!role) return '';
    
    const roleNames: Record<string, string> = {
      [MemberRole.ADMIN]: 'Administrateur',
      [MemberRole.DIRECTION]: 'Direction',
      [MemberRole.CHEF_CHANTIER]: 'Chef Chantier',
      [MemberRole.CHEF_EQUIPE]: 'Chef Équipe',
      [MemberRole.MAGASINIER]: 'Magasinier',
      [MemberRole.LOGISTIQUE]: 'Logistique',
      [MemberRole.RESP_FINANCE]: 'Finance',
    };
    
    return roleNames[role] || role;
  };

  // Helper function to get role icon
  const getRoleIcon = (role: MemberRole | null): string => {
    if (!role) return '👤';
    
    const roleIcons: Record<string, string> = {
      [MemberRole.ADMIN]: '👨‍💼',
      [MemberRole.DIRECTION]: '🎯',
      [MemberRole.CHEF_CHANTIER]: '🏗️',
      [MemberRole.CHEF_EQUIPE]: '👷',
      [MemberRole.MAGASINIER]: '📦',
      [MemberRole.LOGISTIQUE]: '🚚',
      [MemberRole.RESP_FINANCE]: '💰',
    };
    
    return roleIcons[role] || '👤';
  };

  // Helper function to get company/site display
  const getCompanyDisplay = (company: typeof activeCompany): string => {
    if (!company) return 'Gestion Construction & Approvisionnements';
    
    const companyName = company.name || 'Entreprise';
    
    // Check if org_unit is available (may be added to UserCompany type in future)
    // Using type assertion to access potential org_unit property
    const companyWithOrgUnit = company as typeof company & { org_unit?: string | null };
    const site = companyWithOrgUnit.org_unit;
    
    if (site) {
      return `${companyName} • ${site}`;
    }
    
    return companyName;
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

  // Fermer le dropdown de simulation de rôle en cliquant à l'extérieur
  useEffect(() => {
    const handleRoleDropdownClickOutside = (event: MouseEvent) => {
      if (isRoleDropdownOpen) {
        const target = event.target as HTMLElement;
        // Vérifier si le clic est à l'extérieur du badge et du dropdown
        if (!target.closest('.role-badge-container') && !target.closest('.role-simulation-dropdown')) {
          setIsRoleDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleRoleDropdownClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleRoleDropdownClickOutside);
    };
  }, [isRoleDropdownOpen]);

  return (
    <header className="backdrop-blur-md bg-gradient-to-r from-purple-900/80 to-purple-800/80 border-b border-purple-300/50 shadow-lg shadow-purple-500/20 sticky top-0 z-40">
      <div className="px-4 py-4">
        {/* FIX: Conditional flex layout - justify-between for both, but ml-auto on Role Badge in Construction for right alignment */}
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling
                
                // Utiliser le contexte pour basculer le mode switcher
                console.log('🔄 Logo cliqué - Basculement du mode switcher', { 
                  currentMode: isSwitcherMode,
                  toggleFunction: typeof toggleSwitcherMode 
                });
                
                if (typeof toggleSwitcherMode === 'function') {
                  toggleSwitcherMode();
                  console.log('✅ toggleSwitcherMode appelé depuis Header - Nouveau mode:', !isSwitcherMode);
                } else {
                  console.error('❌ toggleSwitcherMode n\'est pas une fonction:', toggleSwitcherMode);
                }
                
                // Visual feedback: Trigger ripple effect
                setLogoRipple(true);
                setTimeout(() => {
                  setLogoRipple(false);
                }, 600);
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity duration-200 relative"
              aria-label="Basculer entre les modules"
              title="Cliquez pour changer de module"
            >
              <div className="w-12 h-12 bg-white/40 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/50 relative z-10 overflow-hidden">
                {logoRipple && (
                  <span className="absolute inset-0 bg-white/40 rounded-xl animate-ping" />
                )}
                <span className="text-white font-bold text-xl relative z-10">B</span>
              </div>
            </button>
            <div>
              {/* FIX: Title changed from "BazarKELY Construction" to "1saKELY" in Construction module */}
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                {isConstructionModule ? '1saKELY' : 'BazarKELY'}
              </h1>
              <p className="text-sm text-purple-100 font-medium drop-shadow-sm">
                {isConstructionModule 
                  ? 'BTP Construction'
                  : 'Budget familial Madagascar'}
              </p>
            </div>
          </div>

          {/* Right side container - Role Badge (Construction) or Budget actions */}
          <div className="flex items-center">
            {/* Role Badge - Construction POC only - Aligned to right with ml-auto in Construction */}
            {isConstructionModule && constructionRole && (
              <div className="ml-auto relative role-badge-container">
                {/* Badge cliquable seulement si ADMIN (vérifier activeCompany.role, pas constructionRole) */}
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 ${
                    activeCompany?.role === MemberRole.ADMIN ? 'cursor-pointer hover:bg-white/30 transition-colors' : ''
                  }`}
                  onClick={() => {
                    // Only allow dropdown if real role is ADMIN
                    if (activeCompany?.role === MemberRole.ADMIN) {
                      setIsRoleDropdownOpen(!isRoleDropdownOpen);
                      console.log('🎭 [Role Simulation] Toggle dropdown, current simulated:', constructionContext?.simulatedRole);
                    }
                  }}
                >
                  <span className="text-xl">{getRoleIcon(constructionRole)}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {getRoleDisplayName(constructionRole)}
                    </span>
                    {user && (
                      <span className="text-xs text-white/80">
                        {user?.detailedProfile?.firstName && user?.detailedProfile?.lastName
                          ? `${user.detailedProfile.firstName} ${user.detailedProfile.lastName.charAt(0)}.`
                          : user?.detailedProfile?.firstName || user?.username || user?.email || ''}
                      </span>
                    )}
                  </div>
                  {/* Dropdown indicator for Admin users */}
                  {activeCompany?.role === MemberRole.ADMIN && (
                    <span className="text-white/60 text-xs ml-1">
                      {isRoleDropdownOpen ? '▲' : '▼'}
                    </span>
                  )}
                </div>

                {/* Role Simulation Dropdown - Only visible for ADMIN users */}
                {isRoleDropdownOpen && activeCompany?.role === MemberRole.ADMIN && constructionContext && (
                  <div className="role-simulation-dropdown absolute top-full right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 min-w-[200px] max-w-[250px]">
                    {/* Return to Administrator option - Always visible at top */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        constructionContext.clearSimulation();
                        setIsRoleDropdownOpen(false);
                        console.log('🔄 [Role Simulation] Returned to Administrator');
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 border-b border-gray-200 flex items-center gap-2"
                    >
                      <span className="text-lg">👨‍💼</span>
                      <span>Retour à Administrateur</span>
                    </button>

                    {/* Available roles for simulation (exclude ADMIN) */}
                    {[
                      { role: MemberRole.DIRECTION, name: 'Direction', icon: '🎯' },
                      { role: MemberRole.CHEF_CHANTIER, name: 'Chef Chantier', icon: '🏗️' },
                      { role: MemberRole.CHEF_EQUIPE, name: 'Chef Équipe', icon: '👷' },
                      { role: MemberRole.MAGASINIER, name: 'Magasinier', icon: '📦' },
                      { role: MemberRole.LOGISTIQUE, name: 'Logistique', icon: '🚚' },
                      { role: MemberRole.RESP_FINANCE, name: 'Finance', icon: '💰' },
                    ].map(({ role, name, icon }) => (
                      <button
                        key={role}
                        onClick={(e) => {
                          e.stopPropagation();
                          constructionContext.setSimulatedRole(role);
                          setIsRoleDropdownOpen(false);
                          console.log('🎭 [Role Simulation] Selected role:', role, name);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                          constructionContext.simulatedRole === role 
                            ? 'bg-blue-50 text-blue-700 font-semibold' 
                            : 'text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        <span>{name}</span>
                        {constructionContext.simulatedRole === role && (
                          <span className="ml-auto text-xs text-blue-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* Actions - Budget module only (hidden in Construction to allow Role badge right alignment) */}
          {!isConstructionModule && (
            <div className="flex items-center space-x-3">
              {/* Level Badge */}
              <LevelBadge
                onClick={() => navigate('/certification')}
                currentLevel={currentLevel}
                levelName={currentLevel === 1 ? 'Débutant' : currentLevel === 2 ? 'Intermédiaire' : currentLevel === 3 ? 'Avancé' : currentLevel === 4 ? 'Expert' : 'Maître'}
                totalScore={Math.min(115, (quizScore || 0) + (practiceScore || 0) + (profileScore || 0))}
              />

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
            </div>
          )}
          </div>
        </div>

        {/* Informations utilisateur - Hidden in Construction mode (banner only relevant for Family Budget) */}
        {/* FIX: Use pathname check to prevent Budget banner from showing in Construction module */}
        {user && !isConstructionModule && !location.pathname.includes('/construction') && (
          <div className="mt-4 text-sm text-white bg-purple-500/40 backdrop-blur-sm rounded-xl p-4 border border-purple-300/50 shadow-lg">
            <div className="flex items-center justify-between flex-nowrap overflow-hidden"> {/* FORCE SINGLE LINE LAYOUT */}
              <div>
                {showUsername && (
                  <span className="font-semibold text-white whitespace-nowrap">Bonjour, {user.username?.charAt(0).toUpperCase() + user.username?.slice(1).toLowerCase()} !</span>
                )} {/* GREETING SYNCHRONIZED WITH USERNAME 60 SECOND TIMER */}
                <div className="relative">
                  {/* Vérification de sécurité pour le rendu des messages */}
                  {messages.length > 0 && messages[currentMessage] && (
                    <div className="flex items-center space-x-2">
                      <span 
                        onClick={messages[currentMessage]?.action}
                        className={`text-purple-100 ml-2 whitespace-nowrap overflow-hidden transition-all duration-1000 ease-in-out cursor-pointer hover:bg-purple-500/20 hover:bg-opacity-80 px-3 py-1 rounded-lg flex items-center space-x-2 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                      >
                        <span>{messages[currentMessage]?.text}</span>
                        {(() => {
                          const IconComponent = messages[currentMessage]?.icon;
                          return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
                        })()}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                      {/* Close button for priority questionnaire banner */}
                      {messages[currentMessage]?.type === 'priority-questionnaire' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePriorityQuestionnaireBannerDismiss();
                          }}
                          className="text-purple-200 hover:text-white transition-colors p-1 rounded-full hover:bg-purple-500/20"
                          title="Fermer"
                        >
                          <span className="text-sm font-bold">×</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Tooltip pour les messages motivationnels */}
                  {showTooltip && messages[currentMessage]?.type === 'motivational' && (
                    <div className="absolute top-full left-0 mt-2 bg-white text-gray-800 text-xs px-3 py-2 rounded-lg shadow-lg border z-50 whitespace-nowrap">
                      💡 Conseil : Cliquez pour plus d'inspiration !
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                       {isOnline ? (
                         <Wifi className="w-4 h-4 text-green-500" />
                       ) : (
                         <WifiOff className="w-4 h-4 text-red-500" />
                       )}
                <span className="text-xs text-purple-100 whitespace-nowrap">
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span> {/* PREVENT TEXT WRAPPING KEEP ON SINGLE LINE */}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Quiz Question Popup - Budget module only */}
      {/* Debug log commented out - was causing console clutter
      {(() => {
        console.log(`[Header] Rendering QuizQuestionPopup with showQuizPopup: ${showQuizPopup}, currentQuizId: ${currentQuizId} at ${Date.now()}`);
        return null;
      })()}
      */}
      {!isConstructionModule && showQuizPopup && (
        <QuizQuestionPopup
          key={currentQuizId || 'quiz-popup'} // Force clean remount on each opening
          isOpen={showQuizPopup}
          onClose={() => {
            console.log(`[Header] Closing quiz popup at ${Date.now()}`);
            setShowQuizPopup(false);
            setCurrentQuizId('');
            // Reload completed quiz IDs to update banner
            const stored = localStorage.getItem('bazarkely-quiz-questions-completed');
            try {
              const completed = stored ? JSON.parse(stored) : [];
              setCompletedQuizIds(Array.isArray(completed) ? completed : []);
              console.log('🔄 Reloaded completed quiz questions:', completed);
            } catch (error) {
              console.error('Error reloading completed quiz questions:', error);
              setCompletedQuizIds([]);
            }
          }}
          questionId={currentQuizId}
        />
      )}

    </header>
  );
};

export default Header;

