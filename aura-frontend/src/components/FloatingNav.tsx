import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Scissors, Sparkles, Bookmark } from 'lucide-react';

export default function FloatingNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', path: '/', icon: Home },
    { id: 'tryon', label: 'Try On', path: '/tryon', icon: Scissors },
    { id: 'catalog', label: 'Catalog', path: '#catalog', icon: Sparkles },
    { id: 'saved', label: 'Saved', path: '#saved', icon: Bookmark },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-2 max-w-[95vw]">
      <div className="mobile-floating-nav flex items-center justify-center gap-1 p-1.5 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && !item.path.startsWith('#') && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path.startsWith('#')) {
                  const el = document.getElementById(item.path.slice(1));
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else navigate('/tryon');
                } else {
                  navigate(item.path);
                }
              }}
              className={`shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#FF6B35] text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isActive && <span className="whitespace-nowrap text-xs leading-none">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
