<script setup lang="ts">
import { Motion } from "motion-v";
import type { DropdownMenuItem } from "@nuxt/ui";
import type { ImageJobItem } from "~/stores/imageJob";
import type { ConverterSettings } from "~/stores/imageConverter";
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "Image Converter - Ono Toolkit",
  description:
    "Convert images between JPG, PNG, WebP, GIF, BMP, ICO, and AVIF - right in your browser. PNG to ICO favicons included. Private and free - nothing is uploaded."
});

const store = useImageConverterStore();
const { downloadBlob, download } = useFileDownload();

const previewId = ref<string | null>(null);
const previewItem = computed<ImageJobItem | null>(
  () => store.items.find((item) => item.id === previewId.value) ?? null
);
const previewOpen = computed({
  get: () => previewId.value !== null,
  set: (value: boolean) => {
    if (!value) previewId.value = null;
  }
});

// AVIF needs the browser's native encoder (Chrome/Edge); detect on mount.
const avifSupported = ref(false);
onMounted(async () => {
  avifSupported.value = await useImageConvert().canEncodeAvif();
});

const doneItems = computed(() => store.items.filter((item) => item.resultBlob));

function onSelectFiles(files: File[]): void {
  store.addFiles(files);
}
function onDownload(id: string): void {
  const item = store.items.find((entry) => entry.id === id);
  if (item?.resultBlob) downloadBlob(item.resultBlob, item.resultName);
}
function onPreview(id: string): void {
  previewId.value = id;
}

/** "Use source quality" swaps the whole quality mode; stale overrides are cleared. */
function onUseSourceQuality(value: boolean): void {
  store.setSettings({ useSourceQuality: value });
  if (value) store.clearOverrideFields(["quality"]);
}

async function onDownloadZip(): Promise<void> {
  if (doneItems.value.length === 0) return;
  const { zip } = useZip();
  const entries: Record<string, Uint8Array> = {};
  const seen = new Map<string, number>();
  for (const item of doneItems.value) {
    // De-dupe identical output names within the ZIP.
    const count = seen.get(item.resultName) ?? 0;
    seen.set(item.resultName, count + 1);
    const name =
      count === 0 ? item.resultName : item.resultName.replace(/(\.[^.]+)$/, `-${count}$1`);
    entries[name] = new Uint8Array(await item.resultBlob!.arrayBuffer());
  }
  download(await zip(entries), "converted-images.zip", "application/zip");
}

/** Saves each converted file separately (browsers may prompt once). */
async function onDownloadSeparate(): Promise<void> {
  for (const item of doneItems.value) {
    if (!item.resultBlob) continue;
    downloadBlob(item.resultBlob, item.resultName);
    // Small gap so the browser doesn't drop rapid successive downloads.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const downloadItems = computed<DropdownMenuItem[]>(() => [
  { label: "As ZIP", icon: "i-lucide-file-archive", onSelect: () => void onDownloadZip() },
  {
    label: "Separate files",
    icon: "i-lucide-files",
    onSelect: () => void onDownloadSeparate()
  }
]);

const reduceMotion = ref(false);
onMounted(() => {
  reduceMotion.value = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
});

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Image Converter"
    description="Convert between JPG, PNG, WebP, GIF, BMP, ICO, and AVIF - all in your browser."
    icon="i-lucide-repeat-2"
    wide
    privacy-note="Your images are converted locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <ToolDropzone
        v-if="store.status === 'idle'"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/x-icon,image/vnd.microsoft.icon,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.ico,.avif"
        hint="JPG, PNG, WebP, GIF, BMP, ICO or AVIF - add one or more"
        label="Drop your images here, or tap to browse"
        @select-files="onSelectFiles"
      />

      <UAlert
        v-if="store.addError"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :description="store.addError"
      />

      <template v-if="store.items.length > 0">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-muted text-sm font-medium">
            {{ store.items.length }} image{{ store.items.length > 1 ? "s" : "" }}
          </p>
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="store.reset()"
          >
            Clear all
          </UButton>
        </div>

        <ConvertControls
          :settings="store.settings"
          :show-transparency="store.items.some((item) => item.mayHaveAlpha)"
          :avif-supported="avifSupported"
          @update:format="(v: ConverterSettings['format']) => store.setSettings({ format: v })"
          @update:quality="(v: number) => store.setSettings({ quality: v })"
          @update:bg-color="(v: string) => store.setSettings({ bgColor: v })"
          @update:use-source-quality="onUseSourceQuality"
        />

        <Motion
          v-if="store.doneCount > 0"
          :initial="{ opacity: 0, y: 6 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ type: 'spring', stiffness: 260, damping: 22 }"
        >
          <p
            class="text-muted bg-primary/5 border-primary/15 flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs"
          >
            <Motion
              class="inline-flex"
              :animate="reduceMotion ? {} : { scale: [1, 1.25, 1] }"
              :transition="
                reduceMotion ? {} : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
              "
            >
              <UIcon name="i-lucide-eye" class="text-primary size-4" />
            </Motion>
            <span>Click any image to compare <strong>before &amp; after</strong>.</span>
          </p>
        </Motion>

        <ImageJobList
          :items="store.items"
          badge-kind="format"
          download-aria-label="Download converted image"
          show-per-item-settings
          :bulk-format="store.settings.format"
          :bulk-quality="store.settings.quality"
          :use-source-quality="store.settings.useSourceQuality"
          :avif-supported="avifSupported"
          @remove="store.remove"
          @download="onDownload"
          @preview="onPreview"
          @settings-override="store.setSettingsOverride"
        />

        <UButton
          v-if="store.status !== 'done'"
          color="primary"
          icon="i-lucide-repeat-2"
          size="lg"
          block
          :loading="store.isBusy"
          :disabled="!store.canRun"
          @click="store.processAll()"
        >
          {{ store.isBusy ? "Converting…" : "Convert images" }}
        </UButton>

        <AppCard v-if="store.status === 'done'">
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <UIcon name="i-lucide-circle-check" class="size-6" />
              </span>
              <div>
                <p class="text-highlighted font-semibold">
                  Converted {{ store.doneCount }} of {{ store.items.length }}
                </p>
                <p class="text-dimmed text-xs">
                  {{ formatBytes(store.totalOriginalSize) }} →
                  {{ formatBytes(store.totalResultSize) }}
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UDropdownMenu :items="downloadItems" class="sm:flex-1">
                <UButton
                  color="primary"
                  icon="i-lucide-download"
                  trailing-icon="i-lucide-chevron-down"
                  size="lg"
                  block
                >
                  Download all
                </UButton>
              </UDropdownMenu>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                size="lg"
                block
                class="sm:flex-1"
                @click="store.reset()"
              >
                Start over
              </UButton>
            </div>
          </div>
        </AppCard>
      </template>

      <ImageCompareModal
        v-model:open="previewOpen"
        :item="previewItem"
        before-label="Original"
        after-label="Converted"
      />
    </div>
  </ToolLayout>
</template>
