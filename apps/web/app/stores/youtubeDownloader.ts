import { defineStore } from "pinia";
import type { DownloadMode, YoutubeVideoInfo } from "~/types/youtube";
import { isYoutubeUrl } from "~/schemas/youtubeUrl";
import { defaultQuality } from "~/utils/youtube";

export type DownloaderStatus = "idle" | "loading" | "ready" | "downloading" | "error";

interface YoutubeDownloaderState {
  url: string;
  info: YoutubeVideoInfo | null;
  mode: DownloadMode;
  /** Selected max video height; 0 means best available. */
  quality: number;
  status: DownloaderStatus;
  error: string | null;
}

export const useYoutubeDownloaderStore = defineStore("youtubeDownloader", {
  state: (): YoutubeDownloaderState => ({
    url: "",
    info: null,
    mode: "video",
    quality: 0,
    status: "idle",
    error: null
  }),
  getters: {
    canFetch(state): boolean {
      return isYoutubeUrl(state.url) && state.status !== "loading";
    },
    isBusy(state): boolean {
      return state.status === "loading" || state.status === "downloading";
    },
    /** Video is only offered when the backend reported at least one resolution. */
    canPickVideo(state): boolean {
      return (state.info?.heights.length ?? 0) > 0;
    }
  },
  actions: {
    setUrl(value: string): void {
      this.url = value;
      // Editing the URL invalidates any previously loaded video.
      if (this.info) {
        this.info = null;
        this.status = "idle";
      }
      if (this.error) this.error = null;
    },
    setMode(mode: DownloadMode): void {
      this.mode = mode;
    },
    setQuality(quality: number): void {
      this.quality = quality;
    },
    /** Applies freshly fetched metadata and derives sensible defaults. */
    applyInfo(info: YoutubeVideoInfo): void {
      this.info = info;
      this.quality = defaultQuality(info.heights);
      this.mode = info.heights.length ? "video" : "audio";
      this.status = "ready";
      this.error = null;
    },
    fail(message: string): void {
      this.status = "error";
      this.error = message;
    },
    async fetchInfo(): Promise<void> {
      if (!isYoutubeUrl(this.url)) {
        this.fail("That doesn't look like a YouTube link.");
        return;
      }
      const { fetchInfo } = useYoutubeBackend();
      this.status = "loading";
      this.error = null;
      try {
        this.applyInfo(await fetchInfo(this.url.trim()));
      } catch (error) {
        this.fail(error instanceof Error ? error.message : "Could not fetch video details.");
      }
    },
    async download(): Promise<void> {
      if (!this.info) return;
      const { fetchDownload, saveBlob } = useYoutubeBackend();
      this.status = "downloading";
      this.error = null;
      try {
        const { blob, filename } = await fetchDownload({
          url: this.url.trim(),
          mode: this.mode,
          quality: this.mode === "audio" ? 0 : this.quality
        });
        saveBlob(blob, filename);
        this.status = "ready";
      } catch (error) {
        this.fail(error instanceof Error ? error.message : "The download failed.");
      }
    },
    reset(): void {
      this.$reset();
    }
  }
});
