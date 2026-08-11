import { describe, expect, it } from "vitest";
import {
  clampDimension,
  clampPercentage,
  clampTargetKb,
  planTargetDimensions,
  RESIZE_MAX_DIMENSION,
  RESIZE_MAX_PERCENTAGE,
  RESIZE_MIN_PERCENTAGE,
  type ResizeSettings
} from "~/utils/imageResize";

function dims(mode: ResizeSettings["mode"], extra: Partial<ResizeSettings> = {}): ResizeSettings {
  return {
    mode,
    percentage: 50,
    width: null,
    height: null,
    fit: "contain",
    targetKb: 200,
    ...extra
  };
}

describe("planTargetDimensions - percentage mode", () => {
  it("scales both axes by the percentage", () => {
    expect(planTargetDimensions(200, 100, dims("percentage"))).toEqual({ width: 100, height: 50 });
    expect(planTargetDimensions(200, 100, dims("percentage", { percentage: 200 }))).toEqual({
      width: 400,
      height: 200
    });
  });

  it("rounds fractional results", () => {
    expect(planTargetDimensions(33, 33, dims("percentage", { percentage: 25 }))).toEqual({
      width: 8,
      height: 8
    });
  });

  it("clamps to the supported range", () => {
    const huge = planTargetDimensions(9000, 9000, dims("percentage", { percentage: 100 }));
    expect(huge.width).toBeLessThanOrEqual(RESIZE_MAX_DIMENSION);
    expect(huge.height).toBeLessThanOrEqual(RESIZE_MAX_DIMENSION);
    const tiny = planTargetDimensions(2, 2, dims("percentage", { percentage: 1 }));
    expect(tiny.width).toBeGreaterThanOrEqual(1);
  });
});

describe("planTargetDimensions - dimensions mode", () => {
  it("keeps the aspect ratio when one axis is empty", () => {
    expect(planTargetDimensions(200, 100, dims("dimensions", { width: 100 }))).toEqual({
      width: 100,
      height: 50
    });
    expect(planTargetDimensions(200, 100, dims("dimensions", { height: 50 }))).toEqual({
      width: 100,
      height: 50
    });
  });

  it("contain scales down to fit inside the box", () => {
    expect(
      planTargetDimensions(
        400,
        100,
        dims("dimensions", { width: 200, height: 100, fit: "contain" })
      )
    ).toEqual({ width: 200, height: 50 });
  });

  it("contain can upscale a small image to the box", () => {
    expect(
      planTargetDimensions(10, 10, dims("dimensions", { width: 100, height: 50, fit: "contain" }))
    ).toEqual({ width: 50, height: 50 });
  });

  it("cover fills the box and crops overflow", () => {
    // 400x100 source in a 200x200 box: scale = max(0.5, 2) = 2 -> 800x200.
    expect(
      planTargetDimensions(400, 100, dims("dimensions", { width: 200, height: 200, fit: "cover" }))
    ).toEqual({ width: 800, height: 200 });
  });

  it("stretch forces the exact dimensions", () => {
    expect(
      planTargetDimensions(400, 100, dims("dimensions", { width: 40, height: 90, fit: "stretch" }))
    ).toEqual({ width: 40, height: 90 });
  });

  it("rejects a box with no axes", () => {
    expect(() => planTargetDimensions(200, 100, dims("dimensions"))).toThrow();
  });
});

describe("planTargetDimensions - size mode", () => {
  it("keeps the raster untouched (budget is met by the encoder)", () => {
    expect(planTargetDimensions(640, 480, dims("size", { targetKb: 100 }))).toEqual({
      width: 640,
      height: 480
    });
  });
});

describe("clamping helpers", () => {
  it("clamps dimensions", () => {
    expect(clampDimension(0)).toBe(1);
    expect(clampDimension(-5)).toBe(1);
    expect(clampDimension(4.4)).toBe(4);
    expect(clampDimension(999999)).toBe(RESIZE_MAX_DIMENSION);
  });

  it("clamps percentages", () => {
    expect(clampPercentage(0)).toBe(RESIZE_MIN_PERCENTAGE);
    expect(clampPercentage(10.6)).toBe(11);
    expect(clampPercentage(1000)).toBe(RESIZE_MAX_PERCENTAGE);
  });

  it("clamps target KB", () => {
    expect(clampTargetKb(0)).toBe(1);
    expect(clampTargetKb(42.4)).toBe(42);
    expect(clampTargetKb(99999)).toBe(10240);
  });
});

describe("planTargetDimensions - input validation", () => {
  it("rejects non-positive input dimensions", () => {
    expect(() => planTargetDimensions(0, 100, dims("percentage"))).toThrow();
    expect(() => planTargetDimensions(100, -1, dims("percentage"))).toThrow();
  });
});
