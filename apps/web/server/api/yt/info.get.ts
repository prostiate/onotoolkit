import { createError, defineEventHandler, getQuery } from "h3";
import {
  assertAllowedOrigin,
  assertConfigured,
  clientIp,
  rateLimitOrThrow,
  signedHeaders,
  upstreamError,
  useYtConfig
} from "../../utils/ytBackend";
import { isYoutubeUrl } from "../../utils/ytSigning";

/**
 * Proxies GET /api/yt/info to the private backend's /api/info, signing the
 * request. The browser only ever sees this same-origin route; the Render URL
 * and secrets stay server-side.
 */
export default defineEventHandler(async (event) => {
  const config = useYtConfig(event);
  assertConfigured(config);
  assertAllowedOrigin(event, config);
  rateLimitOrThrow(event);

  const url = String(getQuery(event).url ?? "").trim();
  if (!isYoutubeUrl(url)) {
    throw createError({ statusCode: 400, data: { error: "a valid YouTube URL is required" } });
  }

  const path = "/api/info";
  const rawQuery = `url=${encodeURIComponent(url)}`;
  const headers = await signedHeaders(config, "GET", path, rawQuery, "", clientIp(event));

  const res = await fetch(`${config.backendUrl}${path}?${rawQuery}`, { headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) upstreamError(res.status, data);
  return data;
});
