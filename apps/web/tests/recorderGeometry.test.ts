import { describe, expect, it } from "vitest";
import { clampNormalizedRect, denormalizeRect } from "~/utils/screenRecorder";
import { defaultOverlayRect, parseRecorderSettings } from "~/schemas/screenRecorder";

describe("denormalizeRect", () => {
  it("maps a normalized rect to canvas pixels", () => {
    expect(denormalizeRect({ x: 0.5, y: 0.25, width: 0.2, height: 0.1 }, 1920, 1080)).toEqual({
      x: 960,
      y: 270,
      width: 384,
      height: 108
    });
  });
});

describe("clampNormalizedRect", () => {
  it("keeps a rect that overflows the right/bottom edge inside the canvas", () => {
    const clamped = clampNormalizedRect({ x: 0.9, y: 0.9, width: 0.3, height: 0.3 });
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1);
    expect(clamped.y + clamped.height).toBeLessThanOrEqual(1);
  });

  it("enforces a minimum size and non-negative origin", () => {
    const clamped = clampNormalizedRect({ x: -0.5, y: -0.5, width: 0.01, height: 0.01 });
    expect(clamped.x).toBeGreaterThanOrEqual(0);
    expect(clamped.y).toBeGreaterThanOrEqual(0);
    expect(clamped.width).toBeGreaterThanOrEqual(0.05);
    expect(clamped.height).toBeGreaterThanOrEqual(0.05);
  });
});

describe("parseRecorderSettings migration", () => {
  it("upgrades legacy settings that lack the newer fields", () => {
    const legacy = {
      webcamOn: true,
      micOn: false,
      systemAudio: false,
      cameraDeviceId: null,
      micDeviceId: null,
      overlayCorner: "bottom-right",
      overlaySize: "medium",
      resolution: "auto",
      frameRate: 30
    };
    const parsed = parseRecorderSettings(legacy);
    expect(parsed.webcamOn).toBe(true);
    expect(parsed.recordMode).toBe("screen");
    expect(parsed.overlayShape).toBe("rounded");
    expect(parsed.overlayRect).toEqual(defaultOverlayRect());
  });

  it("falls back to defaults for a non-object value", () => {
    expect(parseRecorderSettings("nonsense").recordMode).toBe("screen");
  });
});
