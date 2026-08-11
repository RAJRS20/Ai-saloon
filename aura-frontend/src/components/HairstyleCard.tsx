import type { Hairstyle } from '../types/hairstyle';
import { Plus, Check } from 'lucide-react';

interface HairstyleCardProps {
  hairstyle: Hairstyle;
  isSelected: boolean;
  onSelect: (hairstyle: Hairstyle) => void;
}

export default function HairstyleCard({ hairstyle, isSelected, onSelect }: HairstyleCardProps) {
  // Default high quality barber photos if referenceImageUrl is missing or empty
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
      className={`card-reference overflow-hidden p-3 transition-all duration-200 cursor-pointer group ${
        isSelected ? 'ring-2 ring-[#FF6B35] ring-offset-2 ring-offset-[#F5F2EC]' : ''
      }`}
    >
      {/* Image Container with 20px rounded corners */}
      <div className="relative aspect-[1/1] w-full rounded-2xl overflow-hidden bg-gray-100 mb-2.5">
        <img
          src={imageUrl}
          alt={hairstyle.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Selected badge overlay */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#FF6B35] flex items-center justify-center shadow-md text-white">
            <Check className="w-4 h-4" strokeWidth={3} />
          </div>
        )}

        {/* Category tag */}
        <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
          {hairstyle.category}
        </span>
      </div>

      {/* Card Info & Plus Button */}
      <div className="flex items-center justify-between pt-0.5 px-0.5">
        <div>
          <h3 className="font-bold text-[#1A1513] text-xs sm:text-sm line-clamp-1 group-hover:text-[#FF6B35] transition-colors">
            {hairstyle.name}
          </h3>
          <p className="text-[11px] font-semibold text-[#8C837B] mt-0.5">
            Free AI Try-On
          </p>
        </div>

        {/* Circular Orange Action Button (+) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(hairstyle);
          }}
          className={`action-plus-btn shrink-0 ${isSelected ? 'bg-black text-white' : ''}`}
          aria-label={`Select ${hairstyle.name}`}
        >
          {isSelected ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
