import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function BeforeAfter({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before',
  afterLabel = 'After',
}: BeforeAfterProps) {
  const [sliderValue, setSliderValue] = useState(50);
  const [isInteracting, setIsInteracting] = useState(false);
  const [afterError, setAfterError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset image error state if afterUrl changes
  useEffect(() => {
    setAfterError(false);
  }, [afterUrl]);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderValue(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsInteracting(true);
    updatePosition(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInteracting) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsInteracting(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const displayAfterUrl = (!afterError && afterUrl) ? afterUrl : beforeUrl;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden select-none touch-none shadow-xl border border-[#EBE6DE] bg-[#1E1B18] cursor-ew-resize group"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      id="before-after-slider-container"
    >
      {/* After image (full width underneath) */}
      <img
        src={displayAfterUrl}
        alt="After hairstyle transformation"
        className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
        draggable={false}
        onError={() => setAfterError(true)}
      />

      {/* Before image (clipped to left side) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
      >
        <img
          src={beforeUrl}
          alt="Original portrait"
          className="absolute inset-0 w-full h-full object-cover object-top"
          draggable={false}
        />
      </div>

      {/* Center Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,107,53,0.8)] pointer-events-none"
        style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)' }}
      >
        {/* Touch handle with arrows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-xl border-2 border-[#FF6B35] flex items-center justify-center gap-0.5 transition-transform group-active:scale-110">
          <ChevronLeft className="w-4 h-4 text-[#FF6B35] stroke-[3]" />
          <ChevronRight className="w-4 h-4 text-[#FF6B35] stroke-[3]" />
        </div>
      </div>

      {/* Floating Labels */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-black/60 text-white backdrop-blur-md border border-white/10 shadow-md">
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-3 right-3 pointer-events-none">
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#FF6B35] text-white backdrop-blur-md shadow-md">
          {afterLabel}
        </span>
      </div>

      {/* Interactive Drag Hint */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-black/60 text-white/90 backdrop-blur-md border border-white/10 shadow-md animate-pulse">
          Drag or tap to compare
        </span>
      </div>
    </div>
  );
}
