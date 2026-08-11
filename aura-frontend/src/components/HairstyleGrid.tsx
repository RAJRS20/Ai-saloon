import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, X, SlidersHorizontal } from 'lucide-react';
import type { Hairstyle } from '../types/hairstyle';
import HairstyleCard from './HairstyleCard';
import { getHairstyles } from '../services/hairstyleService';

const FALLBACK_HAIRSTYLES: Hairstyle[] = [
  {
    id: 1,
    name: 'Low Fade + Textured Crop',
    slug: 'low-fade-textured-crop',
    category: 'Fade',
    description: 'Clean low skin fade that blends naturally into longer top hair.',
    promptDetails: 'Low skin fade around lower sides and nape, gradual clean blending into a modern textured crop on top.',
    recommendedFaceShapes: ['oval', 'square', 'diamond'],
    hairTypes: ['straight', 'wavy'],
    length: 'short',
    maintenanceLevel: 'medium',
    referenceImageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 1
  },
  {
    id: 2,
    name: 'Mid Fade + Quiff',
    slug: 'mid-fade-quiff',
    category: 'Fade',
    description: 'Classic mid-skin fade — versatile and clean for all styles.',
    promptDetails: 'Mid-level skin fade on sides and back, sharp transitions, clean lines around ears.',
    recommendedFaceShapes: ['oval', 'oblong', 'heart'],
    hairTypes: ['straight', 'wavy', 'coily'],
    length: 'short',
    maintenanceLevel: 'medium',
    referenceImageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 2
  },
  {
    id: 3,
    name: 'High Fade + Pompadour',
    slug: 'high-fade-pompadour',
    category: 'Fade',
    description: 'Bold high skin fade for a sharp, modern contrast look.',
    promptDetails: 'High skin fade starting above temples, close-cropped sides, strong contrast with longer top.',
    recommendedFaceShapes: ['oval', 'square'],
    hairTypes: ['straight', 'coily'],
    length: 'short',
    maintenanceLevel: 'high',
    referenceImageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 3
  },
  {
    id: 4,
    name: 'Textured Crop',
    slug: 'textured-crop',
    category: 'Crop',
    description: 'Modern textured fringe with a disconnected undercut.',
    promptDetails: 'Short-to-medium textured crop on top, natural forward texture, subtle volume.',
    recommendedFaceShapes: ['oval', 'round', 'heart'],
    hairTypes: ['straight', 'wavy'],
    length: 'short',
    maintenanceLevel: 'low',
    referenceImageUrl: 'https://images.unsplash.com/photo-1517832606589-7150a6d750b7?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 4
  },
  {
    id: 5,
    name: 'French Crop',
    slug: 'french-crop',
    category: 'Crop',
    description: 'Sharp fringe with tight sides — clean and authoritative.',
    promptDetails: 'Heavy blunt fringe, tight tapered sides, clean neckline, structured top.',
    recommendedFaceShapes: ['oblong', 'heart', 'diamond'],
    hairTypes: ['straight', 'wavy'],
    length: 'short',
    maintenanceLevel: 'medium',
    referenceImageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 5
  },
  {
    id: 6,
    name: 'Classic Quiff',
    slug: 'quiff',
    category: 'Classic',
    description: 'Voluminous swept-up front with tapered sides — timeless style.',
    promptDetails: 'High volume quiff swept upward and back at front, tapered clean sides.',
    recommendedFaceShapes: ['oval', 'square', 'oblong'],
    hairTypes: ['straight', 'wavy'],
    length: 'medium',
    maintenanceLevel: 'high',
    referenceImageUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 6
  },
  {
    id: 7,
    name: 'Executive Pompadour',
    slug: 'pompadour',
    category: 'Classic',
    description: 'Bold signature volume swept back with sleek sides.',
    promptDetails: 'Classic pompadour with strong upswept volume at front, smooth sides swept back.',
    recommendedFaceShapes: ['oval', 'square'],
    hairTypes: ['straight', 'wavy'],
    length: 'medium',
    maintenanceLevel: 'high',
    referenceImageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 7
  },
  {
    id: 8,
    name: 'Gentlemen Side Part',
    slug: 'side-part',
    category: 'Classic',
    description: 'Elegant side part — clean and professional.',
    promptDetails: 'Hard side part, combed-over top, tapered sides, neat finish.',
    recommendedFaceShapes: ['oval', 'oblong', 'diamond'],
    hairTypes: ['straight', 'wavy'],
    length: 'medium',
    maintenanceLevel: 'medium',
    referenceImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 8
  },
  {
    id: 9,
    name: 'Modern Crew Cut',
    slug: 'crew-cut',
    category: 'Classic',
    description: 'Short uniform cut with a slightly longer top — reliable and clean.',
    promptDetails: 'Uniform short crew cut, slightly longer on top, tapered sides.',
    recommendedFaceShapes: ['oval', 'square', 'diamond'],
    hairTypes: ['straight', 'wavy', 'coily'],
    length: 'short',
    maintenanceLevel: 'low',
    referenceImageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 9
  },
  {
    id: 10,
    name: 'Clean Buzz Cut',
    slug: 'buzz-cut',
    category: 'Classic',
    description: 'Ultra-short all-over cut that emphasizes facial features.',
    promptDetails: 'Very short uniform buzz, slight taper at hairline, clean edges.',
    recommendedFaceShapes: ['oval', 'square'],
    hairTypes: ['straight', 'wavy', 'coily'],
    length: 'short',
    maintenanceLevel: 'low',
    referenceImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 10
  },
  {
    id: 11,
    name: 'Long Layered Flow',
    slug: 'long-layered',
    category: 'Long',
    description: 'Natural long layered flow with movement and texture.',
    promptDetails: 'Long layered hair past shoulders, natural movement, face-framing layers.',
    recommendedFaceShapes: ['oval', 'heart', 'oblong'],
    hairTypes: ['straight', 'wavy'],
    length: 'long',
    maintenanceLevel: 'medium',
    referenceImageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 11
  },
  {
    id: 12,
    name: 'Curly High Top',
    slug: 'curly-high-top',
    category: 'Curly',
    description: 'Natural curly high-top with defined coils and low sides.',
    promptDetails: 'Natural curly high top, defined coil texture, low-faded sides.',
    recommendedFaceShapes: ['oblong', 'heart', 'diamond'],
    hairTypes: ['coily', 'curly'],
    length: 'medium',
    maintenanceLevel: 'medium',
    referenceImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    sortOrder: 12
  },
];

