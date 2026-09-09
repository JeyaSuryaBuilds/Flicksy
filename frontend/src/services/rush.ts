import { api } from "./api";
import type { FeedResponse, Post } from "../types";

export async function getRushFeed(cursor?: string | null): Promise<FeedResponse> {
  const res = await api.get<FeedResponse>("/rush/feed", { params: cursor ? { cursor } : {} });
  return res.data;
}

export async function createRush(data: {
  caption: string;
  location: string;
  media_tag: string;
  media_urls: string[];
  sound_id?: string | null;
}): Promise<Post> {
  const res = await api.post<Post>("/rush", { ...data, media_type: "video", is_rush: true });
  return res.data;
}
