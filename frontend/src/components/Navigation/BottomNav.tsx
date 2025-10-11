import { NavLink } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS } from '../../constants';
import { Home, Wallet, ArrowUpDown, PieChart, Target } from 'lucide-react';

/*
 * SPACING CHANGES MADE FOR COMPACT BOTTOM NAV:
 * - Container padding: py-4 → py-2 → py-1.5 (16px → 8px → 6px vertical)
 * - Icon size: w-6 h-6 → w-5 h-5 → w-[18px] h-[18px] (24px → 20px → 18px)
 * - Text margin: mt-2 → mt-1 (8px → 4px) - preserved for readability
 * - Icon container padding: p-3 → p-2 → p-1.5 (12px → 8px → 6px) in CSS
 * - Estimated height reduction: 80-90px → 55-65px → 48-56px
 */

const iconMap = {
  Home,
  Wallet,
  ArrowUpDown,
  PieChart,
  Target
};

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl z-50 safe-area-inset">
      <div className="flex items-center justify-around py-1.5">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const IconComponent = iconMap[item.icon as keyof typeof iconMap];
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `mobile-nav-item ${isActive ? 'active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-600 shadow-lg scale-110' : 'hover:bg-blue-50 hover:scale-105'}`}>
                    <IconComponent className={`w-[18px] h-[18px] transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  <span className={`text-xs font-semibold mt-1 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>
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

export default BottomNav;
