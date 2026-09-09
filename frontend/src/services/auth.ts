import { api } from "./api";
import type { AuthResponse, UserPublic } from "../types";

export async function register(data: {
  email: string;
  username: string;
  display_name: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/register", data);
  return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", { email, password });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(email: string, code: string, new_password: string): Promise<void> {
  await api.post("/auth/reset-password", { email, code, new_password });
}

export async function getMe(): Promise<UserPublic> {
  const res = await api.get<UserPublic>("/auth/me");
  return res.data;
}

export async function verifyEmail(code: string): Promise<void> {
  await api.post("/auth/verify-email", { code });
}

export async function resendVerification(): Promise<void> {
  await api.post("/auth/resend-verification");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
}

export async function deactivateAccount(): Promise<void> {
  await api.put("/auth/deactivate");
}

export async function deleteAccount(): Promise<void> {
  await api.delete("/auth/me");
}
