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
      {/* Animated Orb */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8">
        <div className="absolute inset-0 rounded-full bg-[#FF6B35] shadow-xl shadow-[#FF6B35]/30 animate-pulse" />
        <div className="absolute inset-1.5 sm:inset-2 rounded-full bg-white flex items-center justify-center border-2 border-[#FF6B35]">
          {status === 'COMPLETED' ? (
            <Check className="w-8 h-8 text-emerald-600" strokeWidth={3} />
          ) : (
            <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-[#FF6B35] spin" />
          )}
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-black text-[#1E1B18] mb-1">
        {status === 'COMPLETED' ? 'Your look is ready!' : `Applying ${hairstyleName || 'new style'}...`}
      </h3>
      <p className="text-xs sm:text-sm text-[#787069] mb-6">
        {progressMessage || 'Google Gemini AI is rendering your haircut transformation'}
      </p>

      {/* Generation Checklist */}
      <div className="flex flex-col gap-2.5 sm:gap-3 text-left">
        {STEPS.map((step) => {
          const state = getStepState(step.key, status);
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-2xl transition-all duration-300 ${
                state === 'active'
                  ? 'bg-white border-2 border-[#FF6B35] shadow-md'
                  : state === 'done'
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-[#F5F2EC] border border-[#EBE6DE] opacity-60'
              }`}
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  state === 'done'
                    ? 'bg-emerald-600 text-white'
                    : state === 'active'
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-[#EBE6DE] text-[#787069]'
                }`}
              >
                {state === 'done' ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : state === 'active' ? (
                  <Loader2 className="w-3.5 h-3.5 spin" />
                ) : (
                  <span className="text-[#787069]">{step.icon}</span>
                )}
              </div>
              <span
                className={`text-xs sm:text-sm font-bold truncate ${
                  state === 'done'
                    ? 'text-emerald-700'
                    : state === 'active'
                    ? 'text-[#1E1B18]'
                    : 'text-[#787069]'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-[11px] text-[#787069]">
        Takes approximately 15–30 seconds. Your portrait stays private and secure.
      </p>
    </div>
  );
}
