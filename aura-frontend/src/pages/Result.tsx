import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Share2, Scissors, ArrowLeft, Sparkles, Check, AlertCircle, Heart, Star } from 'lucide-react';
import BeforeAfter from '../components/BeforeAfter';
import FloatingNav from '../components/FloatingNav';
import { getJobStatus, regenerateTryOn } from '../services/hairstyleService';
import type { TryOnJob } from '../types/hairstyle';

export default function Result() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<TryOnJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'result' | 'about' | 'reviews'>('result');
  const [isFavorite, setIsFavorite] = useState(false);

  const demoBefore = searchParams.get('before');
  const demoStyle = searchParams.get('style');
  const isDemoMode = jobId === 'demo';

  useEffect(() => {
    if (isDemoMode) {
      setJob({
        jobId: 'demo',
        status: 'COMPLETED',
        sourceImageUrl: demoBefore || '',
        resultImageUrl: demoBefore || '',
        createdAt: new Date().toISOString(),
        hairstyle: demoStyle ? {
          id: 0,
          name: demoStyle,
          slug: '',
          category: 'Fade',
          description: 'A clean, modern haircut styled by AI.',
          promptDetails: '',
          recommendedFaceShapes: ['oval', 'square'],
          hairTypes: ['straight', 'wavy'],
          length: 'short',
          maintenanceLevel: 'low',
          referenceImageUrl: '',
          isActive: true,
          sortOrder: 0
        } : undefined,
      });
      setLoading(false);
      return;
    }

    if (!jobId) return;
    setLoading(true);
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkJob = async () => {
      try {
        const j = await getJobStatus(jobId);
        setJob(j);
        if (j.status === 'COMPLETED' || j.status === 'FAILED') {
          setLoading(false);
          if (pollInterval) clearInterval(pollInterval);
          if (j.status === 'FAILED') {
            setError(j.errorMessage || 'Generation failed. Please try again.');
          }
        }
      } catch {
        setError('Could not load result. Please check your connection and try again.');
        setLoading(false);
        if (pollInterval) clearInterval(pollInterval);
      }
    };

    checkJob();
    pollInterval = setInterval(checkJob, 2500);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId, isDemoMode, demoBefore, demoStyle]);

  const handleRegenerate = useCallback(async () => {
    if (!job) return;
    setRegenerating(true);
    setError(null);
    try {
      const newJob = await regenerateTryOn(job.jobId);
      navigate(`/result/${newJob.jobId}`);
    } catch {
      setError('Regeneration failed. Please try again.');
      setRegenerating(false);
    }
  }, [job, navigate]);

  const handleDownload = useCallback(async () => {
    if (!job?.resultImageUrl) return;
    try {
      const response = await fetch(job.resultImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-ai-${job.hairstyle?.name ? job.hairstyle.name.toLowerCase().replace(/\s+/g, '-') : 'hairstyle'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(job.resultImageUrl, '_blank');
    }
  }, [job]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'My AI Hairstyle Try-On — Aura AI',
      text: `Check out how I look with a ${job?.hairstyle?.name || 'new hairstyle'} using Aura AI!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled share sheet
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center p-4">
        <div className="text-center card-reference p-8 max-w-sm w-full">
          <div className="w-14 h-14 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="w-7 h-7 spin" />
          </div>
          <p className="text-[#1A1513] font-bold text-base mb-1">Rendering Haircut AI...</p>
          <p className="text-xs text-[#8C837B]">Applying fine strand texture and blending</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center p-4">
        <div className="text-center card-reference p-8 max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-[#1A1513] font-bold text-lg mb-1">Something went wrong</h2>
          <p className="text-[#8C837B] text-xs sm:text-sm mb-6">{error || 'Result not found'}</p>
          <button
            onClick={() => navigate('/tryon')}
            className="btn-orange px-6 py-3 text-xs sm:text-sm w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex flex-col justify-between relative pb-safe-bottom">
      {/* ── SCREEN 3: Detail & Result View (Reference Screen 3) ── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        {/* Card Container for Result (Reference Screen 3 Style) */}
        <div className="card-reference overflow-hidden p-4 sm:p-6 mb-6">
          {/* Top Control Bar inside Card */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/tryon')}
              className="w-10 h-10 rounded-full bg-[#F5F2EC] border border-[#E6E1D8] flex items-center justify-center text-[#5C544E] hover:text-[#1A1513] hover:border-[#FF6B35] transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-3 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> AI Try-On Ready
            </span>

            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-[#F5F2EC] border-[#E6E1D8] text-[#5C544E] hover:text-red-500'
              }`}
              aria-label="Favorite"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
            </button>
          </div>

          {/* Interactive Before/After Result Slider */}
          <div className="mb-6 rounded-3xl overflow-hidden shadow-sm">
            <BeforeAfter
              beforeUrl={job.sourceImageUrl || ''}
              afterUrl={job.resultImageUrl || job.sourceImageUrl || ''}
              beforeLabel="Before"
              afterLabel={job.hairstyle?.name || 'After AI Haircut'}
            />
          </div>

          {/* Hairstyle Title & Rating Badge (Reference Screen 3: "Richard Anderson ★ 4.7 (116)") */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1A1513] mb-1">
                {job.hairstyle?.name || 'Textured Hairstyle'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-[#8C837B]">
                <div className="flex items-center gap-1 text-[#FF6B35] font-bold">
                  <Star className="w-4 h-4 fill-[#FF6B35]" />
                  <span>4.9 (120 reviews)</span>
                </div>
                <span>·</span>
                <span className="font-semibold text-[#FF6B35]">Pro Barber Style</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/tryon')}
              className="text-xs font-bold text-[#FF6B35] underline hover:text-[#E85A24]"
            >
              Change Style
            </button>
          </div>

          {/* Tab Selector Pills (Reference Screen 3: [ Booking ] [ About ] [ Reviews ]) */}
          <div className="flex gap-2 p-1 rounded-full bg-[#F5F2EC] mb-6">
            {(['result', 'about', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-full text-xs font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'pill-active'
                    : 'text-[#5C544E] hover:text-[#1A1513]'
                }`}
              >
                {tab === 'result' ? 'Try-On Result' : tab}
              </button>
            ))}
          </div>

          {/* Tab 1 Content: Action Controls */}
          {activeTab === 'result' && (
            <div className="space-y-4">
              {/* Primary Download Button (Reference Screen 3 Orange Button [ Book Now ]) */}
              <button
                id="btn-download-result"
                onClick={handleDownload}
                className="btn-orange w-full py-3.5 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>Save & Download Look</span>
              </button>

              {/* Secondary Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="btn-share-result"
                  onClick={handleShare}
                  className="pill-inactive py-3 text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied!' : 'Share Look'}</span>
                </button>

                {!isDemoMode ? (
                  <button
                    id="btn-regenerate-result"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="pill-inactive py-3 text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {regenerating ? (
                      <>
                        <Sparkles className="w-4 h-4 spin text-[#FF6B35]" />
                        <span>Rendering...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>Re-Generate</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/tryon')}
                    className="pill-inactive py-3 text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Try Another</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2 Content: About Style */}
          {activeTab === 'about' && (
            <div className="text-xs sm:text-sm text-[#5C544E] leading-relaxed space-y-2">
              <p className="font-medium text-[#1A1513]">
                {job.hairstyle?.description || 'Classic fade haircut generated with Gemini AI model.'}
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-[#F5F2EC] font-semibold text-[#1A1513]">
                  Length: {job.hairstyle?.length || 'Short'}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#F5F2EC] font-semibold text-[#1A1513]">
                  Maintenance: {job.hairstyle?.maintenanceLevel || 'Low'}
                </span>
              </div>
            </div>
          )}

          {/* Tab 3 Content: Customer Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-3">
              {[
                { name: 'Alex M.', text: 'Super realistic! Showed this exact AI preview to my barber.', rating: 5 },
                { name: 'David K.', text: 'The low fade preview was spot on. Highly recommended.', rating: 5 },
              ].map((r, i) => (
                <div key={i} className="p-3 rounded-2xl bg-[#F5F2EC] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#1A1513]">{r.name}</span>
                    <div className="flex text-[#FF6B35]">
                      {[...Array(r.rating)].map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-[#FF6B35]" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[#5C544E]">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <FloatingNav />
    </div>
  );
}
