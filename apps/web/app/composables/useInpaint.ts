import type { InferenceSession } from "onnxruntime-web";
import type { RgbaImage } from "~/utils/image";
import {
  brushOverlayToMaskUint8,
  chwUint8ToRgba,
  compositeMaskedRegion,
  rgbaToChwUint8
} from "~/utils/image";

/**
 * MI-GAN (Picsart, ICCV 2023) inpainting pipeline as ONNX, run entirely in the
 * browser via onnxruntime-web. The model expects a full-resolution uint8 RGB
 * image `[1,3,H,W]` and a uint8 mask `[1,1,H,W]` (255 = keep, 0 = inpaint) and
 * internally crops/resizes/blends, so unmasked areas are preserved. We then
 * additionally composite so only brushed pixels can ever change.
 *
 * Model: MIT-licensed, https://huggingface.co/andraniksargsyan/migan
 * Reference contract: lxfater/inpaint-web (GPL) - re-implemented here, not copied.
 */

// Must match the installed onnxruntime-web so the CDN wasm/js stay ABI-compatible.
// This exact build is the one @imgly/background-removal's README pins (its data
// CDN wasm is built against it), and unlike stable 1.21.0 it also ships correct
// TypeScript "exports" for its types.
const ORT_VERSION = "1.21.0-dev.20250206-d981b153d3";
const MODEL_URL =
  "https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx";
const MODEL_CACHE = "ono-toolkit-models";

export type InpaintPhase = "downloading-model" | "loading-model" | "processing";

export interface InpaintProgress {
  phase: InpaintPhase;
  /** 0..1 when known, otherwise undefined. */
  ratio?: number;
}

// Session is expensive (~28MB weights) - keep one per page lifetime.
let sessionPromise: Promise<InferenceSession> | null = null;

/**
 * Streams the model, reporting download progress, and caches it in the Cache
 * Storage API so subsequent visits skip the download entirely.
 */
async function fetchModel(onProgress?: (ratio: number | undefined) => void): Promise<ArrayBuffer> {
  const cache = "caches" in globalThis ? await caches.open(MODEL_CACHE) : null;
  const cached = cache ? await cache.match(MODEL_URL) : undefined;
  if (cached) {
    onProgress?.(1);
    return cached.arrayBuffer();
  }

  const response = await fetch(MODEL_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the model (HTTP ${response.status}).`);
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(total > 0 ? received / total : undefined);
    }
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  if (cache) {
    await cache.put(
      MODEL_URL,
      new Response(buffer, { headers: { "content-type": "application/octet-stream" } })
    );
  }
  return buffer.buffer;
}

export function useInpaint() {
  async function ensureSession(
    onProgress?: (progress: InpaintProgress) => void
  ): Promise<InferenceSession> {
    if (sessionPromise) return sessionPromise;

    sessionPromise = (async () => {
      if (import.meta.server) throw new Error("Inpainting is only available in the browser.");
      const ort = await import("onnxruntime-web");
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      ort.env.wasm.numThreads = 1;

      const modelBuffer = await fetchModel((ratio) =>
        onProgress?.({ phase: "downloading-model", ratio })
      );

      onProgress?.({ phase: "loading-model" });
      const useWebGpu = typeof navigator !== "undefined" && "gpu" in navigator;
      try {
        return await ort.InferenceSession.create(modelBuffer, {
          executionProviders: useWebGpu ? ["webgpu", "wasm"] : ["wasm"]
        });
      } catch {
        // WebGPU can fail to initialise on some drivers - fall back to WASM.
        return ort.InferenceSession.create(modelBuffer, { executionProviders: ["wasm"] });
      }
    })();

    try {
      return await sessionPromise;
    } catch (error) {
      sessionPromise = null; // allow a retry on the next attempt
      throw error;
    }
  }

  /**
   * Inpaints the pixels painted in `overlay` out of `image`. Returns a new
   * raster where only the brushed region differs from the original.
   */
  async function inpaint(
    image: RgbaImage,
    overlay: RgbaImage,
    onProgress?: (progress: InpaintProgress) => void
  ): Promise<RgbaImage> {
    if (image.width !== overlay.width || image.height !== overlay.height) {
      throw new Error("The brush layer and image dimensions must match.");
    }
    if (import.meta.server) throw new Error("Inpainting is only available in the browser.");
    const ort = await import("onnxruntime-web");
    const session = await ensureSession(onProgress);

    onProgress?.({ phase: "processing" });
    const { width, height } = image;
    const mask = brushOverlayToMaskUint8(overlay);

    const imageTensor = new ort.Tensor("uint8", rgbaToChwUint8(image), [1, 3, height, width]);
    const maskTensor = new ort.Tensor("uint8", mask, [1, 1, height, width]);

    const feeds: Record<string, InferenceSession.OnnxValueMapType[string]> = {
      [session.inputNames[0]!]: imageTensor,
      [session.inputNames[1]!]: maskTensor
    };

    const outputs = await session.run(feeds);
    const output = outputs[session.outputNames[0]!];
    if (!output) throw new Error("The model returned no output.");

    const chw = output.data as Uint8Array;
    const result = chwUint8ToRgba(chw, width, height);

    // Guarantee: every unpainted pixel stays byte-identical to the original.
    return compositeMaskedRegion(image, result, mask);
  }

  return { inpaint, ensureSession };
}
