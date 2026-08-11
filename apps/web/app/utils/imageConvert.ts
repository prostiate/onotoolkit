import type { RgbaImage } from "~/utils/image";

/**
 * Pure, framework-agnostic helpers for the in-browser image converter.
 *
 * The ICO and BMP encoders write well-specified binary containers from plain
 * rasters, so they live here as pure functions and are fully unit-tested
 * without a DOM. Everything runs on the client; no bytes are ever uploaded.
 */

/** Formats the converter can write. */
export type ConvertFormat = "jpeg" | "png" | "webp" | "gif" | "bmp" | "ico" | "avif";

/** Static facts about each output format (MIME, extension, capabilities). */
export interface FormatInfo {
  /** Human label shown in the UI. */
  label: string;
  mime: string;
  /** Output file extension without a dot. */
  extension: string;
  /** Whether the quality slider affects the encoder (lossy formats). */
  lossy: boolean;
  /** Whether the format can store an alpha channel. */
  alpha: boolean;
}

export const FORMAT_INFO: Record<ConvertFormat, FormatInfo> = {
  jpeg: { label: "JPEG", mime: "image/jpeg", extension: "jpg", lossy: true, alpha: false },
  png: { label: "PNG", mime: "image/png", extension: "png", lossy: false, alpha: true },
  webp: { label: "WebP", mime: "image/webp", extension: "webp", lossy: true, alpha: true },
  gif: { label: "GIF", mime: "image/gif", extension: "gif", lossy: false, alpha: false },
  bmp: { label: "BMP", mime: "image/bmp", extension: "bmp", lossy: false, alpha: true },
  ico: { label: "ICO", mime: "image/x-icon", extension: "ico", lossy: false, alpha: true },
  avif: { label: "AVIF", mime: "image/avif", extension: "avif", lossy: true, alpha: true }
} as const;

/** All writeable formats, in UI display order. */
export const CONVERT_FORMATS: readonly ConvertFormat[] = [
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "ico",
  "avif"
];

/**
 * The standard multi-size favicon set. Sizes above 256 are not representable
 * in an ICO header (the size bytes are capped with 0 = 256).
 */
export const ICO_FAVICON_SIZES: readonly number[] = [16, 32, 48, 64, 128, 256];

/** Every source image format the converter accepts. */
export type SourceImageFormat = ConvertFormat | "other";

/**
 * Classifies an input file by MIME type, falling back to its extension.
 * Decoding itself is done by the browser (canvas), which reads all of these.
 */
export function detectSourceFormat(mimeType: string, fileName: string): SourceImageFormat {
  if (mimeType === "image/jpeg" || /\.jpe?g$/i.test(fileName)) return "jpeg";
  if (mimeType === "image/png" || /\.png$/i.test(fileName)) return "png";
  if (mimeType === "image/webp" || /\.webp$/i.test(fileName)) return "webp";
  if (mimeType === "image/gif" || /\.gif$/i.test(fileName)) return "gif";
  if (mimeType === "image/bmp" || mimeType === "image/x-ms-bmp" || /\.bmp$/i.test(fileName)) {
    return "bmp";
  }
  if (
    mimeType === "image/x-icon" ||
    mimeType === "image/vnd.microsoft.icon" ||
    /\.ico$/i.test(fileName)
  ) {
    return "ico";
  }
  if (
    mimeType === "image/avif" ||
    mimeType === "image/avif-sequence" ||
    /\.avif$/i.test(fileName)
  ) {
    return "avif";
  }
  return "other";
}

/**
 * True when a transparent image must be flattened onto the background colour
 * before encoding: formats that cannot store alpha (JPEG, GIF).
 */
export function needsFlatten(format: ConvertFormat, hasAlpha: boolean): boolean {
  return hasAlpha && !FORMAT_INFO[format].alpha;
}

/** User-chosen encoding options shared by the converter and the resizer. */
export interface EncodeSettings {
  format: ConvertFormat;
  /** 0-100; applies to lossy formats (JPEG / WebP / AVIF). */
  quality: number;
  /** Hex background colour used when flattening transparency (JPEG / GIF). */
  bgColor: string;
}

