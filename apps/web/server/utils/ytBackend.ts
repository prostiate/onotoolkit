import type { H3Event } from "h3";
import { createError, getRequestHeader, getRequestIP } from "h3";
import { allowIp, buildCanonical, hmacHex, pickErrorMessage } from "./ytSigning";

/**
 * Server-side plumbing for the YouTube Downloader proxy. Runs only in the Nitro
 * server (never shipped to the browser), so it can hold the Render URL and
 * secrets and sign requests the private backend will accept. Pure logic
 * (signing, validation, rate limiting) lives in ./ytSigning.
 */

export interface YtConfig {
  backendUrl: string;
  apiKey: string;
  hmacSecret: string;
}

/** Reads the server-only runtime config for the backend proxy. */
export function useYtConfig(event: H3Event): YtConfig {
  const config = useRuntimeConfig(event);
  return {
    backendUrl: String(config.ytBackendUrl ?? "").replace(/\/+$/, ""),
    apiKey: String(config.ytApiKey ?? ""),
    hmacSecret: String(config.ytHmacSecret ?? "")
  };
}

/** Throws a 503 when the backend URL is not configured. */
export function assertConfigured(config: YtConfig): void {
  if (!config.backendUrl) {
    throw createError({
      statusCode: 503,
      data: { error: "The download service is not configured yet." }
    });
  }
}

/** Builds the auth headers the backend requires for an /api request. */
export async function signedHeaders(
  config: YtConfig,
  method: string,
  path: string,
  rawQuery: string,
  body: string,
  realIp: string
): Promise<Record<string, string>> {
  const ts = Math.floor(Date.now() / 1000);
  const signature = await hmacHex(
    config.hmacSecret,
    buildCanonical(ts, method, path, rawQuery, body)
  );
  return {
    "X-Api-Key": config.apiKey,
    "X-Timestamp": String(ts),
    "X-Signature": signature,
    "X-Real-Client-IP": realIp
  };
}

/** The real client IP, preferring Cloudflare's header. */
export function clientIp(event: H3Event): string {
  const cf = getRequestHeader(event, "cf-connecting-ip");
  if (cf) return cf;
  return getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
}

/** Throws a 429 when the caller has exceeded its per-IP rate limit. */
export function rateLimitOrThrow(event: H3Event): void {
  if (!allowIp(clientIp(event))) {
    throw createError({
      statusCode: 429,
      data: { error: "You're going a bit fast - please wait a moment and try again." }
    });
  }
}

/** Maps a non-OK upstream response body to a thrown H3 error. */
export function upstreamError(status: number, data: unknown): never {
  throw createError({
    statusCode: status === 0 ? 502 : status,
    data: { error: pickErrorMessage(data) }
  });
}
