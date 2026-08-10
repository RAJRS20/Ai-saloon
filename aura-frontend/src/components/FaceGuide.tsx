import type { FaceQualityCheck } from '../types/hairstyle';

interface FaceGuideProps {
  qualityChecks: FaceQualityCheck[];
  faceCount: number;
}

export default function FaceGuide({ qualityChecks, faceCount }: FaceGuideProps) {
  const hasError = qualityChecks.some(c => !c.passed && c.severity === 'error');
  const hasWarning = qualityChecks.some(c => !c.passed && c.severity === 'warning');
  const allGood = faceCount === 1 && !hasError && !hasWarning;

  const ovalColor = allGood
    ? '#22c55e'
    : hasError
    ? '#ef4444'
    : hasWarning
    ? '#eab308'
    : 'rgba(255,255,255,0.4)';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* SVG oval guide optimized for portrait viewfinder */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 133"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Darkened vignette mask */}
        <defs>
          <mask id="face-oval-mask">
            <rect width="100" height="133" fill="white" />
            <ellipse cx="50" cy="58" rx="25" ry="34" fill="black" />
          </mask>
        </defs>
        <rect
          width="100"
          height="133"
          fill="rgba(0,0,0,0.38)"
          mask="url(#face-oval-mask)"
        />
        {/* Oval border */}
        <ellipse
          cx="50"
          cy="58"
          rx="25"
          ry="34"
          fill="none"
          stroke={ovalColor}
          strokeWidth="0.6"
          strokeDasharray={allGood ? 'none' : '3 1.5'}
          style={{ transition: 'all 0.3s ease' }}
        />
        {/* Sleek Corner decorators */}
        {['tl', 'tr', 'bl', 'br'].map((corner) => {
          const isTop = corner.startsWith('t');
          const isLeft = corner.endsWith('l');
          const cx = isLeft ? 25 : 75;
          const cy = isTop ? 24 : 92;
          const d = isTop
            ? isLeft
              ? `M ${cx + 5},${cy} L ${cx},${cy} L ${cx},${cy + 5}`
              : `M ${cx - 5},${cy} L ${cx},${cy} L ${cx},${cy + 5}`
            : isLeft
            ? `M ${cx + 5},${cy} L ${cx},${cy} L ${cx},${cy - 5}`
            : `M ${cx - 5},${cy} L ${cx},${cy} L ${cx},${cy - 5}`;
          return (
            <path
              key={corner}
              d={d}
              fill="none"
              stroke={ovalColor}
              strokeWidth="0.8"
              strokeLinecap="round"
              style={{ transition: 'stroke 0.3s ease' }}
            />
          );
        })}
      </svg>

      {/* Top guidance chip */}
      <div className="absolute top-3 left-3 right-3 flex justify-center">
        <span
          className={`text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg max-w-[90%] text-center transition-all ${
            allGood
              ? 'bg-green-500/30 text-green-200 border border-green-500/40'
              : hasError
              ? 'bg-red-500/30 text-red-200 border border-red-500/40'
              : faceCount === 0
              ? 'bg-black/60 text-white/80 border border-white/15'
              : 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/40'
          }`}
        >
          {faceCount === 0
            ? 'Align your face in the oval'
            : allGood
            ? '✓ Ready! Tap shutter to capture'
            : hasError
            ? qualityChecks.find(c => !c.passed && c.severity === 'error')?.message
            : qualityChecks.find(c => !c.passed && c.severity === 'warning')?.message}
        </span>
      </div>
    </div>
  );
}

