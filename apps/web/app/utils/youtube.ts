import type { DownloadMode } from "~/types/youtube";

/** Formats a duration in seconds as `m:ss` (or `h:mm:ss` past an hour). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** Preferred default video height when the video offers something higher. */
const PREFERRED_HEIGHT = 1080;

/**
 * Picks a sensible default quality from the available heights: the highest at or
 * below 1080p, or the lowest available if everything is above that. Returns 0
 * (meaning "best") when no heights are known.
 */
export function defaultQuality(heights: number[]): number {
  if (!heights.length) return 0;
  const atOrBelow = heights.filter((h) => h <= PREFERRED_HEIGHT);
  if (atOrBelow.length) return Math.max(...atOrBelow);
  return Math.min(...heights);
}

/** Human label for a video height, e.g. 2160 -> "4K", 1080 -> "1080p". */
export function qualityLabel(height: number): string {
  if (height >= 4320) return "8K";
  if (height >= 2160) return "4K";
  return `${height}p`;
}

/** Strips characters that are unsafe in a filename, collapsing whitespace. */
export function sanitizeTitle(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "video";
}

/** Fallback download filename when the backend does not supply one. */
export function defaultDownloadName(title: string, mode: DownloadMode): string {
  const ext = mode === "audio" ? "m4a" : "mp4";
  return `${sanitizeTitle(title).slice(0, 150).trim()}.${ext}`;
}

/**
 * Extracts a filename from a Content-Disposition header, preferring the RFC 5987
 * `filename*=UTF-8''...` form and falling back to the plain `filename="..."`.
 */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ""));
    } catch {
      /* malformed encoding - fall through to the plain form */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() ?? null;
}
