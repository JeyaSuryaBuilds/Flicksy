import { api } from "./api";
import type { UserPublic } from "../types";

export async function getUser(userId: string): Promise<UserPublic> {
  const res = await api.get<UserPublic>(`/users/${userId}`);
  return res.data;
}

export async function updateUser(
  userId: string,
  data: { display_name?: string; bio?: string; avatar_url?: string; website?: string; pronouns?: string; username?: string }
): Promise<UserPublic> {
  const res = await api.put<UserPublic>(`/users/${userId}`, data);
  return res.data;
}

export async function checkFlickTagAvailable(username: string): Promise<{ username: string; available: boolean }> {
  const res = await api.get(`/users/flicktag-available`, { params: { username } });
  return res.data;
}

export async function getFollowers(userId: string): Promise<UserPublic[]> {
  const res = await api.get<UserPublic[]>(`/users/${userId}/followers`);
  return res.data;
}

export async function getFollowing(userId: string): Promise<UserPublic[]> {
  const res = await api.get<UserPublic[]>(`/users/${userId}/following`);
  return res.data;
}

export async function followUser(userId: string): Promise<void> {
  await api.post(`/users/${userId}/follow`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}/follow`);
}
