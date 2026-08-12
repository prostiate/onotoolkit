import { z } from "zod";
import type { NormalizedRect, RecorderSettings } from "~/types/screenRecorder";

export const webcamCornerSchema = z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]);
export const overlaySizeSchema = z.enum(["small", "medium", "large"]);
export const webcamShapeSchema = z.enum(["circle", "rounded", "square"]);
export const recorderModeSchema = z.enum(["screen", "screen-camera", "camera"]);
export const recorderResolutionSchema = z.enum(["auto", "1080p", "720p"]);
export const recorderFrameRateSchema = z.union([z.literal(30), z.literal(60)]);

/** Default freeform webcam overlay: a medium tile tucked in the bottom-right. */
export function defaultOverlayRect(): NormalizedRect {
  return { x: 0.7, y: 0.68, width: 0.26, height: 0.28 };
}

export const normalizedRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.05).max(1),
  height: z.number().min(0.05).max(1)
});

/**
 * Every field carries a default so that settings persisted by an older build
 * (missing the newer keys) upgrade in place instead of resetting wholesale.
 */
export const recorderSettingsSchema = z.object({
  recordMode: recorderModeSchema.default("screen"),
  webcamOn: z.boolean().default(false),
  micOn: z.boolean().default(true),
  systemAudio: z.boolean().default(false),
  cameraDeviceId: z.string().nullable().default(null),
  micDeviceId: z.string().nullable().default(null),
  overlayCorner: webcamCornerSchema.default("bottom-right"),
  overlaySize: overlaySizeSchema.default("medium"),
  overlayShape: webcamShapeSchema.default("rounded"),
  overlayRect: normalizedRectSchema.default(defaultOverlayRect()),
  resolution: recorderResolutionSchema.default("auto"),
  frameRate: recorderFrameRateSchema.default(30)
});

/** Factory for fresh defaults; returns a new object so callers can mutate freely. */
export function defaultRecorderSettings(): RecorderSettings {
  return {
    recordMode: "screen",
    webcamOn: false,
    micOn: true,
    systemAudio: false,
    cameraDeviceId: null,
    micDeviceId: null,
    overlayCorner: "bottom-right",
    overlaySize: "medium",
    overlayShape: "rounded",
    overlayRect: defaultOverlayRect(),
    resolution: "auto",
    frameRate: 30
  };
}

/**
 * Parses persisted settings. Because each field has a default, partial or
 * legacy objects are upgraded field-by-field; only a completely invalid shape
 * (e.g. not an object) falls back to fresh defaults.
 */
export function parseRecorderSettings(raw: unknown): RecorderSettings {
  const parsed = recorderSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : defaultRecorderSettings();
}
