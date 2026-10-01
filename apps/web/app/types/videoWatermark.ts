import type { VideoMetadata } from "@ono-toolkit/gemini-video";
import type { VideoWatermarkSettings } from "~/schemas/videoWatermark";

export type VideoPhase = "detecting" | "loading-model" | "processing";
export interface VideoProgress {
  phase: VideoPhase;
  ratio: number | null;
  processedFrames?: number;
  frameEstimate?: number;
}
export interface VideoSummary {
  metadata: VideoMetadata;
  processedFrames: number;
  skippedFrames: number;
  confident: boolean;
  audioCopied: boolean;
  audioSkipReason: string | null;
}
export type VideoWorkerRequest = { file: File; settings: VideoWatermarkSettings; origin: string };
export type VideoWorkerResponse =
  | { type: "progress"; progress: VideoProgress }
  | { type: "done"; blob: Blob; summary: VideoSummary }
  | { type: "error"; message: string };
