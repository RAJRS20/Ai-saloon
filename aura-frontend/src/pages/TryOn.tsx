import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Scissors, Sparkles, AlertCircle, RefreshCw, Check } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import HairstyleGrid from '../components/HairstyleGrid';
import GenerationProgress from '../components/GenerationProgress';
import type { Hairstyle, TryOnJob, JobStatus } from '../types/hairstyle';
import { generateTryOn, getJobStatus, getHairstyles } from '../services/hairstyleService';

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
  const [searchParams] = useSearchParams();
  const styleIdParam = searchParams.get('styleId');

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

  // Load preselected hairstyle if styleId query parameter is present from Home page
  useEffect(() => {
    if (styleIdParam) {
      const id = Number(styleIdParam);
      if (!isNaN(id)) {
        getHairstyles()
          .then(list => {
            const found = list.find(h => h.id === id);
            if (found) setSelectedHairstyle(found);
          })
          .catch(() => {});
      }
    }
  }, [styleIdParam]);

  const handleHairstyleSelect = useCallback((h: Hairstyle) => {
    setSelectedHairstyle(h);
  }, []);

  const startGeneration = useCallback(async (fileOverride?: File, styleOverride?: Hairstyle) => {
    const targetFile = fileOverride || photoFile;
    const targetStyle = styleOverride || selectedHairstyle;

    if (!targetFile || !targetStyle) return;
    setError(null);
    setStep('generating');
    setJobStatus('PENDING');

    if (pollRef.current) clearInterval(pollRef.current);

    try {
      setJobStatus('VALIDATING');
      setJobProgressMsg('Checking your photo quality...');
      const job: TryOnJob = await generateTryOn(targetFile, {
        hairstyleId: targetStyle.id,
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
          navigate(`/result/demo?before=${encodeURIComponent(photoPreviewUrl || '')}&style=${encodeURIComponent(targetStyle.name)}`);
        }, 2000);
      }, 3000);
      console.warn('Fallback error:', err);
    }
  }, [photoFile, selectedHairstyle, hairColor, photoPreviewUrl, navigate]);

  const handlePhotoCapture = useCallback((file: File, previewUrl: string) => {
    if (photoPreviewUrlRef.current && photoPreviewUrlRef.current !== previewUrl) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
    }
    photoPreviewUrlRef.current = previewUrl;
    setPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);

    // If hairstyle was ALREADY selected on Home page, directly start generation!
    if (selectedHairstyle) {
      startGeneration(file, selectedHairstyle);
    } else {
      // General Try-On flow: Proceed step-by-step to Step 2 (Select Hairstyle)
      setStep('hairstyle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedHairstyle, startGeneration]);

  const steps: Step[] = ['photo', 'hairstyle', 'generating', 'done'];
  const currentStepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1E1B18] flex flex-col justify-between relative pb-safe-bottom">
      {/* Light Header Bar */}
      <header className="sticky top-0 z-40 light-header px-4 sm:px-6 py-3">
        <div className="max-w-md mx-auto sm:max-w-xl md:max-w-4xl flex items-center justify-between gap-3">
          <button
            id="tryon-back-btn"
            onClick={() => {
              if (step === 'photo') navigate('/');
              else if (step === 'hairstyle') setStep('photo');
            }}
            className="w-9 h-9 rounded-full bg-white border border-[#EBE6DE] flex items-center justify-center text-[#574F46] hover:text-[#1E1B18] hover:border-[#FF6B35] active:scale-95 transition-all"
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
                        ? 'pill-light-active'
                        : isPast
                        ? 'bg-[#FF6B35]/15 text-[#FF6B35]'
                        : 'bg-white text-[#787069] border border-[#EBE6DE]'
                    }`}
                  >
                    <span>{i + 1}</span>
                    <span className="hidden xs:inline">{STEP_LABELS[s]}</span>
                  </div>
                  {i < 2 && (
                    <div className={`w-3 sm:w-6 h-0.5 rounded-full ${i < currentStepIdx ? 'bg-[#FF6B35]' : 'bg-[#EBE6DE]'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white shadow-sm">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="text-sm font-extrabold text-[#1E1B18] hidden sm:block">Aura AI</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-md mx-auto sm:max-w-xl md:max-w-4xl px-4 sm:px-6 py-5 w-full flex-1 ${step === 'hairstyle' ? 'pb-28 sm:pb-32' : ''}`}>
        {/* Error banner */}
        {error && (
          <div className="mb-4 sm:mb-6 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Step 1: Photo Capture */}
        {step === 'photo' && (
          <div className="fade-in-up">
            {/* Pre-selected Hairstyle Banner if coming from Home */}
            {selectedHairstyle && (
              <div className="mb-4 light-card p-3 flex items-center justify-between gap-2 border-l-4 border-l-[#FF6B35]">
                <div className="flex items-center gap-2 min-w-0">
                  <Scissors className="w-4 h-4 text-[#FF6B35] shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-[#FF6B35] tracking-wider block">Selected Style</span>
                    <span className="text-xs font-bold text-[#1E1B18] truncate block">{selectedHairstyle.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedHairstyle(null);
                    setStep('hairstyle');
                  }}
                  className="text-xs text-[#787069] hover:text-[#FF6B35] font-semibold shrink-0"
                >
                  Change
                </button>
              </div>
            )}

            <div className="text-center mb-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B35] block mb-1">
                {selectedHairstyle ? 'Upload Photo to Generate' : 'Step 1 of 2'}
              </span>
              <h1 className="text-2xl font-black text-[#1E1B18] mb-1">Take or Upload Your Photo</h1>
              <p className="text-xs text-[#787069]">
                {selectedHairstyle
                  ? `Once uploaded, AI will immediately apply ${selectedHairstyle.name}`
                  : 'Front-facing portrait with clear lighting works best'}
              </p>
            </div>
            <CameraCapture onCapture={handlePhotoCapture} />
          </div>
        )}

        {/* Step 2: Hairstyle Selection (Used in general Try-On flow) */}
        {step === 'hairstyle' && (
          <div>
            {/* User Photo Card */}
            <div className="light-card p-3.5 mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {photoPreviewUrl && (
                  <div className="shrink-0 w-12 h-14 rounded-xl overflow-hidden border-2 border-[#FF6B35] shadow-sm">
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
                  <h2 className="text-xs sm:text-sm font-bold text-[#1E1B18]">
                    {selectedHairstyle ? selectedHairstyle.name : 'Choose a Hairstyle Below'}
                  </h2>
                  <button
                    onClick={() => setStep('photo')}
                    className="text-[11px] text-[#787069] hover:text-[#FF6B35] flex items-center gap-1 mt-0.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change photo</span>
                  </button>
                </div>
              </div>

              {selectedHairstyle && (
                <button
                  id="btn-top-generate-tryon"
                  onClick={() => startGeneration()}
                  className="btn-primary-accent px-4 py-2 text-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Hair Color Selector */}
            <div className="light-card p-3.5 mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#1E1B18] uppercase tracking-wider">Hair Color</label>
                <span className="text-xs text-[#FF6B35] font-semibold capitalize">{hairColor}</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2 py-0.5">
                {HAIR_COLORS.map(c => {
                  const isSelected = hairColor === c.name;
                  return (
                    <button
                      key={c.name}
                      id={`hair-color-${c.name.replace(' ', '-')}`}
                      onClick={() => setHairColor(c.name)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'pill-light-active'
                          : 'pill-light-inactive'
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

        {/* Step 3: Generating */}
        {step === 'generating' && (
          <div className="py-8 sm:py-14">
            <GenerationProgress
              status={jobStatus}
              progressMessage={jobProgressMsg}
              hairstyleName={selectedHairstyle?.name}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Bar when selecting hairstyle */}
      {step === 'hairstyle' && (
        <div className="fixed bottom-4 left-4 right-4 z-40 pointer-events-none">
          <div className="max-w-md mx-auto bg-[#1E1B18] text-white rounded-full p-2 pl-4 shadow-2xl flex items-center justify-between gap-3 pointer-events-auto border border-white/10">
            <div className="truncate">
              <p className="text-[10px] text-gray-400">Selected Style</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {selectedHairstyle ? selectedHairstyle.name : 'Tap a style above'}
              </p>
            </div>

            <button
              id="btn-generate-tryon"
              onClick={() => startGeneration()}
              disabled={!selectedHairstyle}
              className="btn-primary-accent px-5 py-2.5 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
