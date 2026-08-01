<script setup lang="ts">
import type { MergeMode } from "~/stores/merge";
import { formatBytes } from "~/utils/formatBytes";
import { toCompressedFileName } from "~/utils/pdf";

useSeoMeta({
  title: "Merge PDF - Ono Toolkit",
  description:
    "Combine several PDFs into one in your browser, reorder them by drag or buttons, then optionally compress the result. Private and free - nothing is uploaded."
});

const store = useMergeStore();
const { download } = useFileDownload();

function onSelectFiles(files: File[]): void {
  void store.addFiles(files);
}

function downloadMerged(): void {
  if (store.mergedBytes) download(store.mergedBytes, store.mergedFileName);
}

function downloadCompressed(): void {
  if (store.compressResult) {
    download(store.compressResult.bytes, toCompressedFileName(store.mergedFileName));
  }
}

const showIntake = computed(
  () => store.status === "idle" || store.status === "ready" || store.status === "error"
);

const modeOptions: { value: MergeMode; icon: string; label: string }[] = [
  { value: "files", icon: "i-lucide-files", label: "Whole files" },
  { value: "pages", icon: "i-lucide-layout-grid", label: "Pages" }
];

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Merge PDF"
    description="Combine several PDFs into one, in the order you choose."
    icon="i-lucide-combine"
    wide
    privacy-note="Your PDFs are combined locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <template v-if="showIntake">
        <ToolDropzone
          multiple
          :disabled="store.isBusy"
          hint="Add two or more PDFs"
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
          <div class="flex flex-wrap items-center justify-between gap-2 px-1">
            <p class="text-highlighted text-sm font-semibold">
              {{ store.items.length }} file{{ store.items.length > 1 ? "s" : "" }}
              <span class="text-dimmed font-normal">· {{ formatBytes(store.totalSize) }}</span>
            </p>
            <div class="flex items-center gap-2">
              <div class="border-default flex items-center gap-0.5 rounded-lg border p-0.5">
                <UButton
                  v-for="option in modeOptions"
                  :key="option.value"
                  :icon="option.icon"
                  size="sm"
                  :color="store.mode === option.value ? 'primary' : 'neutral'"
                  :variant="store.mode === option.value ? 'soft' : 'ghost'"
                  :disabled="store.buildingPages"
                  @click="store.setMode(option.value)"
                >
                  {{ option.label }}
                </UButton>
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
          </div>

          <template v-if="store.mode === 'files'">
            <MergeFileList
              :items="store.items"
              @move="store.move"
              @remove="store.remove"
              @reorder="store.reorder"
            />
            <p class="text-dimmed text-xs">Drag rows, or use the arrows, to set the merge order.</p>
          </template>

          <template v-else>
            <AppCard v-if="store.buildingPages">
              <div class="flex flex-col items-center gap-3 py-4 text-center">
                <UIcon name="i-lucide-loader-circle" class="text-primary size-6 animate-spin" />
                <p class="text-highlighted font-semibold">Loading pages...</p>
              </div>
            </AppCard>
            <template v-else>
              <PageOrganizer
                :pages="store.pages"
                selectable
                rotatable
                reorderable
                @toggle="store.togglePage"
                @rotate="store.rotatePage"
                @move="store.movePage"
                @reorder="store.reorderPages"
                @select-all="store.selectAllPages"
                @select-none="store.selectNonePages"
                @request-thumb="store.ensurePageThumb"
              />
              <p class="text-dimmed text-xs">
                Select, drag to reorder, and rotate individual pages across all files.
              </p>
            </template>
          </template>

          <UButton
            color="primary"
            icon="i-lucide-combine"
            size="lg"
            block
            :disabled="!store.canMerge"
            @click="store.merge()"
          >
            {{ store.mode === "pages" ? `Merge ${store.selectedPageCount} pages` : "Merge PDFs" }}
          </UButton>
        </template>
      </template>

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="store.errorMessage ?? 'Please try different PDFs.'"
      />

      <AppCard v-if="store.status === 'merging'">
        <div class="flex flex-col items-center gap-3 py-4 text-center">
          <span
            class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full"
          >
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
          </span>
          <p class="text-highlighted font-semibold">Merging your PDFs...</p>
        </div>
      </AppCard>

      <ToolProgress
        v-if="store.status === 'compressing'"
        :stage="store.compressStage"
        :file-name="store.mergedFileName"
      />

      <template v-if="store.status === 'merged'">
        <AppCard>
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <UIcon name="i-lucide-circle-check" class="size-6" />
              </span>
              <div>
                <p class="text-highlighted font-semibold">Merged!</p>
                <p class="text-dimmed max-w-xs truncate text-xs">{{ store.mergedFileName }}</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="bg-muted rounded-lg px-2 py-3">
                <p class="text-dimmed text-xs">Files</p>
                <p class="text-highlighted font-semibold">{{ store.items.length }}</p>
              </div>
              <div class="bg-muted rounded-lg px-2 py-3">
                <p class="text-dimmed text-xs">Pages</p>
                <p class="text-highlighted font-semibold">{{ store.mergedPageCount ?? "-" }}</p>
              </div>
              <div class="bg-muted rounded-lg px-2 py-3">
                <p class="text-dimmed text-xs">Size</p>
                <p class="text-highlighted font-semibold">
                  {{ formatBytes(store.mergedSize ?? 0) }}
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row">
              <UButton
                color="primary"
                icon="i-lucide-download"
                size="lg"
                block
                @click="downloadMerged()"
              >
                Download
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                size="lg"
                block
                @click="store.reset()"
              >
                Start over
              </UButton>
            </div>
          </div>
        </AppCard>

        <MergeCompressPrompt />
      </template>

      <template v-if="store.status === 'compressed' && store.compressResult">
        <ToolResultCard
          :result="store.compressResult"
          reset-label="Start over"
          @download="downloadCompressed"
          @reset="store.reset"
        />
        <div class="text-center">
          <UButton
            icon="i-lucide-download"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="downloadMerged()"
          >
            Download the uncompressed merged PDF instead
          </UButton>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>
