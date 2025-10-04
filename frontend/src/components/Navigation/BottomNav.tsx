import { NavLink } from 'react-router-dom';
import { BOTTOM_NAV_ITEMS } from '../../constants';
import { Home, Wallet, ArrowUpDown, PieChart, Target } from 'lucide-react';

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
      <div className="flex items-center justify-around py-4">
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
                    <IconComponent className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  <span className={`text-xs font-semibold mt-2 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>
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
