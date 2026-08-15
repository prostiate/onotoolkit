import { z } from "zod";
import type { BackgroundRemovalQuality, BackgroundRemovalQualityOption } from "~/types/tools";

export const backgroundRemovalQualitySchema = z.enum(["small", "medium"]);

/**
 * Bytes the browser fetches on a first run, measured against the
 * `@imgly/background-removal` 1.7.0 asset CDN (`resources.json`):
 *
 * - `/models/isnet_quint8` ....................  44,348,940
 * - `/models/isnet_fp16` ......................  88,152,708
 * - `/onnxruntime-web/ort-wasm-simd-threaded.*`  11,845,354 (wasm + loader mjs)
 *
 * The runtime is shared by both models, so the totals below are model + runtime.
 * Everything is cached by the browser afterwards, and the library defaults to
 * the CPU (wasm) backend, so the larger WebGPU "jsep" runtime is never fetched.
 */
const ONNX_RUNTIME_BYTES = 11_845_354;

export const backgroundRemovalQualityOptions: readonly BackgroundRemovalQualityOption[] = [
  {
    value: "small",
    label: "Standard",
    description:
      "Quantised model. Indistinguishable from High on most photos; edges can be slightly coarser on fine detail such as hair, fur or semi-transparent fabric.",
    model: "isnet_quint8",
    downloadBytes: 44_348_940 + ONNX_RUNTIME_BYTES
  },
  {
    value: "medium",
    label: "High detail",
    description:
      "Half-precision model. Cleaner edges on hair, fur and thin objects, at roughly double the one-time download and a slower run.",
    model: "isnet_fp16",
    downloadBytes: 88_152_708 + ONNX_RUNTIME_BYTES
  }
] as const;

/** Small by default: a ~100 MB silent download is a bad first impression. */
export const DEFAULT_BACKGROUND_REMOVAL_QUALITY: BackgroundRemovalQuality = "small";

export function backgroundRemovalQualityOption(
  quality: BackgroundRemovalQuality
): BackgroundRemovalQualityOption {
  return (
    backgroundRemovalQualityOptions.find((option) => option.value === quality) ??
    backgroundRemovalQualityOptions[0]!
  );
}

/** Parses a persisted preference, falling back to the default when unusable. */
export function parseBackgroundRemovalQuality(raw: unknown): BackgroundRemovalQuality {
  const parsed = backgroundRemovalQualitySchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_BACKGROUND_REMOVAL_QUALITY;
}
