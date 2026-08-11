import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Upload, RotateCcw, Check, AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useFaceLandmarker } from '../hooks/useFaceLandmarker';
import FaceGuide from './FaceGuide';

interface CameraCaptureProps {
  onCapture: (file: File, previewUrl: string) => void;
}

type Mode = 'choice' | 'camera' | 'preview';

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [mode, setMode] = useState<Mode>('choice');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number>(0);

  const { qualityChecks, processFrame, faceCount } = useFaceLandmarker();

  useEffect(() => {
    if (mode !== 'camera' || !videoRef.current) return;
    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        processFrame(videoRef.current);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mode, processFrame]);

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setMode('camera');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError('Camera access denied or unavailable. Please allow camera permissions or upload a photo from your gallery.');
    }
  }, [facingMode]);

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  }, [facingMode, startCamera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    setIsCapturing(true);

    setCountdown(2);
    const tick = (n: number) => {
      if (n === 0) {
        setCountdown(null);
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'aura_portrait.jpg', { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            setCapturedFile(file);
            setPreviewUrl(url);
            setMode('preview');
            stopCamera();
            setIsCapturing(false);
          }
        }, 'image/jpeg', 0.94);
      } else {
        setTimeout(() => tick(n - 1), 800);
        setCountdown(n);
      }
    };
    tick(2);
  }, [stopCamera, facingMode, isCapturing]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please upload a JPG, PNG, or WebP photo.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('Image file must be smaller than 20MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    setCapturedFile(file);
    setPreviewUrl(url);
    setMode('preview');
  }, []);

  const handedOffRef = useRef(false);

  const handleConfirm = useCallback(() => {
    if (capturedFile && previewUrl) {
      handedOffRef.current = true;
      onCapture(capturedFile, previewUrl);
    }
  }, [capturedFile, previewUrl, onCapture]);

  const handleRetake = useCallback(() => {
    if (previewUrl && !handedOffRef.current) URL.revokeObjectURL(previewUrl);
    handedOffRef.current = false;
    setPreviewUrl(null);
    setCapturedFile(null);
    setMode('choice');
    stopCamera();
  }, [previewUrl, stopCamera]);

  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => { previewUrlRef.current = previewUrl; }, [previewUrl]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (!handedOffRef.current && previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [stopCamera]);

  const errorChecks = qualityChecks.filter(c => !c.passed && c.severity === 'error');
  const canCapture = errorChecks.length === 0 && faceCount === 1;

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-lg mx-auto">
      {/* Choice Mode */}
      {mode === 'choice' && (
        <div className="w-full fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Camera Button */}
            <button
              id="btn-use-camera"
              onClick={() => startCamera('user')}
              className="light-card rounded-2xl p-5 sm:p-6 flex flex-row sm:flex-col items-center gap-4 active:scale-[0.98] transition-all cursor-pointer text-left sm:text-center group"
            >
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7 text-[#FF6B35]" />
              </div>
              <div>
                <p className="font-bold text-[#1E1B18] text-base sm:text-lg">Take Live Photo</p>
                <p className="text-xs text-[#787069] mt-0.5">Use camera with real-time face guidance</p>
              </div>
            </button>

            {/* Upload Button */}
            <button
              id="btn-upload-photo"
              onClick={() => fileInputRef.current?.click()}
              className="light-card rounded-2xl p-5 sm:p-6 flex flex-row sm:flex-col items-center gap-4 active:scale-[0.98] transition-all cursor-pointer text-left sm:text-center group"
            >
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7 text-[#FF6B35]" />
              </div>
              <div>
                <p className="font-bold text-[#1E1B18] text-base sm:text-lg">Upload from Gallery</p>
                <p className="text-xs text-[#787069] mt-0.5">Choose portrait from your photos (JPG, PNG)</p>
              </div>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileUpload}
            id="file-input-photo"
          />

          {/* Guidelines Box */}
          <div className="mt-5 light-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2 text-[#FF6B35]">
              <Sparkles className="w-4 h-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Tips for realistic AI try-on</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1E1B18] font-medium">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Full head & hair visible
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Facing camera directly
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Clear natural lighting
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Neutral background
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Mode */}
      {mode === 'camera' && (
        <div className="w-full fade-in-up">
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-[3/4] w-full shadow-2xl border border-white/10">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              autoPlay
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            <FaceGuide qualityChecks={qualityChecks} faceCount={faceCount} />

            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <span className="text-8xl sm:text-9xl font-black text-white drop-shadow-2xl animate-pulse">
                  {countdown}
                </span>
              </div>
            )}

            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
              <button
                id="btn-camera-back-top"
                onClick={() => { setMode('choice'); stopCamera(); }}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
                aria-label="Back"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                id="btn-camera-flip"
                onClick={toggleCameraFacing}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
                aria-label="Switch camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 z-30">
                <div className="text-center max-w-xs">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-white font-medium text-sm mb-4">{cameraError}</p>
                  <button
                    id="btn-camera-upload-fallback"
                    onClick={() => { setMode('choice'); fileInputRef.current?.click(); }}
                    className="btn-primary-accent px-6 py-2.5 text-xs font-bold w-full"
                  >
                    Upload from Photos Instead
                  </button>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-10 pointer-events-auto px-4">
              <button
                id="btn-capture-photo"
                onClick={capturePhoto}
                disabled={isCapturing || !!cameraError || !canCapture}
                className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 cursor-pointer group"
                aria-label="Take Photo"
              >
                <span className="absolute inset-0 rounded-full border-4 border-white/80 group-hover:border-white transition-colors" />
                <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FF6B35] flex items-center justify-center shadow-lg text-white">
                  {isCapturing ? (
                    <Loader2 className="w-6 h-6 spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </span>
              </button>

              <span className="text-[10px] text-white/90 backdrop-blur-sm px-3 py-1 rounded-full bg-black/50">
                {canCapture ? 'Tap shutter to take portrait' : 'Position face inside guide'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {mode === 'preview' && previewUrl && (
        <div className="w-full fade-in-up">
          <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-black shadow-xl border border-[#EBE6DE]">
            <img
              src={previewUrl}
              alt="Your portrait preview"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            <div className="absolute top-3 left-3 right-3 flex justify-center pointer-events-none">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15">
                Portrait captured
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex gap-2.5">
              <button
                id="btn-retake-photo"
                onClick={handleRetake}
                className="flex-1 py-3 rounded-full bg-white/90 border border-[#EBE6DE] text-[#1E1B18] font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <button
                id="btn-use-this-photo"
                onClick={handleConfirm}
                className="flex-1 btn-primary-accent py-3 text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
