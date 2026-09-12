import { API_URL } from "../services/api";

/**
 * Centralized media URL resolver — the ONE place that turns a stored media
 * value (as returned by the backend, e.g. "/media/xyz.jpg") into a URL the
 * browser/WebView can actually load.
 *
 * Every place that renders public media (Flicks/Stream, Rush, Moments,
 * Discover, Avatars, My Space) should resolve through this function instead
 * of using the raw value directly — otherwise a relative "/media/..." path
 * resolves against the frontend's own origin (localhost during dev, the
 * Vercel domain in production) instead of the Render backend, and the
 * image/video silently fails to load.
 *
 * Handles:
 * - null / undefined / "" -> "" (caller renders a fallback/placeholder)
 * - absolute http:// or https:// URLs -> returned unchanged
 * - local/device-only URLs (blob:, data:, filesystem:, capacitor://,
 *   file://, content://) -> returned unchanged, NEVER prefixed with the
 *   API host. These are transient local previews (e.g.
 *   URL.createObjectURL(...) while composing a Rush/Moment/Flash before
 *   upload, or a native Capacitor camera/gallery preview path) and are
 *   never valid to fetch from the backend.
 * - relative backend paths (e.g. "/media/xyz.jpg" or "media/xyz.jpg")
 *   -> prefixed with the configured API_URL (VITE_API_URL, e.g.
 *   https://flicksy-api.onrender.com in production).
 */

// URL schemes that point at something already loadable on-device and must
// never be rewritten to point at the API host.
const LOCAL_URL_SCHEME_RE = /^(blob|data|filesystem|capacitor|file|content):/i;

export function isLocalPreviewUrl(url: string): boolean {
  return LOCAL_URL_SCHEME_RE.test(url);
}

export function resolveMediaUrl(mediaUrl?: string | null): string {
  if (!mediaUrl) return "";

  const trimmed = mediaUrl.trim();
  if (!trimmed) return "";

  // Already absolute (points at some http(s) host, whether that's our own
  // API or a third-party CDN) -- leave it exactly as-is.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Local-only/device preview URLs must pass through untouched.
  if (isLocalPreviewUrl(trimmed)) {
    return trimmed;
  }

  const apiBaseUrl = API_URL.replace(/\/+$/, "");
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${apiBaseUrl}${normalizedPath}`;
}