import { defineStore } from "pinia";
import { markRaw } from "vue";
import {
  parseVideoWatermarkSettings,
  videoFileSchema,
  videoWatermarkSettingsSchema
} from "~/schemas/videoWatermark";
import type { VideoWatermarkSettings } from "~/schemas/videoWatermark";
import type {
  VideoProgress,
  VideoSummary,
  VideoWorkerRequest,
  VideoWorkerResponse
} from "~/types/videoWatermark";
import { videoCapabilityError } from "~/utils/videoWatermark";

const STORAGE_KEY = "ono-toolkit-video-watermark-settings";
interface State {
  file: File | null;
  sourceUrl: string | null;
  resultUrl: string | null;
  resultBlob: Blob | null;
  status: "idle" | "ready" | "working" | "done" | "error";
  settings: VideoWatermarkSettings;
  progress: VideoProgress | null;
  summary: VideoSummary | null;
  worker: Worker | null;
  jobId: number;
  error: string | null;
  addError: string | null;
  cancelled: boolean;
}
export const useVideoWatermarkStore = defineStore("videoWatermark", {
  state: (): State => ({
    file: null,
    sourceUrl: null,
    resultUrl: null,
    resultBlob: null,
    status: "idle",
    settings: parseVideoWatermarkSettings(null),
    progress: null,
    summary: null,
    worker: null,
    jobId: 0,
    error: null,
    addError: null,
    cancelled: false
  }),
  getters: {
    resultName: (state): string =>
      `${state.file?.name.replace(/\.[^./\\]+$/, "") || "video"}-no-watermark.mp4`,
    isBusy: (state): boolean => state.status === "working"
  },
  actions: {
    hydrate(): void {
      try {
        this.settings = parseVideoWatermarkSettings(localStorage.getItem(STORAGE_KEY));
      } catch {
        /* Private browsing may disable storage. */
      }
    },
    setSettings(settings: VideoWatermarkSettings): void {
      const parsed = videoWatermarkSettingsSchema.safeParse(settings);
      if (!parsed.success) return;
      this.settings = parsed.data;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        /* Preferences remain usable without storage. */
      }
    },
    selectFile(file: File): void {
      if (this.isBusy) return;
      const parsed = videoFileSchema.safeParse(file);
      if (!parsed.success) {
        this.addError = parsed.error.issues[0]?.message ?? "Choose a video.";
        return;
      }
      this.reset();
      this.file = markRaw(file);
      this.sourceUrl = URL.createObjectURL(file);
      this.status = "ready";
    },
    async run(): Promise<void> {
      if (!this.file || this.isBusy) return;
      this.error = videoCapabilityError();
      if (this.error) {
        this.status = "error";
        return;
      }
      this.clearResult();
      this.status = "working";
      this.cancelled = false;
      this.progress = { phase: "detecting", ratio: 0 };
      const jobId = ++this.jobId;
      try {
        const { default: VideoWorker } = await import("~/workers/videoWatermark.worker?worker");
        // A cancellation or route change can happen while the worker chunk loads.
        if (this.status !== "working" || this.jobId !== jobId) return;
        const worker = markRaw(new VideoWorker());
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<VideoWorkerResponse>): void => {
          if (this.worker !== worker) return;
          const message = event.data;
          if (message.type === "progress") {
            this.progress = message.progress;
            return;
          }
          if (message.type === "done") {
            this.resultBlob = markRaw(message.blob);
            this.resultUrl = URL.createObjectURL(message.blob);
            this.summary = message.summary;
            this.status = "done";
          } else {
            this.error = message.message;
            this.status = "error";
          }
          this.stopWorker();
          this.progress = null;
        };
        worker.onerror = (): void => {
          if (this.worker !== worker) return;
          this.error = "The video worker stopped. Try a shorter clip in desktop Chrome or Edge.";
          this.status = "error";
          this.stopWorker();
          this.progress = null;
        };
        const request: VideoWorkerRequest = {
          file: this.file,
          settings: { ...this.settings },
          origin: location.origin
        };
        worker.postMessage(request);
      } catch {
        if (this.status !== "working" || this.jobId !== jobId) return;
        this.error = "The video processor could not load. Check your connection and try again.";
        this.status = "error";
        this.stopWorker();
        this.progress = null;
      }
    },
    stopWorker(): void {
      this.jobId++;
      this.worker?.terminate();
      this.worker = null;
    },
    cancel(): void {
      this.stopWorker();
      this.progress = null;
      this.cancelled = true;
      this.status = this.file ? "ready" : "idle";
    },
    clearResult(): void {
      if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
      this.resultUrl = null;
      this.resultBlob = null;
      this.summary = null;
      this.error = null;
    },
    reset(): void {
      this.stopWorker();
      this.clearResult();
      if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
      this.file = null;
      this.sourceUrl = null;
      this.status = "idle";
      this.progress = null;
      this.addError = null;
      this.cancelled = false;
    }
  }
});
