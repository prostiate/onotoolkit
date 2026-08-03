import { defineStore } from "pinia";
import { markRaw } from "vue";
import { imageFileSchema } from "~/schemas/imageFile";
import { detectImageFormat, type CompressSettings } from "~/utils/image";

export type CompressItemStatus = "pending" | "working" | "done" | "error";

export interface CompressItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  previewUrl: string;
  isPng: boolean;
  status: CompressItemStatus;
  resultBlob: Blob | null;
  resultUrl: string | null;
  resultSize: number;
  resultName: string;
  error: string | null;
}

export type CompressStatus = "idle" | "ready" | "working" | "done";

interface CompressImageState {
  items: CompressItem[];
  status: CompressStatus;
  settings: CompressSettings;
  addError: string | null;
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "image";
}

export const useCompressImageStore = defineStore("compressImage", {
  state: (): CompressImageState => ({
    items: [],
    status: "idle",
    settings: {
      quality: 75,
      format: "original",
      pngLossless: true,
      flattenTransparent: false,
      flattenColor: "#ffffff"
    },
    addError: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "working",
    canCompress: (state): boolean => state.items.length > 0 && state.status !== "working",
    /** Whether any PNG/WebP (potentially transparent) is present, to show flatten controls. */
    hasTransparentCandidate: (state): boolean => state.items.some((item) => item.isPng),
    doneCount: (state): number => state.items.filter((item) => item.status === "done").length,
    totalOriginalSize: (state): number =>
      state.items.reduce((sum, item) => sum + item.originalSize, 0),
    totalResultSize: (state): number =>
      state.items.reduce((sum, item) => sum + (item.status === "done" ? item.resultSize : 0), 0)
  },
  actions: {
    addFiles(files: File[]): void {
      this.addError = null;
      if (this.status === "done") this.clearResults();
      let rejected = 0;
      for (const file of files) {
        if (!imageFileSchema.safeParse(file).success) {
          rejected += 1;
          continue;
        }
        const format = detectImageFormat(file.type, file.name);
        this.items.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          originalSize: file.size,
          previewUrl: URL.createObjectURL(file),
          isPng: format === "png" || format === "webp",
          status: "pending",
          resultBlob: null,
          resultUrl: null,
          resultSize: 0,
          resultName: file.name,
          error: null
        });
      }
      if (this.items.length > 0 && this.status !== "working") this.status = "ready";
      if (rejected > 0) {
        this.addError = `Skipped ${rejected} file${rejected > 1 ? "s" : ""} that ${rejected > 1 ? "are" : "is"} not a supported image.`;
      }
    },
    remove(id: string): void {
      const item = this.items.find((entry) => entry.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      this.items = this.items.filter((entry) => entry.id !== id);
      if (this.items.length === 0) this.reset();
    },
    setQuality(quality: number): void {
      this.settings.quality = quality;
      this.onSettingsChanged();
    },
    setFormat(format: CompressSettings["format"]): void {
      this.settings.format = format;
      this.onSettingsChanged();
    },
    setPngLossless(value: boolean): void {
      this.settings.pngLossless = value;
      this.onSettingsChanged();
    },
    setFlattenTransparent(value: boolean): void {
      this.settings.flattenTransparent = value;
      this.onSettingsChanged();
    },
    setFlattenColor(color: string): void {
      this.settings.flattenColor = color;
      this.onSettingsChanged();
    },
    /** After a completed run, changing a setting invalidates results so the user re-runs. */
    onSettingsChanged(): void {
      if (this.status === "done") this.clearResults();
    },
    async compressAll(): Promise<void> {
      if (this.items.length === 0) return;
      this.status = "working";
      const { compress } = useImageCompress();
      // Sequential: keeps peak memory low for large batches.
      for (const item of this.items) {
        item.status = "working";
        item.error = null;
        try {
          const outcome = await compress(item.file, this.settings);
          if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
          item.resultBlob = markRaw(outcome.blob);
          item.resultSize = outcome.blob.size;
          item.resultUrl = URL.createObjectURL(outcome.blob);
          item.resultName = `${baseName(item.name)}-min.${outcome.extension}`;
          item.status = "done";
        } catch (error) {
          item.status = "error";
          item.error = error instanceof Error ? error.message : "Could not compress this image.";
        }
      }
      this.status = "done";
    },
    clearResults(): void {
      for (const item of this.items) {
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        item.resultBlob = null;
        item.resultUrl = null;
        item.resultSize = 0;
        item.status = "pending";
        item.error = null;
      }
      if (this.items.length > 0) this.status = "ready";
    },
    reset(): void {
      for (const item of this.items) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      this.items = [];
      this.status = "idle";
      this.addError = null;
      this.settings = {
        quality: 75,
        format: "original",
        pngLossless: true,
        flattenTransparent: false,
        flattenColor: "#ffffff"
      };
    }
  }
});
