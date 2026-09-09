import { api } from "./api";

export async function reportContent(targetType: "post" | "comment" | "user" | "story", targetId: string, reason: string, details = "") {
  await api.post("/reports", { target_type: targetType, target_id: targetId, reason, details });
}
