import { computed, markRaw, ref } from "vue";
import { defineStore } from "pinia";
import { imageFileSchema } from "~/schemas/imageFile";
import { detectSourceFormat } from "~/utils/imageConvert";

export type ImageJobStatus = "idle" | "ready" | "working" | "done";
export type ImageJobItemStatus = "pending" | "working" | "done" | "error";

/** One queued image with its (optional) processed result. */
export interface ImageJobItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  previewUrl: string;
  /** True when the source codec could carry transparency (all but JPEG). */
  mayHaveAlpha: boolean;
  status: ImageJobItemStatus;
  resultBlob: Blob | null;
  resultUrl: string | null;
  resultSize: number;
  resultName: string;
  /** Result pixel size; null when the tool does not report one. */
  resultDimensions: { width: number; height: number } | null;
  error: string | null;
}

/** What the per-file processor returns for one file. */
export interface ImageJobOutcome {
  blob: Blob;
  /** Output file extension without a dot. */
  extension: string;
  width?: number;
  height?: number;
}

export interface ImageJobStoreOptions<TSettings extends object> {
  defaultSettings: () => TSettings;
  /** Inserted into the output name before the extension, e.g. "-converted". */
  suffix: string;
  /** Runs the actual conversion/resizing for one file. */
  process: (file: File, settings: TSettings) => Promise<ImageJobOutcome>;
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "image";
}

/**
 * Factory for the near-identical Converter / Resizer Pinia stores: a batch of
 * image files, one set of user settings, sequential processing with per-item
 * status, and result invalidation when settings change after a run.
 */
export function defineImageJobStore<TSettings extends object>(
  id: string,
  options: ImageJobStoreOptions<TSettings>
) {
  const { defaultSettings, suffix, process } = options;

  return defineStore(id, () => {
    const items = ref<ImageJobItem[]>([]);
    const status = ref<ImageJobStatus>("idle");
    const settings = ref<TSettings>(defaultSettings());
    const addError = ref<string | null>(null);

    const isBusy = computed(() => status.value === "working");
    const canRun = computed(() => items.value.length > 0 && status.value !== "working");
    const doneCount = computed(() => items.value.filter((item) => item.status === "done").length);
    const totalOriginalSize = computed(() =>
      items.value.reduce((sum, item) => sum + item.originalSize, 0)
    );
    const totalResultSize = computed(() =>
      items.value.reduce((sum, item) => sum + (item.status === "done" ? item.resultSize : 0), 0)
    );

    function addFiles(files: File[]): void {
      addError.value = null;
      if (status.value === "done") clearResults();
      let rejected = 0;
      for (const file of files) {
        if (!imageFileSchema.safeParse(file).success) {
          rejected += 1;
          continue;
        }
        items.value.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          originalSize: file.size,
          previewUrl: URL.createObjectURL(file),
          mayHaveAlpha: detectSourceFormat(file.type, file.name) !== "jpeg",
          status: "pending",
          resultBlob: null,
          resultUrl: null,
          resultSize: 0,
          resultName: file.name,
          resultDimensions: null,
          error: null
        });
      }
      if (items.value.length > 0 && status.value !== "working") status.value = "ready";
      if (rejected > 0) {
        addError.value = `Skipped ${rejected} file${rejected > 1 ? "s" : ""} that ${rejected > 1 ? "are" : "is"} not a supported image.`;
      }
    }

    function remove(id: string): void {
      const item = items.value.find((entry) => entry.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      items.value = items.value.filter((entry) => entry.id !== id);
      if (items.value.length === 0) reset();
    }

    /** Merges a settings patch; a finished run is invalidated so the user re-runs. */
    function setSettings(patch: Partial<TSettings>): void {
      settings.value = { ...settings.value, ...patch };
      if (status.value === "done") clearResults();
    }

    async function processAll(): Promise<void> {
      if (items.value.length === 0) return;
      status.value = "working";
      // Sequential: keeps peak memory low for large batches.
      for (const item of items.value) {
        item.status = "working";
        item.error = null;
        try {
          const outcome = await process(item.file, settings.value);
          if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
          item.resultBlob = markRaw(outcome.blob);
          item.resultSize = outcome.blob.size;
          item.resultUrl = URL.createObjectURL(outcome.blob);
          item.resultName = `${baseName(item.name)}${suffix}.${outcome.extension}`;
          item.resultDimensions =
            outcome.width != null && outcome.height != null
              ? { width: outcome.width, height: outcome.height }
              : null;
          item.status = "done";
        } catch (error) {
          item.status = "error";
          item.error = error instanceof Error ? error.message : "Could not process this image.";
        }
      }
      status.value = "done";
    }

    function clearResults(): void {
      for (const item of items.value) {
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        item.resultBlob = null;
        item.resultUrl = null;
        item.resultSize = 0;
        item.resultName = item.name;
        item.resultDimensions = null;
        item.status = "pending";
        item.error = null;
      }
      if (items.value.length > 0) status.value = "ready";
    }

    function reset(): void {
      for (const item of items.value) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      }
      items.value = [];
      status.value = "idle";
      addError.value = null;
      settings.value = defaultSettings();
    }

    return {
      items,
      status,
      settings,
      addError,
      isBusy,
      canRun,
      doneCount,
      totalOriginalSize,
      totalResultSize,
      addFiles,
      remove,
      setSettings,
      processAll,
      clearResults,
      reset
    };
  });
}
