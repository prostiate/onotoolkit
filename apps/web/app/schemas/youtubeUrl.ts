import { z } from "zod";

/** Hosts we accept a YouTube link from. Mirrors the backend allow-list. */
const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com"
]);

/** Reports whether value is a well-formed http(s) URL on a known YouTube host. */
export function isYoutubeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return YT_HOSTS.has(url.hostname.toLowerCase());
}

/** Validates the pasted YouTube link before we call the backend. */
export const youtubeUrlSchema = z
  .string()
  .trim()
  .min(1, "Paste a YouTube link to get started.")
  .refine(isYoutubeUrl, "That doesn't look like a YouTube link.");
