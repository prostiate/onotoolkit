<script setup lang="ts">
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "PDF to JPG - Ono Toolkit",
  description:
    "Convert PDF pages to JPG images in your browser - pick pages and quality, download a single image or a ZIP. Private and free; nothing is uploaded."
});

const store = usePdfToJpgStore();
const { download } = useFileDownload();

function onSelect(file: File): void {
  void store.load(file);
}
function onDownload(): void {
  if (store.result) download(store.result.bytes, store.result.fileName, store.result.mimeType);
}

const scales: { value: number; label: string }[] = [
  { value: 1, label: "Standard (1x)" },
  { value: 2, label: "High (2x)" },
  { value: 3, label: "Max (3x)" }
];

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="PDF to JPG"
    description="Turn PDF pages into JPG images."
    icon="i-lucide-file-image"
    wide
    privacy-note="Your PDF is converted locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <ToolDropzone
        v-if="store.status === 'idle' || (store.status === 'error' && !store.source)"
        @select="onSelect"
      />

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="store.errorMessage ?? 'Please try a different PDF.'"
      />

      <AppCard v-if="store.status === 'working'">
        <div class="flex flex-col items-center gap-3 py-4 text-center">
          <UIcon name="i-lucide-loader-circle" class="text-primary size-6 animate-spin" />
          <p class="text-highlighted font-semibold">Working...</p>
        </div>
      </AppCard>

      <template v-if="store.status === 'ready' && store.source">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-1.5">
            <label class="text-muted text-xs font-medium">Quality</label>
            <USelect
              :model-value="store.scale"
              :items="scales"
              value-key="value"
              size="sm"
              class="w-36"
              @update:model-value="store.setScale(Number($event))"
            />
          </div>
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="store.reset()"
          >
            Choose another
          </UButton>
        </div>

        <PageOrganizer
          :pages="store.pages"
          selectable
          @toggle="store.toggle"
          @select-all="store.selectAll"
          @select-none="store.selectNone"
          @request-thumb="store.ensureThumbnail"
        />

        <UButton
          color="primary"
          icon="i-lucide-images"
          size="lg"
          block
          :disabled="store.selectedCount === 0"
          @click="store.convert()"
        >
          Convert {{ store.selectedCount }} page{{ store.selectedCount === 1 ? "" : "s" }} to JPG
        </UButton>
      </template>

      <template v-if="store.status === 'done' && store.result">
        <AppCard>
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <UIcon name="i-lucide-circle-check" class="size-6" />
              </span>
              <div>
                <p class="text-highlighted font-semibold">Ready!</p>
                <p class="text-dimmed max-w-xs truncate text-xs">
                  {{ store.result.fileName }} · {{ formatBytes(store.result.bytes.length) }}
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UButton
                color="primary"
                icon="i-lucide-download"
                size="lg"
                block
                @click="onDownload()"
              >
                Download
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-arrow-left"
                size="lg"
                block
                @click="store.backToPages()"
              >
                Back to pages
              </UButton>
            </div>
          </div>
        </AppCard>
      </template>
    </div>
  </ToolLayout>
</template>
