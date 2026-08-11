import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, User, Scissors } from 'lucide-react';

export default function FloatingNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', path: '/', icon: Home },
    { id: 'tryon', label: 'Try On', path: '/tryon', icon: Scissors },
    { id: 'favorites', label: 'Favorites', path: '#', icon: Heart },
    { id: 'profile', label: 'Profile', path: '#', icon: User },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3">
      <div className="floating-nav-container flex items-center gap-1.5 p-1.5 backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path !== '#') navigate(item.path);
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'floating-nav-item-active shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {isActive && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
