import { api } from "./api";
import type { FeedResponse, Post } from "../types";

export async function getFeed(cursor?: string | null): Promise<FeedResponse> {
  const res = await api.get<FeedResponse>("/posts/feed", { params: cursor ? { cursor } : {} });
  return res.data;
}

export async function getPost(postId: string): Promise<Post> {
  const res = await api.get<Post>(`/posts/${postId}`);
  return res.data;
}

export async function createPost(data: {
  caption: string;
  location: string;
  media_type: string;
  media_tag: string;
  media_urls: string[];
  sound_id?: string | null;
}): Promise<Post> {
  const res = await api.post<Post>("/posts", data);
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function updatePost(
  postId: string,
  data: { caption: string; location: string; media_type: string; media_tag: string; media_urls: string[] }
): Promise<Post> {
  const res = await api.put<Post>(`/posts/${postId}`, data);
  return res.data;
}

export async function archivePost(postId: string): Promise<Post> {
  const res = await api.post<Post>(`/posts/${postId}/archive`);
  return res.data;
}

export async function unarchivePost(postId: string): Promise<Post> {
  const res = await api.post<Post>(`/posts/${postId}/unarchive`);
  return res.data;
}

export async function pinPost(postId: string): Promise<Post> {
  const res = await api.post<Post>(`/posts/${postId}/pin`);
  return res.data;
}

export async function unpinPost(postId: string): Promise<Post> {
  const res = await api.post<Post>(`/posts/${postId}/unpin`);
  return res.data;
}

export async function likePost(postId: string): Promise<void> {
  await api.post(`/posts/${postId}/like`);
}

export async function unlikePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}/like`);
}

export async function bookmarkPost(postId: string): Promise<void> {
  await api.post(`/posts/${postId}/bookmark`);
}

export async function unbookmarkPost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}/bookmark`);
}