interface HairstyleGridProps {
  selectedId: number | null;
  onSelect: (hairstyle: Hairstyle) => void;
}

const CATEGORIES = ['All', 'Fade', 'Crop', 'Classic', 'Long', 'Curly'];

export default function HairstyleGrid({ selectedId, onSelect }: HairstyleGridProps) {
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getHairstyles()
      .then(data => {
        setHairstyles(data.length > 0 ? data : FALLBACK_HAIRSTYLES);
        setLoading(false);
      })
      .catch(() => {
        setHairstyles(FALLBACK_HAIRSTYLES);
        setError(null);
        setLoading(false);
      });
  }, []);

  const filtered = hairstyles.filter(h => {
    const matchCat = activeCategory === 'All' || h.category === activeCategory;
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="w-full" id="catalog">
      {/* Mobile-aligned Search Bar & Filter */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787069] pointer-events-none" />
          <input
            id="hairstyle-search"
            type="text"
            placeholder="Search Salon, Specialist, Style..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-full bg-white border border-[#EBE6DE] text-[#1E1B18] text-xs sm:text-sm placeholder-[#787069] shadow-sm focus:outline-none focus:border-[#FF6B35] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#787069] hover:text-[#1E1B18]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          className="w-10 h-10 rounded-full bg-white border border-[#EBE6DE] flex items-center justify-center text-[#574F46] hover:border-[#FF6B35] hover:text-[#FF6B35] shadow-sm transition-all shrink-0"
          aria-label="Filter options"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Category Pills Horizontal Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-bold text-[#1E1B18] text-base">Category</h2>
          <button
            onClick={() => setActiveCategory('All')}
            className="text-xs font-semibold text-[#787069] hover:text-[#FF6B35] transition-colors"
          >
            See All
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                id={`filter-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  isActive ? 'pill-light-active' : 'pill-light-inactive'
                }`}
              >
                {cat === 'All' ? 'Hairdressing' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-[#1E1B18] text-base sm:text-lg">
          {activeCategory === 'All' ? 'Hairdressing' : activeCategory}
        </h2>
        <span className="text-xs font-semibold text-[#787069]">
          {filtered.length} styles
        </span>
      </div>

      {/* Error notice */}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Mobile Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-44 gap-2.5">
          <Loader2 className="w-7 h-7 text-[#FF6B35] spin" />
          <p className="text-xs text-[#787069]">Loading haircuts catalog...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-[#787069] py-10 light-card p-6">
          <p className="text-sm font-semibold text-[#1E1B18] mb-1">No hairstyles found</p>
          <p className="text-xs text-[#787069] mb-3.5">Try searching for a different haircut name</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('All'); }}
            className="btn-primary-accent px-4 py-2 rounded-full text-xs font-bold inline-block"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          {filtered.map((h, i) => (
            <div key={h.id} className="fade-in-up" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
              <HairstyleCard
                hairstyle={h}
                isSelected={selectedId === h.id}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
