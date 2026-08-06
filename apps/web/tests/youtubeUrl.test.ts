import { describe, expect, it } from "vitest";
import { isYoutubeUrl, youtubeUrlSchema } from "~/schemas/youtubeUrl";

describe("isYoutubeUrl", () => {
  it("accepts known YouTube hosts", () => {
    const valid = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "http://youtube.com/watch?v=abc",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://music.youtube.com/watch?v=abc",
      "https://m.youtube.com/watch?v=abc",
      "  https://www.youtube.com/shorts/abc  "
    ];
    for (const url of valid) expect(isYoutubeUrl(url)).toBe(true);
  });

  it("rejects other hosts and malformed input", () => {
    const invalid = [
      "",
      "not a url",
      "ftp://youtube.com/watch?v=abc",
      "https://vimeo.com/12345",
      "https://youtube.evil.com/watch?v=abc",
      "javascript:alert(1)"
    ];
    for (const url of invalid) expect(isYoutubeUrl(url)).toBe(false);
  });
});

describe("youtubeUrlSchema", () => {
  it("passes a valid link", () => {
    const result = youtubeUrlSchema.safeParse("https://youtu.be/abc");
    expect(result.success).toBe(true);
  });

  it("reports a friendly message for a non-YouTube link", () => {
    const result = youtubeUrlSchema.safeParse("https://vimeo.com/1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/YouTube link/);
    }
  });

  it("reports a message for an empty value", () => {
    const result = youtubeUrlSchema.safeParse("   ");
    expect(result.success).toBe(false);
  });
});
