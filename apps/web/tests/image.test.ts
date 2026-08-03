import { describe, expect, it } from "vitest";
import {
  brushOverlayToMaskUint8,
  chwUint8ToRgba,
  compositeMaskedRegion,
  decideOutput,
  detectImageFormat,
  flattenOntoColor,
  formatExtension,
  formatMimeType,
  hasPaintedPixels,
  hexToRgb,
  imageHasAlpha,
  rgbaToChwUint8,
  type CompressSettings,
  type RgbaImage
} from "~/utils/image";

/** Builds a solid RGBA raster for tests. */
function solid(width: number, height: number, r: number, g: number, b: number, a = 255): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width, height, data };
}

describe("hexToRgb", () => {
  it("parses 6-digit hex", () => {
    expect(hexToRgb("#0891b2")).toEqual({ r: 8, g: 145, b: 178 });
  });
  it("parses shorthand 3-digit hex", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });
  it("tolerates a missing hash", () => {
    expect(hexToRgb("000000")).toEqual({ r: 0, g: 0, b: 0 });
  });
  it("rejects invalid hex", () => {
    expect(() => hexToRgb("#12")).toThrow();
    expect(() => hexToRgb("#zzzzzz")).toThrow();
  });
});

describe("flattenOntoColor", () => {
  it("keeps opaque foreground pixels unchanged", () => {
    const fg = solid(1, 1, 10, 20, 30, 255);
    const out = flattenOntoColor(fg, { r: 255, g: 255, b: 255 });
    expect(Array.from(out.data)).toEqual([10, 20, 30, 255]);
  });
  it("replaces fully transparent pixels with the background colour", () => {
    const fg = solid(1, 1, 10, 20, 30, 0);
    const out = flattenOntoColor(fg, { r: 100, g: 150, b: 200 });
    expect(Array.from(out.data)).toEqual([100, 150, 200, 255]);
  });
  it("alpha-blends half-transparent pixels", () => {
    const fg = solid(1, 1, 0, 0, 0, 128); // ~50%
    const out = flattenOntoColor(fg, { r: 255, g: 255, b: 255 });
    // 0*0.502 + 255*0.498 ≈ 127
    expect(out.data[0]).toBeGreaterThanOrEqual(126);
    expect(out.data[0]).toBeLessThanOrEqual(128);
    expect(out.data[3]).toBe(255);
  });
});

describe("CHW round-trip", () => {
  it("converts RGBA -> CHW uint8 with planar channel order", () => {
    // 2x1: pixel0 = (1,2,3), pixel1 = (4,5,6)
    const data = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]);
    const chw = rgbaToChwUint8({ width: 2, height: 1, data });
    // R plane, then G plane, then B plane
    expect(Array.from(chw)).toEqual([1, 4, 2, 5, 3, 6]);
  });
  it("chwUint8ToRgba inverts rgbaToChwUint8", () => {
    const original = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]);
    const chw = rgbaToChwUint8({ width: 2, height: 1, data: original });
    const back = chwUint8ToRgba(chw, 2, 1);
    expect(Array.from(back.data)).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
  });
});

describe("brushOverlayToMaskUint8", () => {
  it("marks painted pixels as 0 (inpaint) and clear pixels as 255 (keep)", () => {
    // pixel0 painted (alpha 140), pixel1 clear (alpha 0)
    const data = new Uint8ClampedArray([220, 38, 38, 140, 0, 0, 0, 0]);
    const mask = brushOverlayToMaskUint8({ width: 2, height: 1, data });
    expect(Array.from(mask)).toEqual([0, 255]);
  });
  it("treats faint sub-threshold alpha as unpainted", () => {
    const data = new Uint8ClampedArray([220, 38, 38, 5]);
    const mask = brushOverlayToMaskUint8({ width: 1, height: 1, data });
    expect(mask[0]).toBe(255);
  });
});

describe("hasPaintedPixels", () => {
  it("is true when any pixel is painted", () => {
    const data = new Uint8ClampedArray([0, 0, 0, 0, 1, 1, 1, 200]);
    expect(hasPaintedPixels({ width: 2, height: 1, data })).toBe(true);
  });
  it("is false for an empty overlay", () => {
    const data = new Uint8ClampedArray(8);
    expect(hasPaintedPixels({ width: 2, height: 1, data })).toBe(false);
  });
});

