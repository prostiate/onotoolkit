import { defineStore } from "pinia";
import type {
  OverlaySize,
  RecorderDevices,
  RecorderFrameRate,
  RecorderResolution,
  RecorderResult,
  RecorderSession,
  RecorderStatus,
  WebcamCorner
} from "~/types/screenRecorder";
import { defaultRecorderSettings, parseRecorderSettings } from "~/schemas/screenRecorder";
import { isScreenRecordingSupported, recordingFileName } from "~/utils/screenRecorder";

const STORAGE_KEY = "ono-toolkit-screen-recorder-settings";
const ELAPSED_TICK_MS = 250;

function extensionFromMime(mimeType: string): "mp4" | "webm" {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

function mediaDevices(): MediaDevices | null {
  return typeof navigator !== "undefined" ? navigator.mediaDevices : null;
}

export const useScreenRecorderStore = defineStore("screenRecorder", {
  state: () => ({
    settings: defaultRecorderSettings(),
    status: "idle" as RecorderStatus,
    devices: { cameras: [], microphones: [] } as RecorderDevices,
    cameraStream: null as MediaStream | null,
    micStream: null as MediaStream | null,
    session: null as RecorderSession | null,
    canvasEl: null as HTMLCanvasElement | null,
    overlayVisible: false,
    elapsedMs: 0,
    result: null as RecorderResult | null,
    errorMessage: null as string | null,
    startedAtMs: 0,
    pausedAccumMs: 0,
    pauseStartedAtMs: null as number | null,
    timerHandle: null as ReturnType<typeof setInterval> | null
  }),
  getters: {
    isRecording: (state): boolean => state.status === "recording",
    isPaused: (state): boolean => state.status === "paused",
    hasSession: (state): boolean => state.status === "recording" || state.status === "paused"
  },
  actions: {
    fail(error: unknown): void {
      this.status = "error";
      this.errorMessage = error instanceof Error ? error.message : "Something went wrong.";
    },

    /** Restores persisted preferences (client-only; safe to call in onMounted). */
    hydrate(): void {
      if (typeof localStorage === "undefined") return;
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch {
        /* storage may throw (private mode); defaults stay */
      }
      if (stored) this.settings = parseRecorderSettings(JSON.parse(stored));
    },

    /**
     * Hydrates the remembered preferences and resumes the webcam when the
     * stored default has it on (Zoom-lobby behaviour), then refreshes the
     * device list. Call once from the page's onMounted.
     */
    async restoreSession(): Promise<void> {
      this.hydrate();
      if (this.settings.webcamOn && !this.cameraStream) {
        try {
          await this.acquireCameraStream();
        } catch {
          this.settings.webcamOn = false;
          this.persist();
        }
      }
      await this.loadDevices();
    },

    persist(): void {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        /* storage may be unavailable (private mode); preferences just won't stick */
      }
    },

    async loadDevices(): Promise<void> {
      const devices = mediaDevices();
      if (!devices?.enumerateDevices) return;
      const all = await devices.enumerateDevices();
      this.devices = {
        cameras: all.filter((device) => device.kind === "videoinput"),
        microphones: all.filter((device) => device.kind === "audioinput")
      };
    },

    async acquireCameraStream(): Promise<void> {
      const devices = mediaDevices();
      if (!devices?.getUserMedia) {
        throw new Error("This browser cannot access the camera.");
      }
      const stream = await devices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(this.settings.cameraDeviceId
            ? { deviceId: { exact: this.settings.cameraDeviceId } }
            : {})
        },
        audio: false
      });
      this.releaseCameraStream();
      this.cameraStream = markRaw(stream);
      this.session?.setCameraStream(this.cameraStream);
      await this.loadDevices();
    },

    async acquireMicStream(): Promise<void> {
      const devices = mediaDevices();
      if (!devices?.getUserMedia) {
        throw new Error("This browser cannot access the microphone.");
      }
      const audio = this.settings.micDeviceId
        ? { deviceId: { exact: this.settings.micDeviceId } }
        : true;
      const stream = await devices.getUserMedia({ video: false, audio });
      this.releaseMicStream();
      this.micStream = markRaw(stream);
      await this.loadDevices();
    },

    releaseCameraStream(): void {
      if (this.cameraStream) {
        for (const track of this.cameraStream.getTracks()) track.stop();
      }
      this.cameraStream = null;
      this.session?.setCameraStream(null);
    },

    releaseMicStream(): void {
      if (this.micStream) {
        for (const track of this.micStream.getTracks()) track.stop();
      }
      this.micStream = null;
    },

    async setWebcamOn(enabled: boolean): Promise<void> {
      this.settings.webcamOn = enabled;
      this.persist();
      if (enabled) {
        try {
          await this.acquireCameraStream();
        } catch (error) {
          this.settings.webcamOn = false;
          this.persist();
          this.fail(error);
        }
      } else {
        this.releaseCameraStream();
      }
    },

    async setMicOn(enabled: boolean): Promise<void> {
      this.settings.micOn = enabled;
      this.persist();
      if (enabled) {
        try {
          await this.acquireMicStream();
        } catch (error) {
          this.settings.micOn = false;
          this.persist();
          this.fail(error);
        }
      } else {
        this.releaseMicStream();
      }
    },

    setSystemAudio(enabled: boolean): void {
      this.settings.systemAudio = enabled;
      this.persist();
    },

    async setCameraDevice(deviceId: string | null): Promise<void> {
      this.settings.cameraDeviceId = deviceId;
      this.persist();
      if (this.settings.webcamOn) {
        try {
          await this.acquireCameraStream();
        } catch (error) {
          this.settings.webcamOn = false;
          this.persist();
          this.fail(error);
        }
      }
    },

    async setMicDevice(deviceId: string | null): Promise<void> {
      this.settings.micDeviceId = deviceId;
      this.persist();
      if (this.settings.micOn) {
        try {
          await this.acquireMicStream();
        } catch (error) {
          this.settings.micOn = false;
          this.persist();
          this.fail(error);
        }
      }
    },

    setOverlayCorner(corner: WebcamCorner): void {
      this.settings.overlayCorner = corner;
      this.persist();
    },

    setOverlaySize(size: OverlaySize): void {
      this.settings.overlaySize = size;
      this.persist();
    },

    setResolution(resolution: RecorderResolution): void {
      this.settings.resolution = resolution;
      this.persist();
    },

    setFrameRate(frameRate: RecorderFrameRate): void {
      this.settings.frameRate = frameRate;
      this.persist();
    },

    setOverlayVisible(visible: boolean): void {
      this.overlayVisible = visible;
      this.session?.setOverlayEnabled(visible);
    },

    /** Toggles the webcam overlay mid-recording, acquiring the camera on demand. */
    async toggleOverlay(): Promise<void> {
      if (this.overlayVisible) {
        this.setOverlayVisible(false);
        return;
      }
      if (!this.cameraStream) {
        try {
          await this.acquireCameraStream();
        } catch (error) {
          this.fail(error);
          return;
        }
      }
      this.setOverlayVisible(true);
    },

    startElapsedTimer(): void {
      this.stopElapsedTimer();
      this.timerHandle = setInterval(() => {
        this.elapsedMs = Date.now() - this.startedAtMs - this.pausedAccumMs;
      }, ELAPSED_TICK_MS);
    },

    stopElapsedTimer(): void {
      if (this.timerHandle !== null) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
    },

    /** Registers the recording canvas. The element stays mounted across states. */
    setCanvas(canvas: HTMLCanvasElement | null): void {
      this.canvasEl = canvas;
    },

    async startRecording(): Promise<void> {
      if (this.hasSession || this.status === "done") return;
      if (!isScreenRecordingSupported()) {
        this.fail(new Error("This browser does not support screen recording."));
        return;
      }
      if (!this.canvasEl) {
        this.fail(new Error("The recording surface is not ready yet."));
        return;
      }
      const canvas = this.canvasEl;
      this.errorMessage = null;
      try {
        if (this.settings.webcamOn && !this.cameraStream) await this.acquireCameraStream();
        if (this.settings.micOn && !this.micStream) await this.acquireMicStream();

        const devices = mediaDevices();
        if (!devices?.getDisplayMedia) {
          throw new Error("This browser does not support screen capture.");
        }
        const displayStream = await devices.getDisplayMedia({
          video: { frameRate: { ideal: this.settings.frameRate } },
          audio: this.settings.systemAudio
        });

        const { createSession } = useScreenRecorder();
        const session = createSession({
          canvas,
          displayStream,
          cameraStream: this.cameraStream,
          micStream: this.settings.micOn ? this.micStream : null,
          tabStream: this.settings.systemAudio ? displayStream : null,
          overlay: {
            enabled: this.settings.webcamOn && this.cameraStream !== null,
            corner: this.settings.overlayCorner,
            size: this.settings.overlaySize
          },
          resolution: this.settings.resolution,
          frameRate: this.settings.frameRate,
          onScreenEnded: () => {
            if (this.hasSession) void this.stopRecording();
          }
        });
        this.session = session;
        await session.ready;

        this.overlayVisible = this.settings.webcamOn && this.cameraStream !== null;
        this.elapsedMs = 0;
        this.startedAtMs = Date.now();
        this.pausedAccumMs = 0;
        this.pauseStartedAtMs = null;
        this.status = "recording";
        this.startElapsedTimer();
      } catch (error) {
        this.session?.dispose();
        this.session = null;
        this.status = "error";
        this.errorMessage =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Screen sharing was cancelled or denied."
            : error instanceof Error
              ? error.message
              : "Could not start the recording.";
      }
    },

    pauseRecording(): void {
      if (!this.hasSession || this.status !== "recording") return;
      this.session?.pause();
      this.status = "paused";
      this.stopElapsedTimer();
      this.pauseStartedAtMs = Date.now();
    },

    resumeRecording(): void {
      if (!this.hasSession || this.status !== "paused") return;
      this.session?.resume();
      this.status = "recording";
      if (this.pauseStartedAtMs !== null) {
        this.pausedAccumMs += Date.now() - this.pauseStartedAtMs;
        this.pauseStartedAtMs = null;
      }
      this.startedAtMs = Date.now() - this.elapsedMs - this.pausedAccumMs;
      this.startElapsedTimer();
    },

    async stopRecording(): Promise<void> {
      if (!this.session) {
        this.reset();
        return;
      }
      const session = this.session;
      this.stopElapsedTimer();
      if (this.status === "paused" && this.pauseStartedAtMs !== null) {
        this.pausedAccumMs += Date.now() - this.pauseStartedAtMs;
        this.pauseStartedAtMs = null;
      }
      this.elapsedMs = Date.now() - this.startedAtMs - this.pausedAccumMs;
      try {
        const blob = await session.stop();
        const url = URL.createObjectURL(blob);
        this.result = {
          blob,
          url,
          fileName: recordingFileName(new Date(), extensionFromMime(blob.type)),
          mimeType: blob.type,
          durationMs: this.elapsedMs
        };
        this.status = "done";
      } catch (error) {
        this.fail(error);
      } finally {
        this.session = null;
        this.releaseCameraStream();
        this.releaseMicStream();
        this.overlayVisible = false;
      }
    },

    reset(): void {
      if (this.session) {
        void this.session.stop().catch(() => undefined);
      }
      this.session = null;
      this.stopElapsedTimer();
      this.releaseCameraStream();
      this.releaseMicStream();
      if (this.result) URL.revokeObjectURL(this.result.url);
      this.result = null;
      this.status = "idle";
      this.elapsedMs = 0;
      this.startedAtMs = 0;
      this.pausedAccumMs = 0;
      this.pauseStartedAtMs = null;
      this.overlayVisible = false;
      this.errorMessage = null;
    }
  }
});
