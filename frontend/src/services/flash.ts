import { api } from "./api";

export interface Flash {
  id: string;
  sender_id: string;
  recipient_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string;
  reply_to_flash_id?: string | null;
  is_disappearing: boolean;
  delivered_at: string;
  seen_at?: string | null;
  created_at: string;
}

export async function sendFlash(data: {
  recipient_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  reply_to_flash_id?: string;
  is_disappearing?: boolean;
}): Promise<Flash> {
  const res = await api.post<Flash>("/flash", data);
  return res.data;
}

export async function getFlashInbox(): Promise<Flash[]> {
  const res = await api.get<Flash[]>("/flash/inbox");
  return res.data;
}

export async function getFlashSent(): Promise<Flash[]> {
  const res = await api.get<Flash[]>("/flash/sent");
  return res.data;
}

export async function markFlashSeen(flashId: string): Promise<void> {
  await api.post(`/flash/${flashId}/seen`);
}

export async function unsendFlash(flashId: string): Promise<void> {
  await api.delete(`/flash/${flashId}`);
}
