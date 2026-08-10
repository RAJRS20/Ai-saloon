import { useNavigate } from 'react-router-dom';
import { Sparkles, Camera, Scissors, Star, ArrowRight, Zap, Shield, Layers, ChevronRight } from 'lucide-react';

const FEATURES = [
  {
    icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: 'Photorealistic AI',
    description: 'Powered by Google Gemini\'s image-editing model for natural, photo-accurate results.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: 'Identity Preserved',
    description: 'Your face, eyes, skin tone, and facial features remain completely unchanged.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    icon: <Layers className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: '12+ Curated Hairstyles',
    description: 'Low Fade, Pompadour, Textured Crop, Quiff, Long Layered, Curly and many more.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: <Camera className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: 'Camera or Upload',
    description: 'Take a live photo with real-time face guidance or upload an existing portrait.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
];

const STYLES = [
  { name: 'Low Fade', category: 'Fade' },
  { name: 'Textured Crop', category: 'Crop' },
  { name: 'Pompadour', category: 'Classic' },
  { name: 'Quiff', category: 'Classic' },
  { name: 'Long Layered', category: 'Long' },
  { name: 'Curly High Top', category: 'Curly' },
  { name: 'Mid Fade', category: 'Fade' },
  { name: 'French Crop', category: 'Crop' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-animated grid-pattern overflow-x-hidden flex flex-col justify-between">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between glass-card border-b border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">Aura AI</span>
        </div>
        <button
          id="nav-try-now"
          onClick={() => navigate('/tryon')}
          className="btn-glow text-white text-xs sm:text-sm font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl flex items-center gap-1.5"
        >
          <span>Try Now</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* Hero section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 text-center max-w-5xl mx-auto w-full">
        {/* Glowing orbs */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 sm:left-1/4 sm:translate-x-0 w-60 sm:w-72 h-60 sm:h-72 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="absolute top-28 right-1/4 w-48 sm:w-56 h-48 sm:h-56 rounded-full bg-pink-600/15 blur-3xl pointer-events-none hidden sm:block" />

        <div className="relative fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-full glass-card border border-violet-500/30 mb-6 sm:mb-8">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
            <span className="text-xs sm:text-sm text-violet-300 font-medium">Powered by Google Gemini</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.15] sm:leading-tight mb-4 sm:mb-6 tracking-tight">
            See yourself with any{' '}
            <span className="gradient-text block sm:inline">hairstyle</span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 px-2">
            Upload or take a photo and see a photorealistic preview of any haircut — in seconds.
            Your identity stays intact. Only the hair changes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <button
              id="hero-try-on-btn"
              onClick={() => navigate('/tryon')}
              className="btn-glow text-white font-bold text-base sm:text-lg px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl flex items-center gap-2.5 justify-center shadow-lg shadow-violet-600/25 active:scale-[0.98] transition-transform"
            >
              <Camera className="w-5 h-5" />
              <span>Try On Now — It's Free</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              id="hero-how-it-works"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="glass-card border border-white/10 text-white font-semibold text-sm sm:text-base px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl hover:border-white/25 active:scale-[0.98] transition-all"
            >
              How it works
            </button>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-8 sm:mt-10 text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="ml-1 text-gray-300 font-medium">Photorealistic results</span>
            </div>
            <span className="hidden sm:inline text-gray-600">·</span>
            <span className="text-gray-400">No app download needed</span>
          </div>
        </div>
      </section>

      {/* Hairstyle pills horizontal swipe container */}
      <section className="py-4 sm:py-6 overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6 gap-2.5 sm:gap-3 py-1">
          {STYLES.map((s) => (
            <button
              key={s.name}
              onClick={() => navigate('/tryon')}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full glass-card border border-white/10 hover:border-violet-500/40 active:scale-95 transition-all cursor-pointer group"
            >
              <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-400 group-hover:text-violet-300" />
              <span className="text-xs sm:text-sm text-gray-200 group-hover:text-white whitespace-nowrap font-medium">{s.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold">{s.category}</span>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-400 block mb-1">Simple Workflow</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
            Three steps to your new look
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { step: '01', icon: <Camera className="w-6 h-6 sm:w-8 sm:h-8" />, title: 'Take or Upload Photo', desc: 'Use your phone camera with live face guidance or upload a portrait from your gallery.' },
            { step: '02', icon: <Scissors className="w-6 h-6 sm:w-8 sm:h-8" />, title: 'Choose a Hairstyle', desc: 'Browse 12+ styles across Fades, Crops, Classics, Long cuts, and Curly styles.' },
            { step: '03', icon: <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />, title: 'Instant AI Result', desc: 'Gemini AI transforms your hair. Compare with the interactive before/after slider.' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="glass-card border border-white/5 rounded-2xl p-5 sm:p-6 text-center relative overflow-hidden group hover:border-violet-500/30 transition-all">
              <div className="text-xs font-black text-violet-400 tracking-widest mb-3 bg-violet-500/10 inline-block px-2.5 py-1 rounded-full">{step}</div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4 text-violet-400 group-hover:scale-105 transition-transform">
                {icon}
              </div>
              <h3 className="font-bold text-white text-base sm:text-lg mb-1.5">{title}</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-400 block mb-1">State of the art</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
            Why Aura AI is different
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
          {FEATURES.map(({ icon, title, description, color, bg }) => (
            <div key={title} className={`glass-card rounded-2xl p-5 sm:p-6 border ${bg} transition-all hover:translate-y-[-2px]`}>
              <div className={`${color} mb-3`}>{icon}</div>
              <h3 className="font-bold text-white text-base sm:text-lg mb-1.5">{title}</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 sm:py-20 px-4 sm:px-6 text-center max-w-2xl mx-auto w-full">
        <div className="glass-card border border-violet-500/20 rounded-3xl p-6 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 sm:mb-4">
            Ready for your <span className="gradient-text">new look?</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto">No sign-up required. No watermarks. Just photorealistic AI virtual try-on.</p>
          <button
            id="cta-try-on-btn"
            onClick={() => navigate('/tryon')}
            className="btn-glow text-white font-bold text-base sm:text-lg px-8 py-3.5 sm:px-10 sm:py-4 rounded-2xl w-full sm:w-auto shadow-lg shadow-violet-600/30"
          >
            Start Your Try-On Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 sm:py-8 px-4 sm:px-6 text-center text-xs text-gray-500 pb-safe-bottom">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Scissors className="w-3.5 h-3.5 text-violet-500" />
          <span className="font-bold text-gray-400">Aura AI</span>
        </div>
        <p>Results are AI visualizations — not exact predictions of a real haircut.</p>
        <p className="mt-1 text-gray-600">Photos are processed securely and not stored permanently.</p>
      </footer>
    </div>
  );
}

