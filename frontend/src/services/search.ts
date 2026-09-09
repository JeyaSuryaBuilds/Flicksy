import { api } from "./api";
import type { Post, UserPublic } from "../types";

export async function searchUsers(query: string): Promise<UserPublic[]> {
  const res = await api.get<UserPublic[]>("/search/users", { params: { q: query } });
  return res.data;
}

export async function searchPosts(query: string): Promise<Post[]> {
  const res = await api.get<Post[]>("/search/posts", { params: { q: query } });
  return res.data;
}
