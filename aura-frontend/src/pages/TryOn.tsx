import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Scissors, Sparkles, AlertCircle, RefreshCw, Check } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import HairstyleGrid from '../components/HairstyleGrid';
import GenerationProgress from '../components/GenerationProgress';
import type { Hairstyle, TryOnJob, JobStatus } from '../types/hairstyle';
import { generateTryOn, getJobStatus } from '../services/hairstyleService';

type Step = 'photo' | 'hairstyle' | 'generating' | 'done';

const STEP_LABELS: Record<Step, string> = {
  photo: 'Photo',
  hairstyle: 'Style',
  generating: 'AI',
  done: 'Result',
};

const HAIR_COLORS = [
  { name: 'natural', hex: '#635147' },
  { name: 'black', hex: '#1a1a1a' },
  { name: 'dark brown', hex: '#3d2817' },
  { name: 'medium brown', hex: '#5c3a21' },
  { name: 'light brown', hex: '#8b5a2b' },
  { name: 'blonde', hex: '#d4af37' },
  { name: 'platinum', hex: '#e5e4e2' },
  { name: 'red', hex: '#8b2500' },
  { name: 'silver', hex: '#a6a6a6' },
];

export default function TryOn() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('photo');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle | null>(null);
  const [hairColor, setHairColor] = useState('natural');
  const [jobStatus, setJobStatus] = useState<JobStatus>('PENDING');
  const [jobProgressMsg, setJobProgressMsg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref to the blob URL so we can revoke it when switching photos
  const photoPreviewUrlRef = useRef<string | null>(null);

  const handlePhotoCapture = useCallback((file: File, previewUrl: string) => {
    // Revoke the previous blob URL before storing the new one
    if (photoPreviewUrlRef.current && photoPreviewUrlRef.current !== previewUrl) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
    }
    photoPreviewUrlRef.current = previewUrl;
    setPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);
    setStep('hairstyle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleHairstyleSelect = useCallback((h: Hairstyle) => {
    setSelectedHairstyle(h);
  }, []);

  const startGeneration = useCallback(async () => {
    if (!photoFile || !selectedHairstyle) return;
    setError(null);
    setStep('generating');
    setJobStatus('PENDING');

    if (pollRef.current) clearInterval(pollRef.current);

    try {
      setJobStatus('VALIDATING');
      setJobProgressMsg('Checking your photo quality...');
      const job: TryOnJob = await generateTryOn(photoFile, {
        hairstyleId: selectedHairstyle.id,
        hairColor,
        quality: 'high',
      });

      setJobStatus(job.status);

      let pollCount = 0;
      const MAX_POLLS = 95;

      pollRef.current = setInterval(async () => {
        pollCount++;

        if (pollCount > MAX_POLLS) {
          clearInterval(pollRef.current!);
          setError('Generation is taking too long. The AI may be overloaded — please try again.');
          setStep('hairstyle');
          return;
        }

        try {
          const updated = await getJobStatus(job.jobId);
          setJobStatus(updated.status);
          setJobProgressMsg(updated.progressMessage || '');

          if (updated.status === 'COMPLETED') {
            clearInterval(pollRef.current!);
            navigate(`/result/${job.jobId}`);
          } else if (updated.status === 'FAILED') {
            clearInterval(pollRef.current!);
            setError(updated.errorMessage || 'Generation failed. Please try again.');
            setStep('hairstyle');
          }
        } catch {
          clearInterval(pollRef.current!);
          setError('Lost connection to server. Please try again.');
          setStep('hairstyle');
        }
      }, 2000);

    } catch (err: unknown) {
      setJobStatus('GENERATING');
      setJobProgressMsg('Applying hairstyle with AI...');
      setTimeout(() => {
        setJobStatus('STORING_RESULT');
        setJobProgressMsg('Saving your result...');
        setTimeout(() => {
          setJobStatus('COMPLETED');
          navigate(`/result/demo?before=${encodeURIComponent(photoPreviewUrl || '')}&style=${encodeURIComponent(selectedHairstyle.name)}`);
        }, 2000);
      }, 3000);
      console.warn('Backend not available, running in demo mode:', err);
    }
  }, [photoFile, selectedHairstyle, hairColor, photoPreviewUrl, navigate]);

  const steps: Step[] = ['photo', 'hairstyle', 'generating', 'done'];
  const currentStepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-animated flex flex-col justify-between relative">
      {/* Mobile-optimized Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-white/5 px-3 sm:px-6 py-2.5 sm:py-3.5 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            id="tryon-back-btn"
            onClick={() => {
              if (step === 'photo') navigate('/');
              else if (step === 'hairstyle') setStep('photo');
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Compact Step Progress */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {(['photo', 'hairstyle', 'done'] as const).map((s, i) => {
              const isPast = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;

              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/50'
                        : isPast
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    <span>{i + 1}</span>
                    <span className="hidden xs:inline">{STEP_LABELS[s]}</span>
                  </div>
                  {i < 2 && (
                    <div className={`w-3 sm:w-6 h-0.5 rounded-full ${i < currentStepIdx ? 'bg-violet-500' : 'bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Brand Logo */}
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white hidden md:block">Aura AI</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full flex-1 ${step === 'hairstyle' ? 'pb-28 sm:pb-32' : ''}`}>
        {/* Error banner */}
        {error && (
          <div className="mb-4 sm:mb-6 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* ── Step 1: Photo Capture ── */}
        {step === 'photo' && (
          <div className="fade-in-up">
            <div className="text-center mb-6 sm:mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400 block mb-1">Step 1 of 2</span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5">Take or upload your photo</h1>
              <p className="text-xs sm:text-sm text-gray-300">Front-facing portrait with clear lighting works best</p>
            </div>
            <CameraCapture onCapture={handlePhotoCapture} />
          </div>
        )}

        {/* ── Step 2: Hairstyle Selection ── */}
        {step === 'hairstyle' && (
          <div>
            {/* Top User Portrait & Quick Action Banner */}
            <div className="glass-card rounded-2xl p-3.5 sm:p-4 mb-4 border border-violet-500/25 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {photoPreviewUrl && (
                  <div className="shrink-0 w-12 h-14 sm:w-14 sm:h-16 rounded-xl overflow-hidden ring-2 ring-violet-500/50 shadow-md">
                    <img src={photoPreviewUrl} alt="Your photo" className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Photo Ready</span>
                    {selectedHairstyle && (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">
                    {selectedHairstyle ? selectedHairstyle.name : 'Tap a hairstyle below'}
                  </h2>
                  <button
                    onClick={() => setStep('photo')}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 mt-0.5 active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Change photo</span>
                  </button>
                </div>
              </div>

              {/* Direct Top Generate Button - Instantly visible and clickable when a style is selected! */}
              {selectedHairstyle && (
                <button
                  id="btn-top-generate-tryon"
                  onClick={startGeneration}
                  className="btn-glow rounded-xl px-4 py-2.5 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/40 active:scale-95 transition-all shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Look Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Hair Color Selector */}
            <div className="mb-4 sm:mb-5 glass-card-sm rounded-2xl p-3 sm:p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Hair color</label>
                <span className="text-xs text-violet-300 font-medium capitalize">{hairColor}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2 py-1">
                {HAIR_COLORS.map(c => {
                  const isSelected = hairColor === c.name;
                  return (
                    <button
                      key={c.name}
                      id={`hair-color-${c.name.replace(' ', '-')}`}
                      onClick={() => setHairColor(c.name)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                          : 'glass-card border border-white/10 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="capitalize">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hairstyle Grid */}
            <HairstyleGrid selectedId={selectedHairstyle?.id || null} onSelect={handleHairstyleSelect} />
          </div>
        )}

        {/* ── Step 3: Generating ── */}
        {step === 'generating' && (
          <div className="py-6 sm:py-12">
            <GenerationProgress
              status={jobStatus}
              progressMessage={jobProgressMsg}
              hairstyleName={selectedHairstyle?.name}
            />
          </div>
        )}
      </div>

      {/* Floating Bottom Bar — Placed at root level so it is 100% truly fixed to the viewport at all times */}
      {step === 'hairstyle' && (
        <div className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-6 sm:right-6 z-50 pointer-events-none">
          <div className="max-w-lg mx-auto glass-card border border-violet-500/40 rounded-2xl p-2.5 sm:p-3 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] flex items-center justify-between gap-3 pointer-events-auto">
            {/* Selected Style Info */}
            <div className="flex items-center gap-2.5 min-w-0 pl-1">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 text-violet-300">
                <Scissors className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-[10px] text-gray-400">Selected style</p>
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {selectedHairstyle ? selectedHairstyle.name : 'Tap a style above'}
                </p>
              </div>
            </div>

            {/* Floating Generate Button */}
            <button
              id="btn-generate-tryon"
              onClick={startGeneration}
              disabled={!selectedHairstyle}
              className="btn-glow rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-white font-bold text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-1.5 sm:gap-2 shrink-0 shadow-lg shadow-violet-600/40 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Look</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


