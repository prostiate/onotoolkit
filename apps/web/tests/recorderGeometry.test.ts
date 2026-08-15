import { describe, expect, it } from "vitest";
import {
  applyShapeClip,
  clampNormalizedRect,
  denormalizeRect,
  moveNormalizedRect,
  overlayShapeRect,
  resizeNormalizedRect
} from "~/utils/screenRecorder";
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

describe("overlay interaction geometry", () => {
  const starting = { x: 0.2, y: 0.3, width: 0.25, height: 0.2 };

  it("moves an overlay and clamps it at the canvas edges", () => {
    const moved = moveNormalizedRect(starting, 0.1, -0.1);
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.2);
    expect(moveNormalizedRect(starting, 2, 2)).toEqual({
      x: 0.75,
      y: 0.8,
      width: 0.25,
      height: 0.2
    });
  });

  it("resizes from the direct-manipulation handle and respects minimum size", () => {
    expect(resizeNormalizedRect(starting, 0.1, 0.05)).toEqual({
      x: 0.2,
      y: 0.3,
      width: 0.35,
      height: 0.25
    });
    expect(resizeNormalizedRect(starting, -1, -1).width).toBe(0.05);
    expect(resizeNormalizedRect(starting, -1, -1).height).toBe(0.05);
  });
});

describe("webcam shape geometry", () => {
  it("uses the centered inscribed square for circles at arbitrary sizes", () => {
    expect(overlayShapeRect({ x: 0.1, y: 0.2, width: 0.4, height: 0.2 }, "circle")).toEqual({
      x: 0.2,
      y: 0.2,
      width: 0.2,
      height: 0.2
    });
  });

  it("uses the original bounds for non-circular shapes", () => {
    const rect = { x: 0.1, y: 0.2, width: 0.4, height: 0.2 };
    expect(overlayShapeRect(rect, "rounded")).toBe(rect);
    expect(overlayShapeRect(rect, "square")).toBe(rect);
  });

  it("uses equal radii for a circle even when its bounding box is rectangular", () => {
    const calls: number[][] = [];
    const ellipse = (...args: number[]): void => calls.push(args);
    const context = {
      beginPath: () => undefined,
      ellipse,
      clip: () => undefined
    } as unknown as CanvasRenderingContext2D;

    applyShapeClip(context, "circle", 10, 20, 200, 100);

    expect(calls[0]).toEqual([110, 70, 50, 50, 0, 0, Math.PI * 2]);
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
