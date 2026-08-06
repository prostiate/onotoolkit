import { describe, expect, it } from "vitest";
import {
  defaultDownloadName,
  defaultQuality,
  formatDuration,
  parseContentDispositionFilename,
  qualityLabel,
  sanitizeTitle
} from "~/utils/youtube";

describe("formatDuration", () => {
  it("formats sub-hour durations as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(213)).toBe("3:33");
  });

  it("formats hour-plus durations as h:mm:ss", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(7325)).toBe("2:02:05");
  });

  it("guards against invalid input", () => {
    expect(formatDuration(-10)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
  });
});

describe("defaultQuality", () => {
  it("returns 0 (best) when no heights are known", () => {
    expect(defaultQuality([])).toBe(0);
  });

  it("prefers the highest resolution at or below 1080p", () => {
    expect(defaultQuality([2160, 1440, 1080, 720])).toBe(1080);
    expect(defaultQuality([720, 480, 360])).toBe(720);
  });

  it("falls back to the lowest when everything is above 1080p", () => {
    expect(defaultQuality([2160, 1440])).toBe(1440);
  });
});

describe("qualityLabel", () => {
  it("labels common heights", () => {
    expect(qualityLabel(360)).toBe("360p");
    expect(qualityLabel(1080)).toBe("1080p");
    expect(qualityLabel(2160)).toBe("4K");
    expect(qualityLabel(4320)).toBe("8K");
  });
});

describe("sanitizeTitle", () => {
  it("strips unsafe filename characters", () => {
    expect(sanitizeTitle('a/b\\c:d*e?f"g<h>i|j')).toBe("a b c d e f g h i j");
  });

  it("falls back to 'video' for empty input", () => {
    expect(sanitizeTitle("   ")).toBe("video");
  });
});

describe("defaultDownloadName", () => {
  it("uses the right extension per mode", () => {
    expect(defaultDownloadName("My Song", "audio")).toBe("My Song.m4a");
    expect(defaultDownloadName("My Clip", "video")).toBe("My Clip.mp4");
  });
});

describe("parseContentDispositionFilename", () => {
  it("returns null without a header", () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
  });

  it("prefers the RFC 5987 filename* form", () => {
    const header = `attachment; filename="Rick_Astley.m4a"; filename*=UTF-8''Rick%20Astley.m4a`;
    expect(parseContentDispositionFilename(header)).toBe("Rick Astley.m4a");
  });

  it("decodes non-ASCII names", () => {
    const header = `attachment; filename="Caf_.m4a"; filename*=UTF-8''Caf%C3%A9.m4a`;
    expect(parseContentDispositionFilename(header)).toBe("Café.m4a");
  });

  it("falls back to the plain filename form", () => {
    expect(parseContentDispositionFilename(`attachment; filename="video.mp4"`)).toBe("video.mp4");
  });
});
