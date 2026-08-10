import { Check, Loader2, Image, Sparkles, CloudUpload } from 'lucide-react';
import type { JobStatus } from '../types/hairstyle';

interface GenerationProgressProps {
  status: JobStatus;
  progressMessage?: string;
  hairstyleName?: string;
}

const STEPS: { key: JobStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'VALIDATING', label: 'Validating photo quality', icon: <Image className="w-4 h-4" /> },
  { key: 'GENERATING', label: 'Transforming hairstyle with Gemini AI', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'STORING_RESULT', label: 'Finalizing photorealistic portrait', icon: <CloudUpload className="w-4 h-4" /> },
  { key: 'COMPLETED', label: 'Transformation complete!', icon: <Check className="w-4 h-4" /> },
];

const STATUS_ORDER: JobStatus[] = ['PENDING', 'VALIDATING', 'GENERATING', 'STORING_RESULT', 'COMPLETED'];

function getStepState(stepKey: JobStatus, currentStatus: JobStatus): 'done' | 'active' | 'pending' {
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  if (currentIdx > stepIdx) return 'done';
  if (currentIdx === stepIdx) return 'active';
  return 'pending';
}

export default function GenerationProgress({ status, progressMessage, hairstyleName }: GenerationProgressProps) {
  return (
    <div className="w-full max-w-sm mx-auto text-center fade-in-up px-2">
      {/* Animated Orb Centerpiece */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 pulse-glow shadow-2xl shadow-violet-600/40" />
        <div className="absolute inset-1.5 sm:inset-2 rounded-full bg-gradient-to-br from-violet-900/60 to-pink-900/60 backdrop-blur-md flex items-center justify-center border border-white/20">
          {status === 'COMPLETED' ? (
            <Check className="w-8 h-8 text-emerald-400" strokeWidth={3} />
          ) : (
            <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-white spin" />
          )}
        </div>
        {/* Pulsing Orbit Rings */}
        {status !== 'COMPLETED' && (
          <>
            <div className="absolute -inset-2 rounded-full border border-violet-500/30 animate-ping" style={{ animationDuration: '2.5s' }} />
            <div className="absolute -inset-4 rounded-full border border-pink-500/20 animate-ping" style={{ animationDuration: '3.5s' }} />
          </>
        )}
      </div>

      <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1">
        {status === 'COMPLETED' ? 'Your look is ready!' : `Applying ${hairstyleName || 'new style'}...`}
      </h3>
      <p className="text-xs sm:text-sm text-gray-400 mb-6">
        {progressMessage || 'Google Gemini is creating your virtual haircut transformation'}
      </p>

      {/* Generation Step Checklist */}
      <div className="flex flex-col gap-2.5 sm:gap-3 text-left">
        {STEPS.map((step) => {
          const state = getStepState(step.key, status);
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl transition-all duration-500 ${
                state === 'active'
                  ? 'glass-card border border-violet-500/50 bg-violet-500/15 shadow-lg shadow-violet-600/15'
                  : state === 'done'
                  ? 'glass-card-sm border border-emerald-500/30 bg-emerald-500/10'
                  : 'glass-card-sm border border-white/5 opacity-35'
              }`}
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  state === 'done'
                    ? 'bg-emerald-500 shadow-md shadow-emerald-500/40'
                    : state === 'active'
                    ? 'bg-violet-600 shadow-md shadow-violet-600/50'
                    : 'bg-gray-800'
                }`}
              >
                {state === 'done' ? (
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                ) : state === 'active' ? (
                  <Loader2 className="w-3.5 h-3.5 text-white spin" />
                ) : (
                  <span className="text-gray-500">{step.icon}</span>
                )}
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold truncate ${
                  state === 'done'
                    ? 'text-emerald-300'
                    : state === 'active'
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-[11px] text-gray-500">
        Takes approximately 15–30 seconds. Your portrait stays private and secure.
      </p>
    </div>
  );
}

