<script setup lang="ts">
import { compressPresetOptions } from "~/schemas/compress";
import { toCompressedFileName } from "~/utils/pdf";
import type { CompressPreset } from "~/types/tools";

useSeoMeta({
  title: "Compress PDF - Ono Toolkit",
  description:
    "Reduce PDF file size in your browser with adjustable quality. Private and free - nothing is uploaded."
});

const store = useCompressStore();
const { download } = useFileDownload();

const activePreset = computed(() =>
  compressPresetOptions.find((option) => option.value === store.preset)
);

function selectPreset(preset: CompressPreset): void {
  if (!store.isBusy) store.setPreset(preset);
}

async function onSelect(file: File): Promise<void> {
  await store.run(file);
}

function onDownload(): void {
  if (!store.result) return;
  download(store.result.bytes, toCompressedFileName(store.result.fileName));
}

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Compress PDF"
    description="Shrink your PDF while keeping it readable."
    icon="i-lucide-archive"
  >
    <div class="space-y-5">
      <AppCard v-if="store.status === 'idle' || store.status === 'error'">
        <div class="space-y-5">
          <div class="space-y-2">
            <p class="text-highlighted text-sm font-semibold">Compression level</p>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                v-for="option in compressPresetOptions"
                :key="option.value"
                type="button"
                class="rounded-lg border px-3 py-2.5 text-left transition-colors"
                :class="
                  store.preset === option.value
                    ? 'border-primary bg-primary/10 ring-primary/30 ring-2'
                    : 'border-default bg-default hover:bg-muted'
                "
                @click="selectPreset(option.value)"
              >
                <span
                  class="block text-sm font-semibold"
                  :class="store.preset === option.value ? 'text-primary' : 'text-highlighted'"
                >
                  {{ option.label }}
                </span>
                <span class="text-dimmed block text-xs">{{ option.dpi }} dpi</span>
              </button>
            </div>
            <p class="text-muted text-xs">{{ activePreset?.description }}</p>
          </div>

          <ToolDropzone :disabled="store.isBusy" @select="onSelect" />
        </div>
      </AppCard>

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Could not compress this file"
        :description="store.errorMessage ?? 'Please try a different PDF.'"
      />

      <ToolProgress v-if="store.isBusy" :stage="store.stage" :file-name="store.fileName" />

      <template v-if="store.status === 'done' && store.result">
        <PdfComparePreview
          v-if="store.originalFile"
          :original-file="store.originalFile"
          :compressed-bytes="store.result.bytes"
        />
        <ToolResultCard :result="store.result" @download="onDownload" @reset="store.reset" />
      </template>
    </div>
  </ToolLayout>
</template>
