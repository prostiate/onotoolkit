import { computed, markRaw, shallowRef, ref } from "vue";
import { defineStore } from "pinia";
import { imageFileSchema } from "~/schemas/imageFile";
import { detectSourceFormat } from "~/utils/imageConvert";

export type ImageJobStatus = "idle" | "ready" | "working" | "done";
export type ImageJobItemStatus = "pending" | "working" | "done" | "error";

/** One queued image with its (optional) processed result. */
export interface ImageJobItem<TSettings extends object = object> {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  previewUrl: string;
  /** True when the source codec could carry transparency (all but JPEG). */
  mayHaveAlpha: boolean;
  /** Per-image settings that override the bulk settings; null follows the bulk. */
  settingsOverride: Partial<TSettings> | null;
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
 * Merges a per-image override onto the bulk settings. Explicit `undefined`
 * values are dropped so a partial override can never null a bulk setting.
 */
function mergeSettings<TSettings extends object>(
  bulk: TSettings,
  override: Partial<TSettings> | null
): TSettings {
  if (override === null) return bulk;
  const merged = { ...bulk } as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    const value = (override as Record<string, unknown>)[key];
    if (value !== undefined) merged[key] = value;
  }
  return merged as TSettings;
}

/**
 * Factory for the near-identical Converter / Resizer Pinia stores: a batch of
 * image files, one set of user settings, sequential processing with per-item
 * status, and result invalidation when settings change after a run. Items are
 * replaced immutably (shallowRef) so the generic settings type survives Pinia
 * unwrapping untouched.
 */
export function defineImageJobStore<TSettings extends object>(
  id: string,
  options: ImageJobStoreOptions<TSettings>
) {
  const { defaultSettings, suffix, process } = options;

  return defineStore(id, () => {
    const items = shallowRef<ImageJobItem<TSettings>[]>([]);
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

    /** Drops a finished item's result so it needs a re-run. */
    function withoutResult(item: ImageJobItem<TSettings>): ImageJobItem<TSettings> {
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      return {
        ...item,
        resultBlob: null,
        resultUrl: null,
        resultSize: 0,
        resultName: item.name,
        resultDimensions: null,
        status: "pending",
        error: null
      };
    }

    function addFiles(files: File[]): void {
      addError.value = null;
      if (status.value === "done") clearResults();
      const additions: ImageJobItem<TSettings>[] = [];
      let rejected = 0;
      for (const file of files) {
        if (!imageFileSchema.safeParse(file).success) {
          rejected += 1;
          continue;
        }
        additions.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          originalSize: file.size,
          previewUrl: URL.createObjectURL(file),
          mayHaveAlpha: detectSourceFormat(file.type, file.name) !== "jpeg",
          settingsOverride: null,
          status: "pending",
          resultBlob: null,
          resultUrl: null,
          resultSize: 0,
          resultName: file.name,
          resultDimensions: null,
          error: null
        });
      }
      items.value = [...items.value, ...additions];
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

    /**
     * Sets or clears one image's settings override (null = follow the bulk
     * settings). Only that image's finished result is invalidated.
     */
    function setSettingsOverride(id: string, patch: Partial<TSettings> | null): void {
      items.value = items.value.map((item) => {
        if (item.id !== id) return item;
        const settingsOverride =
          patch === null ? null : { ...(item.settingsOverride ?? {}), ...patch };
        return item.status === "done" && settingsOverride !== item.settingsOverride
          ? withoutResult({ ...item, settingsOverride })
          : { ...item, settingsOverride };
      });
    }

    /** Removes fields from every image's override (e.g. quality on mode swap). */
    function clearOverrideFields(fields: (keyof TSettings)[]): void {
      const fieldSet = new Set<string>(fields as string[]);
      items.value = items.value.map((item) => {
        if (item.settingsOverride === null) return item;
        const entries = Object.entries(item.settingsOverride).filter(([key]) => !fieldSet.has(key));
        const changed = entries.length !== Object.keys(item.settingsOverride).length;
        if (!changed) return item;
        const settingsOverride: Partial<TSettings> | null =
          entries.length === 0 ? null : (Object.fromEntries(entries) as Partial<TSettings>);
        return item.status === "done"
          ? withoutResult({ ...item, settingsOverride })
          : { ...item, settingsOverride };
      });
    }

    async function processAll(): Promise<void> {
      if (items.value.length === 0) return;
      status.value = "working";
      // Sequential: keeps peak memory low for large batches.
      for (const item of items.value) {
        let next: ImageJobItem<TSettings>;
        try {
          const outcome = await process(
            item.file,
            mergeSettings(settings.value, item.settingsOverride)
          );
          if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
          next = {
            ...item,
            resultBlob: markRaw(outcome.blob),
            resultSize: outcome.blob.size,
            resultUrl: URL.createObjectURL(outcome.blob),
            resultName: `${baseName(item.name)}${suffix}.${outcome.extension}`,
            resultDimensions:
              outcome.width != null && outcome.height != null
                ? { width: outcome.width, height: outcome.height }
                : null,
            status: "done",
            error: null
          };
        } catch (error) {
          next = {
            ...item,
            status: "error",
            error: error instanceof Error ? error.message : "Could not process this image."
          };
        }
        items.value = items.value.map((entry) => (entry.id === item.id ? next : entry));
      }
      status.value = "done";
    }

    function clearResults(): void {
      items.value = items.value.map(withoutResult);
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
      setSettingsOverride,
      clearOverrideFields,
      processAll,
      clearResults,
      reset
    };
  });
}
