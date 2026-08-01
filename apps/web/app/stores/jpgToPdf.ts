import { defineStore } from "pinia";
import type { ImageInput, MarginMode, PageSizeMode } from "~/composables/useImageToPdf";
import { imageFileSchema } from "~/schemas/imageFile";
import { toPdfFileName } from "~/utils/pdf";

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  /** Object URL used for the thumbnail preview; revoked on remove/reset. */
  previewUrl: string;
}

export type JpgToPdfStatus = "idle" | "ready" | "working" | "done" | "error";

interface JpgToPdfState {
  items: ImageItem[];
  status: JpgToPdfStatus;
  pageSize: PageSizeMode;
  margin: MarginMode;
  resultBytes: Uint8Array | null;
  resultName: string;
  errorMessage: string | null;
  addError: string | null;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image."));
    img.src = url;
  });
}

/** Decodes any image file to PNG bytes via a canvas (for WebP/GIF/BMP). */
async function imageFileToPng(file: File): Promise<Uint8Array> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context is unavailable.");
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not convert this image.");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function prepareImage(file: File): Promise<ImageInput> {
  const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
  const isJpg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
  if (isPng) return { bytes: new Uint8Array(await file.arrayBuffer()), type: "png" };
  if (isJpg) return { bytes: new Uint8Array(await file.arrayBuffer()), type: "jpg" };
  return { bytes: await imageFileToPng(file), type: "png" };
}

export const useJpgToPdfStore = defineStore("jpgToPdf", {
  state: (): JpgToPdfState => ({
    items: [],
    status: "idle",
    pageSize: "fit",
    margin: "none",
    resultBytes: null,
    resultName: "images.pdf",
    errorMessage: null,
    addError: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "working",
    canBuild: (state): boolean => state.items.length > 0 && state.status !== "working"
  },
  actions: {
    setPageSize(size: PageSizeMode): void {
      this.pageSize = size;
    },
    setMargin(margin: MarginMode): void {
      this.margin = margin;
    },
    addFiles(files: File[]): void {
      this.addError = null;
      if (this.status === "done") {
        this.resultBytes = null;
        this.status = "ready";
      }
      let rejected = 0;
      for (const file of files) {
        if (!imageFileSchema.safeParse(file).success) {
          rejected += 1;
          continue;
        }
        this.items.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file)
        });
      }
      if (this.items.length > 0 && this.status !== "working") this.status = "ready";
      if (rejected > 0) {
        this.addError = `Skipped ${rejected} file${rejected > 1 ? "s" : ""} that ${rejected > 1 ? "are" : "is"} not a supported image.`;
      }
    },
    move(id: string, direction: -1 | 1): void {
      const index = this.items.findIndex((item) => item.id === id);
      const to = index + direction;
      if (index < 0 || to < 0 || to >= this.items.length) return;
      const [item] = this.items.splice(index, 1);
      if (item) this.items.splice(to, 0, item);
    },
    reorder(fromIndex: number, toIndex: number): void {
      if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= this.items.length) return;
      const clamped = Math.max(0, Math.min(toIndex, this.items.length - 1));
      const [item] = this.items.splice(fromIndex, 1);
      if (item) this.items.splice(clamped, 0, item);
    },
    remove(id: string): void {
      const item = this.items.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      this.items = this.items.filter((entry) => entry.id !== id);
      if (this.items.length === 0) this.reset();
    },
    async build(): Promise<void> {
      if (this.items.length === 0) return;
      this.status = "working";
      this.errorMessage = null;
      try {
        const inputs: ImageInput[] = [];
        for (const item of this.items) inputs.push(await prepareImage(item.file));
        const { build } = useImageToPdf();
        this.resultBytes = await build(inputs, { pageSize: this.pageSize, margin: this.margin });
        this.resultName = toPdfFileName(this.items[0]?.name ?? "images");
        this.status = "done";
      } catch (error) {
        this.status = "error";
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while building the PDF.";
      }
    },
    backToImages(): void {
      if (this.items.length > 0) {
        this.status = "ready";
        this.resultBytes = null;
        this.errorMessage = null;
      }
    },
    reset(): void {
      for (const item of this.items) URL.revokeObjectURL(item.previewUrl);
      this.items = [];
      this.status = "idle";
      this.pageSize = "fit";
      this.margin = "none";
      this.resultBytes = null;
      this.resultName = "images.pdf";
      this.errorMessage = null;
      this.addError = null;
    }
  }
});
