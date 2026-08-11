import { useNavigate } from 'react-router-dom';
import { Bell, Scissors, Shield, Zap, Camera, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import HairstyleGrid from '../components/HairstyleGrid';
import type { Hairstyle } from '../types/hairstyle';

export default function Home() {
  const navigate = useNavigate();

  const handleSelectHairstyle = (hairstyle: Hairstyle) => {
    navigate(`/tryon?styleId=${hairstyle.id}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] flex flex-col justify-between pb-safe-bottom">
      {/* Light Header */}
      <header className="sticky top-0 z-40 light-header px-4 sm:px-6 py-3">
        <div className="max-w-md mx-auto sm:max-w-xl md:max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white shadow-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#1E1B18]">Aura AI</span>
          </div>

          <button
            onClick={() => navigate('/tryon')}
            className="btn-primary-accent text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <span>Try AI Salon</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Mobile-Aligned Content */}
      <main className="max-w-md mx-auto sm:max-w-xl md:max-w-4xl px-4 sm:px-6 pt-5 pb-8 w-full flex-1">
        {/* User Greeting & Notification Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="User Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div>
              <p className="text-[11px] font-medium text-[#787069]">Good Morning!</p>
              <h2 className="text-base font-bold text-[#1E1B18]">Jacob Thomas</h2>
            </div>
          </div>

          <button
            className="w-9 h-9 rounded-full bg-white border border-[#EBE6DE] flex items-center justify-center text-[#574F46] hover:text-[#FF6B35] shadow-sm transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#FF6B35]" />
          </button>
        </div>

        {/* ── High-Impact Full Salon Image Banner Card ── */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-[#EBE6DE] mb-6 aspect-[16/9] sm:aspect-[21/9]">
          {/* High-res Salon Background Image */}
          <img
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80"
            alt="Luxury Barber Salon"
            className="w-full h-full object-cover object-center scale-105"
          />

          {/* Gradient Overlay for Text Clarity */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent flex flex-col justify-center p-5 sm:p-7">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6B35]/20 border border-[#FF6B35]/40 text-[#FF9E79] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 w-max">
              <Sparkles className="w-3 h-3 text-[#FF6B35]" />
              <span>Aura AI Virtual Salon</span>
            </div>

            <h3 className="text-lg sm:text-2xl font-black text-white leading-tight mb-2 max-w-xs sm:max-w-md">
              Transform Your Look Instantly
            </h3>

            <p className="text-xs sm:text-sm text-gray-200 mb-4 max-w-xs line-clamp-2">
              Preview 15+ photorealistic haircuts & colors before your next salon visit.
            </p>

            <button
              onClick={() => navigate('/tryon')}
              className="btn-primary-accent text-xs sm:text-sm px-5 py-2.5 flex items-center gap-1.5 w-max shadow-md"
            >
              <span>Try On Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hairstyle Grid Section */}
        <HairstyleGrid selectedId={null} onSelect={handleSelectHairstyle} />

        {/* App Features */}
        <div className="mt-8 pt-6 border-t border-[#EBE6DE]">
          <h2 className="font-bold text-[#1E1B18] text-base mb-3 text-center">
            Why Aura AI Virtual Try-On
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: <Zap className="w-4 h-4 text-[#FF6B35]" />,
                title: 'Instant Preview',
                desc: 'Photorealistic AI hair preview in seconds.',
              },
              {
                icon: <Shield className="w-4 h-4 text-[#FF6B35]" />,
                title: 'Face Preserved',
                desc: 'Your eyes, nose, skin & face stay intact.',
              },
              {
                icon: <Camera className="w-4 h-4 text-[#FF6B35]" />,
                title: 'Camera Alignment',
                desc: 'Built-in face guide for optimal results.',
              },
            ].map((f) => (
              <div key={f.title} className="light-card p-3.5 text-center">
                <div className="w-9 h-9 rounded-full bg-[#FF6B35]/10 flex items-center justify-center mx-auto mb-2">
                  {f.icon}
                </div>
                <h3 className="font-bold text-xs text-[#1E1B18] mb-1">{f.title}</h3>
                <p className="text-[11px] text-[#787069] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-[#787069] border-t border-[#EBE6DE]">
        <p>© 2026 Aura AI Salon. All rights reserved.</p>
      </footer>
    </div>
  );
}
