import { defineStore } from "pinia";
import { markRaw } from "vue";
import type { BackgroundRemovalPhase } from "~/composables/useBackgroundRemoval";
import { imageFileSchema } from "~/schemas/imageFile";
import { hexToRgb, type RgbaImage } from "~/utils/image";

export type BackgroundRemoverStatus = "idle" | "working" | "done" | "error";
export type BackgroundMode = "transparent" | "color";

interface BackgroundRemoverState {
  fileName: string;
  originalUrl: string | null;
  originalSize: number;
  status: BackgroundRemoverStatus;
  phase: BackgroundRemovalPhase | null;
  /** 0..1 when known, otherwise null (indeterminate spinner). */
  progress: number | null;
  /** Transparent cutout kept raw (large typed array - not deeply reactive). */
  cutout: RgbaImage | null;
  mode: BackgroundMode;
  color: string;
  resultUrl: string | null;
  resultBlob: Blob | null;
  errorMessage: string | null;
  addError: string | null;
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "image";
}

export const useBackgroundRemoverStore = defineStore("backgroundRemover", {
  state: (): BackgroundRemoverState => ({
    fileName: "",
    originalUrl: null,
    originalSize: 0,
    status: "idle",
    phase: null,
    progress: null,
    cutout: null,
    mode: "transparent",
    color: "#ffffff",
    resultUrl: null,
    resultBlob: null,
    errorMessage: null,
    addError: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "working",
    resultName: (state): string => {
      const suffix = state.mode === "transparent" ? "no-bg" : "bg";
      return `${baseName(state.fileName)}-${suffix}.png`;
    }
  },
  actions: {
    async setFile(file: File): Promise<void> {
      this.addError = null;
      const parsed = imageFileSchema.safeParse(file);
      if (!parsed.success) {
        this.addError = parsed.error.issues[0]?.message ?? "Please choose a valid image.";
        return;
      }
      this.clearResult();
      if (this.originalUrl) URL.revokeObjectURL(this.originalUrl);
      this.fileName = file.name;
      this.originalSize = file.size;
      this.originalUrl = URL.createObjectURL(file);
      await this.run(file);
    },
    async run(file: File): Promise<void> {
      this.status = "working";
      this.phase = "downloading-model";
      this.progress = null;
      this.errorMessage = null;
      try {
        const { removeBackground } = useBackgroundRemoval();
        const result = await removeBackground(file, ({ phase, ratio }) => {
          this.phase = phase;
          this.progress = ratio ?? null;
        });
        this.cutout = markRaw(result.cutout);
        await this.recompose();
        this.status = "done";
        this.phase = null;
      } catch (error) {
        this.status = "error";
        this.errorMessage =
          error instanceof Error ? error.message : "Could not remove the background.";
      }
    },
    async setMode(mode: BackgroundMode): Promise<void> {
      this.mode = mode;
      if (this.cutout) await this.recompose();
    },
    async setColor(color: string): Promise<void> {
      this.color = color;
      if (this.mode === "color" && this.cutout) await this.recompose();
    },
    async recompose(): Promise<void> {
      if (!this.cutout) return;
      const { toColorBackground, toTransparentPng } = useBackgroundRemoval();
      const blob =
        this.mode === "color"
          ? await toColorBackground(this.cutout, hexToRgb(this.color))
          : await toTransparentPng(this.cutout);
      if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
      this.resultBlob = markRaw(blob);
      this.resultUrl = URL.createObjectURL(blob);
    },
    clearResult(): void {
      if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
      this.resultUrl = null;
      this.resultBlob = null;
      this.cutout = null;
      this.status = "idle";
      this.phase = null;
      this.progress = null;
      this.errorMessage = null;
    },
    reset(): void {
      if (this.originalUrl) URL.revokeObjectURL(this.originalUrl);
      this.originalUrl = null;
      this.fileName = "";
      this.originalSize = 0;
      this.mode = "transparent";
      this.color = "#ffffff";
      this.addError = null;
      this.clearResult();
    }
  }
});
