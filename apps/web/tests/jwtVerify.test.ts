// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SignJWT, exportJWK, exportPKCS8, exportSPKI, generateKeyPair } from "jose";
import { useJwt } from "~/composables/useJwt";
import { decodeJwt } from "~/utils/jwt";

const { verifySignature, signToken, generateExample } = useJwt();

const SAMPLE_HS256 =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("HS256 secret verification", () => {
  it("accepts the correct secret", async () => {
    expect(
      await verifySignature({
        token: SAMPLE_HS256,
        alg: "HS256",
        kind: "secret",
        secret: "your-256-bit-secret"
      })
    ).toBe(true);
  });

  it("rejects a wrong secret", async () => {
    expect(
      await verifySignature({
        token: SAMPLE_HS256,
        alg: "HS256",
        kind: "secret",
        secret: "nope"
      })
    ).toBe(false);
  });

  it("honours the Base64URL-encoded secret switch", async () => {
    const rawKey = new Uint8Array(32).map((_, i) => (i * 7 + 3) & 0xff);
    const token = await new SignJWT({ sub: "abc" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(rawKey);
    const b64 = Buffer.from(rawKey).toString("base64url");

    // With the switch on, the base64url string decodes to the real key bytes.
    expect(
      await verifySignature({
        token,
        alg: "HS256",
        kind: "secret",
        secret: b64,
        secretBase64Url: true
      })
    ).toBe(true);

    // With the switch off, the string is treated as raw UTF-8 -> wrong key.
    expect(
      await verifySignature({
        token,
        alg: "HS256",
        kind: "secret",
        secret: b64,
        secretBase64Url: false
      })
    ).toBe(false);
  });
});

describe("public-key verification (ES256)", () => {
  it("verifies with a SPKI PEM and with a JWK", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    const token = await new SignJWT({ sub: "abc" })
      .setProtectedHeader({ alg: "ES256" })
      .sign(privateKey);

    const pem = await exportSPKI(publicKey);
    expect(await verifySignature({ token, alg: "ES256", kind: "public", publicKey: pem })).toBe(
      true
    );

    const jwk = await exportJWK(publicKey);
    expect(
      await verifySignature({
        token,
        alg: "ES256",
        kind: "public",
        publicKey: JSON.stringify(jwk)
      })
    ).toBe(true);
  });

  it("rejects a token signed by a different key", async () => {
    const signer = await generateKeyPair("ES256", { extractable: true });
    const other = await generateKeyPair("ES256", { extractable: true });
    const token = await new SignJWT({ sub: "abc" })
      .setProtectedHeader({ alg: "ES256" })
      .sign(signer.privateKey);
    const otherPem = await exportSPKI(other.publicKey);

    expect(
      await verifySignature({ token, alg: "ES256", kind: "public", publicKey: otherPem })
    ).toBe(false);
  });

  it("throws when the public key input is empty", async () => {
    await expect(
      verifySignature({ token: SAMPLE_HS256, alg: "ES256", kind: "public", publicKey: "" })
    ).rejects.toThrow();
  });
});

describe("unsupported algorithms", () => {
  it("throws", async () => {
    await expect(
      verifySignature({ token: SAMPLE_HS256, alg: "WAT1", kind: "unsupported" })
    ).rejects.toThrow();
  });
});

describe("signToken", () => {
  it("signs HS256 and round-trips through verify", async () => {
    const token = await signToken({
      header: { typ: "JWT" },
      payload: { sub: "x", name: "Jane" },
      alg: "HS256",
      kind: "secret",
      secret: "top-secret"
    });
    expect(decodeJwt(token).header.alg).toBe("HS256");
    expect(decodeJwt(token).payload).toMatchObject({ sub: "x", name: "Jane" });
    expect(
      await verifySignature({ token, alg: "HS256", kind: "secret", secret: "top-secret" })
    ).toBe(true);
  });

  it("signs ES256 with a private key and verifies with the public key", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    const token = await signToken({
      header: { typ: "JWT" },
      payload: { sub: "x" },
      alg: "ES256",
      kind: "public",
      privateKey: await exportPKCS8(privateKey)
    });
    const spki = await exportSPKI(publicKey);
    expect(await verifySignature({ token, alg: "ES256", kind: "public", publicKey: spki })).toBe(
      true
    );
  });

  it("throws when no signing key is provided", async () => {
    await expect(
      signToken({ header: {}, payload: { sub: "x" }, alg: "ES256", kind: "public" })
    ).rejects.toThrow();
  });
});

describe("generateExample", () => {
  it("creates an HS256 example that verifies with its secret", async () => {
    const example = await generateExample("HS256");
    expect(example.secret).toBeTruthy();
    expect(decodeJwt(example.token).header.alg).toBe("HS256");
    expect(
      await verifySignature({
        token: example.token,
        alg: "HS256",
        kind: "secret",
        secret: example.secret
      })
    ).toBe(true);
  });

  it("creates an ES256 example that verifies with its public key", async () => {
    const example = await generateExample("ES256");
    expect(example.publicKey).toBeTruthy();
    expect(
      await verifySignature({
        token: example.token,
        alg: "ES256",
        kind: "public",
        publicKey: example.publicKey
      })
    ).toBe(true);
  });
});
