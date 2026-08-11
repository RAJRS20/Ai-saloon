import { useNavigate } from 'react-router-dom';
import { Bell, Scissors, Sparkles, Shield, Zap, Camera, ChevronRight } from 'lucide-react';
import HairstyleGrid from '../components/HairstyleGrid';
import FloatingNav from '../components/FloatingNav';
import type { Hairstyle } from '../types/hairstyle';

export default function Home() {
  const navigate = useNavigate();

  const handleSelectHairstyle = (hairstyle: Hairstyle) => {
    navigate(`/tryon?styleId=${hairstyle.id}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex flex-col justify-between pb-safe-bottom">
      {/* ─── SCREEN 1: Hero Splash Section (Reference Screen 1) ─── */}
      <section className="relative w-full bg-[#1A1513] text-white rounded-b-[36px] overflow-hidden shadow-xl">
        {/* Barber Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80"
            alt="Barber Shop"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1513] via-[#1A1513]/70 to-transparent" />
        </div>

        {/* Top Navbar */}
        <div className="relative z-10 px-5 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center text-white shadow-md">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">Aura AI</span>
          </div>

          <button
            onClick={() => navigate('/tryon')}
            className="btn-orange text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <span>Try AI Salon</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hero Content (Exact typography from Reference Screen 1) */}
        <div className="relative z-10 px-6 pt-10 pb-12 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4 text-xs font-medium text-[#FF9E79]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Virtual Hairstyle Try-On</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-3">
            Discover the beauty in you today
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-8 max-w-md">
            Discover the beauty within you and shine with confidence, elegance, and a style that's uniquely yours.
          </p>

          {/* Reference Button Style: [ (✂) Get Started  >>> ] */}
          <button
            onClick={() => navigate('/tryon')}
            className="btn-dark-pill px-5 py-3.5 flex items-center justify-between w-full max-w-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white">
                <Scissors className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-white">Get Started</span>
            </div>
            <div className="flex items-center text-[#FF9E79] group-hover:translate-x-1 transition-transform">
              <ChevronRight className="w-4 h-4 -mr-1" />
              <ChevronRight className="w-4 h-4 -mr-1" />
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </section>

      {/* ─── SCREEN 2: Discovery Section (Reference Screen 2) ─── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-12 w-full flex-1">
        {/* User Greeting & Notification Header (Reference Screen 2) */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="User Avatar"
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div>
              <p className="text-[11px] font-medium text-[#8C837B]">Good Morning!</p>
              <h2 className="text-base sm:text-lg font-bold text-[#1A1513]">Jacob Thomas</h2>
            </div>
          </div>

          <button
            className="w-10 h-10 rounded-full bg-white border border-[#E6E1D8] flex items-center justify-center text-[#5C544E] hover:text-[#FF6B35] shadow-sm transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#FF6B35]" />
          </button>
        </div>

        {/* Promo Banner Card (Reference Screen 2: "Get 20% Off Your Next Haircut!") */}
        <div className="card-dark-hero relative overflow-hidden p-5 sm:p-6 mb-8 flex items-center justify-between">
          <div className="relative z-10 max-w-[60%]">
            <h3 className="text-lg sm:text-2xl font-black text-white leading-tight mb-3">
              Get 20% Off Your Next Haircut!
            </h3>
            <button
              onClick={() => navigate('/tryon')}
              className="btn-orange text-xs sm:text-sm px-5 py-2.5 inline-flex items-center gap-1.5"
            >
              <span>Book Now</span>
            </button>
          </div>

          {/* Banner Barber Photo */}
          <div className="relative w-32 sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-white/10">
            <img
              src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=400&q=80"
              alt="Barber"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Hairstyle Grid Section with Search & Categories */}
        <HairstyleGrid selectedId={null} onSelect={handleSelectHairstyle} />

        {/* App Highlights / Features */}
        <div className="mt-12 pt-8 border-t border-[#E6E1D8]">
          <h2 className="font-bold text-[#1A1513] text-lg mb-4 text-center">
            Why Choose Aura AI Virtual Salon
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Zap className="w-5 h-5 text-[#FF6B35]" />,
                title: 'Instant Preview',
                desc: 'See any hairstyle rendered photorealistically in seconds.',
              },
              {
                icon: <Shield className="w-5 h-5 text-[#FF6B35]" />,
                title: 'Face Preserved',
                desc: 'Your facial features, tone and skin stay untouched.',
              },
              {
                icon: <Camera className="w-5 h-5 text-[#FF6B35]" />,
                title: 'Live Camera Guidance',
                desc: 'Built-in MediaPipe AI face alignment for optimal results.',
              },
            ].map((f) => (
              <div key={f.title} className="card-reference p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#FF6B35]/10 flex items-center justify-center mx-auto mb-2">
                  {f.icon}
                </div>
                <h3 className="font-bold text-sm text-[#1A1513] mb-1">{f.title}</h3>
                <p className="text-xs text-[#8C837B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-[#8C837B] border-t border-[#E6E1D8]">
        <p>© 2026 Aura AI Salon. Powered by Google Gemini AI.</p>
      </footer>

      {/* Floating Bottom Navigation Pill (Reference Screen 2) */}
      <FloatingNav />
    </div>
  );
}
