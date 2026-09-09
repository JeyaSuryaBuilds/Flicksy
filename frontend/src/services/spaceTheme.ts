import { api } from "./api";

export interface SpaceTheme {
  preset: "midnight" | "sunset" | "aurora" | "minimal" | "custom";
  background_color: string;
  background_gradient: string;
  background_image_url: string;
  accent_color: string;
  card_style: "rounded" | "sharp" | "outlined";
  button_style: "filled" | "outline" | "soft";
  font_style: "default" | "serif" | "mono";
  avatar_frame: "none" | "ring" | "glow" | "dashed";
  glow_effect: boolean;
}

export async function getMySpaceTheme(): Promise<SpaceTheme> {
  const res = await api.get<SpaceTheme>("/space-theme/me");
  return res.data;
}

export async function getUserSpaceTheme(userId: string): Promise<SpaceTheme> {
  const res = await api.get<SpaceTheme>(`/space-theme/user/${userId}`);
  return res.data;
}

export async function updateMySpaceTheme(patch: Partial<SpaceTheme>): Promise<SpaceTheme> {
  const res = await api.put<SpaceTheme>("/space-theme/me", patch);
  return res.data;
}
