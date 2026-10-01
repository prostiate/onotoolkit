import type { VideoDetection, VideoMetadata, VideoOptions } from "./index";
export interface VideoPreset extends VideoOptions {
  id: string;
  videoBitrateMbps: number | string;
}
export function getAutomaticVideoPresetConfig(
  detection?: VideoDetection | null,
  metadata?: VideoMetadata | null
): VideoPreset;
