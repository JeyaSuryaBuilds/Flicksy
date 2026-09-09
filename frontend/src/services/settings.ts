import { api } from "./api";
import type { UserSettings } from "../types";

export async function getSettings(): Promise<UserSettings> {
  const res = await api.get<UserSettings>("/settings");
  return res.data;
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const res = await api.put<UserSettings>("/settings", patch);
  return res.data;
}
