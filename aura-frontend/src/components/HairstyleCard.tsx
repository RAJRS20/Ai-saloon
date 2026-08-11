import type { Hairstyle } from '../types/hairstyle';
import { Plus, Check } from 'lucide-react';

interface HairstyleCardProps {
  hairstyle: Hairstyle;
  isSelected: boolean;
  onSelect: (hairstyle: Hairstyle) => void;
}

export default function HairstyleCard({ hairstyle, isSelected, onSelect }: HairstyleCardProps) {
  const fallbackImages: Record<number, string> = {
    1: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
    2: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80',
    3: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80',
    4: 'https://images.unsplash.com/photo-1517832606589-7150a6d750b7?auto=format&fit=crop&w=600&q=80',
    5: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
    6: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=600&q=80',
    7: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80',
    8: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  };

  const imageUrl = hairstyle.referenceImageUrl || fallbackImages[hairstyle.id] || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';

  return (
    <div
      id={`hairstyle-card-${hairstyle.id}`}
      onClick={() => onSelect(hairstyle)}
      className={`light-card p-2.5 sm:p-3 overflow-hidden transition-all duration-200 cursor-pointer group ${
        isSelected ? 'ring-2 ring-[#FF6B35] ring-offset-2 ring-offset-[#FAF8F5]' : ''
      }`}
    >
      {/* Aspect Ratio 1:1 Image Container */}
      <div className="relative aspect-[1/1] w-full rounded-2xl overflow-hidden bg-gray-100 mb-2">
        <img
          src={imageUrl}
          alt={hairstyle.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Selected badge overlay */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center shadow-md text-white z-10">
            <Check className="w-4 h-4" strokeWidth={3} />
          </div>
        )}

        {/* Category tag */}
        <span className="absolute bottom-2 left-2 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
          {hairstyle.category}
        </span>
      </div>

      {/* Title & Plus Button */}
      <div className="flex items-center justify-between pt-0.5 px-0.5 gap-1.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#1E1B18] text-xs sm:text-sm line-clamp-1 group-hover:text-[#FF6B35] transition-colors">
            {hairstyle.name}
          </h3>
          <p className="text-[10px] sm:text-[11px] font-medium text-[#787069] truncate">
            Free AI Try-On
          </p>
        </div>

        {/* Circular Action Button (+) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(hairstyle);
          }}
          className={`action-btn-circle shrink-0 ${isSelected ? 'bg-[#1E1B18] text-white' : ''}`}
          aria-label={`Select ${hairstyle.name}`}
        >
          {isSelected ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
