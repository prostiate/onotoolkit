/** Corner of the recording canvas where the webcam picture-in-picture sits. */
export type WebcamCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Webcam overlay size relative to the canvas width. */
export type OverlaySize = "small" | "medium" | "large";

/** Shape mask applied to the webcam picture-in-picture. */
export type WebcamShape = "circle" | "rounded" | "square";

/** Recording resolution; "auto" uses the captured display's native size. */
export type RecorderResolution = "auto" | "1080p" | "720p";

/** Recording frame rate for the composited canvas. */
export type RecorderFrameRate = 30 | 60;

/**
 * What the user chose to record on the pre-flight screen. The mode is a
 * starting point, not a lock: a "screen" session can still add a webcam, and a
 * "camera" session can still add the screen while recording.
 */
export type RecorderMode = "screen" | "screen-camera" | "camera";

/**
 * A rectangle expressed as fractions (0..1) of the canvas width/height, so the
 * webcam overlay keeps its relative position/size regardless of resolution.
 */
export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Freehand/annotation tool used on the live overlay. */
export type AnnotationTool = "pen" | "highlighter" | "rect" | "arrow";

/**
 * A single annotation drawn over the composite. Points are normalized (0..1)
 * against the canvas. Pen/highlighter keep every sampled point; rect/arrow keep
 * exactly the start and end point.
 */
export interface AnnotationStroke {
  id: string;
  tool: AnnotationTool;
  color: string;
  /** Stroke width as a fraction of the canvas width, so it scales with output. */
  width: number;
  points: { x: number; y: number }[];
}

/** User preferences shown on the Zoom-style pre-recording screen. */
export interface RecorderSettings {
  /** What to capture; chosen on the "What do you want to record?" step. */
  recordMode: RecorderMode;
  /** Remembered default: start the session with the webcam on or off. */
  webcamOn: boolean;
  micOn: boolean;
  /** Capture the tab's audio via getDisplayMedia. */
  systemAudio: boolean;
  cameraDeviceId: string | null;
  micDeviceId: string | null;
  overlayCorner: WebcamCorner;
  overlaySize: OverlaySize;
  /** Shape mask for the webcam picture-in-picture. */
  overlayShape: WebcamShape;
  /** Freeform webcam overlay geometry (normalized). Used when a screen is present. */
  overlayRect: NormalizedRect;
  resolution: RecorderResolution;
  frameRate: RecorderFrameRate;
}

/** Lifecycle of the recording flow. */
export type RecorderStatus = "idle" | "recording" | "paused" | "done" | "error";

/** Final recording produced by a session. */
export interface RecorderResult {
  blob: Blob;
  url: string;
  fileName: string;
  mimeType: string;
  durationMs: number;
  /** Optional poster frame captured from the canvas at stop time. */
  posterUrl: string | null;
}

/** Media devices available to the pre-recording screen. */
export interface RecorderDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}

/** A recording persisted in the local IndexedDB library. */
export interface StoredRecording {
  id: string;
  name: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  size: number;
  createdAt: number;
  /** JPEG poster frame captured from the canvas, or null when unavailable. */
  thumbnail: Blob | null;
}

/** Live read-only accessors the engine polls each frame for overlay/annotations. */
export interface RecorderLiveState {
  /** Whether the webcam overlay should be composited. */
  overlayEnabled: () => boolean;
  /** Current webcam overlay geometry (normalized). */
  overlayRect: () => NormalizedRect;
  /** Current webcam shape mask. */
  overlayShape: () => WebcamShape;
  /** Current annotation strokes to burn into the output. */
  annotations: () => AnnotationStroke[];
}

/** Handle to an active recording engine session (owned by the store). */
export interface RecorderSession {
  /** Resolves once the recorder is encoding; rejects if setup failed. */
  ready: Promise<void>;
  /** Stops the session and resolves with the encoded recording. */
  stop(): Promise<Blob>;
  pause(): void;
  resume(): void;
  /** Shows/hides the webcam overlay in the composited output. */
  setOverlayEnabled(enabled: boolean): void;
  /** Swaps the webcam stream used for the overlay (e.g. acquired mid-recording). */
  setCameraStream(stream: MediaStream | null): void;
  /** Adds/removes the screen capture mid-session (camera-only → add screen). */
  setDisplayStream(stream: MediaStream | null): void;
  /** Reconnects the mixed audio inputs without replacing the recorded track. */
  setAudioSources(sources: { micStream: MediaStream | null; tabStream: MediaStream | null }): void;
  /** Grabs a poster frame (JPEG) from the current canvas, or null on failure. */
  capturePoster(): Promise<Blob | null>;
  /** Stops all tracks, timers, and the audio graph. Safe to call multiple times. */
  dispose(): void;
}

/** Options accepted by the engine when creating a session. */
export interface RecorderSessionOptions {
  canvas: HTMLCanvasElement;
  displayStream: MediaStream | null;
  cameraStream: MediaStream | null;
  micStream: MediaStream | null;
  tabStream: MediaStream | null;
  overlay: { enabled: boolean };
  live: RecorderLiveState;
  resolution: RecorderResolution;
  frameRate: RecorderFrameRate;
  /** Invoked when the user stops sharing the screen through the browser UI. */
  onScreenEnded: () => void;
}
