import { describe, expect, it } from "vitest";
import {
  allowIp,
  buildCanonical,
  hmacHex,
  isYoutubeUrl,
  pickErrorMessage
} from "../server/utils/ytSigning";

describe("buildCanonical + hmacHex", () => {
  it("builds the canonical string exactly", () => {
    expect(buildCanonical(1700000000, "GET", "/api/info", "url=abc", "")).toBe(
      "1700000000\nGET\n/api/info\nurl=abc\n"
    );
  });

  it("matches the known HMAC vector (same as the Go backend + openssl)", async () => {
    const canonical = buildCanonical(1700000000, "GET", "/api/info", "url=abc", "");
    // Independently computed: openssl dgst -sha256 -hmac "s"
    expect(await hmacHex("s", canonical)).toBe(
      "4e199f7bb818164e12fc270c3315db3d796c0982f82c80dba48130f51b2a969d"
    );
  });

  it("changes the signature when the body changes", async () => {
    const a = await hmacHex(
      "s",
      buildCanonical(1, "POST", "/api/download", "", `{"mode":"audio"}`)
    );
    const b = await hmacHex(
      "s",
      buildCanonical(1, "POST", "/api/download", "", `{"mode":"video"}`)
    );
    expect(a).not.toBe(b);
  });
});

describe("isYoutubeUrl (server edge check)", () => {
  it("accepts YouTube hosts and rejects others", () => {
    expect(isYoutubeUrl("https://youtu.be/abc")).toBe(true);
    expect(isYoutubeUrl("https://www.youtube.com/watch?v=abc")).toBe(true);
    expect(isYoutubeUrl("https://vimeo.com/1")).toBe(false);
    expect(isYoutubeUrl("not a url")).toBe(false);
  });
});

describe("allowIp rate limiter", () => {
  it("permits the burst then blocks, refilling over time", () => {
    const ip = "test-ip-burst";
    const now = 1_000_000;
    for (let i = 0; i < 8; i++) {
      expect(allowIp(ip, now)).toBe(true);
    }
    expect(allowIp(ip, now)).toBe(false);
    // 4 seconds later -> ~2 tokens refilled (0.5/sec).
    expect(allowIp(ip, now + 4000)).toBe(true);
  });

  it("tracks IPs independently", () => {
    const now = 2_000_000;
    expect(allowIp("test-ip-a", now)).toBe(true);
    expect(allowIp("test-ip-b", now)).toBe(true);
  });
});

describe("pickErrorMessage", () => {
  it("uses the upstream error string when present", () => {
    expect(pickErrorMessage({ error: "That video is unavailable." })).toBe(
      "That video is unavailable."
    );
  });

  it("falls back to a generic message", () => {
    expect(pickErrorMessage(null)).toMatch(/problem/i);
    expect(pickErrorMessage({})).toMatch(/problem/i);
    expect(pickErrorMessage({ error: 42 })).toMatch(/problem/i);
  });
});
