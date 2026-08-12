<script setup lang="ts">
import { Motion } from "motion-v";
import type { DropdownMenuItem } from "@nuxt/ui";
import type { ImageJobItem } from "~/stores/imageJob";
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "Image Resizer - Ono Toolkit",
  description:
    "Resize images by percentage, exact pixels, or a target file size - with quality control - all in your browser. Private and free - nothing is uploaded."
});

const store = useImageResizerStore();
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

/** "Exact size" mode needs at least one dimension. */
const dimensionsInvalid = computed(
  () =>
    store.settings.mode === "dimensions" &&
    store.settings.width == null &&
    store.settings.height == null
);

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
  download(await zip(entries), "resized-images.zip", "application/zip");
}

/** Saves each resized file separately (browsers may prompt once). */
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
    title="Image Resizer"
    description="Resize by percentage, exact pixels, or a target file size - with full quality control."
    icon="i-lucide-scaling"
    wide
    privacy-note="Your images are resized locally in your browser and never uploaded."
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
          <div class="flex items-center gap-2">
            <AddFilesButton
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/x-icon,image/vnd.microsoft.icon,image/avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.ico,.avif"
              label="Add more images"
              @select-files="onSelectFiles"
            />
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
        </div>

        <ResizeControls
          :settings="store.settings"
          :show-transparency="store.items.some((item) => item.mayHaveAlpha)"
          :avif-supported="avifSupported"
          @update:settings="store.setSettings"
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
          badge-kind="savings"
          download-aria-label="Download resized image"
          @remove="store.remove"
          @download="onDownload"
          @preview="onPreview"
        />

        <UButton
          v-if="store.status !== 'done'"
          color="primary"
          icon="i-lucide-scaling"
          size="lg"
          block
          :loading="store.isBusy"
          :disabled="!store.canRun || dimensionsInvalid"
          @click="store.processAll()"
        >
          {{ store.isBusy ? "Resizing…" : "Resize images" }}
        </UButton>

        <UAlert
          v-if="dimensionsInvalid"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Enter a width or a height"
          description="Leave one field empty to keep the aspect ratio - at least one dimension is needed."
        />

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
                  Resized {{ store.doneCount }} of {{ store.items.length }}
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
        after-label="Resized"
      />
    </div>
  </ToolLayout>
</template>
