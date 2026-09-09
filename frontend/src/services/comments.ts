import { api } from "./api";
import type { Comment } from "../types";

export async function getComments(postId: string): Promise<Comment[]> {
  const res = await api.get<Comment[]>(`/posts/${postId}/comments`);
  return res.data;
}

export async function addComment(postId: string, body: string): Promise<Comment> {
  const res = await api.post<Comment>(`/posts/${postId}/comments`, { body });
  return res.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}

export async function likeComment(commentId: string): Promise<void> {
  await api.post(`/comments/${commentId}/like`);
}
