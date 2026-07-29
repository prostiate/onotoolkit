import { defineStore } from "pinia";
import type { KeyKind } from "~/types/jwt";
import { keyKindForAlg } from "~/utils/jwt";

function stringifyHeader(alg: string): string {
  return JSON.stringify({ alg, typ: "JWT" }, null, 2);
}

const DEFAULT_PAYLOAD = JSON.stringify(
  { sub: "1234567890", name: "John Doe", iat: 1516239022 },
  null,
  2
);

interface EncoderState {
  alg: string;
  header: string;
  payload: string;
  secret: string;
  secretBase64Url: boolean;
  privateKey: string;
  token: string;
  error: string | null;
  seq: number;
}

function parseObject(text: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`The ${label} is not valid JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`The ${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

export const useJwtEncoderStore = defineStore("jwtEncoder", {
  state: (): EncoderState => ({
    alg: "HS256",
    header: stringifyHeader("HS256"),
    payload: DEFAULT_PAYLOAD,
    secret: "a-string-secret-at-least-256-bits-long",
    secretBase64Url: false,
    privateKey: "",
    token: "",
    error: null,
    seq: 0
  }),
  getters: {
    keyKind: (state): KeyKind => keyKindForAlg(state.alg)
  },
  actions: {
    setAlg(alg: string): void {
      this.alg = alg;
      // Keep the header JSON's alg in sync (preserve other header fields).
      try {
        const header = parseObject(this.header, "header");
        header.alg = alg;
        this.header = JSON.stringify(header, null, 2);
      } catch {
        this.header = stringifyHeader(alg);
      }
    },
    async encode(): Promise<void> {
      const seq = ++this.seq;
      try {
        const header = parseObject(this.header, "header");
        const payload = parseObject(this.payload, "payload");
        const { signToken } = useJwt();
        const token = await signToken({
          header,
          payload,
          alg: this.alg,
          kind: this.keyKind,
          secret: this.secret,
          secretBase64Url: this.secretBase64Url,
          privateKey: this.privateKey
        });
        if (seq !== this.seq) return;
        this.token = token;
        this.error = null;
      } catch (error) {
        if (seq !== this.seq) return;
        this.token = "";
        this.error = error instanceof Error ? error.message : "Could not encode the token.";
      }
    },
    async loadExample(): Promise<void> {
      const { generateExample } = useJwt();
      try {
        const example = await generateExample(this.alg);
        this.header = JSON.stringify(example.header, null, 2);
        this.payload = JSON.stringify(example.payload, null, 2);
        this.secret = example.secret ?? this.secret;
        this.privateKey = example.privateKey ?? "";
        this.secretBase64Url = false;
        this.token = example.token;
        this.error = null;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Could not generate an example.";
      }
    }
  }
});
