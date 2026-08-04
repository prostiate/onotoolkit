import { describe, expect, it } from "vitest";
import {
  centerBoxToPdf,
  centerBoxTopLeft,
  clamp,
  displayToPage,
  flipPathPoints,
  flipPointY,
  pageToDisplay,
  rectToCenterBox
} from "~/utils/pdfEditor";

describe("scale conversions", () => {
  it("round-trips display <-> page at a scale", () => {
    expect(displayToPage(200, 2)).toBe(100);
    expect(pageToDisplay(100, 2)).toBe(200);
  });
  it("rejects a non-positive scale", () => {
    expect(() => displayToPage(10, 0)).toThrow();
  });
});

describe("flipPointY", () => {
  it("flips the y axis about the page height", () => {
    expect(flipPointY(30, 40, 100)).toEqual({ x: 30, y: 60 });
  });
});

describe("rectToCenterBox / centerBoxTopLeft", () => {
  it("converts a top-left rect to a centre box and back", () => {
    const box = rectToCenterBox(10, 20, 100, 40);
    expect(box).toEqual({ cx: 60, cy: 40, width: 100, height: 40, rotation: 0 });
    expect(centerBoxTopLeft(box)).toEqual({ x: 10, y: 20 });
  });
});

describe("centerBoxToPdf", () => {
  it("places an unrotated box at the correct bottom-left origin", () => {
    // Page 200 tall; box centred at (60,40) top-left origin, 100x40.
    // Screen top-left y = 20 -> pdf bottom-left y = 200 - 20 - 40 = 140.
    const box = rectToCenterBox(10, 20, 100, 40);
    const p = centerBoxToPdf(box, 200);
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(140, 6);
    expect(p.width).toBe(100);
    expect(p.height).toBe(40);
    expect(p.rotate).toBe(-0);
  });

  it("negates the rotation (screen clockwise -> pdf CCW)", () => {
    const box = { cx: 100, cy: 100, width: 50, height: 30, rotation: 30 };
    expect(centerBoxToPdf(box, 400).rotate).toBe(-30);
  });

  it("keeps the box centre fixed under rotation", () => {
    // For a 90deg rotation, the origin math should still describe a box whose
    // centre maps to (cx, pageH - cy). Reconstruct the centre from the origin.
    const box = { cx: 120, cy: 90, width: 80, height: 40, rotation: 90 };
    const pageH = 300;
    const p = centerBoxToPdf(box, pageH);
    const a = p.rotate * (Math.PI / 180); // the CCW angle pdf-lib will apply
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // centre = origin + R(a) * (w/2, h/2)
    const centerX = p.x + (p.width / 2) * cos - (p.height / 2) * sin;
    const centerY = p.y + (p.width / 2) * sin + (p.height / 2) * cos;
    expect(centerX).toBeCloseTo(120, 4);
    expect(centerY).toBeCloseTo(pageH - 90, 4);
  });
});

describe("flipPathPoints", () => {
  it("flips each point's y and pairs them", () => {
    expect(flipPathPoints([0, 0, 10, 20], 100)).toEqual([
      { x: 0, y: 100 },
      { x: 10, y: 80 }
    ]);
  });
  it("ignores a trailing odd coordinate", () => {
    expect(flipPathPoints([1, 2, 3], 10)).toEqual([{ x: 1, y: 8 }]);
  });
});

describe("clamp", () => {
  it("clamps into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
