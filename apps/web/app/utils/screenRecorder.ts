import type { OverlaySize, WebcamCorner } from "~/types/screenRecorder";

/** Preferred MediaRecorder MIME types, best quality first (probed per browser). */
export const RECORDER_MIME_CANDIDATES: readonly { mimeType: string; extension: "mp4" | "webm" }[] =
  [
    { mimeType: "video/mp4;codecs=avc1,mp4a", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" }
  ];

/** Overlay width as a fraction of the canvas width, by size preset. */
export const OVERLAY_SIZE_FACTORS: Record<OverlaySize, number> = {
  small: 0.15,
  medium: 0.22,
  large: 0.3
};

/** Padding between the overlay and the canvas edge, in CSS pixels. */
export const OVERLAY_MARGIN = 16;

/** Video bitrate used for the recorder, tuned to the chosen resolution. */
export function recorderBitrate(resolution: string): number {
  if (resolution === "1080p") return 8_000_000;
  if (resolution === "720p") return 5_000_000;
  return 6_000_000;
}

/**
 * Picks the first supported MIME type (and its file extension) for this
 * browser. Returns null when the MediaRecorder API is unavailable entirely.
 */
export function pickRecorderMimeType(
  isSupported: (mimeType: string) => boolean
): { mimeType: string; extension: "mp4" | "webm" } | null {
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    if (isSupported(candidate.mimeType)) return candidate;
  }
  return null;
}

/** Builds a collision-free, time-ordered file name for a recording. */
export function recordingFileName(date: Date, extension: string): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const datePart = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
  const timePart = [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("");
  return `screen-recording-${datePart}-${timePart}.${extension}`;
}

/** Rectangle for the webcam overlay within the composited canvas. */
export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the overlay rectangle for a corner + size, keeping the camera's
 * aspect ratio and clamping so the overlay never leaves the canvas.
 */
export function computeOverlayRect(
  canvasWidth: number,
  canvasHeight: number,
  cameraAspect: number,
  corner: WebcamCorner,
  size: OverlaySize
): OverlayRect {
  const safeAspect = Number.isFinite(cameraAspect) && cameraAspect > 0 ? cameraAspect : 16 / 9;
  const width = Math.round(canvasWidth * OVERLAY_SIZE_FACTORS[size]);
  const height = Math.round(Math.min(width / safeAspect, canvasHeight * 0.5));
  const margin = Math.min(OVERLAY_MARGIN, Math.round(canvasWidth * 0.02));
  const x = corner.endsWith("left") ? margin : canvasWidth - width - margin;
  const y = corner.startsWith("top") ? margin : canvasHeight - height - margin;
  return { x, y, width, height };
}

/** Human-friendly label for a media device, with a sensible fallback. */
export function formatDeviceLabel(device: MediaDeviceInfo, kind: "camera" | "microphone"): string {
  const label = device.label.trim();
  if (label) return label;
  return kind === "camera" ? "Default camera" : "Default microphone";
}

/** Formats an elapsed time in milliseconds as m:ss or h:mm:ss. */
export function formatRecordingDuration(elapsedMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** Tells whether the browser has the APIs a recording session needs. */
export function isScreenRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}
