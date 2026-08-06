import { defineEventHandler, readRawBody, setResponseHeader } from "h3";
import {
  assertAllowedOrigin,
  assertConfigured,
  clientIp,
  enforceDailyQuota,
  rateLimitOrThrow,
  signedHeaders,
  upstreamError,
  useYtConfig,
  verifyTurnstileOrThrow
} from "../../utils/ytBackend";

/**
 * Proxies POST /api/yt/download to the private backend's /api/download, signing
 * the request and streaming the resulting file straight back to the browser.
 * The video bytes pass through without buffering (low CPU, low memory).
 */
export default defineEventHandler(async (event) => {
  const config = useYtConfig(event);
  assertConfigured(config);
  assertAllowedOrigin(event, config);
  rateLimitOrThrow(event);
  // Turnstile (bot check) then the durable daily quota, before doing real work.
  await verifyTurnstileOrThrow(event, config);
  await enforceDailyQuota(event, config);

  // The signature covers these exact bytes, so forward the same string.
  const body = (await readRawBody(event, "utf8")) ?? "";
  const path = "/api/download";
  const headers = {
    ...(await signedHeaders(config, "POST", path, "", body, clientIp(event))),
    "Content-Type": "application/json"
  };

  const res = await fetch(`${config.backendUrl}${path}`, { method: "POST", body, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    upstreamError(res.status, data);
  }

  setResponseHeader(
    event,
    "Content-Type",
    res.headers.get("Content-Type") ?? "application/octet-stream"
  );
  const disposition = res.headers.get("Content-Disposition");
  if (disposition) setResponseHeader(event, "Content-Disposition", disposition);

  // Stream the upstream body through unchanged.
  return res.body;
});
