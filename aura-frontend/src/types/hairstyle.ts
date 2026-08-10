// Hairstyle types
export interface Hairstyle {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  promptDetails: string;
  recommendedFaceShapes: string[];
  hairTypes: string[];
  length: 'short' | 'medium' | 'long';
  maintenanceLevel: 'low' | 'medium' | 'high';
  referenceImageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HairstyleCategory {
  name: string;
  count: number;
}

// Try-On job types
export type JobStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'GENERATING'
  | 'STORING_RESULT'
  | 'COMPLETED'
  | 'FAILED';

export interface TryOnJob {
  jobId: string;
  status: JobStatus;
  resultImageUrl?: string;
  sourceImageUrl?: string;
  hairstyle?: Hairstyle;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  progressPercent?: number;
  progressMessage?: string;
}

export interface GenerationRequest {
  hairstyleId: number;
  hairColor?: string;
  quality?: 'standard' | 'high';
}

// Face validation
export interface FaceValidationResult {
  isValid: boolean;
  faceCount: number;
  issues: string[];
  guidance: string[];
  landmarks?: FaceLandmark[];
  headPose?: HeadPose;
}

export interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceQualityCheck {
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Auth types
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
