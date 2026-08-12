import { z } from "zod";
import type { RecorderSettings } from "~/types/screenRecorder";

export const webcamCornerSchema = z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]);
export const overlaySizeSchema = z.enum(["small", "medium", "large"]);
export const recorderResolutionSchema = z.enum(["auto", "1080p", "720p"]);
export const recorderFrameRateSchema = z.union([z.literal(30), z.literal(60)]);

export const recorderSettingsSchema = z.object({
  webcamOn: z.boolean(),
  micOn: z.boolean(),
  systemAudio: z.boolean(),
  cameraDeviceId: z.string().nullable(),
  micDeviceId: z.string().nullable(),
  overlayCorner: webcamCornerSchema,
  overlaySize: overlaySizeSchema,
  resolution: recorderResolutionSchema,
  frameRate: recorderFrameRateSchema
});

/** Factory for fresh defaults; returns a new object so callers can mutate freely. */
export function defaultRecorderSettings(): RecorderSettings {
  return {
    webcamOn: false,
    micOn: true,
    systemAudio: false,
    cameraDeviceId: null,
    micDeviceId: null,
    overlayCorner: "bottom-right",
    overlaySize: "medium",
    resolution: "auto",
    frameRate: 30
  };
}

/**
 * Parses persisted settings, falling back to defaults when the stored value is
 * missing or no longer matches the schema (e.g. after a schema change).
 */
export function parseRecorderSettings(raw: unknown): RecorderSettings {
  const parsed = recorderSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultRecorderSettings();
}