describe("compositeMaskedRegion", () => {
  const original = solid(2, 1, 10, 10, 10, 255);
  const result = solid(2, 1, 99, 99, 99, 255);

  it("copies model output only where the mask is 0 (painted)", () => {
    const mask = new Uint8Array([0, 255]); // pixel0 painted, pixel1 kept
    const out = compositeMaskedRegion(original, result, mask);
    expect(Array.from(out.data)).toEqual([99, 99, 99, 255, 10, 10, 10, 255]);
  });

  it("keeps every unpainted pixel byte-identical to the original", () => {
    const mask = new Uint8Array([255, 255]);
    const out = compositeMaskedRegion(original, result, mask);
    expect(Array.from(out.data)).toEqual(Array.from(original.data));
  });

  it("throws when sizes do not match", () => {
    expect(() => compositeMaskedRegion(original, result, new Uint8Array([0]))).toThrow();
  });
});

describe("imageHasAlpha", () => {
  it("is true when any pixel is not fully opaque", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 200]);
    expect(imageHasAlpha({ width: 2, height: 1, data })).toBe(true);
  });
  it("is false when every pixel is fully opaque", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]);
    expect(imageHasAlpha({ width: 2, height: 1, data })).toBe(false);
  });
});

describe("detectImageFormat", () => {
  it("classifies by MIME type", () => {
    expect(detectImageFormat("image/jpeg", "x")).toBe("jpeg");
    expect(detectImageFormat("image/png", "x")).toBe("png");
    expect(detectImageFormat("image/webp", "x")).toBe("webp");
  });
  it("falls back to the file extension", () => {
    expect(detectImageFormat("", "photo.JPG")).toBe("jpeg");
    expect(detectImageFormat("application/octet-stream", "a.png")).toBe("png");
    expect(detectImageFormat("", "a.webp")).toBe("webp");
  });
  it("returns 'other' for unsupported inputs", () => {
    expect(detectImageFormat("image/gif", "a.gif")).toBe("other");
  });
});

describe("format helpers", () => {
  it("maps formats to MIME types", () => {
    expect(formatMimeType("jpeg")).toBe("image/jpeg");
    expect(formatMimeType("png")).toBe("image/png");
    expect(formatMimeType("webp")).toBe("image/webp");
  });
  it("maps formats to file extensions", () => {
    expect(formatExtension("jpeg")).toBe("jpg");
    expect(formatExtension("png")).toBe("png");
    expect(formatExtension("webp")).toBe("webp");
  });
});

describe("decideOutput", () => {
  const base: CompressSettings = {
    quality: 75,
    format: "original",
    pngLossless: true,
    flattenTransparent: false,
    flattenColor: "#ffffff"
  };

  it("re-encodes everything to WebP when format is 'webp'", () => {
    expect(decideOutput("jpeg", false, { ...base, format: "webp" })).toEqual({
      format: "webp",
      flatten: false
    });
    expect(decideOutput("png", true, { ...base, format: "webp" })).toEqual({
      format: "webp",
      flatten: false
    });
  });

  it("keeps JPEG input as JPEG", () => {
    expect(decideOutput("jpeg", false, base)).toEqual({ format: "jpeg", flatten: false });
  });

  it("keeps opaque PNG as lossless PNG", () => {
    expect(decideOutput("png", false, base)).toEqual({ format: "png", flatten: false });
  });

  it("keeps transparent PNG as lossless PNG by default", () => {
    expect(decideOutput("png", true, base)).toEqual({ format: "png", flatten: false });
  });

  it("flattens a transparent PNG to JPEG when requested", () => {
    expect(decideOutput("png", true, { ...base, flattenTransparent: true })).toEqual({
      format: "jpeg",
      flatten: true
    });
  });

  it("does not flatten an opaque PNG even if flatten is on", () => {
    expect(decideOutput("png", false, { ...base, flattenTransparent: true })).toEqual({
      format: "png",
      flatten: false
    });
  });

  it("sends lossy PNGs to WebP when PNG lossless is off", () => {
    expect(decideOutput("png", true, { ...base, pngLossless: false })).toEqual({
      format: "webp",
      flatten: false
    });
  });

  it("keeps WebP input as WebP in original mode", () => {
    expect(decideOutput("webp", true, base)).toEqual({ format: "webp", flatten: false });
  });
});
