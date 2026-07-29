export interface JwtSegments {
  header: string;
  payload: string;
  signature: string;
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  segments: JwtSegments;
  /** Byte length of each raw segment, for display. */
  sizes: { header: number; payload: number; signature: number };
}

export type SignatureStatus = "idle" | "verifying" | "valid" | "invalid" | "error";

/** Kind of key input a given `alg` needs. */
export type KeyKind = "secret" | "public" | "none" | "unsupported";

export type ClaimState = "ok" | "warn" | "error" | "neutral";

export interface ClaimRow {
  key: string;
  label: string;
  value: string;
  description?: string;
  /** Extra humanized detail, e.g. a formatted date + relative time. */
  detail?: string;
  state: ClaimState;
}
