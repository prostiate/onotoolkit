import { describe, expect, it } from "vitest";
import {
  CONVERT_FORMATS,
  FORMAT_INFO,
  ICO_FAVICON_SIZES,
  detectSourceFormat,
  encodeBmpRgba,
  encodeIco,
  needsFlatten,
  planIcoSizes
} from "~/utils/imageConvert";
import type { RgbaImage } from "~/utils/image";

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

/** Tiny valid-ish PNG byte stub (8-byte signature + nothing else is enough for ICO layout). */
function stubPng(size: number): Uint8Array {
  const bytes = new Uint8Array(8 + size);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  return bytes;
}

describe("FORMAT_INFO", () => {
  it("covers every converter format with consistent metadata", () => {
    for (const format of CONVERT_FORMATS) {
      const info = FORMAT_INFO[format];
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.mime).toMatch(/^image\//);
      expect(info.extension).toMatch(/^[a-z0-9]+$/);
    }
  });

  it("marks JPEG and GIF as alpha-incapable, others as alpha-capable", () => {
    expect(FORMAT_INFO.jpeg.alpha).toBe(false);
    expect(FORMAT_INFO.gif.alpha).toBe(false);
    expect(FORMAT_INFO.png.alpha).toBe(true);
    expect(FORMAT_INFO.webp.alpha).toBe(true);
    expect(FORMAT_INFO.bmp.alpha).toBe(true);
    expect(FORMAT_INFO.ico.alpha).toBe(true);
    expect(FORMAT_INFO.avif.alpha).toBe(true);
  });

  it("marks JPEG, WebP and AVIF as lossy (quality applies)", () => {
    expect(FORMAT_INFO.jpeg.lossy).toBe(true);
    expect(FORMAT_INFO.webp.lossy).toBe(true);
    expect(FORMAT_INFO.avif.lossy).toBe(true);
    expect(FORMAT_INFO.png.lossy).toBe(false);
    expect(FORMAT_INFO.gif.lossy).toBe(false);
    expect(FORMAT_INFO.bmp.lossy).toBe(false);
    expect(FORMAT_INFO.ico.lossy).toBe(false);
  });

  it("maps standard MIME types and extensions", () => {
    expect(FORMAT_INFO.jpeg.mime).toBe("image/jpeg");
    expect(FORMAT_INFO.jpeg.extension).toBe("jpg");
    expect(FORMAT_INFO.ico.mime).toBe("image/x-icon");
    expect(FORMAT_INFO.ico.extension).toBe("ico");
    expect(FORMAT_INFO.avif.mime).toBe("image/avif");
  });
});

describe("detectSourceFormat", () => {
  it("classifies by MIME type", () => {
    expect(detectSourceFormat("image/jpeg", "x")).toBe("jpeg");
    expect(detectSourceFormat("image/png", "x")).toBe("png");
    expect(detectSourceFormat("image/webp", "x")).toBe("webp");
    expect(detectSourceFormat("image/gif", "x")).toBe("gif");
    expect(detectSourceFormat("image/bmp", "x")).toBe("bmp");
    expect(detectSourceFormat("image/x-icon", "x")).toBe("ico");
    expect(detectSourceFormat("image/vnd.microsoft.icon", "x")).toBe("ico");
    expect(detectSourceFormat("image/avif", "x")).toBe("avif");
  });

  it("falls back to the file extension", () => {
    expect(detectSourceFormat("", "photo.JPG")).toBe("jpeg");
    expect(detectSourceFormat("application/octet-stream", "a.png")).toBe("png");
    expect(detectSourceFormat("", "a.webp")).toBe("webp");
    expect(detectSourceFormat("", "a.gif")).toBe("gif");
    expect(detectSourceFormat("", "a.bmp")).toBe("bmp");
    expect(detectSourceFormat("", "favicon.ico")).toBe("ico");
    expect(detectSourceFormat("", "photo.avif")).toBe("avif");
  });

  it("returns 'other' for unsupported inputs", () => {
    expect(detectSourceFormat("image/tiff", "a.tiff")).toBe("other");
    expect(detectSourceFormat("", "a.pdf")).toBe("other");
  });
});

describe("needsFlatten", () => {
  it("flattens transparency only for alpha-incapable formats", () => {
    expect(needsFlatten("jpeg", true)).toBe(true);
    expect(needsFlatten("gif", true)).toBe(true);
    expect(needsFlatten("png", true)).toBe(false);
    expect(needsFlatten("webp", true)).toBe(false);
    expect(needsFlatten("ico", true)).toBe(false);
    expect(needsFlatten("bmp", true)).toBe(false);
    expect(needsFlatten("avif", true)).toBe(false);
  });

  it("never flattens opaque images", () => {
    expect(needsFlatten("jpeg", false)).toBe(false);
    expect(needsFlatten("gif", false)).toBe(false);
  });
});

