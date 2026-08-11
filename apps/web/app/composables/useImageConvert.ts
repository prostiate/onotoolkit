import {
  CONVERT_FORMATS,
  FORMAT_INFO,
  encodeBmpRgba,
  encodeIco,
  needsFlatten,
  planIcoSizes,
  type ConvertFormat,
  type EncodeSettings,
  type IcoEntry
} from "~/utils/imageConvert";
import {
  clampTargetKb,
  planTargetDimensions,
  RESIZE_MIN_DIMENSION,
  type ResizeSettings,
  type TargetDimensions
} from "~/utils/imageResize";
import { flattenOntoColor, hexToRgb, imageHasAlpha, type RgbaImage } from "~/utils/image";

export interface ConvertOutcome {
  blob: Blob;
  /** Output file extension without a dot. */
  extension: string;
}

export interface ResizeOutcome extends ConvertOutcome {
  width: number;
  height: number;
}

/** Geometry + encoding options for a single resize job. */
export type ResizeJobSettings = ResizeSettings & EncodeSettings;

/** Bounded searches keep "target file size" fast and predictable. */
const TARGET_QUALITY_ITERATIONS = 6;
const TARGET_SCALE_STEPS = 5;

/**
 * Browser-only image conversion engine shared by the Image Converter and the
 * Image Resizer. Inputs are decoded to RGBA via a canvas (which reads JPG,
 * PNG, WebP, GIF, BMP, ICO and AVIF); outputs are encoded with the jSquash
 * codecs (MozJPEG / oxipng / WebP), the browser's native AVIF encoder, the
 * tiny bundled ICO/BMP encoders, or gifenc for static GIF. Codecs are lazily
 * imported so their WASM stays out of the SSR bundle. Nothing is uploaded.
 */
