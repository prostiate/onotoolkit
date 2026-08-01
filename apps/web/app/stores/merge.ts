import { defineStore } from "pinia";
import type { CompressPreset, CompressResult } from "~/types/tools";
import type { WorkerStage } from "~/types/worker";
import { DEFAULT_COMPRESS_PRESET } from "~/schemas/compress";
import { mergeFileSchema, mergeFilesSchema } from "~/schemas/merge";
import { toMergedFileName } from "~/utils/pdf";

/** A PDF queued for merging, with a lazily rendered first-page thumbnail. */
export interface MergeItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
  thumbnail: string | null;
  loading: boolean;
}

export type MergeStatus =
  "idle" | "ready" | "merging" | "merged" | "compressing" | "compressed" | "error";

interface MergeState {
  items: MergeItem[];
  status: MergeStatus;
  mergedBytes: Uint8Array | null;
  mergedSize: number | null;
  mergedPageCount: number | null;
  mergedFileName: string;
  preset: CompressPreset;
  compressStage: WorkerStage | null;
  compressResult: CompressResult | null;
  errorMessage: string | null;
  addError: string | null;
}

export const useMergeStore = defineStore("merge", {
  state: (): MergeState => ({
    items: [],
    status: "idle",
    mergedBytes: null,
    mergedSize: null,
    mergedPageCount: null,
    mergedFileName: "merged.pdf",
    preset: DEFAULT_COMPRESS_PRESET,
    compressStage: null,
    compressResult: null,
    errorMessage: null,
    addError: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "merging" || state.status === "compressing",
    totalSize: (state): number => state.items.reduce((sum, item) => sum + item.size, 0),
    canMerge(state): boolean {
      return state.items.length >= 2 && !this.isBusy;
    }
  },
  actions: {
    setPreset(preset: CompressPreset): void {
      this.preset = preset;
    },
    /** Drops merge/compress results but keeps the queued files. */
    clearResults(): void {
      this.mergedBytes = null;
      this.mergedSize = null;
      this.mergedPageCount = null;
      this.compressStage = null;
      this.compressResult = null;
    },
    async addFiles(files: File[]): Promise<void> {
      this.addError = null;
      if (this.status === "merged" || this.status === "compressed") {
        this.clearResults();
        this.status = "ready";
      }

      const accepted: MergeItem[] = [];
      let rejected = 0;
      for (const file of files) {
        if (!mergeFileSchema.safeParse(file).success) {
          rejected += 1;
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          pageCount: null,
          thumbnail: null,
          loading: true
        });
      }

      if (accepted.length > 0) {
        this.items.push(...accepted);
        if (this.status === "idle" || this.status === "error") this.status = "ready";
        void this.loadPreviews(accepted);
      }
      if (rejected > 0) {
        this.addError = `Skipped ${rejected} file${rejected > 1 ? "s" : ""} that ${rejected > 1 ? "are" : "is"} not a valid PDF.`;
      }
    },
    /** Renders a first-page thumbnail and reads the page count for each new item. */
    async loadPreviews(created: MergeItem[]): Promise<void> {
      const { openDocument, renderPage } = usePdfRender();
      for (const item of created) {
        try {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          const doc = await openDocument(bytes);
          const target = this.items.find((entry) => entry.id === item.id);
          if (target) target.pageCount = doc.numPages;
          const rendered = await renderPage(doc, 1, 96);
          if (target) target.thumbnail = rendered.dataUrl;
        } catch {
          /* Leave the thumbnail empty; the file may still merge fine. */
        } finally {
          const target = this.items.find((entry) => entry.id === item.id);
          if (target) target.loading = false;
        }
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
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= this.items.length) return;
      const clamped = Math.max(0, Math.min(toIndex, this.items.length - 1));
      const [item] = this.items.splice(fromIndex, 1);
      if (item) this.items.splice(clamped, 0, item);
    },
    remove(id: string): void {
      this.items = this.items.filter((item) => item.id !== id);
      if (this.items.length === 0) this.reset();
      else if (this.status !== "idle") this.status = "ready";
    },
    async merge(): Promise<void> {
      const files = this.items.map((item) => item.file);
      const parsed = mergeFilesSchema.safeParse(files);
      if (!parsed.success) {
        this.status = "error";
        this.errorMessage = parsed.error.issues[0]?.message ?? "These files cannot be merged.";
        return;
      }

      this.status = "merging";
      this.errorMessage = null;
      this.clearResults();

      try {
        const inputs = await Promise.all(
          this.items.map(async (item) => ({ bytes: new Uint8Array(await item.file.arrayBuffer()) }))
        );
        const { merge } = useMergePdf();
        const result = await merge(inputs);
        this.mergedBytes = result.bytes;
        this.mergedSize = result.bytes.length;
        this.mergedPageCount = result.pageCount;
        this.mergedFileName = toMergedFileName(this.items[0]?.name);
        this.status = "merged";
      } catch (error) {
        this.status = "error";
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while merging.";
      }
    },
    async compress(): Promise<void> {
      const merged = this.mergedBytes;
      if (!merged) return;
      this.status = "compressing";
      this.compressStage = "loading-engine";
      this.errorMessage = null;

      try {
        const { compress } = useGhostscript();
        // Copy into a fresh Uint8Array so the Blob part is a plain ArrayBuffer view.
        const view = new Uint8Array(merged);
        const file = new File([view], this.mergedFileName, { type: "application/pdf" });
        const result = await compress({
          file,
          preset: this.preset,
          onStage: (stage) => {
            this.compressStage = stage;
          }
        });
        // If Ghostscript could not shrink an already-optimized PDF (the output is
        // the same size or larger), keep the merged file so the download is never
        // bigger than what we produced.
        this.compressResult =
          result.compressedSize >= result.originalSize
            ? {
                fileName: result.fileName,
                originalSize: result.originalSize,
                compressedSize: result.originalSize,
                bytes: merged
              }
            : result;
        this.status = "compressed";
        this.compressStage = null;
      } catch (error) {
        this.status = "error";
        this.compressStage = null;
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while compressing.";
      }
    },
    reset(): void {
      this.items = [];
      this.status = "idle";
      this.mergedBytes = null;
      this.mergedSize = null;
      this.mergedPageCount = null;
      this.mergedFileName = "merged.pdf";
      this.compressStage = null;
      this.compressResult = null;
      this.errorMessage = null;
      this.addError = null;
    }
  }
});
