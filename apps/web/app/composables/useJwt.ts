import type { KeyKind } from "~/types/jwt";
import { base64UrlToBytes, keyKindForAlg } from "~/utils/jwt";

export interface VerifyArgs {
  token: string;
  alg: string;
  kind: KeyKind;
  secret?: string;
  secretBase64Url?: boolean;
  publicKey?: string;
}

export interface SignArgs {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  alg: string;
  kind: KeyKind;
  secret?: string;
  secretBase64Url?: boolean;
  privateKey?: string;
}

export interface GeneratedExample {
  token: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  secret?: string;
  privateKey?: string;
  publicKey?: string;
}

const EXAMPLE_PAYLOAD: Record<string, unknown> = {
  sub: "1234567890",
  name: "John Doe",
  admin: true,
  iat: 1516239022
};
const EXAMPLE_SECRET = "a-string-secret-at-least-256-bits-long";

/**
 * Decodes, verifies, signs, and generates JSON Web Tokens (RFC 7519) entirely
 * in the browser using `jose` (Web Crypto). `jose` is imported dynamically so it
 * never enters the SSR server bundle, and tokens/secrets/keys never leave the
 * device. This is a developer/debugging aid, not a production auth service.
 */
export function useJwt() {
  async function verifySignature(args: VerifyArgs): Promise<boolean> {
    const jose = await import("jose");

    let key: Uint8Array | CryptoKey;
    if (args.kind === "secret") {
      const secret = args.secret ?? "";
      key = args.secretBase64Url ? base64UrlToBytes(secret) : new TextEncoder().encode(secret);
    } else if (args.kind === "public") {
      const input = (args.publicKey ?? "").trim();
      if (!input) throw new Error("Provide a public key (PEM or JWK) to verify.");
      key = input.startsWith("{")
        ? await jose.importJWK(JSON.parse(input) as import("jose").JWK, args.alg)
        : await jose.importSPKI(input, args.alg);
    } else {
      throw new Error(`Signature verification is not supported for "${args.alg}".`);
    }

    try {
      await jose.compactVerify(args.token, key);
      return true;
    } catch {
      return false;
    }
  }

  async function signToken(args: SignArgs): Promise<string> {
    const jose = await import("jose");
    const header: import("jose").JWTHeaderParameters = { ...args.header, alg: args.alg };
    const signer = new jose.SignJWT(args.payload).setProtectedHeader(header);

    let key: Uint8Array | CryptoKey;
    if (args.kind === "secret") {
      const secret = args.secret ?? "";
      key = args.secretBase64Url ? base64UrlToBytes(secret) : new TextEncoder().encode(secret);
    } else if (args.kind === "public") {
      const input = (args.privateKey ?? "").trim();
      if (!input) throw new Error("Provide a private key (PKCS8 PEM or JWK) to sign.");
      key = input.startsWith("{")
        ? await jose.importJWK(JSON.parse(input) as import("jose").JWK, args.alg)
        : await jose.importPKCS8(input, args.alg);
    } else {
      throw new Error(`Signing is not supported for "${args.alg}".`);
    }

    return signer.sign(key);
  }

  async function generateExample(alg: string): Promise<GeneratedExample> {
    const jose = await import("jose");
    const header: import("jose").JWTHeaderParameters = { alg, typ: "JWT" };
    const kind = keyKindForAlg(alg);

    if (kind === "secret") {
      const token = await new jose.SignJWT(EXAMPLE_PAYLOAD)
        .setProtectedHeader(header)
        .sign(new TextEncoder().encode(EXAMPLE_SECRET));
      return { token, header, payload: EXAMPLE_PAYLOAD, secret: EXAMPLE_SECRET };
    }

    if (kind === "public") {
      const { publicKey, privateKey } = await jose.generateKeyPair(alg, { extractable: true });
      const token = await new jose.SignJWT(EXAMPLE_PAYLOAD)
        .setProtectedHeader(header)
        .sign(privateKey);
      return {
        token,
        header,
        payload: EXAMPLE_PAYLOAD,
        privateKey: await jose.exportPKCS8(privateKey),
        publicKey: await jose.exportSPKI(publicKey)
      };
    }

    throw new Error(`Cannot generate an example for "${alg}".`);
  }

  return { verifySignature, signToken, generateExample };
}
