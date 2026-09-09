import { api } from "./api";

export interface UploadResult {
  url: string;
  content_type: string;
  size: number;
}

export async function uploadMedia(file: File, kind: "image" | "video", visibility: "public" | "private" = "public"): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);
  formData.append("visibility", visibility);

  const res = await api.post<UploadResult>("/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
