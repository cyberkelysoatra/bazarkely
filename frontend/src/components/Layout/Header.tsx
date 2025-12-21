import HeaderLogo from './header/HeaderLogo';
import HeaderTitle from './header/HeaderTitle';
import HeaderConstructionActions from './header/HeaderConstructionActions';
import HeaderBudgetActions from './header/HeaderBudgetActions';
import HeaderUserBanner from './header/HeaderUserBanner';

/**
 * Header - Main header orchestrator component
 * 
 * Architecture:
 * - This is a clean orchestrator that assembles all header sub-components
 * - Each sub-component handles its own conditional rendering (Budget vs Construction)
 * - Sub-components return null when not applicable, so we can render them all
 * 
 * Structure:
 * 1. Main bar: Logo + Title (left) | Actions (right)
 *    - CompanyBadge is included in HeaderConstructionActions
 * 2. User banner: Below main bar (Budget module only)
 */
export default function Header() {
  return (
    <header className="
      sticky top-0 z-50
      bg-gradient-to-r from-purple-900/80 to-purple-800/80
      backdrop-blur-md
      border-b border-purple-300/50
      shadow-lg shadow-purple-500/20
    ">
      {/* Main header bar */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left section: Logo, Title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <HeaderLogo />
            <HeaderTitle />
          </div>

          {/* Right section: Module-specific actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <HeaderConstructionActions />
            <HeaderBudgetActions />
          </div>
        </div>
      </div>

      {/* User banner - Budget module only (returns null in Construction) */}
      <div className="px-4 pb-4">
        <HeaderUserBanner />
      </div>
    </header>
  );
}
