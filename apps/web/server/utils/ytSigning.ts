/**
 * Pure, framework-free helpers for the YouTube backend proxy: request signing,
 * URL validation, rate limiting, and error-message selection. Kept free of h3 /
 * Nitro imports so they are trivially unit-testable. `ytBackend.ts` wraps these
 * with the h3 event plumbing.
 */

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

/** Cheap edge validation so we don't forward junk to the backend. */
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

/**
 * Canonical string that both this proxy and the Go backend feed into HMAC:
 * "<ts>\n<METHOD>\n<path>\n<rawQuery>\n<body>".
 */
export function buildCanonical(
  ts: number,
  method: string,
  path: string,
  rawQuery: string,
  body: string
): string {
  return `${ts}\n${method}\n${path}\n${rawQuery}\n${body}`;
}

/** Hex HMAC-SHA256 using the Web Crypto API (available in Workers and Node). */
export async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Best-effort per-IP rate limiting -------------------------------------
// In-memory token buckets. On Cloudflare this is per-isolate (not distributed),
// so it is a deterrent, not a hard quota. Documented in the ROUND2 spec; upgrade
// to Cloudflare Rate Limiting / a Durable Object if stronger guarantees are needed.

interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();
// Conservative for a free tier: a short burst then ~1 request every 5s sustained.
const RATE_BURST = 5;
const RATE_REFILL_PER_SEC = 0.2;

/** Returns false when the IP has exhausted its bucket. `now` is injectable. */
export function allowIp(ip: string, now: number = Date.now()): boolean {
  const bucket = buckets.get(ip) ?? { tokens: RATE_BURST, last: now };
  const elapsed = (now - bucket.last) / 1000;
  if (elapsed > 0) {
    bucket.tokens = Math.min(RATE_BURST, bucket.tokens + elapsed * RATE_REFILL_PER_SEC);
    bucket.last = now;
  }
  let allowed = false;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    allowed = true;
  }
  buckets.set(ip, bucket);
  return allowed;
}

/**
 * Whether a request Origin is allowed. When `allowed` is empty the check is
 * disabled (returns true). A missing Origin (same-origin non-CORS navigations
 * often omit it) is allowed; only a *present, mismatched* Origin is rejected.
 */
export function originAllowed(origin: string | undefined | null, allowed: string): boolean {
  if (!allowed) return true;
  if (!origin) return true;
  return origin === allowed;
}

/** Parses a non-negative integer cap from an env string; 0 means "disabled". */
export function parseCap(value: string | undefined): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Picks a user-facing message from an upstream JSON error body. */
export function pickErrorMessage(data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const value = (data as { error: unknown }).error;
    if (typeof value === "string" && value) return value;
  }
  return "The download service had a problem. Please try again.";
}
