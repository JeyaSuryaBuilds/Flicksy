import { api } from "./api";
import type { Notification } from "../types";

export async function getNotifications(): Promise<Notification[]> {
  const res = await api.get<Notification[]>("/notifications");
  return res.data;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await api.put(`/notifications/${notificationId}/read`);
}
