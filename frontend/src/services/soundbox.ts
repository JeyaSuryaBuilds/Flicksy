import { api } from "./api";

export interface Sound {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  audio_url: string;
  duration_seconds: number;
  source: string;
}

export async function searchSounds(query: string): Promise<Sound[]> {
  const res = await api.get<Sound[]>("/soundbox/search", { params: { q: query } });
  return res.data;
}

export async function getTrendingSounds(): Promise<Sound[]> {
  const res = await api.get<Sound[]>("/soundbox/trending");
  return res.data;
}

export async function getRecentSounds(): Promise<Sound[]> {
  const res = await api.get<Sound[]>("/soundbox/recent");
  return res.data;
}

export async function uploadOriginalSound(title: string, audioUrl: string, durationSeconds = 0): Promise<Sound> {
  const res = await api.post<Sound>("/soundbox/original", { title, audio_url: audioUrl, duration_seconds: durationSeconds });
  return res.data;
}

export async function getSound(soundId: string): Promise<Sound> {
  const res = await api.get<Sound>(`/soundbox/${soundId}`);
  return res.data;
}
