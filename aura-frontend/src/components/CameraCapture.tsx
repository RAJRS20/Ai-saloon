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

  // Live face tracking on video
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
    // Stop any existing stream first
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

    // 2-second quick countdown for mobile
    setCountdown(2);
    const tick = (n: number) => {
      if (n === 0) {
        setCountdown(null);
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        
        // Flip horizontally if front-facing user camera for natural selfie photo
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

  // Track whether the blob URL was handed off to the parent — if so, the parent
  // owns the lifetime of that URL and we must NOT revoke it on unmount.
  const handedOffRef = useRef(false);

  const handleConfirm = useCallback(() => {
    if (capturedFile && previewUrl) {
      handedOffRef.current = true;
      onCapture(capturedFile, previewUrl);
    }
  }, [capturedFile, previewUrl, onCapture]);

  const handleRetake = useCallback(() => {
    // Safe to revoke here — we're keeping the URL inside this component
    if (previewUrl && !handedOffRef.current) URL.revokeObjectURL(previewUrl);
    handedOffRef.current = false;
    setPreviewUrl(null);
    setCapturedFile(null);
    setMode('choice');
    stopCamera();
  }, [previewUrl, stopCamera]);

  // Only run cleanup for the camera stream; do NOT revoke the blob URL on unmount
  // if it was already passed to the parent via onCapture.
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => { previewUrlRef.current = previewUrl; }, [previewUrl]);

  useEffect(() => {
    return () => {
      stopCamera();
      // Only revoke if we still own the URL (it wasn't handed off)
      if (!handedOffRef.current && previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [stopCamera]);

  const passedChecks = qualityChecks.filter(c => c.passed).length;
  const errorChecks = qualityChecks.filter(c => !c.passed && c.severity === 'error');
  const warningChecks = qualityChecks.filter(c => !c.passed && c.severity === 'warning');
  const canCapture = errorChecks.length === 0 && faceCount === 1;

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-lg mx-auto">
      {/* ── Mode: Choice ── */}
      {mode === 'choice' && (
        <div className="w-full fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Camera button */}
            <button
              id="btn-use-camera"
              onClick={() => startCamera('user')}
              className="glass-card rounded-2xl p-6 sm:p-8 flex sm:flex-col items-center gap-4 sm:gap-4 border border-violet-500/20 hover:border-violet-500/60 active:scale-[0.98] transition-all group cursor-pointer text-left sm:text-center"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-violet-600/10">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-violet-400" />
              </div>
              <div>
                <p className="font-bold text-white text-base sm:text-lg">Take Live Photo</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">Use camera with real-time face guidance</p>
              </div>
            </button>

            {/* Upload button */}
            <button
              id="btn-upload-photo"
              onClick={() => fileInputRef.current?.click()}
              className="glass-card rounded-2xl p-6 sm:p-8 flex sm:flex-col items-center gap-4 sm:gap-4 border border-pink-500/20 hover:border-pink-500/60 active:scale-[0.98] transition-all group cursor-pointer text-left sm:text-center"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 border border-pink-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-pink-600/10">
                <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-pink-400" />
              </div>
              <div>
                <p className="font-bold text-white text-base sm:text-lg">Upload from Gallery</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">Choose portrait from your photos (JPG, PNG)</p>
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

          {/* Photo guidelines */}
          <div className="mt-4 sm:mt-6 glass-card-sm rounded-2xl p-4 sm:p-5 border border-white/5">
            <div className="flex items-center gap-2 mb-2 text-violet-300">
              <Sparkles className="w-3.5 h-3.5" />
              <p className="text-xs font-bold uppercase tracking-wider">Tips for realistic AI try-on</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 font-bold">✓</span> Full head & hair visible
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 font-bold">✓</span> Facing camera directly
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 font-bold">✓</span> Clear natural lighting
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 font-bold">✓</span> Neutral background
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mode: Live Camera ── */}
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

            {/* Face guide overlay */}
            <FaceGuide qualityChecks={qualityChecks} faceCount={faceCount} />

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <span className="text-8xl sm:text-9xl font-black text-white drop-shadow-2xl animate-pulse">
                  {countdown}
                </span>
              </div>
            )}

            {/* Top controls in camera viewfinder */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
              <button
                id="btn-camera-back-top"
                onClick={() => { setMode('choice'); stopCamera(); }}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
                aria-label="Back"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Flip camera button */}
              <button
                id="btn-camera-flip"
                onClick={toggleCameraFacing}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
                title="Switch camera"
                aria-label="Switch camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Camera error state */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 z-30">
                <div className="text-center max-w-xs">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-white font-medium text-sm mb-4">{cameraError}</p>
                  <button
                    id="btn-camera-upload-fallback"
                    onClick={() => { setMode('choice'); fileInputRef.current?.click(); }}
                    className="btn-glow px-6 py-2.5 rounded-xl text-white text-xs font-bold w-full"
                  >
                    Upload from Photos Instead
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Shutter Bar inside Camera */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-10 pointer-events-auto px-4">
              {/* Shutter Button */}
              <button
                id="btn-capture-photo"
                onClick={capturePhoto}
                disabled={isCapturing || !!cameraError || !canCapture}
                className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed group cursor-pointer"
                aria-label="Take Photo"
              >
                {/* Outer Ring */}
                <span className="absolute inset-0 rounded-full border-4 border-white/80 group-hover:border-white transition-colors" />
                {/* Inner glowing circle */}
                <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 group-hover:from-violet-400 group-hover:to-pink-400 transition-all flex items-center justify-center shadow-lg shadow-violet-600/40">
                  {isCapturing ? (
                    <Loader2 className="w-6 h-6 text-white spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </span>
              </button>

              <span className="text-[10px] text-white/70 backdrop-blur-sm px-2.5 py-0.5 rounded-full bg-black/40">
                {canCapture ? 'Tap shutter to take portrait' : 'Position face inside guide'}
              </span>
            </div>
          </div>

          {/* Quality indicators pill list */}
          {qualityChecks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {qualityChecks.filter(c => !c.passed).map((check, i) => (
                <span
                  key={i}
                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full ${
                    check.severity === 'error'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{check.message}</span>
                </span>
              ))}
              {passedChecks > 0 && errorChecks.length === 0 && warningChecks.length === 0 && (
                <span className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-medium">
                  <Check className="w-3 h-3" />
                  Positioning looks great!
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mode: Photo Preview ── */}
      {mode === 'preview' && previewUrl && (
        <div className="w-full fade-in-up">
          <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-black shadow-2xl border border-white/10">
            <img
              src={previewUrl}
              alt="Your portrait preview"
              className="w-full h-full object-cover object-top"
            />
            {/* Gradient overlay for buttons */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            {/* Top confirmation badge */}
            <div className="absolute top-3 left-3 right-3 flex justify-center pointer-events-none">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15">
                Portrait captured
              </span>
            </div>

            {/* Bottom floating action bar */}
            <div className="absolute bottom-4 left-4 right-4 flex gap-2.5">
              <button
                id="btn-retake-photo"
                onClick={handleRetake}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl glass-card border border-white/20 text-white font-semibold text-xs sm:text-sm active:scale-95 transition-all shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>
              <button
                id="btn-use-this-photo"
                onClick={handleConfirm}
                className="flex-1 btn-glow rounded-2xl py-3 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-violet-600/30"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2.5">
            Face and natural hair are clearly framed for best virtual haircut accuracy
          </p>
        </div>
      )}
    </div>
  );
}

