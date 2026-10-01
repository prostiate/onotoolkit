import type { DenoiseRuntime } from "./runtime";
export interface VideoMetadata {
  width: number;
  height: number;
  firstTimestamp: number;
  duration: number | null;
  codec: string | null;
  frameRate: number;
  frameCountEstimate: number | null;
  averageBitrate: number | null;
}
export interface WatermarkPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  marginRight?: number;
  marginBottom?: number;
}
export interface VideoDetection {
  isConfident: boolean;
  watermarkKind?: string;
  position: WatermarkPosition;
  template?: { cleanup?: { runtimeFdncnnSigma?: number; allenkFdncnnPadding?: number } };
}
export interface DetectionResult {
  metadata: VideoMetadata;
  detection: VideoDetection;
}
export interface PipelineProgress {
  phase: "detect" | "process";
  progress: number;
  processedFrames?: number;
  frameEstimate?: number;
}
export interface VideoOptions {
  signal?: AbortSignal;
  sampleCount?: number;
  onProgress?: (progress: PipelineProgress) => void;
  yieldToMainThread?: () => Promise<void>;
  detection?: DetectionResult;
  allowLowConfidence?: boolean;
  videoBitrate?: number;
  alphaGain?: number;
  adaptiveAlpha?: boolean;
  highQualityCleanup?: boolean;
  denoiseBackend?: string;
  edgeDenoiseStrength?: number;
  residualCleanupStrength?: number;
  allenkFdncnnRuntime?: DenoiseRuntime | null;
  allenkFdncnnSigma?: number;
  allenkFdncnnPadding?: number;
  allenkFdncnnTemporalReuse?: { maxFrames: number; threshold: number };
  preserveAudio?: boolean;
}
export interface VideoRemovalResult extends DetectionResult {
  blob: Blob;
  processedFrames: number;
  skippedFrames: number;
  audioCopied: boolean;
  audioSkipReason: string | null;
}
export function inspectGeminiVideoFile(file: Blob): Promise<VideoMetadata>;
export function detectGeminiVideoWatermark(
  file: Blob,
  options?: VideoOptions
): Promise<DetectionResult>;
export function removeGeminiVideoWatermark(
  file: Blob,
  options?: VideoOptions
): Promise<VideoRemovalResult>;
