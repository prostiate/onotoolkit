import type { BackgroundRemovalQuality } from "~/types/tools";
import type { RgbColor, RgbaImage } from "~/utils/image";
import {
  DEFAULT_BACKGROUND_REMOVAL_QUALITY,
  backgroundRemovalQualityOption
} from "~/schemas/backgroundRemover";
import { flattenOntoColor } from "~/utils/image";

/** Coarse progress phase surfaced to the UI while a run is in flight. */
export type BackgroundRemovalPhase = "downloading-model" | "processing";

export interface BackgroundRemovalProgress {
  phase: BackgroundRemovalPhase;
  /** 0..1 when known, otherwise undefined (indeterminate). */
  ratio?: number;
}

export interface BackgroundRemovalResult {
  /** Transparent PNG cutout (foreground only). */
  cutout: RgbaImage;
  width: number;
  height: number;
}

/**
 * Wraps `@imgly/background-removal` (AGPL, same as this repo). The library and
 * its ONNX weights are imported lazily on first use so they never enter the SSR
 * bundle, and are cached by the browser after the first download. The image
 * itself is processed entirely on-device - nothing is uploaded.
 *
 * The model is chosen explicitly rather than left to the library, whose own
 * default is "medium" (`isnet_fp16`, 88 MB). We pass the user's preference,
 * which defaults to "small" (`isnet_quint8`, 44 MB); with the shared ~11.8 MB
 * ONNX runtime wasm on top, that is a ~56 MB first run instead of ~100 MB.
 * `~/schemas/backgroundRemover` holds the exact per-quality byte counts the UI
 * shows before the download starts.
 */
export function useBackgroundRemoval() {
  const { blobToRgba, rgbaToBlob } = useCanvasImage();

  /** Removes the background, returning a transparent RGBA cutout. */
  async function removeBackground(
    file: File | Blob,
    onProgress?: (progress: BackgroundRemovalProgress) => void,
    quality: BackgroundRemovalQuality = DEFAULT_BACKGROUND_REMOVAL_QUALITY
  ): Promise<BackgroundRemovalResult> {
    if (import.meta.server) {
      throw new Error("Background removal is only available in the browser.");
    }
    const { removeBackground: imglyRemoveBackground } = await import("@imgly/background-removal");

    const blob = await imglyRemoveBackground(file, {
      model: backgroundRemovalQualityOption(quality).model,
      output: { format: "image/png" },
      progress: (key: string, current: number, total: number) => {
        const ratio = total > 0 ? current / total : undefined;
        // `key` looks like "fetch:/models/..." while assets download, then
        // "compute:inference" during the actual matting pass.
        onProgress?.({
          phase: key.startsWith("fetch") ? "downloading-model" : "processing",
          ratio
        });
      }
    });

    const cutout = await blobToRgba(blob);
    return { cutout, width: cutout.width, height: cutout.height };
  }

  /**
   * Composites a transparent cutout onto a solid colour (lossless PNG). Runs on
   * a canvas and never re-invokes the model, so switching colours is instant.
   */
  async function toColorBackground(cutout: RgbaImage, color: RgbColor): Promise<Blob> {
    return rgbaToBlob(flattenOntoColor(cutout, color), "image/png");
  }

  /** Encodes the transparent cutout as a lossless PNG for download. */
  async function toTransparentPng(cutout: RgbaImage): Promise<Blob> {
    return rgbaToBlob(cutout, "image/png");
  }

  return { removeBackground, toColorBackground, toTransparentPng };
}
