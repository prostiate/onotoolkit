import { describe, expect, it } from "vitest";
import {
  computeOverlayRect,
  formatDeviceLabel,
  formatRecordingDuration,
  isScreenRecordingSupported,
  pickRecorderMimeType,
  recorderBitrate,
  recordingFileName
} from "~/utils/screenRecorder";
import { defaultRecorderSettings, parseRecorderSettings } from "~/schemas/screenRecorder";

describe("pickRecorderMimeType", () => {
  it("prefers MP4 (H.264) when the browser supports it", () => {
    const supported = new Set(["video/mp4;codecs=avc1,mp4a", "video/webm;codecs=vp9,opus"]);
    const picked = pickRecorderMimeType((mime) => supported.has(mime));
    expect(picked).toEqual({ mimeType: "video/mp4;codecs=avc1,mp4a", extension: "mp4" });
  });

  it("falls back to WebM VP9, then VP8, then plain WebM", () => {
    expect(
      pickRecorderMimeType((mime) =>
        ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus"].includes(mime)
      )
    ).toEqual({ mimeType: "video/webm;codecs=vp9,opus", extension: "webm" });
    expect(pickRecorderMimeType((mime) => mime === "video/webm;codecs=vp8,opus")).toEqual({
      mimeType: "video/webm;codecs=vp8,opus",
      extension: "webm"
    });
    expect(pickRecorderMimeType((mime) => mime === "video/webm")).toEqual({
      mimeType: "video/webm",
      extension: "webm"
    });
  });

  it("returns null when no candidate is supported", () => {
    expect(pickRecorderMimeType(() => false)).toBeNull();
  });

  it("guards against isTypeSupported throwing (old browsers)", () => {
    expect(pickRecorderMimeType(() => true)).toEqual({
      mimeType: "video/mp4;codecs=avc1,mp4a",
      extension: "mp4"
    });
    expect(pickRecorderMimeType(() => false)).toBeNull();
  });
});

describe("recorderBitrate", () => {
  it("tunes bitrate to the chosen resolution", () => {
    expect(recorderBitrate("1080p")).toBe(8_000_000);
    expect(recorderBitrate("720p")).toBe(5_000_000);
    expect(recorderBitrate("auto")).toBe(6_000_000);
  });
});

describe("recordingFileName", () => {
  it("builds a timestamped file name", () => {
    const date = new Date(2026, 7, 12, 9, 5, 3);
    expect(recordingFileName(date, "webm")).toBe("screen-recording-2026-08-12-090503.webm");
  });

  it("zero-pads hours, minutes and seconds", () => {
    const date = new Date(2026, 0, 1, 0, 0, 0);
    expect(recordingFileName(date, "mp4")).toBe("screen-recording-2026-01-01-000000.mp4");
  });
});

describe("computeOverlayRect", () => {
  const canvas = { width: 1920, height: 1080 };

  it("places the overlay in the requested corner with the margin", () => {
    const rect = computeOverlayRect(canvas.width, canvas.height, 16 / 9, "top-left", "medium");
    expect(rect.x).toBe(16);
    expect(rect.y).toBe(16);
    const bottomRight = computeOverlayRect(
      canvas.width,
      canvas.height,
      16 / 9,
      "bottom-right",
      "medium"
    );
    expect(bottomRight.x).toBe(canvas.width - bottomRight.width - 16);
    expect(bottomRight.y).toBe(canvas.height - bottomRight.height - 16);
  });

  it("scales the overlay by size preset", () => {
    const small = computeOverlayRect(1920, 1080, 16 / 9, "top-right", "small");
    const large = computeOverlayRect(1920, 1080, 16 / 9, "top-right", "large");
    expect(small.width).toBe(Math.round(1920 * 0.15));
    expect(large.width).toBe(Math.round(1920 * 0.3));
  });

  it("keeps the camera's aspect ratio", () => {
    const rect = computeOverlayRect(1920, 1080, 4 / 3, "bottom-left", "medium");
    expect(rect.width / rect.height).toBeCloseTo(4 / 3, 2);
  });

  it("clamps tall overlays to half the canvas height", () => {
    const rect = computeOverlayRect(1920, 1080, 1 / 4, "bottom-left", "large");
    expect(rect.height).toBeLessThanOrEqual(1080 * 0.5);
  });

  it("clamps the margin on tiny canvases", () => {
    const rect = computeOverlayRect(320, 240, 16 / 9, "bottom-right", "medium");
    expect(rect.x + rect.width).toBeLessThanOrEqual(320);
    expect(rect.y + rect.height).toBeLessThanOrEqual(240);
  });

  it("falls back to 16:9 for degenerate aspect ratios", () => {
    const rect = computeOverlayRect(1920, 1080, 0, "top-left", "small");
    expect(rect.width / rect.height).toBeCloseTo(16 / 9, 5);
    const nan = computeOverlayRect(1920, 1080, Number.NaN, "top-left", "small");
    expect(nan.width / nan.height).toBeCloseTo(16 / 9, 5);
  });
});

describe("formatDeviceLabel", () => {
  const device = (label: string): MediaDeviceInfo => ({ label }) as MediaDeviceInfo;

  it("returns the device label when present", () => {
    expect(formatDeviceLabel(device("HD Webcam"), "camera")).toBe("HD Webcam");
    expect(formatDeviceLabel(device("Blue Yeti"), "microphone")).toBe("Blue Yeti");
  });

  it("falls back to a friendly default", () => {
    expect(formatDeviceLabel(device(""), "camera")).toBe("Default camera");
    expect(formatDeviceLabel(device("   "), "microphone")).toBe("Default microphone");
  });
});

describe("formatRecordingDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatRecordingDuration(0)).toBe("0:00");
    expect(formatRecordingDuration(42_000)).toBe("0:42");
    expect(formatRecordingDuration(61_000)).toBe("1:01");
  });

  it("formats hours as h:mm:ss", () => {
    expect(formatRecordingDuration(3_661_000)).toBe("1:01:01");
  });

  it("never shows a negative duration", () => {
    expect(formatRecordingDuration(-5)).toBe("0:00");
  });
});

describe("isScreenRecordingSupported", () => {
  it("returns false when the media APIs are missing", () => {
    expect(isScreenRecordingSupported()).toBe(false);
  });
});

describe("recorder settings schema", () => {
  it("round-trips persisted settings", () => {
    const settings = defaultRecorderSettings();
    const stored = JSON.stringify(settings);
    expect(parseRecorderSettings(JSON.parse(stored))).toEqual(settings);
  });

  it("returns defaults for garbage input", () => {
    expect(parseRecorderSettings(null)).toEqual(defaultRecorderSettings());
    expect(parseRecorderSettings({ webcamOn: "yes" })).toEqual(defaultRecorderSettings());
    expect(parseRecorderSettings(42)).toEqual(defaultRecorderSettings());
  });

  it("rejects out-of-range enum values instead of trusting them", () => {
    const parsed = parseRecorderSettings({
      ...defaultRecorderSettings(),
      overlayCorner: "sideways",
      frameRate: 25
    });
    expect(parsed).toEqual(defaultRecorderSettings());
  });

  it("defaults webcam off but mic on (privacy-first defaults)", () => {
    const defaults = defaultRecorderSettings();
    expect(defaults.webcamOn).toBe(false);
    expect(defaults.micOn).toBe(true);
    expect(defaults.overlayCorner).toBe("bottom-right");
    expect(defaults.resolution).toBe("auto");
    expect(defaults.frameRate).toBe(30);
  });
});
