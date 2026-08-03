import { defineStore } from "pinia";
import { markRaw } from "vue";
import type { InpaintPhase } from "~/composables/useInpaint";
import { imageFileSchema } from "~/schemas/imageFile";
import { hasPaintedPixels, type RgbaImage } from "~/utils/image";

export type WatermarkStatus = "idle" | "ready" | "working" | "done" | "error";

interface WatermarkRemoverState {
  fileName: string;
  sourceUrl: string | null;
  width: number;
  height: number;
  brushSize: number;
  status: WatermarkStatus;
  phase: InpaintPhase | null;
  progress: number | null;
  resultUrl: string | null;
  resultBlob: Blob | null;
  errorMessage: string | null;
  addError: string | null;
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "image";
}

export const useWatermarkRemoverStore = defineStore("watermarkRemover", {
  state: (): WatermarkRemoverState => ({
    fileName: "",
    sourceUrl: null,
    width: 0,
    height: 0,
    brushSize: 40,
    status: "idle",
    phase: null,
    progress: null,
    resultUrl: null,
    resultBlob: null,
    errorMessage: null,
    addError: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "working",
    resultName: (state): string => `${baseName(state.fileName)}-clean.png`
  },
  actions: {
    setBrushSize(size: number): void {
      this.brushSize = size;
    },
    async setFile(file: File): Promise<void> {
      this.addError = null;
      const parsed = imageFileSchema.safeParse(file);
      if (!parsed.success) {
        this.addError = parsed.error.issues[0]?.message ?? "Please choose a valid image.";
        return;
      }
      this.reset();
      try {
        const { loadBitmap } = useCanvasImage();
        const bitmap = await loadBitmap(file);
        this.width = bitmap.width;
        this.height = bitmap.height;
        bitmap.close();
      } catch {
        this.addError = "Could not read this image.";
        return;
      }
      this.fileName = file.name;
      this.sourceUrl = URL.createObjectURL(file);
      this.status = "ready";
    },
    /** Runs inpainting on the source + brushed overlay produced by the canvas. */
    async run(source: RgbaImage, overlay: RgbaImage): Promise<void> {
      if (!hasPaintedPixels(overlay)) {
        this.addError = "Brush over the watermark first, then remove it.";
        return;
      }
      this.status = "working";
      this.phase = "downloading-model";
      this.progress = null;
      this.errorMessage = null;
      this.addError = null;
      try {
        const { inpaint } = useInpaint();
        const { rgbaToBlob } = useCanvasImage();
        const result = await inpaint(source, overlay, ({ phase, ratio }) => {
          this.phase = phase;
          this.progress = ratio ?? null;
        });
        const blob = await rgbaToBlob(result, "image/png");
        if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
        this.resultBlob = markRaw(blob);
        this.resultUrl = URL.createObjectURL(blob);
        this.status = "done";
        this.phase = null;
      } catch (error) {
        this.status = "error";
        this.errorMessage =
          error instanceof Error ? error.message : "Could not remove the watermark.";
      }
    },
    backToEdit(): void {
      if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
      this.resultUrl = null;
      this.resultBlob = null;
      this.errorMessage = null;
      if (this.sourceUrl) this.status = "ready";
    },
    reset(): void {
      if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
      if (this.resultUrl) URL.revokeObjectURL(this.resultUrl);
      this.fileName = "";
      this.sourceUrl = null;
      this.width = 0;
      this.height = 0;
      this.status = "idle";
      this.phase = null;
      this.progress = null;
      this.resultUrl = null;
      this.resultBlob = null;
      this.errorMessage = null;
      this.addError = null;
    }
  }
});