/** One PNG-embedded icon inside an ICO container. */
export interface IcoEntry {
  /** Icon dimension in pixels (1-256; 256 is stored as 0 in the header). */
  size: number;
  /** Raw PNG bytes at that size. */
  png: Uint8Array;
}

/**
 * Builds a Windows ICO file from PNG payloads (Vista+ style). Pure and
 * dependency-free: ICONDIR header + one ICONDIRENTRY per image, followed by
 * the PNG blobs. Returns the complete file as bytes.
 */
export function encodeIco(entries: IcoEntry[]): Uint8Array {
  if (entries.length === 0) throw new Error("encodeIco: at least one image is required.");
  if (entries.length > 255) throw new Error("encodeIco: at most 255 images are supported.");

  const count = entries.length;
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + count * entrySize;
  const total = dirSize + entries.reduce((sum, entry) => sum + entry.png.length, 0);

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, count, true); // image count

  let offset = dirSize;
  for (let i = 0; i < count; i += 1) {
    const entry = entries[i]!;
    if (entry.size <= 0 || entry.size > 256) {
      throw new Error(`encodeIco: size ${entry.size} is outside 1-256.`);
    }
    const at = headerSize + i * entrySize;
    const sizeByte = entry.size === 256 ? 0 : entry.size;
    out[at] = sizeByte; // width (0 = 256)
    out[at + 1] = sizeByte; // height (0 = 256)
    out[at + 2] = 0; // colour count
    out[at + 3] = 0; // reserved
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, entry.png.length, true); // bytes in resource
    view.setUint32(at + 12, offset, true); // offset to resource
    out.set(entry.png, offset);
    offset += entry.png.length;
  }
  return out;
}

/**
 * Encodes an RGBA raster as an uncompressed 32-bit (BGRA) BMP, using a
 * negative height so rows are written top-down (no flipping needed). Pure.
 */
export function encodeBmpRgba(image: RgbaImage): Uint8Array {
  const { width, height, data } = image;
  const pixelBytes = width * height * 4;
  const fileSize = 14 + 40 + pixelBytes;
  const out = new Uint8Array(fileSize);
  const view = new DataView(out.buffer);

  // BITMAPFILEHEADER (14 bytes)
  out[0] = 0x42; // "B"
  out[1] = 0x4d; // "M"
  view.setUint32(2, fileSize, true); // file size
  view.setUint32(6, 0, true); // reserved
  view.setUint32(10, 54, true); // pixel data offset

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative height: top-down rows
  view.setUint16(26, 1, true); // colour planes
  view.setUint16(28, 32, true); // bits per pixel
  view.setUint32(30, 0, true); // compression: BI_RGB (none)
  view.setUint32(34, pixelBytes, true); // image size
  view.setUint32(38, 0, true); // x pixels per metre
  view.setUint32(42, 0, true); // y pixels per metre
  view.setUint32(46, 0, true); // colours used
  view.setUint32(50, 0, true); // important colours

  // Pixels: BGRA (blue, green, red, alpha), top-down, 4 bytes aligned.
  for (let i = 0; i < data.length; i += 4) {
    const at = 54 + i;
    out[at] = data[i + 2]!; // B
    out[at + 1] = data[i + 1]!; // G
    out[at + 2] = data[i]!; // R
    out[at + 3] = data[i + 3]!; // A
  }
  return out;
}

/**
 * Picks the favicon sizes to embed in an ICO from a source raster: every
 * standard size that fits within the smaller side. If the source is smaller
 * than 16 px, a single 16 px entry is still produced (upscaled).
 */
export function planIcoSizes(sourceWidth: number, sourceHeight: number): number[] {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("planIcoSizes: source dimensions must be positive.");
  }
  const smallestSide = Math.min(sourceWidth, sourceHeight);
  const sizes = ICO_FAVICON_SIZES.filter((size) => size <= smallestSide);
  return sizes.length > 0 ? sizes : [ICO_FAVICON_SIZES[0]!];
}
