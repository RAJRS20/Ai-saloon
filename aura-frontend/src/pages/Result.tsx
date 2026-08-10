import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Share2, Scissors, ArrowLeft, Sparkles, Check, AlertCircle } from 'lucide-react';
import BeforeAfter from '../components/BeforeAfter';
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

  // Demo mode params
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
        hairstyle: demoStyle ? { id: 0, name: demoStyle, slug: '', category: '', description: '', promptDetails: '', recommendedFaceShapes: [], hairTypes: [], length: 'short', maintenanceLevel: 'low', referenceImageUrl: '', isActive: true, sortOrder: 0 } : undefined,
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
      <div className="min-h-screen bg-gradient-animated flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600 to-pink-600 pulse-glow mx-auto mb-4 flex items-center justify-center shadow-xl shadow-violet-600/40">
            <Sparkles className="w-8 h-8 text-white spin" />
          </div>
          <p className="text-white font-bold text-base mb-1">Rendering your transformation...</p>
          <p className="text-xs text-gray-400">Applying fine hair texture details</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-animated flex items-center justify-center p-4">
        <div className="text-center glass-card border border-red-500/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-white font-bold text-lg mb-1">Something went wrong</h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-6">{error || 'Result not found'}</p>
          <button
            onClick={() => navigate('/tryon')}
            className="btn-glow px-6 py-3 rounded-xl text-white font-bold text-xs sm:text-sm w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-animated flex flex-col justify-between">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-40 glass-card border-b border-white/5 px-4 sm:px-6 py-3 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            id="result-back-btn"
            onClick={() => navigate('/tryon')}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white active:scale-95 transition-all text-xs sm:text-sm font-semibold py-1 px-2.5 rounded-xl bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>New Try-On</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white">Aura AI</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 pb-safe-bottom">
        {/* Header Badge */}
        <div className="text-center mb-6 sm:mb-8 fade-in-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-3">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-bold">Transformation complete</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-1">
            {job.hairstyle?.name || 'New Hairstyle'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">Swipe or tap the slider to compare before and after</p>
        </div>

        {/* Before/After comparison slider */}
        <div className="fade-in-up max-w-sm sm:max-w-md mx-auto">
          <BeforeAfter
            beforeUrl={job.sourceImageUrl || ''}
            afterUrl={job.resultImageUrl || job.sourceImageUrl || ''}
            beforeLabel="Before"
            afterLabel={job.hairstyle?.name || 'After'}
          />
        </div>

        {/* Mobile-optimized action buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-6 sm:mt-8 max-w-sm sm:max-w-md mx-auto fade-in-up">
          {/* Download button */}
          <button
            id="btn-download-result"
            onClick={handleDownload}
            className="btn-glow flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Photo</span>
          </button>

          {/* Share button */}
          <button
            id="btn-share-result"
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl glass-card border border-white/15 text-white font-bold text-xs sm:text-sm hover:border-white/30 active:scale-95 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Share Look'}</span>
          </button>

          {/* Regenerate button (when available) */}
          {!isDemoMode && (
            <button
              id="btn-regenerate-result"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl glass-card border border-violet-500/30 text-violet-300 font-bold text-xs sm:text-sm hover:border-violet-500/60 active:scale-95 transition-all disabled:opacity-50"
            >
              {regenerating ? (
                <>
                  <Sparkles className="w-4 h-4 spin text-violet-400" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Regenerate</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Try another style button */}
        <div className="text-center mt-6">
          <button
            id="btn-try-another-style"
            onClick={() => navigate('/tryon')}
            className="text-xs sm:text-sm font-semibold text-violet-400 hover:text-violet-300 active:scale-95 inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-violet-500/10 border border-violet-500/20 transition-all"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Try a different hairstyle</span>
          </button>
        </div>

        {/* AI Disclaimer */}
        <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-6 max-w-xs mx-auto">
          Results are photorealistic AI visualizations created by Google Gemini.
        </p>
      </div>
    </div>
  );
}

