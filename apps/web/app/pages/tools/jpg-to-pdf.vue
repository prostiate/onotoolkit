<script setup lang="ts">
import type { MarginMode, PageSizeMode } from "~/composables/useImageToPdf";
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "JPG to PDF - Ono Toolkit",
  description:
    "Convert JPG, PNG, or WebP images into a single PDF in your browser - reorder pages and choose page size. Private and free; nothing is uploaded."
});

const store = useJpgToPdfStore();
const { download } = useFileDownload();

function onSelectFiles(files: File[]): void {
  store.addFiles(files);
}
function onDownload(): void {
  if (store.resultBytes) download(store.resultBytes, store.resultName);
}

const pageSizes: { value: PageSizeMode; label: string }[] = [
  { value: "fit", label: "Fit to image" },
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" }
];
const margins: { value: MarginMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "large", label: "Large" }
];

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="JPG to PDF"
    description="Combine images into a single PDF, in the order you choose."
    icon="i-lucide-image"
    wide
    privacy-note="Your images are converted locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <ToolDropzone
        v-if="store.status === 'idle' || store.status === 'ready' || store.status === 'error'"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        hint="JPG, PNG or WebP - add one or more"
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

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="store.errorMessage ?? 'Please try different images.'"
      />

      <template v-if="store.items.length > 0 && store.status !== 'done'">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-1.5">
            <label class="text-muted text-xs font-medium">Page size</label>
            <USelect
              :model-value="store.pageSize"
              :items="pageSizes"
              value-key="value"
              size="sm"
              class="w-32"
              @update:model-value="store.setPageSize($event as PageSizeMode)"
            />
            <label class="text-muted ml-2 text-xs font-medium">Margin</label>
            <USelect
              :model-value="store.margin"
              :items="margins"
              value-key="value"
              size="sm"
              class="w-24"
              @update:model-value="store.setMargin($event as MarginMode)"
            />
          </div>
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

        <ImageFileList
          :items="store.items"
          @move="store.move"
          @remove="store.remove"
          @reorder="store.reorder"
        />
        <p class="text-dimmed text-xs">Drag, or use the arrows, to set the page order.</p>

        <UButton
          color="primary"
          icon="i-lucide-file-output"
          size="lg"
          block
          :loading="store.isBusy"
          :disabled="!store.canBuild"
          @click="store.build()"
        >
          Create PDF
        </UButton>
      </template>

      <template v-if="store.status === 'done' && store.resultBytes">
        <AppCard>
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <UIcon name="i-lucide-circle-check" class="size-6" />
              </span>
              <div>
                <p class="text-highlighted font-semibold">PDF ready!</p>
                <p class="text-dimmed max-w-xs truncate text-xs">
                  {{ store.resultName }} · {{ formatBytes(store.resultBytes.length) }}
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
                @click="store.backToImages()"
              >
                Back to images
              </UButton>
            </div>
          </div>
        </AppCard>
      </template>
    </div>
  </ToolLayout>
</template>
