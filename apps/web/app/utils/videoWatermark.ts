// Upstream FDnCNN weights (largest fixed shape), plus the independently pinned
// ONNX Runtime Web 1.26.0 CPU module and WASM. Bundled worker code is additional.
export const VIDEO_MODEL_MAX_BYTES = 2_679_707;
export const VIDEO_RUNTIME_BYTES = 13_022_405 + 24_180;
export const VIDEO_DOWNLOAD_BYTES = VIDEO_MODEL_MAX_BYTES + VIDEO_RUNTIME_BYTES;

export function videoCapabilityError(): string | null {
  if (!globalThis.isSecureContext)
    return "Open this tool over HTTPS or localhost to process videos.";
  if (
    typeof Worker === "undefined" ||
    typeof OffscreenCanvas === "undefined" ||
    typeof VideoDecoder === "undefined" ||
    typeof VideoEncoder === "undefined"
  ) {
    return "Video processing needs a recent desktop Chrome or Edge with WebCodecs support.";
  }
  return null;
}

export function videoProcessingError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/置信|confidence/i.test(message))
    return "No supported watermark was detected confidently. Check that this is an original Gemini or Veo clip. You can enable best-effort removal in export settings.";
  if (/编码|AVC|H\.264|encoder/i.test(message))
    return "This browser cannot encode H.264 video. Use desktop Chrome or Edge with H.264 support.";
  if (/视频轨|检测帧|decode|codec|format|track/i.test(message))
    return "This video could not be decoded. Choose a playable MP4, WebM or MOV clip in desktop Chrome or Edge.";
  if (/fetch|download|加载|network/i.test(message))
    return "The processing model could not be loaded. Check your connection and try again.";
  return "Video processing could not finish. Try a shorter supported Gemini or Veo clip in desktop Chrome or Edge.";
}
