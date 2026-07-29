import { defineStore } from "pinia";
import type { DecodedJwt, KeyKind, SignatureStatus } from "~/types/jwt";
import { decodeJwt, headerAlg, keyKindForAlg } from "~/utils/jwt";

interface JwtState {
  token: string;
  decoded: DecodedJwt | null;
  decodeError: string | null;
  view: "json" | "claims";
  verifyEnabled: boolean;
  secret: string;
  secretBase64Url: boolean;
  publicKey: string;
  status: SignatureStatus;
  verifyMessage: string | null;
  /** Algorithm used by the "Generate example" control. */
  exampleAlg: string;
}

export const useJwtStore = defineStore("jwt", {
  state: (): JwtState => ({
    token: "",
    decoded: null,
    decodeError: null,
    view: "json",
    verifyEnabled: false,
    secret: "",
    secretBase64Url: false,
    publicKey: "",
    status: "idle",
    verifyMessage: null,
    exampleAlg: "HS256"
  }),
  getters: {
    alg: (state): string => (state.decoded ? headerAlg(state.decoded.header) : ""),
    keyKind(): KeyKind {
      return this.alg ? keyKindForAlg(this.alg) : "unsupported";
    },
    isAlgNone(): boolean {
      return this.keyKind === "none";
    }
  },
  actions: {
    setToken(token: string): void {
      this.token = token;
      this.status = "idle";
      this.verifyMessage = null;
      if (!token.trim()) {
        this.decoded = null;
        this.decodeError = null;
        return;
      }
      try {
        this.decoded = decodeJwt(token);
        this.decodeError = null;
      } catch (error) {
        this.decoded = null;
        this.decodeError = error instanceof Error ? error.message : "Could not decode this token.";
      }
    },
    setView(view: "json" | "claims"): void {
      this.view = view;
    },
    async generateFor(): Promise<void> {
      const { generateExample } = useJwt();
      try {
        const example = await generateExample(this.exampleAlg);
        this.setToken(example.token);
        this.verifyEnabled = true;
        this.secretBase64Url = false;
        this.secret = example.secret ?? "";
        this.publicKey = example.publicKey ?? "";
      } catch (error) {
        this.decodeError =
          error instanceof Error ? error.message : "Could not generate an example.";
      }
    },
    clear(): void {
      this.token = "";
      this.decoded = null;
      this.decodeError = null;
      this.status = "idle";
      this.verifyMessage = null;
      this.secret = "";
      this.publicKey = "";
    },
    async verify(): Promise<void> {
      if (!this.decoded) return;
      if (this.keyKind === "none") {
        this.status = "error";
        this.verifyMessage = 'Algorithm "none" has no signature to verify.';
        return;
      }
      if (this.keyKind === "unsupported") {
        this.status = "error";
        this.verifyMessage = `Verification is not supported for "${this.alg}".`;
        return;
      }

      const { verifySignature } = useJwt();
      this.status = "verifying";
      this.verifyMessage = null;
      try {
        const valid = await verifySignature({
          token: this.token,
          alg: this.alg,
          kind: this.keyKind,
          secret: this.secret,
          secretBase64Url: this.secretBase64Url,
          publicKey: this.publicKey
        });
        this.status = valid ? "valid" : "invalid";
        if (!valid) this.verifyMessage = "The signature does not match.";
      } catch (error) {
        this.status = "error";
        this.verifyMessage =
          error instanceof Error ? error.message : "Could not verify the signature.";
      }
    }
  }
});
