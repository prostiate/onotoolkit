import { defineStore } from "pinia";
import type { CompressPreset, CompressResult, ToolRunnerState } from "~/types/tools";
import type { WorkerStage } from "~/types/worker";
import { DEFAULT_COMPRESS_PRESET, compressFileSchema } from "~/schemas/compress";

interface CompressState {
  status: ToolRunnerState;
  stage: WorkerStage | null;
  preset: CompressPreset;
  fileName: string | null;
  /** Kept client-side so the result view can render a before/after preview. */
  originalFile: File | null;
  result: CompressResult | null;
  errorMessage: string | null;
}

export const useCompressStore = defineStore("compress", {
  state: (): CompressState => ({
    status: "idle",
    stage: null,
    preset: DEFAULT_COMPRESS_PRESET,
    fileName: null,
    originalFile: null,
    result: null,
    errorMessage: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "preparing" || state.status === "running"
  },
  actions: {
    setPreset(preset: CompressPreset): void {
      this.preset = preset;
    },
    reset(): void {
      this.status = "idle";
      this.stage = null;
      this.fileName = null;
      this.originalFile = null;
      this.result = null;
      this.errorMessage = null;
    },
    async run(file: File): Promise<void> {
      const parsed = compressFileSchema.safeParse(file);
      if (!parsed.success) {
        this.status = "error";
        this.errorMessage = parsed.error.issues[0]?.message ?? "Invalid file.";
        return;
      }

      const { compress } = useGhostscript();
      this.status = "preparing";
      this.stage = "loading-engine";
      this.fileName = file.name;
      this.originalFile = file;
      this.result = null;
      this.errorMessage = null;

      try {
        const result = await compress({
          file,
          preset: this.preset,
          onStage: (stage) => {
            this.stage = stage;
            this.status = stage === "loading-engine" ? "preparing" : "running";
          }
        });
        // If Ghostscript could not shrink an already-optimized PDF (output is the
        // same size or larger), keep the original file so the download is never
        // bigger than what the user provided.
        if (result.compressedSize >= result.originalSize) {
          this.result = {
            fileName: result.fileName,
            originalSize: result.originalSize,
            compressedSize: result.originalSize,
            bytes: new Uint8Array(await file.arrayBuffer())
          };
        } else {
          this.result = result;
        }
        this.status = "done";
        this.stage = null;
      } catch (error) {
        this.status = "error";
        this.stage = null;
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while compressing.";
      }
    }
  }
});
