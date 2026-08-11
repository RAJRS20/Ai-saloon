import type { Hairstyle } from '../types/hairstyle';
import { Check, Scissors } from 'lucide-react';

interface HairstyleCardProps {
  hairstyle: Hairstyle;
  isSelected: boolean;
  onSelect: (hairstyle: Hairstyle) => void;
}

const maintenanceColors = {
  low: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20',
  medium: 'text-amber-300 bg-amber-500/15 border-amber-500/20',
  high: 'text-rose-300 bg-rose-500/15 border-rose-500/20',
};

const categoryColors: Record<string, string> = {
  Fade: 'bg-violet-500/30 text-violet-200 border-violet-400/30',
  Crop: 'bg-blue-500/30 text-blue-200 border-blue-400/30',
  Classic: 'bg-amber-500/30 text-amber-200 border-amber-400/30',
  Long: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30',
  Curly: 'bg-pink-500/30 text-pink-200 border-pink-400/30',
  Textured: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/30',
};

export default function HairstyleCard({ hairstyle, isSelected, onSelect }: HairstyleCardProps) {
  const categoryClass = categoryColors[hairstyle.category] || 'bg-gray-500/30 text-gray-200 border-gray-400/30';

  return (
    <button
      id={`hairstyle-card-${hairstyle.id}`}
      onClick={() => onSelect(hairstyle)}
      className={`group relative rounded-2xl overflow-hidden text-left w-full transition-all duration-200 active:scale-[0.97] cursor-pointer ${
        isSelected
          ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-black scale-[1.01] shadow-lg shadow-violet-600/30'
          : 'glass-card border border-white/10 hover:border-violet-500/40 hover:scale-[1.01]'
      }`}
    >
      {/* Card image container */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-900 to-slate-900 overflow-hidden">
        {hairstyle.referenceImageUrl ? (
          <img
            src={hairstyle.referenceImageUrl}
            alt={hairstyle.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-violet-950/40 to-slate-900/60">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-1 text-violet-400">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-gray-300 line-clamp-2">{hairstyle.name}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-violet-600 border border-white/80 flex items-center justify-center shadow-lg shadow-violet-600/50 z-10 animate-scale-up">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
          </div>
        )}

        {/* Category tag */}
        <span className={`absolute top-2 left-2 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md ${categoryClass}`}>
          {hairstyle.category}
        </span>

        {/* Bottom card info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
          <p className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-1">{hairstyle.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-gray-300 capitalize">{hairstyle.length}</span>
            <span className="text-gray-500 text-[10px]">·</span>
            <span className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.2 rounded border ${maintenanceColors[hairstyle.maintenanceLevel]}`}>
              {hairstyle.maintenanceLevel} care
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

