import type { H3Event } from "h3";
import { createError, getRequestHeader, getRequestIP } from "h3";
import {
  allowIp,
  buildCanonical,
  hmacHex,
  originAllowed,
  parseCap,
  pickErrorMessage
} from "./ytSigning";

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
  turnstileSecret: string;
  allowedOrigin: string;
  dailyGlobalMax: number;
  dailyIpMax: number;
}

/** Reads the server-only runtime config for the backend proxy. */
export function useYtConfig(event: H3Event): YtConfig {
  const config = useRuntimeConfig(event);
  return {
    backendUrl: String(config.ytBackendUrl ?? "").replace(/\/+$/, ""),
    apiKey: String(config.ytApiKey ?? ""),
    hmacSecret: String(config.ytHmacSecret ?? ""),
    turnstileSecret: String(config.turnstileSecret ?? ""),
    allowedOrigin: String(config.ytAllowedOrigin ?? ""),
    dailyGlobalMax: parseCap(String(config.ytDailyGlobalMax ?? "")),
    dailyIpMax: parseCap(String(config.ytDailyIpMax ?? ""))
  };
}

/** Rejects requests whose Origin isn't the allowed one (when configured). */
export function assertAllowedOrigin(event: H3Event, config: YtConfig): void {
  const origin = getRequestHeader(event, "origin");
  if (!originAllowed(origin, config.allowedOrigin)) {
    throw createError({ statusCode: 403, data: { error: "Forbidden origin." } });
  }
}

/**
 * Verifies a Cloudflare Turnstile token via siteverify. No-op when no secret is
 * configured (local/dev). The token is read from the cf-turnstile-response
 * header set by the browser widget.
 */
export async function verifyTurnstileOrThrow(event: H3Event, config: YtConfig): Promise<void> {
  if (!config.turnstileSecret) return;
  const token = getRequestHeader(event, "cf-turnstile-response") ?? "";
  const reject = () =>
    createError({
      statusCode: 403,
      data: { error: "Please complete the verification and try again." }
    });
  if (!token) throw reject();

  const body = new URLSearchParams({ secret: config.turnstileSecret, response: token });
  const ip = clientIp(event);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const outcome = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (!outcome?.success) throw reject();
}

// --- KV-backed daily quota ------------------------------------------------
// A durable, distributed cap (unlike the in-memory per-IP limiter). Activates
// only when a YT_KV binding and a cap are configured. Counting is read-then-
// write (not atomic); slight overcount under bursts is acceptable here.

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

function getKv(event: H3Event): KVLike | null {
  const ctx = event.context as { cloudflare?: { env?: Record<string, unknown> } };
  const binding = ctx.cloudflare?.env?.YT_KV;
  if (binding && typeof (binding as KVLike).get === "function") return binding as KVLike;
  return null;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function bumpAndCheck(kv: KVLike, key: string, max: number): Promise<boolean> {
  const current = Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
  if (current >= max) return false;
  // Keep the counter for two days so day-boundary reads stay correct.
  await kv.put(key, String(current + 1), { expirationTtl: 172_800 });
  return true;
}

/**
 * Enforces the daily download caps (per-IP and global) using KV. No-op without
 * a KV binding or configured caps.
 */
export async function enforceDailyQuota(event: H3Event, config: YtConfig): Promise<void> {
  const kv = getKv(event);
  if (!kv) return;
  const day = todayUtc();

  if (config.dailyIpMax > 0) {
    const ok = await bumpAndCheck(kv, `yt:ip:${day}:${clientIp(event)}`, config.dailyIpMax);
    if (!ok) {
      throw createError({
        statusCode: 429,
        data: { error: "You've reached today's download limit. Please try again tomorrow." }
      });
    }
  }
  if (config.dailyGlobalMax > 0) {
    const ok = await bumpAndCheck(kv, `yt:global:${day}`, config.dailyGlobalMax);
    if (!ok) {
      throw createError({
        statusCode: 503,
        data: { error: "The downloader has hit its daily cap. Please try again tomorrow." }
      });
    }
  }
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
