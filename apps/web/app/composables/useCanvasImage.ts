import type { RgbaImage } from "~/utils/image";

/**
 * Browser-only bridge between `Blob`/`ImageBitmap` and the plain {@link RgbaImage}
 * rasters used by the numeric image helpers. Every function here touches the DOM
 * (canvas / createImageBitmap) so it must only be called on the client.
 */
export function useCanvasImage() {
  function createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D context is unavailable in this browser.");
    return ctx;
  }

  /** Decodes any image source into an `ImageBitmap` (respects EXIF orientation). */
  async function loadBitmap(source: Blob): Promise<ImageBitmap> {
    return createImageBitmap(source, { imageOrientation: "from-image" });
  }

  /** Reads a bitmap (or the visible pixels of a canvas) into an {@link RgbaImage}. */
  function bitmapToRgba(bitmap: ImageBitmap): RgbaImage {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: imageData.width, height: imageData.height, data: imageData.data };
  }

  async function blobToRgba(blob: Blob): Promise<RgbaImage> {
    const bitmap = await loadBitmap(blob);
    try {
      return bitmapToRgba(bitmap);
    } finally {
      bitmap.close();
    }
  }

  /** Encodes an {@link RgbaImage} back into a PNG (lossless) or JPEG blob. */
  async function rgbaToBlob(
    image: RgbaImage,
    type: "image/png" | "image/jpeg" = "image/png",
    quality = 0.92
  ): Promise<Blob> {
    const canvas = createCanvas(image.width, image.height);
    const ctx = get2dContext(canvas);
    // Copy into an ArrayBuffer-backed view so the ImageData constructor accepts
    // it (a raster read from a canvas may be SharedArrayBuffer-backed).
    const pixels = new Uint8ClampedArray(image.data);
    ctx.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) throw new Error("Could not encode the image.");
    return blob;
  }

  return { loadBitmap, bitmapToRgba, blobToRgba, rgbaToBlob, createCanvas, get2dContext };
}
