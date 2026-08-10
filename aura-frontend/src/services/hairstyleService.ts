import api from './api';
import type { Hairstyle, TryOnJob, GenerationRequest } from '../types/hairstyle';

// ─── Hairstyles ───────────────────────────────────────────────────────────────

export const getHairstyles = async (category?: string): Promise<Hairstyle[]> => {
  const params = category && category !== 'All' ? { category } : {};
  const { data } = await api.get<Hairstyle[]>('/Hairstyle', { params });
  return data;
};

export const getHairstyle = async (id: number): Promise<Hairstyle> => {
  const { data } = await api.get<Hairstyle>(`/Hairstyle/${id}`);
  return data;
};

export const getCategories = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>('/Hairstyle/categories');
  return data;
};

// ─── Try-On ───────────────────────────────────────────────────────────────────

export const validatePhoto = async (imageFile: File): Promise<{ isValid: boolean; issues: string[] }> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  const { data } = await api.post('/TryOn/validate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const generateTryOn = async (
  imageFile: File,
  request: GenerationRequest
): Promise<TryOnJob> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('hairstyleId', String(request.hairstyleId));
  if (request.hairColor) formData.append('hairColor', request.hairColor);
  formData.append('quality', request.quality || 'high');

  const { data } = await api.post<TryOnJob>('/TryOn/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getJobStatus = async (jobId: string): Promise<TryOnJob> => {
  const { data } = await api.get<TryOnJob>(`/TryOn/${jobId}`);
  return data;
};

export const regenerateTryOn = async (jobId: string, hairstyleId?: number): Promise<TryOnJob> => {
  const { data } = await api.post<TryOnJob>('/TryOn/regenerate', { jobId, hairstyleId });
  return data;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/Auth/login', { email, password });
  return data;
};

export const register = async (email: string, password: string, displayName: string) => {
  const { data } = await api.post('/Auth/register', { email, password, displayName });
  return data;
};
