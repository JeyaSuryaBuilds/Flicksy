import { api } from "./api";

export interface FounderProfile {
  id: string;
  full_name: string;
  public_name: string;
  role: string;
  professional_title: string;
  short_bio: string;
  detailed_bio: string;
  description: string;
  professional_background: string;
  education: string;
  role_in_flickzy: string;
  why_flickzy_created: string;
  flickzy_origin_story: string;
  flickzy_mission: string;
  flickzy_vision: string;
  flickzy_goals: string;
  founder_responsibilities: string;
  flickzy_technologies: string;
  development_status: string;
  future_plans: string;
  interests: string;
  development_focus: string;
  career_goals: string;
  professional_strengths: string;
  areas_of_expertise: string;
  is_public: boolean;
  updated_at: string;
}

export type FounderProfileUpdateData = Partial<Omit<FounderProfile, "id" | "updated_at">>;

export interface FounderProject {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  category: string;
  technologies: string;
  role: string;
  status: string;
  github_url: string;
  live_url: string;
  portfolio_url: string;
  display_order: number;
  is_public: boolean;
  created_at: string;
}

export interface FounderSkill {
  id: string;
  name: string;
  category: string;
  proficiency?: string | null;
  description: string;
  display_order: number;
  is_public: boolean;
  created_at: string;
}

export interface FounderLink {
  id: string;
  link_type: string;
  title: string;
  url: string;
  description: string;
  display_order: number;
  is_public: boolean;
  created_at: string;
}

export interface FounderAchievement {
  id: string;
  title: string;
  description: string;
  category: string;
  date_achieved: string;
  display_order: number;
  is_public: boolean;
  created_at: string;
}

// ---------- Profile ----------
export async function getAdminFounderProfile(): Promise<FounderProfile> {
  const res = await api.get<FounderProfile>("/admin/founder/profile");
  return res.data;
}

export async function updateAdminFounderProfile(data: FounderProfileUpdateData): Promise<FounderProfile> {
  const res = await api.put<FounderProfile>("/admin/founder/profile", data);
  return res.data;
}

// ---------- Projects ----------
export async function listAdminFounderProjects(): Promise<FounderProject[]> {
  const res = await api.get<FounderProject[]>("/admin/founder/projects");
  return res.data;
}

export async function createAdminFounderProject(data: Partial<FounderProject>): Promise<FounderProject> {
  const res = await api.post<FounderProject>("/admin/founder/projects", data);
  return res.data;
}

export async function updateAdminFounderProject(id: string, data: Partial<FounderProject>): Promise<FounderProject> {
  const res = await api.put<FounderProject>(`/admin/founder/projects/${id}`, data);
  return res.data;
}

export async function deleteAdminFounderProject(id: string): Promise<void> {
  await api.delete(`/admin/founder/projects/${id}`);
}

// ---------- Skills ----------
export async function listAdminFounderSkills(): Promise<FounderSkill[]> {
  const res = await api.get<FounderSkill[]>("/admin/founder/skills");
  return res.data;
}

export async function createAdminFounderSkill(data: Partial<FounderSkill>): Promise<FounderSkill> {
  const res = await api.post<FounderSkill>("/admin/founder/skills", data);
  return res.data;
}

export async function updateAdminFounderSkill(id: string, data: Partial<FounderSkill>): Promise<FounderSkill> {
  const res = await api.put<FounderSkill>(`/admin/founder/skills/${id}`, data);
  return res.data;
}

export async function deleteAdminFounderSkill(id: string): Promise<void> {
  await api.delete(`/admin/founder/skills/${id}`);
}

// ---------- Links ----------
export async function listAdminFounderLinks(): Promise<FounderLink[]> {
  const res = await api.get<FounderLink[]>("/admin/founder/links");
  return res.data;
}

export async function createAdminFounderLink(data: Partial<FounderLink>): Promise<FounderLink> {
  const res = await api.post<FounderLink>("/admin/founder/links", data);
  return res.data;
}

export async function updateAdminFounderLink(id: string, data: Partial<FounderLink>): Promise<FounderLink> {
  const res = await api.put<FounderLink>(`/admin/founder/links/${id}`, data);
  return res.data;
}

export async function deleteAdminFounderLink(id: string): Promise<void> {
  await api.delete(`/admin/founder/links/${id}`);
}

// ---------- Achievements ----------
export async function listAdminFounderAchievements(): Promise<FounderAchievement[]> {
  const res = await api.get<FounderAchievement[]>("/admin/founder/achievements");
  return res.data;
}

export async function createAdminFounderAchievement(data: Partial<FounderAchievement>): Promise<FounderAchievement> {
  const res = await api.post<FounderAchievement>("/admin/founder/achievements", data);
  return res.data;
}

export async function updateAdminFounderAchievement(
  id: string,
  data: Partial<FounderAchievement>
): Promise<FounderAchievement> {
  const res = await api.put<FounderAchievement>(`/admin/founder/achievements/${id}`, data);
  return res.data;
}

export async function deleteAdminFounderAchievement(id: string): Promise<void> {
  await api.delete(`/admin/founder/achievements/${id}`);
}