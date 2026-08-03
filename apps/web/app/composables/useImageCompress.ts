import {
  decideOutput,
  detectImageFormat,
  flattenOntoColor,
  formatExtension,
  formatMimeType,
  hexToRgb,
  imageHasAlpha,
  type CompressSettings,
  type ImageFormat
} from "~/utils/image";

export interface CompressOutcome {
  blob: Blob;
  format: ImageFormat;
  /** Output file extension without a dot, e.g. "jpg". */
  extension: string;
}

/**
 * Compresses a single image entirely in the browser using the jSquash codecs
 * (MozJPEG / WebP / oxipng), which are lazily imported so their WASM stays out
 * of the SSR bundle. Inputs are decoded to RGBA via a canvas (uniform across
 * JPEG/PNG/WebP); jSquash is only used for encoding. Nothing is uploaded.
 *
 * Codecs: jSquash (MIT), derived from Google's Squoosh.
 */
export function useImageCompress() {
  const { blobToRgba, toImageData } = useCanvasImage();

  async function encode(
    imageData: ImageData,
    format: ImageFormat,
    quality: number
  ): Promise<ArrayBuffer> {
    if (format === "jpeg") {
      const { encode: encodeJpeg } = await import("@jsquash/jpeg");
      return encodeJpeg(imageData, { quality });
    }
    if (format === "webp") {
      const { encode: encodeWebp } = await import("@jsquash/webp");
      return encodeWebp(imageData, { quality });
    }
    // Lossless PNG via oxipng (keeps transparency). Level 2 balances speed/size.
    const { optimise } = await import("@jsquash/oxipng");
    return optimise(imageData, { level: 2 });
  }

  async function compress(file: File, settings: CompressSettings): Promise<CompressOutcome> {
    const rgba = await blobToRgba(file);
    const input = detectImageFormat(file.type, file.name);
    // JPEG never carries alpha; skip the (cheap but pointless) scan.
    const hasAlpha = input === "jpeg" ? false : imageHasAlpha(rgba);
    const plan = decideOutput(input, hasAlpha, settings);

    const source = plan.flatten ? flattenOntoColor(rgba, hexToRgb(settings.flattenColor)) : rgba;
    const buffer = await encode(toImageData(source), plan.format, settings.quality);

    return {
      blob: new Blob([buffer], { type: formatMimeType(plan.format) }),
      format: plan.format,
      extension: formatExtension(plan.format)
    };
  }

  return { compress };
}
