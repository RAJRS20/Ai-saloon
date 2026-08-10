import { useState, useEffect, useRef, useCallback } from 'react';
import type { FaceLandmark, HeadPose, FaceQualityCheck } from '../types/hairstyle';

interface FaceLandmarkerResult {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  faceCount: number;
  landmarks: FaceLandmark[][];
  headPose: HeadPose | null;
  qualityChecks: FaceQualityCheck[];
  processFrame: (videoElement: HTMLVideoElement | HTMLCanvasElement) => void;
  analyzeImage: (imageElement: HTMLImageElement | HTMLCanvasElement) => FaceQualityCheck[];
}

export function useFaceLandmarker(): FaceLandmarkerResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [landmarks, setLandmarks] = useState<FaceLandmark[][]>([]);
  const [headPose, setHeadPose] = useState<HeadPose | null>(null);
  const [qualityChecks, setQualityChecks] = useState<FaceQualityCheck[]>([]);
  const landmarkerRef = useRef<unknown>(null);
  const lastProcessTime = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const initLandmarker = async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          runningMode: 'IMAGE',
          numFaces: 2,
        });
        if (!cancelled) {
          landmarkerRef.current = faceLandmarker;
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('MediaPipe failed to load, face validation will be skipped:', err);
          setError('Face detection unavailable — you can still try on hairstyles.');
          setIsLoading(false);
          setIsReady(false);
        }
      }
    };

    initLandmarker();
    return () => { cancelled = true; };
  }, []);

  const estimateHeadPose = (lms: FaceLandmark[]): HeadPose => {
    // Use nose tip (1), left eye outer (33), right eye outer (263)
    // Simple heuristic from landmark positions
    if (lms.length < 264) return { yaw: 0, pitch: 0, roll: 0 };
    const noseTip = lms[1];
    const leftEye = lms[33];
    const rightEye = lms[263];
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeMidY = (leftEye.y + rightEye.y) / 2;
    const yaw = (noseTip.x - eyeMidX) * 180;
    const pitch = (noseTip.y - eyeMidY) * 90;
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
    return { yaw, pitch, roll };
  };

  const runQualityChecks = useCallback((
    faces: unknown[],
    lmsArray: FaceLandmark[][]
  ): FaceQualityCheck[] => {
    const checks: FaceQualityCheck[] = [];

    // Check 1: Exactly one face
    if (faces.length === 0) {
      checks.push({ passed: false, message: 'No face detected — please look at the camera', severity: 'error' });
      return checks;
    }
    if (faces.length > 1) {
      checks.push({ passed: false, message: 'Multiple faces detected — please use a solo portrait', severity: 'error' });
    } else {
      checks.push({ passed: true, message: 'One face detected', severity: 'info' });
    }

    if (lmsArray.length > 0) {
      const lms = lmsArray[0];
      const pose = estimateHeadPose(lms);

      // Check 2: Head rotation
      if (Math.abs(pose.yaw) > 25) {
        checks.push({ passed: false, message: 'Please look straight at the camera', severity: 'warning' });
      } else {
        checks.push({ passed: true, message: 'Head position looks good', severity: 'info' });
      }

      // Check 3: Face size (landmarks should span reasonable portion)
      const xs = lms.map(l => l.x);
      const faceWidth = Math.max(...xs) - Math.min(...xs);
      if (faceWidth < 0.2) {
        checks.push({ passed: false, message: 'Move closer to the camera', severity: 'warning' });
      } else if (faceWidth > 0.95) {
        checks.push({ passed: false, message: 'Move a bit further from the camera', severity: 'warning' });
      } else {
        checks.push({ passed: true, message: 'Distance looks good', severity: 'info' });
      }
    }

    return checks;
  }, []);

  const processFrame = useCallback((videoOrCanvas: HTMLVideoElement | HTMLCanvasElement) => {
    if (!landmarkerRef.current || !isReady) return;
    const now = Date.now();
    if (now - lastProcessTime.current < 200) return; // max 5 fps for landmarks
    lastProcessTime.current = now;

    try {
      const lmk = landmarkerRef.current as { detect: (el: HTMLVideoElement | HTMLCanvasElement) => { faceLandmarks: { x: number; y: number; z: number }[][], faces: unknown[] } };
      const result = lmk.detect(videoOrCanvas);
      const faces = result.faceLandmarks || [];
      const lmsArray: FaceLandmark[][] = faces.map((f: { x: number; y: number; z: number }[]) =>
        f.map((l) => ({ x: l.x, y: l.y, z: l.z }))
      );
      setFaceCount(faces.length);
      setLandmarks(lmsArray);
      if (lmsArray.length > 0) {
        setHeadPose(estimateHeadPose(lmsArray[0]));
      }
      setQualityChecks(runQualityChecks(faces, lmsArray));
    } catch {
      // Silently skip frame errors
    }
  }, [isReady, runQualityChecks]);

  const analyzeImage = useCallback((
    imgEl: HTMLImageElement | HTMLCanvasElement
  ): FaceQualityCheck[] => {
    if (!landmarkerRef.current || !isReady) {
      return [{ passed: true, message: 'Face detection skipped', severity: 'info' }];
    }
    try {
      const lmk = landmarkerRef.current as { detect: (el: HTMLImageElement | HTMLCanvasElement) => { faceLandmarks: { x: number; y: number; z: number }[][], faces: unknown[] } };
      const result = lmk.detect(imgEl);
      const faces = result.faceLandmarks || [];
      const lmsArray: FaceLandmark[][] = faces.map((f: { x: number; y: number; z: number }[]) =>
        f.map((l) => ({ x: l.x, y: l.y, z: l.z }))
      );
      return runQualityChecks(faces, lmsArray);
    } catch {
      return [{ passed: true, message: 'Face detection skipped', severity: 'info' }];
    }
  }, [isReady, runQualityChecks]);

  return { isLoading, isReady, error, faceCount, landmarks, headPose, qualityChecks, processFrame, analyzeImage };
}
