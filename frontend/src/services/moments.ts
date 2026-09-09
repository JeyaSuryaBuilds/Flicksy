import { api } from "./api";
import type { Moment, MomentAuthorGroup } from "../types";

export async function getMomentsRow(): Promise<MomentAuthorGroup[]> {
  const res = await api.get<MomentAuthorGroup[]>("/moments");
  return res.data;
}

export async function getMyMoments(): Promise<Moment[]> {
  const res = await api.get<Moment[]>("/moments/mine");
  return res.data;
}

export async function createMoment(data: {
  media_url: string;
  media_type?: string;
  overlay_data?: string;
  sound_id?: string;
  close_crew_only?: boolean;
}): Promise<Moment> {
  const res = await api.post<Moment>("/moments", data);
  return res.data;
}

export async function viewMoment(momentId: string): Promise<void> {
  await api.post(`/moments/${momentId}/view`);
}

export async function deleteMoment(momentId: string): Promise<void> {
  await api.delete(`/moments/${momentId}`);
}

export interface MomentEcho {
  id: string;
  story_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export async function getMomentEchoes(momentId: string): Promise<MomentEcho[]> {
  const res = await api.get<MomentEcho[]>(`/moments/${momentId}/echoes`);
  return res.data;
}

export async function addMomentEcho(momentId: string, body: string): Promise<MomentEcho> {
  const res = await api.post<MomentEcho>(`/moments/${momentId}/echoes`, { body });
  return res.data;
}

export async function sendOnMoment(momentId: string, conversationId: string): Promise<void> {
  await api.post(`/moments/${momentId}/send-on`, { conversation_id: conversationId });
}

export async function recastMoment(momentId: string, caption?: string): Promise<Moment> {
  const res = await api.post<Moment>(`/moments/${momentId}/recast`, { caption });
  return res.data;
}

export async function updateMomentPermissions(
  momentId: string,
  permissions: { allow_echo?: boolean; allow_send_on?: boolean; allow_recast?: boolean }
): Promise<Moment> {
  const res = await api.put<Moment>(`/moments/${momentId}/permissions`, null, { params: permissions });
  return res.data;
}
