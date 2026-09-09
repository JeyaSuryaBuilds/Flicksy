import { api } from "./api";
import type { Conversation, Message } from "../types";

export async function getConversations(): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>("/messages/conversations");
  return res.data;
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const res = await api.get<Message[]>(`/messages/${conversationId}`);
  return res.data;
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const res = await api.post<Message>(`/messages/${conversationId}`, { body });
  return res.data;
}

export async function startConversation(userId: string): Promise<Conversation> {
  const res = await api.post<Conversation>(`/messages/start/${userId}`);
  return res.data;
}
