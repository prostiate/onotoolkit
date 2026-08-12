import { defineStore } from "pinia";
import type {
  NormalizedRect,
  RecorderDevices,
  RecorderFrameRate,
  RecorderLiveState,
  RecorderMode,
  RecorderResolution,
  RecorderResult,
  RecorderSession,
  RecorderStatus,
  StoredRecording,
  WebcamCorner,
  WebcamShape
} from "~/types/screenRecorder";
import { defaultRecorderSettings, parseRecorderSettings } from "~/schemas/screenRecorder";
import {
  clampNormalizedRect,
  isCameraRecordingSupported,
  isScreenRecordingSupported,
  recordingFileName
} from "~/utils/screenRecorder";

const STORAGE_KEY = "ono-toolkit-screen-recorder-settings";
const ELAPSED_TICK_MS = 250;

function extensionFromMime(mimeType: string): "mp4" | "webm" {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

function mediaDevices(): MediaDevices | null {
  return typeof navigator !== "undefined" ? navigator.mediaDevices : null;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `rec-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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
    /** Whether a screen capture is currently part of the composite. */
    displayActive: false,
    overlayVisible: false,
    /** True while the camera preview/acquire is in flight (guards the flash bug). */
    cameraBusy: false,
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
     * Hydrates the remembered preferences and warms up the webcam when the
     * chosen mode wants it, then refreshes the device list. Called once from the
     * page's onMounted.
     */
    async restoreSession(): Promise<void> {
      this.hydrate();
      const wantsCamera = this.settings.recordMode !== "screen" || this.settings.webcamOn;
      if (wantsCamera && !this.cameraStream) {
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
      // Guard against overlapping acquisitions — the reason the preview used to
      // flash on and immediately off (a second acquire tore down the first).
      if (this.cameraBusy) return;
      this.cameraBusy = true;
      try {
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
      } finally {
        this.cameraBusy = false;
      }
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

    /** Chooses what to capture on the "What do you want to record?" step. */
    async setRecordMode(mode: RecorderMode): Promise<void> {
      this.settings.recordMode = mode;
      this.settings.webcamOn = mode !== "screen";
      this.persist();
      const wantsCamera = mode !== "screen";
      if (wantsCamera && !this.cameraStream) {
        try {
          await this.acquireCameraStream();
        } catch (error) {
          this.settings.webcamOn = false;
          this.persist();
          this.fail(error);
        }
      } else if (!wantsCamera && !this.cameraStream) {
        this.releaseCameraStream();
      }
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
      if (this.cameraStream || this.settings.webcamOn) {
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

    setOverlayShape(shape: WebcamShape): void {
      this.settings.overlayShape = shape;
      this.persist();
    },

    /** Updates the freeform webcam overlay geometry (drag/resize on the stage). */
    setOverlayRect(rect: NormalizedRect): void {
      this.settings.overlayRect = clampNormalizedRect(rect);
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

    /** Adds a screen capture to a running camera-only session. */
    async addScreenMidSession(): Promise<void> {
      if (!this.session || this.displayActive) return;
      const devices = mediaDevices();
      if (!devices?.getDisplayMedia) {
        this.fail(new Error("This browser does not support screen capture."));
        return;
      }
      try {
        const displayStream = await devices.getDisplayMedia({
          video: { frameRate: { ideal: this.settings.frameRate } },
          audio: this.settings.systemAudio
        });
        this.session.setDisplayStream(markRaw(displayStream));
        this.displayActive = true;
        // The camera now becomes a picture-in-picture overlay on top of the screen.
        this.overlayVisible = this.cameraStream !== null;
        this.session.setOverlayEnabled(this.overlayVisible);
        this.session.setAudioSources({
          micStream: this.settings.micOn ? this.micStream : null,
          tabStream: this.settings.systemAudio ? displayStream : null
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "NotAllowedError")) this.fail(error);
      }
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

    /** Builds the live accessors the engine polls each frame. */
    buildLiveState(): RecorderLiveState {
      const annotations = useRecorderAnnotations();
      return {
        overlayEnabled: () => this.overlayVisible,
        overlayRect: () => this.settings.overlayRect,
        overlayShape: () => this.settings.overlayShape,
        annotations: () => annotations.snapshot()
      };
    },

    async startRecording(): Promise<void> {
      if (this.hasSession || this.status === "done") return;
      const mode = this.settings.recordMode;
      const wantScreen = mode !== "camera";

      if (wantScreen && !isScreenRecordingSupported()) {
        this.fail(new Error("This browser does not support screen recording."));
        return;
      }
      if (!wantScreen && !isCameraRecordingSupported()) {
        this.fail(new Error("This browser does not support camera recording."));
        return;
      }
      if (!this.canvasEl) {
        this.fail(new Error("The recording surface is not ready yet."));
        return;
      }
      const canvas = this.canvasEl;
      this.errorMessage = null;
      const wantCamera = mode === "camera" || this.settings.webcamOn;

      try {
        if (wantCamera && !this.cameraStream) await this.acquireCameraStream();
        if (this.settings.micOn && !this.micStream) await this.acquireMicStream();

        let displayStream: MediaStream | null = null;
        if (wantScreen) {
          const devices = mediaDevices();
          if (!devices?.getDisplayMedia) {
            throw new Error("This browser does not support screen capture.");
          }
          displayStream = markRaw(
            await devices.getDisplayMedia({
              video: { frameRate: { ideal: this.settings.frameRate } },
              audio: this.settings.systemAudio
            })
          );
        }

        const { createSession } = useScreenRecorder();
        const session = createSession({
          canvas,
          displayStream,
          cameraStream: wantCamera ? this.cameraStream : null,
          micStream: this.settings.micOn ? this.micStream : null,
          tabStream: this.settings.systemAudio ? displayStream : null,
          // The PiP overlay only applies when a screen is the base layer.
          overlay: { enabled: wantScreen && wantCamera && this.cameraStream !== null },
          live: this.buildLiveState(),
          resolution: this.settings.resolution,
          frameRate: this.settings.frameRate,
          onScreenEnded: () => {
            if (this.hasSession) void this.stopRecording();
          }
        });
        this.session = session;
        await session.ready;

        this.displayActive = wantScreen;
        this.overlayVisible = wantScreen && wantCamera && this.cameraStream !== null;
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
      const poster = await session.capturePoster().catch(() => null);
      try {
        const blob = await session.stop();
        const url = URL.createObjectURL(blob);
        const fileName = recordingFileName(new Date(), extensionFromMime(blob.type));
        this.result = {
          blob,
          url,
          fileName,
          mimeType: blob.type,
          durationMs: this.elapsedMs,
          posterUrl: poster ? URL.createObjectURL(poster) : null
        };
        this.status = "done";
        await this.saveToLibrary(blob, fileName, poster);
      } catch (error) {
        this.fail(error);
      } finally {
        this.session = null;
        this.displayActive = false;
        this.releaseCameraStream();
        this.releaseMicStream();
        this.overlayVisible = false;
        useRecorderAnnotations().clear();
      }
    },

    /** Persists a finished recording to the local IndexedDB library. */
    async saveToLibrary(blob: Blob, fileName: string, poster: Blob | null): Promise<void> {
      try {
        const recording: StoredRecording = {
          id: makeId(),
          name: fileName,
          blob,
          mimeType: blob.type,
          durationMs: this.elapsedMs,
          size: blob.size,
          createdAt: Date.now(),
          thumbnail: poster
        };
        await useRecordingsLibrary().add(recording);
      } catch {
        /* library persistence is best-effort; the in-memory result still works */
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
      if (this.result) {
        URL.revokeObjectURL(this.result.url);
        if (this.result.posterUrl) URL.revokeObjectURL(this.result.posterUrl);
      }
      this.result = null;
      this.status = "idle";
      this.displayActive = false;
      this.elapsedMs = 0;
      this.startedAtMs = 0;
      this.pausedAccumMs = 0;
      this.pauseStartedAtMs = null;
      this.overlayVisible = false;
      this.errorMessage = null;
      useRecorderAnnotations().clear();
    }
  }
});
