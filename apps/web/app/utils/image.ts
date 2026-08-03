/**
 * Pure, framework-agnostic image helpers shared by the in-browser image tools
 * (background remover, watermark remover). Everything here runs on the client;
 * no bytes are ever uploaded.
 *
 * The canvas-dependent helpers accept the pixel buffers they need (rather than a
 * canvas) so the numeric core stays testable under happy-dom.
 */

/** A plain, serialisable RGBA raster. Mirrors the browser `ImageData` shape. */
export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA, row-major, 4 bytes per pixel. Length must be width * height * 4. */
  data: Uint8ClampedArray;
}

/** Named CSS-ish colour used for background replacement. */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** Parses a `#rgb` / `#rrggbb` hex string into 0-255 channels. */
export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Invalid hex colour: "${hex}"`);
  }
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16)
  };
}

/**
 * Flattens a (possibly transparent) RGBA raster over a solid background colour,
 * returning a fully opaque RGBA raster. Used to turn a transparent cutout into
 * a solid-colour background without touching the foreground pixels.
 */
export function flattenOntoColor(image: RgbaImage, color: RgbColor): RgbaImage {
  const { width, height, data } = image;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]! / 255;
    const inv = 1 - alpha;
    out[i] = Math.round(data[i]! * alpha + color.r * inv);
    out[i + 1] = Math.round(data[i + 1]! * alpha + color.g * inv);
    out[i + 2] = Math.round(data[i + 2]! * alpha + color.b * inv);
    out[i + 3] = 255;
  }
  return { width, height, data: out };
}

/**
 * Converts an interleaved RGBA raster into planar CHW `uint8` with 3 channels
 * (R, G, B), dropping alpha. This is the layout MI-GAN's ONNX pipeline expects
 * for its image input tensor.
 */
export function rgbaToChwUint8(image: RgbaImage): Uint8Array {
  const { width, height, data } = image;
  const plane = width * height;
  const out = new Uint8Array(plane * 3);
  for (let p = 0; p < plane; p += 1) {
    const src = p * 4;
    out[p] = data[src]!; // R plane
    out[plane + p] = data[src + 1]!; // G plane
    out[2 * plane + p] = data[src + 2]!; // B plane
  }
  return out;
}

/**
 * Builds MI-GAN's single-channel mask tensor from an RGBA brush overlay.
 *
 * MI-GAN convention: 255 = keep (known), 0 = inpaint (hole). A pixel is treated
 * as "painted" (to be removed) when the overlay alpha is above `alphaThreshold`.
 * Painted pixels therefore become 0; everything else stays 255.
 */
export function brushOverlayToMaskUint8(overlay: RgbaImage, alphaThreshold = 10): Uint8Array {
  const { width, height, data } = overlay;
  const plane = width * height;
  const out = new Uint8Array(plane);
  for (let p = 0; p < plane; p += 1) {
    const painted = data[p * 4 + 3]! > alphaThreshold;
    out[p] = painted ? 0 : 255;
  }
  return out;
}

/**
 * Converts the model's planar CHW `uint8` RGB output back into an interleaved,
 * fully-opaque RGBA raster at the given dimensions.
 */
export function chwUint8ToRgba(chw: Uint8Array, width: number, height: number): RgbaImage {
  const plane = width * height;
  const out = new Uint8ClampedArray(plane * 4);
  for (let p = 0; p < plane; p += 1) {
    const dst = p * 4;
    out[dst] = chw[p]!;
    out[dst + 1] = chw[plane + p]!;
    out[dst + 2] = chw[2 * plane + p]!;
    out[dst + 3] = 255;
  }
  return { width, height, data: out };
}

/**
 * Returns `result` but with every pixel that was NOT painted in the mask taken
 * verbatim from `original`. This guarantees the inpainting model can only ever
 * change the brushed region - the rest of the image stays byte-identical, which
 * is what "remove the watermark without degrading quality" actually requires.
 *
 * `mask` is MI-GAN-style (0 = painted/inpaint, 255 = keep).
 */
export function compositeMaskedRegion(
  original: RgbaImage,
  result: RgbaImage,
  mask: Uint8Array
): RgbaImage {
  if (
    original.width !== result.width ||
    original.height !== result.height ||
    mask.length !== original.width * original.height
  ) {
    throw new Error("compositeMaskedRegion: original, result and mask sizes must match.");
  }
  const { width, height } = original;
  const out = new Uint8ClampedArray(original.data.length);
  out.set(original.data);
  for (let p = 0; p < mask.length; p += 1) {
    if (mask[p] === 0) {
      const dst = p * 4;
      out[dst] = result.data[dst]!;
      out[dst + 1] = result.data[dst + 1]!;
      out[dst + 2] = result.data[dst + 2]!;
      out[dst + 3] = result.data[dst + 3]!;
    }
  }
  return { width, height, data: out };
}

/** True when the brush overlay has at least one painted pixel. */
export function hasPaintedPixels(overlay: RgbaImage, alphaThreshold = 10): boolean {
  const { data } = overlay;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! > alphaThreshold) return true;
  }
  return false;
}
