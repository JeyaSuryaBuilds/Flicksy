import { api } from "./api";
import type { UserPublic } from "../types";

export interface DashboardStats {
  total_users: number;
  active_users: number;
  verified_spaces: number;
  flicks: number;
  rushes: number;
  moments: number;
  pending_reports: number;
  total_reports: number;
  active_ads: number;
}

export interface ReportItem {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
}

export interface Ad {
  id: string;
  title: string;
  advertiser: string;
  description: string;
  media_url: string;
  cta_text: string;
  destination_url: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  targeting: string;
  budget_cents: number;
  impressions: number;
  clicks: number;
  spend_cents: number;
  ctr: number;
  created_at: string;
}

export async function getDashboard(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>("/admin/dashboard");
  return res.data;
}

export async function searchAdminUsers(q?: string): Promise<UserPublic[]> {
  const res = await api.get<UserPublic[]>("/admin/users", { params: q ? { q } : {} });
  return res.data;
}

export async function suspendUser(userId: string): Promise<void> {
  await api.put(`/admin/users/${userId}/suspend`);
}

export async function restoreUser(userId: string): Promise<void> {
  await api.put(`/admin/users/${userId}/restore`);
}

export async function setVerification(userId: string, verified: boolean): Promise<UserPublic> {
  const res = await api.put<UserPublic>(`/users/${userId}/verify`, null, { params: { verified } });
  return res.data;
}

export async function setUserRole(userId: string, isAdmin: boolean): Promise<void> {
  await api.put(`/admin/users/${userId}/role`, null, { params: { is_admin: isAdmin } });
}

export async function removeFlick(postId: string): Promise<void> {
  await api.delete(`/admin/posts/${postId}`);
}

export async function removeMoment(momentId: string): Promise<void> {
  await api.delete(`/admin/moments/${momentId}`);
}

export async function listReports(status?: string): Promise<ReportItem[]> {
  const res = await api.get<ReportItem[]>("/admin/reports", { params: status ? { status } : {} });
  return res.data;
}

export async function actionReport(reportId: string, action: "dismiss" | "actioned" | "reviewed"): Promise<ReportItem> {
  const res = await api.put<ReportItem>(`/admin/reports/${reportId}`, { action });
  return res.data;
}

export async function listAds(): Promise<Ad[]> {
  const res = await api.get<Ad[]>("/admin/ads");
  return res.data;
}

export async function createAd(data: Partial<Ad>): Promise<Ad> {
  const res = await api.post<Ad>("/admin/ads", data);
  return res.data;
}

export async function updateAd(adId: string, data: Partial<Ad>): Promise<Ad> {
  const res = await api.put<Ad>(`/admin/ads/${adId}`, data);
  return res.data;
}

export async function pauseAd(adId: string): Promise<Ad> {
  const res = await api.put<Ad>(`/admin/ads/${adId}/pause`);
  return res.data;
}

export async function resumeAd(adId: string): Promise<Ad> {
  const res = await api.put<Ad>(`/admin/ads/${adId}/resume`);
  return res.data;
}

export async function deleteAd(adId: string): Promise<void> {
  await api.delete(`/admin/ads/${adId}`);
}
