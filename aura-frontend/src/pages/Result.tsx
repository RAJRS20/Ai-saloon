import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Share2, Scissors, ArrowLeft, Sparkles, Check, AlertCircle, Heart, Star } from 'lucide-react';
import BeforeAfter from '../components/BeforeAfter';
import { getJobStatus, regenerateTryOn } from '../services/hairstyleService';
import type { TryOnJob } from '../types/hairstyle';

const resolveImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const rawBase = import.meta.env.VITE_API_BASE_URL || 'https://ai-saloon-production.up.railway.app';
  const domain = rawBase.replace(/\/api\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${domain}${cleanPath}`;
};

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
    const targetUrl = resolveImageUrl(job?.resultImageUrl || job?.sourceImageUrl);
    if (!targetUrl) return;
    try {
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-ai-${job?.hairstyle?.name ? job.hairstyle.name.toLowerCase().replace(/\s+/g, '-') : 'hairstyle'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(targetUrl, '_blank');
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
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center light-card p-6 max-w-xs w-full">
          <div className="w-12 h-12 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] mx-auto mb-3 flex items-center justify-center">
            <Sparkles className="w-6 h-6 spin" />
          </div>
          <p className="text-[#1E1B18] font-bold text-sm mb-1">Rendering Haircut AI...</p>
          <p className="text-xs text-[#787069]">Applying fine strand texture and blending</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center light-card p-6 max-w-xs w-full">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h2 className="text-[#1E1B18] font-bold text-base mb-1">Something went wrong</h2>
          <p className="text-[#787069] text-xs mb-5">{error || 'Result not found'}</p>
          <button
            onClick={() => navigate('/tryon')}
            className="btn-primary-accent px-5 py-2.5 text-xs sm:text-sm w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const beforePhotoUrl = resolveImageUrl(job.sourceImageUrl);
  const afterPhotoUrl = resolveImageUrl(job.resultImageUrl) || beforePhotoUrl;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] flex flex-col justify-between relative pb-safe-bottom">
      {/* Mobile Aligned Main Result Container */}
      <main className="max-w-md mx-auto sm:max-w-xl md:max-w-3xl px-4 sm:px-6 py-5 w-full flex-1">
        <div className="light-card overflow-hidden p-4 sm:p-5 mb-6">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between mb-3.5">
            <button
              onClick={() => navigate('/tryon')}
              className="w-9 h-9 rounded-full bg-[#FAF8F5] border border-[#EBE6DE] flex items-center justify-center text-[#574F46] hover:text-[#1E1B18] hover:border-[#FF6B35] transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-3 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> AI Try-On Ready
            </span>

            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                isFavorite ? 'bg-red-50 border-red-200 text-red-500' : 'bg-[#FAF8F5] border-[#EBE6DE] text-[#574F46] hover:text-red-500'
              }`}
              aria-label="Favorite"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
            </button>
          </div>

          {/* Before / After Slider */}
          <div className="mb-5 rounded-2xl overflow-hidden shadow-sm border border-[#EBE6DE]">
            <BeforeAfter
              beforeUrl={beforePhotoUrl}
              afterUrl={afterPhotoUrl}
              beforeLabel="Before"
              afterLabel={job.hairstyle?.name || 'After AI Haircut'}
            />
          </div>

          {/* Hairstyle Title & Details */}
          <div className="flex items-start justify-between mb-3.5">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#1E1B18] mb-0.5">
                {job.hairstyle?.name || 'Textured Hairstyle'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-[#787069]">
                <div className="flex items-center gap-1 text-[#FF6B35] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#FF6B35]" />
                  <span>4.9 (120 reviews)</span>
                </div>
                <span>·</span>
                <span className="font-semibold text-[#FF6B35]">Pro Barber Style</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/tryon')}
              className="text-xs font-bold text-[#FF6B35] underline hover:text-[#E05A2B]"
            >
              Change Style
            </button>
          </div>

          {/* Tab Selector Pills */}
          <div className="flex gap-1.5 p-1 rounded-full bg-[#FAF8F5] border border-[#EBE6DE] mb-5">
            {(['result', 'about', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'pill-light-active'
                    : 'text-[#574F46] hover:text-[#1E1B18]'
                }`}
              >
                {tab === 'result' ? 'Result View' : tab}
              </button>
            ))}
          </div>

          {/* Tab Content 1: Actions */}
          {activeTab === 'result' && (
            <div className="space-y-3">
              <button
                id="btn-download-result"
                onClick={handleDownload}
                className="btn-primary-accent w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Save & Download Photo</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="btn-share-result"
                  onClick={handleShare}
                  className="btn-secondary-light py-2.5 text-xs flex items-center justify-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied!' : 'Share Look'}</span>
                </button>

                {!isDemoMode ? (
                  <button
                    id="btn-regenerate-result"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="btn-secondary-light py-2.5 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                    className="btn-secondary-light py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Try Another</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab Content 2: About */}
          {activeTab === 'about' && (
            <div className="text-xs text-[#574F46] leading-relaxed space-y-2">
              <p className="font-medium text-[#1E1B18]">
                {job.hairstyle?.description || 'Classic fade haircut generated with Gemini AI model.'}
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EBE6DE] font-semibold text-[#1E1B18]">
                  Length: {job.hairstyle?.length || 'Short'}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#EBE6DE] font-semibold text-[#1E1B18]">
                  Maintenance: {job.hairstyle?.maintenanceLevel || 'Low'}
                </span>
              </div>
            </div>
          )}

          {/* Tab Content 3: Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-2.5">
              {[
                { name: 'Alex M.', text: 'Super realistic! Showed this exact AI preview to my barber.', rating: 5 },
                { name: 'David K.', text: 'The low fade preview was spot on. Highly recommended.', rating: 5 },
              ].map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE6DE] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#1E1B18]">{r.name}</span>
                    <div className="flex text-[#FF6B35]">
                      {[...Array(r.rating)].map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-[#FF6B35]" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[#574F46]">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
