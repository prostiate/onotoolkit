import type { ClaimRow, ClaimState, DecodedJwt, JwtSegments, KeyKind } from "~/types/jwt";

/** Decode a base64url string to bytes. */
export function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode a base64url string to a UTF-8 string. */
export function base64UrlToString(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

/** Split a compact JWS/JWT into its three segments, or null if malformed. */
export function splitToken(token: string): JwtSegments | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (!header || !payload) return null;
  return { header, payload, signature: signature ?? "" };
}

function parseJsonSegment(segment: string, label: string): Record<string, unknown> {
  let json: string;
  try {
    json = base64UrlToString(segment);
  } catch {
    throw new Error(`The ${label} is not valid base64url.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`The ${label} is not valid JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`The ${label} is not a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/** Decode a JWT's header and payload. Throws a friendly Error when malformed. */
export function decodeJwt(token: string): DecodedJwt {
  const segments = splitToken(token);
  if (!segments) {
    throw new Error("A JWT must have three parts separated by dots (header.payload.signature).");
  }
  return {
    header: parseJsonSegment(segments.header, "header"),
    payload: parseJsonSegment(segments.payload, "payload"),
    segments,
    sizes: {
      header: segments.header.length,
      payload: segments.payload.length,
      signature: segments.signature.length
    }
  };
}

/** The `alg` from a decoded header, uppercased, or empty. */
export function headerAlg(header: Record<string, unknown>): string {
  const alg = header.alg;
  return typeof alg === "string" ? alg.toUpperCase() : "";
}

/** Algorithms Ono Toolkit can sign and verify (browser Web Crypto via jose). */
export const SIGNING_ALGORITHMS = [
  "HS256",
  "HS384",
  "HS512",
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
  "EdDSA"
] as const;

/** Which kind of key an algorithm needs for verification. */
export function keyKindForAlg(alg: string): KeyKind {
  if (alg === "NONE") return "none";
  if (/^HS(256|384|512)$/.test(alg)) return "secret";
  if (/^(RS|PS|ES)(256|384|512)$/.test(alg) || alg === "EDDSA") return "public";
  return "unsupported";
}

const CLAIM_META: Record<string, { label: string; description: string; time?: boolean }> = {
  iss: { label: "Issuer", description: "Who issued the token (iss)." },
  sub: { label: "Subject", description: "Who the token is about (sub)." },
  aud: { label: "Audience", description: "Who the token is intended for (aud)." },
  exp: { label: "Expiration Time", description: "When the token expires (exp).", time: true },
  nbf: { label: "Not Before", description: "Not valid before this time (nbf).", time: true },
  iat: { label: "Issued At", description: "When the token was issued (iat).", time: true },
  jti: { label: "JWT ID", description: "Unique identifier for the token (jti)." }
};

function formatTimeClaim(
  seconds: number,
  nowSeconds: number
): { detail: string; state: ClaimState } {
  const date = new Date(seconds * 1000).toISOString();
  const diff = seconds - nowSeconds;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    abs < 60
      ? [diff, "second"]
      : abs < 3600
        ? [Math.round(diff / 60), "minute"]
        : abs < 86400
          ? [Math.round(diff / 3600), "hour"]
          : [Math.round(diff / 86400), "day"];
  return { detail: `${date} (${rtf.format(value, unit)})`, state: "neutral" };
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Build a human-readable breakdown of the payload claims. */
export function describeClaims(payload: Record<string, unknown>, nowSeconds: number): ClaimRow[] {
  return Object.entries(payload).map(([key, value]) => {
    const meta = CLAIM_META[key];
    const row: ClaimRow = {
      key,
      label: meta?.label ?? key,
      value: stringifyValue(value),
      description: meta?.description,
      state: "neutral"
    };
    if (meta?.time && typeof value === "number") {
      const { detail } = formatTimeClaim(value, nowSeconds);
      row.detail = detail;
      if (key === "exp") row.state = value <= nowSeconds ? "error" : "ok";
      else if (key === "nbf") row.state = value > nowSeconds ? "warn" : "ok";
    }
    return row;
  });
}

export interface TokenValidity {
  expired: boolean;
  notYetValid: boolean;
}

/** Expiry / not-before status derived from the payload (independent of signature). */
export function tokenValidity(payload: Record<string, unknown>, nowSeconds: number): TokenValidity {
  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : null;
  return {
    expired: exp !== null && exp <= nowSeconds,
    notYetValid: nbf !== null && nbf > nowSeconds
  };
}
