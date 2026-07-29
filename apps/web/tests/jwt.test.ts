import { describe, expect, it } from "vitest";
import {
  base64UrlToBytes,
  base64UrlToString,
  decodeJwt,
  describeClaims,
  headerAlg,
  keyKindForAlg,
  splitToken,
  tokenValidity
} from "~/utils/jwt";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("splitToken", () => {
  it("splits a valid token into three parts", () => {
    const segments = splitToken(SAMPLE);
    expect(segments?.signature).toBe("SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
  });

  it("accepts an empty signature segment (e.g. alg none)", () => {
    const segments = splitToken("aaa.bbb.");
    expect(segments).not.toBeNull();
    expect(segments?.signature).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(splitToken(`  ${SAMPLE}  `)?.header).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });

  it("returns null when parts are missing", () => {
    expect(splitToken("only-one")).toBeNull();
    expect(splitToken("a.b")).toBeNull();
    expect(splitToken(".b.c")).toBeNull();
    expect(splitToken("a..c")).toBeNull();
  });
});

describe("base64url", () => {
  it("decodes to string and bytes", () => {
    expect(base64UrlToString("eyJhIjoxfQ")).toBe('{"a":1}');
    expect(Array.from(base64UrlToBytes("AQID"))).toEqual([1, 2, 3]);
  });

  it("handles URL-safe chars and missing padding", () => {
    // "-_" are the URL-safe substitutes for "+/"
    const bytes = base64UrlToBytes("-_-_");
    expect(bytes.length).toBe(3);
  });
});

describe("decodeJwt", () => {
  it("decodes header and payload with sizes", () => {
    const decoded = decodeJwt(SAMPLE);
    expect(decoded.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decoded.payload).toMatchObject({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
    expect(decoded.sizes.header).toBeGreaterThan(0);
    expect(decoded.sizes.signature).toBeGreaterThan(0);
  });

  it("throws a friendly error for the wrong number of parts", () => {
    expect(() => decodeJwt("a.b")).toThrow(/three parts/i);
  });

  it("throws for non-JSON segments", () => {
    expect(() => decodeJwt("bm90anNvbg.bm90anNvbg.sig")).toThrow(/not valid JSON|not a JSON/i);
  });
});

describe("headerAlg / keyKindForAlg", () => {
  it("reads and uppercases alg", () => {
    expect(headerAlg({ alg: "hs256" })).toBe("HS256");
    expect(headerAlg({})).toBe("");
    expect(headerAlg({ alg: 5 })).toBe("");
  });

  it("maps algorithms to key kinds", () => {
    for (const alg of ["HS256", "HS384", "HS512"]) expect(keyKindForAlg(alg)).toBe("secret");
    for (const alg of ["RS256", "PS384", "ES512", "EDDSA"])
      expect(keyKindForAlg(alg)).toBe("public");
    expect(keyKindForAlg("NONE")).toBe("none");
    expect(keyKindForAlg("HS999")).toBe("unsupported");
    expect(keyKindForAlg("")).toBe("unsupported");
  });
});

describe("describeClaims", () => {
  const now = 1_000_000;

  it("humanizes registered claims and marks expiry state", () => {
    const rows = describeClaims({ iss: "me", exp: now - 5, nbf: now + 5, iat: now - 100 }, now);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.iss?.label).toBe("Issuer");
    expect(byKey.exp?.state).toBe("error");
    expect(byKey.exp?.detail).toMatch(/\(.*\)/);
    expect(byKey.nbf?.state).toBe("warn");
    expect(byKey.iat?.state).toBe("neutral");
    expect(byKey.iat?.detail).toBeTruthy();
  });

  it("stringifies array and object claims and keeps custom keys", () => {
    const rows = describeClaims({ aud: ["a", "b"], role: { admin: true } }, now);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.aud?.value).toBe('["a","b"]');
    expect(byKey.role?.label).toBe("role");
    expect(byKey.role?.value).toBe('{"admin":true}');
  });
});

describe("tokenValidity", () => {
  const now = 1_000_000;
  it("flags expired / not-yet-valid / active", () => {
    expect(tokenValidity({ exp: now - 1 }, now)).toEqual({ expired: true, notYetValid: false });
    expect(tokenValidity({ nbf: now + 1 }, now)).toEqual({ expired: false, notYetValid: true });
    expect(tokenValidity({ exp: now + 10, nbf: now - 10 }, now)).toEqual({
      expired: false,
      notYetValid: false
    });
    expect(tokenValidity({}, now)).toEqual({ expired: false, notYetValid: false });
  });
});
