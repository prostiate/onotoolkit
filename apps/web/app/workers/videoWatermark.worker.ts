import { detectGeminiVideoWatermark, removeGeminiVideoWatermark } from "@ono-toolkit/gemini-video";
import { getAutomaticVideoPresetConfig } from "@ono-toolkit/gemini-video/presets";
import { resolveAllenkFdncnnRuntimeProfile } from "@ono-toolkit/gemini-video/profiles";
import { createAllenkFdncnnOnnxRuntime } from "@ono-toolkit/gemini-video/runtime";
import type { VideoWorkerRequest, VideoWorkerResponse } from "../types/videoWatermark";
import { videoProcessingError } from "../utils/videoWatermark";

const send = (message: VideoWorkerResponse): void => self.postMessage(message);
const yieldToMainThread = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

self.onmessage = async (event: MessageEvent<VideoWorkerRequest>): Promise<void> => {
  const { file, settings, origin } = event.data;
  try {
    const detected = await detectGeminiVideoWatermark(file, {
      sampleCount: 12,
      yieldToMainThread,
      onProgress: ({ progress }) =>
        send({ type: "progress", progress: { phase: "detecting", ratio: progress * 0.15 } })
    });
    if (!detected.detection.isConfident && !settings.allowLowConfidence) {
      throw new Error("Low confidence");
    }
    const preset = getAutomaticVideoPresetConfig(detected.detection, detected.metadata);
    const profile = resolveAllenkFdncnnRuntimeProfile(detected.detection.position);
    let runtime = null;
    if (preset.denoiseBackend === "allenk-fdncnn-browser-spike") {
      send({ type: "progress", progress: { phase: "loading-model", ratio: null } });
      const modelName = profile.modelUrl.split("/").pop();
      const response = await fetch(new URL(`/models/gemini-video/${modelName}`, origin));
      if (!response.ok) throw new Error("Model download failed");
      runtime = await createAllenkFdncnnOnnxRuntime({
        modelBytes: new Uint8Array(await response.arrayBuffer()),
        executionProvider: "wasm",
        numThreads: 1,
        wasmPaths: {
          mjs: new URL("/vendor/gemini-video/ort-wasm-simd-threaded.mjs", origin).href,
          wasm: new URL("/vendor/gemini-video/ort-wasm-simd-threaded.wasm", origin).href
        },
        inputName: "fdncnn_input",
        outputName: "fdncnn_output",
        inputShape: profile.inputShape,
        outputShape: profile.outputShape
      });
    }
    const result = await removeGeminiVideoWatermark(file, {
      ...preset,
      detection: detected,
      allowLowConfidence: settings.allowLowConfidence || preset.allowLowConfidence,
      videoBitrate: settings.bitrateMbps * 1_000_000,
      allenkFdncnnRuntime: runtime,
      allenkFdncnnSigma: detected.detection.template?.cleanup?.runtimeFdncnnSigma ?? 75,
      allenkFdncnnPadding:
        detected.detection.template?.cleanup?.allenkFdncnnPadding ?? profile.padding,
      allenkFdncnnTemporalReuse: { maxFrames: 2, threshold: 6.5 },
      preserveAudio: true,
      yieldToMainThread,
      onProgress: ({ progress, processedFrames, frameEstimate }) =>
        send({
          type: "progress",
          progress: {
            phase: "processing",
            ratio: 0.15 + progress * 0.85,
            processedFrames,
            frameEstimate
          }
        })
    });
    send({
      type: "done",
      blob: result.blob,
      summary: {
        metadata: result.metadata,
        processedFrames: result.processedFrames,
        skippedFrames: result.skippedFrames,
        confident: result.detection.isConfident,
        audioCopied: result.audioCopied,
        audioSkipReason: result.audioSkipReason
      }
    });
  } catch (error) {
    send({ type: "error", message: videoProcessingError(error) });
  }
};