describe("encodeIco", () => {
  it("writes a valid ICONDIR header for one image", () => {
    const png = stubPng(32);
    const ico = encodeIco([{ size: 32, png }]);
    const view = new DataView(ico.buffer);

    expect(ico[0]).toBe(0);
    expect(ico[1]).toBe(0);
    expect(view.getUint16(2, true)).toBe(1); // type: icon
    expect(view.getUint16(4, true)).toBe(1); // one image
    expect(ico.length).toBe(6 + 16 + png.length);
  });

  it("writes one ICONDIRENTRY per image with correct offsets", () => {
    const first = stubPng(10);
    const second = stubPng(20);
    const ico = encodeIco([
      { size: 16, png: first },
      { size: 256, png: second }
    ]);
    const view = new DataView(ico.buffer);

    expect(view.getUint16(4, true)).toBe(2);
    // Entry 1: 16x16
    expect(ico[6]).toBe(16);
    expect(ico[7]).toBe(16);
    expect(view.getUint32(6 + 8, true)).toBe(first.length);
    expect(view.getUint32(6 + 12, true)).toBe(6 + 32);
    // Entry 2: 256px is stored as 0 in the header bytes
    expect(ico[6 + 16]).toBe(0);
    expect(ico[6 + 16 + 1]).toBe(0);
    expect(view.getUint32(6 + 16 + 12, true)).toBe(6 + 32 + first.length);
  });

  it("embeds the PNG bytes at the advertised offsets", () => {
    const png = stubPng(48);
    const ico = encodeIco([{ size: 48, png }]);
    const view = new DataView(ico.buffer);
    const offset = view.getUint32(6 + 12, true);
    expect(Array.from(ico.slice(offset, offset + 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("rejects empty input and out-of-range sizes", () => {
    expect(() => encodeIco([])).toThrow();
    expect(() => encodeIco([{ size: 0, png: stubPng(4) }])).toThrow();
    expect(() => encodeIco([{ size: 257, png: stubPng(4) }])).toThrow();
  });
});

describe("encodeBmpRgba", () => {
  it("writes a valid 32-bit top-down BMP header", () => {
    const bmp = encodeBmpRgba(solid(2, 3, 0, 0, 0));
    const view = new DataView(bmp.buffer);

    expect(String.fromCharCode(bmp[0]!, bmp[1]!)).toBe("BM");
    expect(view.getUint32(2, true)).toBe(bmp.length);
    expect(view.getUint32(10, true)).toBe(54); // pixel offset
    expect(view.getUint32(14, true)).toBe(40); // DIB header size
    expect(view.getInt32(18, true)).toBe(2); // width
    expect(view.getInt32(22, true)).toBe(-3); // negative height = top-down
    expect(view.getUint16(26, true)).toBe(1); // planes
    expect(view.getUint16(28, true)).toBe(32); // bit count
    expect(view.getUint32(30, true)).toBe(0); // BI_RGB
    expect(bmp.length).toBe(54 + 2 * 3 * 4);
  });

  it("stores pixels as BGRA in top-down row order", () => {
    // 2x1: pixel0 = red, pixel1 = blue.
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    const bmp = encodeBmpRgba({ width: 2, height: 1, data });
    expect(Array.from(bmp.slice(54, 62))).toEqual([0, 0, 255, 255, 255, 0, 0, 255]);
  });

  it("round-trips a single pixel through header parsing", () => {
    const source = solid(1, 1, 10, 20, 30, 40);
    const bmp = encodeBmpRgba(source);
    const view = new DataView(bmp.buffer);
    expect(view.getInt32(18, true)).toBe(1);
    expect(view.getInt32(22, true)).toBe(-1);
    // BGRA at offset 54: B=30, G=20, R=10, A=40
    expect(Array.from(bmp.slice(54, 58))).toEqual([30, 20, 10, 40]);
  });
});

describe("planIcoSizes", () => {
  it("includes every standard size that fits the smaller side", () => {
    expect(planIcoSizes(256, 256)).toEqual([...ICO_FAVICON_SIZES]);
    expect(planIcoSizes(64, 128)).toEqual([16, 32, 48, 64]);
  });

  it("falls back to 16 px for sources smaller than the smallest size", () => {
    expect(planIcoSizes(10, 8)).toEqual([16]);
  });

  it("rejects non-positive dimensions", () => {
    expect(() => planIcoSizes(0, 100)).toThrow();
    expect(() => planIcoSizes(-1, 100)).toThrow();
  });
});
