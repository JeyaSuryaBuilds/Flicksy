import { api } from "./api";
import type { AIConversation, AIMessage } from "../types";

export async function listAIConversations(): Promise<AIConversation[]> {
  const res = await api.get<AIConversation[]>("/ai/conversations");
  return res.data;
}

export async function getAIConversationMessages(conversationId: string): Promise<AIMessage[]> {
  const res = await api.get<AIMessage[]>(`/ai/conversations/${conversationId}/messages`);
  return res.data;
}

export async function deleteAIConversation(conversationId: string): Promise<void> {
  await api.delete(`/ai/conversations/${conversationId}`);
}

export async function sendAIChat(
  message: string,
  conversationId?: string | null,
  context?: string
): Promise<{ conversation_id: string; reply: string; provider: string }> {
  const res = await api.post("/ai/chat", { message, conversation_id: conversationId, context });
  return res.data;
}

export async function generateCaption(
  description: string,
  tone: string,
  improveExisting = false
): Promise<{ caption: string; provider: string }> {
  const res = await api.post("/ai/caption", { description, tone, improve_existing: improveExisting });
  return res.data;
}

export async function generateBio(
  prompt: string,
  improveExisting = false
): Promise<{ bio: string; provider: string }> {
  const res = await api.post("/ai/bio", { prompt, improve_existing: improveExisting });
  return res.data;
}

export async function suggestTopicTags(caption: string): Promise<{ tags: string[]; provider: string }> {
  const res = await api.post("/ai/topic-tags", { caption });
  return res.data;
}
