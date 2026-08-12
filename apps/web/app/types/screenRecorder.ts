/** Corner of the recording canvas where the webcam picture-in-picture sits. */
export type WebcamCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Webcam overlay size relative to the canvas width. */
export type OverlaySize = "small" | "medium" | "large";

/** Recording resolution; "auto" uses the captured display's native size. */
export type RecorderResolution = "auto" | "1080p" | "720p";

/** Recording frame rate for the composited canvas. */
export type RecorderFrameRate = 30 | 60;

/** User preferences shown on the Zoom-style pre-recording screen. */
export interface RecorderSettings {
  /** Remembered default: start the session with the webcam on or off. */
  webcamOn: boolean;
  micOn: boolean;
  /** Capture the tab's audio via getDisplayMedia. */
  systemAudio: boolean;
  cameraDeviceId: string | null;
  micDeviceId: string | null;
  overlayCorner: WebcamCorner;
  overlaySize: OverlaySize;
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
}

/** Media devices available to the pre-recording screen. */
export interface RecorderDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
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
  /** Stops all tracks, timers, and the audio graph. Safe to call multiple times. */
  dispose(): void;
}

/** Options accepted by the engine when creating a session. */
export interface RecorderSessionOptions {
  canvas: HTMLCanvasElement;
  displayStream: MediaStream;
  cameraStream: MediaStream | null;
  micStream: MediaStream | null;
  tabStream: MediaStream | null;
  overlay: { enabled: boolean; corner: WebcamCorner; size: OverlaySize };
  resolution: RecorderResolution;
  frameRate: RecorderFrameRate;
  /** Invoked when the user stops sharing the screen through the browser UI. */
  onScreenEnded: () => void;
}
