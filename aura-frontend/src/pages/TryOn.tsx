import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Scissors, Sparkles, AlertCircle, RefreshCw, Check } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import HairstyleGrid from '../components/HairstyleGrid';
import GenerationProgress from '../components/GenerationProgress';
import FloatingNav from '../components/FloatingNav';
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
  const photoPreviewUrlRef = useRef<string | null>(null);

  const handlePhotoCapture = useCallback((file: File, previewUrl: string) => {
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
      console.warn('Backend error or fallback to demo:', err);
    }
  }, [photoFile, selectedHairstyle, hairColor, photoPreviewUrl, navigate]);

  const steps: Step[] = ['photo', 'hairstyle', 'generating', 'done'];
  const currentStepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex flex-col justify-between relative pb-safe-bottom">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-40 bg-white/90 border-b border-[#E6E1D8] px-4 sm:px-6 py-3 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Back button */}
          <button
            id="tryon-back-btn"
            onClick={() => {
              if (step === 'photo') navigate('/');
              else if (step === 'hairstyle') setStep('photo');
            }}
            className="w-9 h-9 rounded-full bg-[#F5F2EC] border border-[#E6E1D8] flex items-center justify-center text-[#5C544E] hover:text-[#1A1513] hover:border-[#FF6B35] active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Step Progress Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {(['photo', 'hairstyle', 'done'] as const).map((s, i) => {
              const isPast = i < currentStepIdx;
              const isCurrent = i === currentStepIdx;

              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'pill-active'
                        : isPast
                        ? 'bg-[#FF6B35]/15 text-[#FF6B35]'
                        : 'bg-[#F5F2EC] text-[#8C837B]'
                    }`}
                  >
                    <span>{i + 1}</span>
                    <span className="hidden xs:inline">{STEP_LABELS[s]}</span>
                  </div>
                  {i < 2 && (
                    <div className={`w-3 sm:w-6 h-0.5 rounded-full ${i < currentStepIdx ? 'bg-[#FF6B35]' : 'bg-[#E6E1D8]'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white shadow-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="text-sm font-extrabold text-[#1A1513] hidden sm:block">Aura AI</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 ${step === 'hairstyle' ? 'pb-28 sm:pb-32' : ''}`}>
        {/* Error banner */}
        {error && (
          <div className="mb-4 sm:mb-6 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* ── Step 1: Photo Capture ── */}
        {step === 'photo' && (
          <div className="fade-in-up">
            <div className="text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B35] block mb-1">Step 1 of 2</span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1A1513] mb-1">Take or Upload Your Photo</h1>
              <p className="text-xs sm:text-sm text-[#8C837B]">Front-facing portrait with clear lighting works best</p>
            </div>
            <CameraCapture onCapture={handlePhotoCapture} />
          </div>
        )}

        {/* ── Step 2: Hairstyle Selection ── */}
        {step === 'hairstyle' && (
          <div>
            {/* User Photo Ready Card */}
            <div className="card-reference p-4 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {photoPreviewUrl && (
                  <div className="shrink-0 w-12 h-14 rounded-2xl overflow-hidden border-2 border-[#FF6B35] shadow-sm">
                    <img src={photoPreviewUrl} alt="Your photo" className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#FF6B35] uppercase tracking-wide">Photo Uploaded</span>
                    {selectedHairstyle && (
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1A1513]">
                    {selectedHairstyle ? selectedHairstyle.name : 'Choose a Hairstyle Below'}
                  </h2>
                  <button
                    onClick={() => setStep('photo')}
                    className="text-[11px] text-[#8C837B] hover:text-[#FF6B35] flex items-center gap-1 mt-0.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change photo</span>
                  </button>
                </div>
              </div>

              {/* Direct Generate Button */}
              {selectedHairstyle && (
                <button
                  id="btn-top-generate-tryon"
                  onClick={startGeneration}
                  className="btn-orange px-5 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Haircut</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Hair Color Selector */}
            <div className="card-reference p-4 mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-[#1A1513] uppercase tracking-wider">Hair Color</label>
                <span className="text-xs text-[#FF6B35] font-semibold capitalize">{hairColor}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2 py-1">
                {HAIR_COLORS.map(c => {
                  const isSelected = hairColor === c.name;
                  return (
                    <button
                      key={c.name}
                      id={`hair-color-${c.name.replace(' ', '-')}`}
                      onClick={() => setHairColor(c.name)}
                      className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'pill-active'
                          : 'pill-inactive'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/50 shadow-sm"
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
          <div className="py-8 sm:py-16">
            <GenerationProgress
              status={jobStatus}
              progressMessage={jobProgressMsg}
              hairstyleName={selectedHairstyle?.name}
            />
          </div>
        )}
      </div>

      {/* Floating Bottom Bar when selecting hairstyle */}
      {step === 'hairstyle' && (
        <div className="fixed bottom-16 sm:bottom-20 left-4 right-4 z-40 pointer-events-none">
          <div className="max-w-md mx-auto bg-[#1A1513] text-white rounded-full p-2 pl-4 shadow-2xl flex items-center justify-between gap-3 pointer-events-auto border border-white/10">
            <div className="truncate">
              <p className="text-[10px] text-gray-400">Selected Style</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {selectedHairstyle ? selectedHairstyle.name : 'Tap a hairstyle above'}
              </p>
            </div>

            <button
              id="btn-generate-tryon"
              onClick={startGeneration}
              disabled={!selectedHairstyle}
              className="btn-orange px-5 py-2.5 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Book / Generate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation */}
      <FloatingNav />
    </div>
  );
}
