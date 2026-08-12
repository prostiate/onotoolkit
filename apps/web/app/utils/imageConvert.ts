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

/** The standard IJG luminance quantization table (quality 50, scale factor 100). */
const IJG_LUMA_QUANT = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113,
  92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99
];

/**
 * Inverts one quant-table entry back to a quality factor. Encoders scale the
 * standard table by S (5000/q for q<=50, 200-2q for q>50), so the scale is
 * recoverable per entry as S_i = 100*v/std and inverted back to q.
 */
function qualityFromQuantEntry(std: number, v: number): number {
  const scale = (100 * v) / std;
  return scale > 100 ? 5000 / scale : (200 - scale) / 2;
}

/** Reads the first usable quantization table from a DQT segment payload. */
function readQuantTable(bytes: Uint8Array, start: number, end: number): number[] | null {
  let offset = start;
  let first: number[] | null = null;
  while (offset < end) {
    const info = bytes[offset]!;
    offset += 1;
    if (offset >= end) return first;
    const precision = info >> 4;
    const tableId = info & 0x0f;
    const size = 64 * (precision === 1 ? 2 : 1);
    if (offset + size > end) return first;
    const table: number[] = [];
    for (let k = 0; k < 64; k += 1) {
      table.push(
        precision === 1
          ? (bytes[offset + k * 2]! << 8) | bytes[offset + k * 2 + 1]!
          : bytes[offset + k]!
      );
    }
    if (tableId === 0) return table;
    if (first === null) first = table;
    offset += size;
  }
  return first;
}

/**
 * Estimates the quality factor a JPEG was encoded with by scanning the DQT
 * segment for the luma quantization table and inverting the IJG scale-factor
 * mapping (5000/q for q<=50, 200-2q for q>50). Returns null when the bytes
 * are not a JPEG or carry no usable quantization table.
 */
export function estimateJpegQuality(bytes: Uint8Array): number | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    let marker = bytes[i + 1]!;
    // Skipped filler 0xFF bytes are allowed between markers.
    while (marker === 0xff && i + 2 < bytes.length) {
      i += 1;
      marker = bytes[i + 1]!;
    }
    // EOI or SOS without any DQT before it.
    if (marker === 0xd9 || marker === 0xda) return null;
    // Standalone markers carry no length field.
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (length < 2 || i + 2 + length > bytes.length) return null;
    if (marker === 0xdb) {
      const table = readQuantTable(bytes, i + 4, i + 2 + length);
      if (table === null) return null;
      let sum = 0;
      let count = 0;
      for (let k = 0; k < 64; k += 1) {
        const std = IJG_LUMA_QUANT[k]!;
        const v = table[k]!;
        if (v <= 0) continue;
        sum += qualityFromQuantEntry(std, v);
        count += 1;
      }
      if (count === 0) return null;
      return Math.min(100, Math.max(1, Math.round(sum / count)));
    }
    i += 2 + length;
  }
  return null;
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
