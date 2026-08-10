import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, X } from 'lucide-react';
import type { Hairstyle } from '../types/hairstyle';
import HairstyleCard from './HairstyleCard';
import { getHairstyles } from '../services/hairstyleService';

// Fallback local data when backend isn't available
const FALLBACK_HAIRSTYLES: Hairstyle[] = [
  { id: 1, name: 'Low Fade', slug: 'low-fade', category: 'Fade', description: 'Clean low skin fade that blends naturally into longer top hair.', promptDetails: 'Low skin-to-short fade around the lower sides and nape, gradual clean blending, natural volume on top.', recommendedFaceShapes: ['oval', 'square', 'diamond'], hairTypes: ['straight', 'wavy'], length: 'short', maintenanceLevel: 'medium', referenceImageUrl: '', isActive: true, sortOrder: 1 },
  { id: 2, name: 'Mid Fade', slug: 'mid-fade', category: 'Fade', description: 'Classic mid-skin fade — versatile and clean for all styles.', promptDetails: 'Mid-level skin fade on sides and back, sharp transitions, clean lines around ears.', recommendedFaceShapes: ['oval', 'oblong', 'heart'], hairTypes: ['straight', 'wavy', 'coily'], length: 'short', maintenanceLevel: 'medium', referenceImageUrl: '', isActive: true, sortOrder: 2 },
  { id: 3, name: 'High Fade', slug: 'high-fade', category: 'Fade', description: 'Bold high skin fade for a sharp, modern contrast look.', promptDetails: 'High skin fade starting above temples, close-cropped sides, strong contrast with longer top.', recommendedFaceShapes: ['oval', 'square'], hairTypes: ['straight', 'coily'], length: 'short', maintenanceLevel: 'high', referenceImageUrl: '', isActive: true, sortOrder: 3 },
  { id: 4, name: 'Textured Crop', slug: 'textured-crop', category: 'Crop', description: 'Modern textured fringe with a disconnected undercut.', promptDetails: 'Short-to-medium textured crop on top, natural forward texture, subtle volume, realistic individual strands, no exaggerated density.', recommendedFaceShapes: ['oval', 'round', 'heart'], hairTypes: ['straight', 'wavy'], length: 'short', maintenanceLevel: 'low', referenceImageUrl: '', isActive: true, sortOrder: 4 },
  { id: 5, name: 'French Crop', slug: 'french-crop', category: 'Crop', description: 'Sharp fringe with tight sides — clean and authoritative.', promptDetails: 'Heavy blunt fringe, tight tapered sides, clean neckline, structured top.', recommendedFaceShapes: ['oblong', 'heart', 'diamond'], hairTypes: ['straight', 'wavy'], length: 'short', maintenanceLevel: 'medium', referenceImageUrl: '', isActive: true, sortOrder: 5 },
  { id: 6, name: 'Quiff', slug: 'quiff', category: 'Classic', description: 'Voluminous swept-up front with tapered sides — timeless style.', promptDetails: 'High volume quiff swept upward and back at front, tapered clean sides, structured hold.', recommendedFaceShapes: ['oval', 'square', 'oblong'], hairTypes: ['straight', 'wavy'], length: 'medium', maintenanceLevel: 'high', referenceImageUrl: '', isActive: true, sortOrder: 6 },
  { id: 7, name: 'Pompadour', slug: 'pompadour', category: 'Classic', description: 'Bold signature volume swept back with sleek sides.', promptDetails: 'Classic pompadour with strong upswept volume at front, smooth sides swept back, high shine finish.', recommendedFaceShapes: ['oval', 'square'], hairTypes: ['straight', 'wavy'], length: 'medium', maintenanceLevel: 'high', referenceImageUrl: '', isActive: true, sortOrder: 7 },
  { id: 8, name: 'Side Part', slug: 'side-part', category: 'Classic', description: 'Elegant gentleman\'s side part — clean and professional.', promptDetails: 'Hard side part, combed-over top, tapered sides, neat finish, classic look.', recommendedFaceShapes: ['oval', 'oblong', 'diamond'], hairTypes: ['straight', 'wavy'], length: 'medium', maintenanceLevel: 'medium', referenceImageUrl: '', isActive: true, sortOrder: 8 },
  { id: 9, name: 'Crew Cut', slug: 'crew-cut', category: 'Classic', description: 'Short uniform cut with a slightly longer top — reliable and clean.', promptDetails: 'Uniform short crew cut, slightly longer on top, tapered sides, clean military-inspired finish.', recommendedFaceShapes: ['oval', 'square', 'diamond'], hairTypes: ['straight', 'wavy', 'coily'], length: 'short', maintenanceLevel: 'low', referenceImageUrl: '', isActive: true, sortOrder: 9 },
  { id: 10, name: 'Buzz Cut', slug: 'buzz-cut', category: 'Classic', description: 'Ultra-short all-over cut that emphasizes facial features.', promptDetails: 'Very short uniform buzz, slight taper at hairline, clean edges, natural scalp-to-hair transition.', recommendedFaceShapes: ['oval', 'square'], hairTypes: ['straight', 'wavy', 'coily'], length: 'short', maintenanceLevel: 'low', referenceImageUrl: '', isActive: true, sortOrder: 10 },
  { id: 11, name: 'Long Layered', slug: 'long-layered', category: 'Long', description: 'Natural long layered flow with movement and texture.', promptDetails: 'Long layered hair past shoulders, natural movement, face-framing layers, soft texture with realistic individual strands.', recommendedFaceShapes: ['oval', 'heart', 'oblong'], hairTypes: ['straight', 'wavy'], length: 'long', maintenanceLevel: 'medium', referenceImageUrl: '', isActive: true, sortOrder: 11 },
  { id: 12, name: 'Curly High Top', slug: 'curly-high-top', category: 'Curly', description: 'Natural curly high-top with defined coils and low sides.', promptDetails: 'Natural curly high top, defined coil texture, low-faded sides, afro-inspired volume with realistic curl definition.', recommendedFaceShapes: ['oblong', 'heart', 'diamond'], hairTypes: ['coily', 'curly'], length: 'medium', maintenanceLevel: 'medium', referenceImageUrl: '', isActive: true, sortOrder: 12 },
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
    <div className="w-full">
      {/* Search and Category Filters */}
      <div className="flex flex-col gap-2.5 sm:gap-3 mb-4 sm:mb-6">
        {/* Search input with clear button */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="hairstyle-search"
            type="text"
            placeholder="Search hairstyles (e.g. Fade, Crop)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 sm:py-3 rounded-xl glass-card border border-white/10 text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories horizontal swipe bar */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5">
          {CATEGORIES.map(cat => {
            const count = cat === 'All'
              ? hairstyles.length
              : hairstyles.filter(h => h.category === cat).length;
            const isActive = activeCategory === cat;

            return (
              <button
                key={cat}
                id={`filter-${cat.toLowerCase()}`}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'btn-glow text-white shadow-md shadow-violet-600/30'
                    : 'glass-card border border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error notice */}
      {error && (
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Hairstyle Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Loader2 className="w-8 h-8 text-violet-400 spin" />
          <p className="text-xs text-gray-400">Loading haircuts catalog...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12 glass-card rounded-2xl p-6 border border-white/5">
          <p className="text-base font-semibold text-white mb-1">No hairstyles found</p>
          <p className="text-xs text-gray-400 mb-4">Try searching for a different haircut name or select another category</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('All'); }}
            className="btn-glow px-4 py-2 rounded-xl text-xs font-bold text-white inline-block"
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