export function useImageConvert() {
  const { blobToRgba, toImageData, createCanvas, get2dContext } = useCanvasImage();

  /** Scales an RGBA raster to new dimensions with high-quality smoothing. */
  async function resizeRgba(image: RgbaImage, width: number, height: number): Promise<RgbaImage> {
    const source = createCanvas(image.width, image.height);
    get2dContext(source).putImageData(toImageData(image), 0, 0);

    const target = createCanvas(width, height);
    const ctx = get2dContext(target);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, image.width, image.height, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    return { width, height, data: imageData.data };
  }

  /** Lossless PNG encode (oxipng, level 2 balances speed and size). */
  async function encodePng(image: RgbaImage): Promise<Uint8Array> {
    const { optimise } = await import("@jsquash/oxipng");
    const buffer = await optimise(toImageData(image), { level: 2 });
    return new Uint8Array(buffer);
  }

  /** Lossy AVIF via the browser's native encoder (Chrome/Edge). */
  async function encodeAvifCanvas(image: RgbaImage, quality: number): Promise<Uint8Array> {
    const canvas = createCanvas(image.width, image.height);
    get2dContext(canvas).putImageData(toImageData(image), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/avif", quality / 100)
    );
    if (!blob) throw new Error("This browser cannot encode AVIF.");
    return new Uint8Array(await blob.arrayBuffer());
  }

  /** Encodes one RGBA raster into a concrete output format. ICO is separate. */
  async function encodeRgba(
    image: RgbaImage,
    format: ConvertFormat,
    quality: number
  ): Promise<Uint8Array> {
    switch (format) {
      case "jpeg": {
        const { encode: encodeJpeg } = await import("@jsquash/jpeg");
        return new Uint8Array(await encodeJpeg(toImageData(image), { quality }));
      }
      case "png":
        return encodePng(image);
      case "webp": {
        const { encode: encodeWebp } = await import("@jsquash/webp");
        return new Uint8Array(await encodeWebp(toImageData(image), { quality }));
      }
      case "gif": {
        const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
        const gif = GIFEncoder();
        const palette = quantize(image.data, 256);
        const index = applyPalette(image.data, palette, "floyd-steinberg");
        gif.writeFrame(index, image.width, image.height, { palette, delay: 0 });
        gif.finish();
        return gif.bytes();
      }
      case "bmp":
        return encodeBmpRgba(image);
      case "avif":
        return new Uint8Array(await encodeAvifCanvas(image, quality));
      case "ico":
        throw new Error("ICO must be encoded via encodeIcoRaster (multi-size).");
    }
  }

  /** Encodes a raster into a multi-size ICO (each size as lossless PNG). */
  async function encodeIcoRaster(image: RgbaImage): Promise<Uint8Array> {
    const sizes = planIcoSizes(image.width, image.height);
    const entries: IcoEntry[] = [];
    for (const size of sizes) {
      const raster =
        size === image.width && size === image.height ? image : await resizeRgba(image, size, size);
      entries.push({ size, png: await encodePng(raster) });
    }
    return encodeIco(entries);
  }

  /**
   * Detects whether the browser can encode AVIF via canvas.toBlob. Used to
   * enable/disable the AVIF output option (Chrome/Edge support it; Safari and
   * Firefox do not).
   */
  async function canEncodeAvif(): Promise<boolean> {
    if (import.meta.server) return false;
    try {
      const canvas = createCanvas(2, 2);
      get2dContext(canvas).fillRect(0, 0, 2, 2);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/avif", 0.5)
      );
      return blob?.type === "image/avif";
    } catch {
      return false;
    }
  }

  /** Converts one file to the requested format, entirely in the browser. */
  async function convertFile(file: File, settings: EncodeSettings): Promise<ConvertOutcome> {
    if (import.meta.server) throw new Error("Image conversion is only available in the browser.");
    const rgba = await blobToRgba(file);
    const source = needsFlatten(settings.format, imageHasAlpha(rgba))
      ? flattenOntoColor(rgba, hexToRgb(settings.bgColor))
      : rgba;
    const bytes =
      settings.format === "ico"
        ? await encodeIcoRaster(source)
        : await encodeRgba(source, settings.format, settings.quality);
    const info = FORMAT_INFO[settings.format];
    return {
      blob: new Blob([new Uint8Array(bytes)], { type: info.mime }),
      extension: info.extension
    };
  }

  /** Binary-search quality for the largest value that still fits the budget. */
  async function searchQuality(
    image: RgbaImage,
    format: ConvertFormat,
    targetBytes: number,
    startQuality: number
  ): Promise<{ bytes: Uint8Array; quality: number }> {
    let low = 1;
    let high = 100;
    let guess = Math.min(100, Math.max(1, Math.round(startQuality)));
    let best: { bytes: Uint8Array; quality: number } | null = null;
    let last: { bytes: Uint8Array; quality: number } | null = null;

    for (let i = 0; i < TARGET_QUALITY_ITERATIONS; i += 1) {
      const bytes = await encodeRgba(image, format, guess);
      last = { bytes, quality: guess };
      if (bytes.byteLength <= targetBytes) {
        best = last;
        low = guess + 1;
      } else {
        high = guess - 1;
      }
      if (low > high) break;
      guess = Math.round((low + high) / 2);
    }
    // Falls back to the smallest attempt when the budget is unreachable.
    return best ?? last!;
  }

  /**
   * Drives an image under a target file size. Lossy formats trade quality
   * (binary search), and scale down only when even quality 1 overshoots.
   * Lossless formats trade scale (their encoders have no quality knob).
   */
  async function fitToTargetSize(
    image: RgbaImage,
    targetBytes: number,
    format: ConvertFormat,
    startQuality: number
  ): Promise<{ bytes: Uint8Array; width: number; height: number; quality: number }> {
    const lossy = FORMAT_INFO[format].lossy;
    let best: { bytes: Uint8Array; width: number; height: number; quality: number } | null = null;

    if (lossy) {
      let scale = 1;
      for (let step = 0; step < TARGET_SCALE_STEPS; step += 1) {
        const dims: TargetDimensions =
          scale === 1
            ? { width: image.width, height: image.height }
            : {
                width: Math.max(RESIZE_MIN_DIMENSION, Math.round(image.width * scale)),
                height: Math.max(RESIZE_MIN_DIMENSION, Math.round(image.height * scale))
              };
        const raster =
          dims.width === image.width ? image : await resizeRgba(image, dims.width, dims.height);
        const { bytes, quality } = await searchQuality(raster, format, targetBytes, startQuality);
        const outcome = { bytes, width: dims.width, height: dims.height, quality };
        if (bytes.byteLength <= targetBytes) return outcome;
        best = outcome;
        if (dims.width <= 16 || dims.height <= 16) break;
        scale *= 0.8;
      }
    } else {
      let low = 0.0625;
      let high = 1;
      for (let step = 0; step < TARGET_SCALE_STEPS + 3; step += 1) {
        const scale = step === 0 ? 1 : (low + high) / 2;
        const dims: TargetDimensions = {
          width: Math.max(RESIZE_MIN_DIMENSION, Math.round(image.width * scale)),
          height: Math.max(RESIZE_MIN_DIMENSION, Math.round(image.height * scale))
        };
        const raster =
          dims.width === image.width ? image : await resizeRgba(image, dims.width, dims.height);
        const bytes = await encodeRgba(raster, format, startQuality);
        const outcome = { bytes, width: dims.width, height: dims.height, quality: startQuality };
        if (bytes.byteLength <= targetBytes) {
          best = outcome;
          low = scale;
        } else {
          high = scale;
        }
      }
    }

    if (!best) throw new Error("Could not shrink the image far enough to reach the target size.");
    return best;
  }

  /** Resizes one file by percentage, exact dimensions, or a target size. */
  async function resizeFile(file: File, settings: ResizeJobSettings): Promise<ResizeOutcome> {
    if (import.meta.server) throw new Error("Image resizing is only available in the browser.");
    const rgba = await blobToRgba(file);

    if (settings.mode === "size") {
      const targetBytes = clampTargetKb(settings.targetKb) * 1024;
      const source = needsFlatten(settings.format, imageHasAlpha(rgba))
        ? flattenOntoColor(rgba, hexToRgb(settings.bgColor))
        : rgba;
      const { bytes, width, height } = await fitToTargetSize(
        source,
        targetBytes,
        settings.format,
        settings.quality
      );
      const info = FORMAT_INFO[settings.format];
      return {
        blob: new Blob([new Uint8Array(bytes)], { type: info.mime }),
        extension: info.extension,
        width,
        height
      };
    }

    const dims = planTargetDimensions(rgba.width, rgba.height, settings);
    const raster =
      dims.width === rgba.width && dims.height === rgba.height
        ? rgba
        : await resizeRgba(rgba, dims.width, dims.height);
    const source = needsFlatten(settings.format, imageHasAlpha(raster))
      ? flattenOntoColor(raster, hexToRgb(settings.bgColor))
      : raster;
    const bytes =
      settings.format === "ico"
        ? await encodeIcoRaster(source)
        : await encodeRgba(source, settings.format, settings.quality);
    const info = FORMAT_INFO[settings.format];
    return {
      blob: new Blob([new Uint8Array(bytes)], { type: info.mime }),
      extension: info.extension,
      width: dims.width,
      height: dims.height
    };
  }

  return { convertFile, resizeFile, resizeRgba, canEncodeAvif, encodeIcoRaster, CONVERT_FORMATS };
}
