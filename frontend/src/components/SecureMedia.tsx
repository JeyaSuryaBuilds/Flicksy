import { useEffect, useState } from "react";
import { api } from "../services/api";

interface SecureMediaProps {
  url: string;
  type: "image" | "video";
  className?: string;
  controls?: boolean;
}

/**
 * Private media (Flash) is served from an authorized-only endpoint, not plain static files —
 * so it can't be dropped straight into an <img src> (no way to attach the Bearer token there).
 * This fetches it via the authenticated axios instance and renders the resulting blob.
 * Public media (Flicks/Rush/Moments/Avatars) never needs this — use a plain <img>/<video> for those.
 */
export function SecureMedia({ url, type, className, controls }: SecureMediaProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    api
      .get(url, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => !cancelled && setError(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) return <div className={className}>Couldn't load this media</div>;
  if (!blobUrl) return <div className={className} />;

  return type === "video" ? (
    <video src={blobUrl} className={className} controls={controls} autoPlay muted={false} />
  ) : (
    <img src={blobUrl} className={className} alt="" />
  );
}
