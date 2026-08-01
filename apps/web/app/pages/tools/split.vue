<script setup lang="ts">
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "Split PDF - Ono Toolkit",
  description:
    "Split a PDF in your browser: extract selected pages into one file, or break it into several PDFs (by ranges or per page) as a ZIP. Private and free - nothing is uploaded."
});

const store = useSplitStore();
const { download } = useFileDownload();

function onSelect(file: File): void {
  void store.load(file);
}

function onDownload(): void {
  if (store.result) download(store.result.bytes, store.result.fileName, store.result.mimeType);
}

const rangeModes: { value: "ranges" | "perPage"; label: string }[] = [
  { value: "ranges", label: "Custom ranges" },
  { value: "perPage", label: "One file per page" }
];

const rangeModel = computed<string>({
  get: () => store.rangeInput,
  set: (value) => store.setRangeInput(value)
});

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Split PDF"
    description="Extract pages into one file, or split into several."
    icon="i-lucide-scissors"
    wide
    privacy-note="Your PDF is split locally in your browser and never uploaded."
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
          <span
            class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full"
          >
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
          </span>
          <p class="text-highlighted font-semibold">Working...</p>
        </div>
      </AppCard>

      <template v-if="store.status === 'ready' && store.source">
        <div class="flex items-center justify-between px-1">
          <p class="text-highlighted text-sm font-semibold">
            {{ store.source.name }}
            <span class="text-dimmed font-normal">· {{ store.pageCount }} pages</span>
          </p>
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

        <div class="grid gap-4 md:grid-cols-2">
          <AppCard>
            <div class="space-y-3">
              <div>
                <p class="text-highlighted font-semibold">Extract selected pages</p>
                <p class="text-muted text-sm">
                  Combine the {{ store.selectedIndices.length }} selected page{{
                    store.selectedIndices.length === 1 ? "" : "s"
                  }}
                  into a single PDF.
                </p>
              </div>
              <UButton
                color="primary"
                icon="i-lucide-file-output"
                size="lg"
                block
                :disabled="store.selectedIndices.length === 0"
                @click="store.extract()"
              >
                Extract to one PDF
              </UButton>
            </div>
          </AppCard>

          <AppCard>
            <div class="space-y-3">
              <div>
                <p class="text-highlighted font-semibold">Split into separate files</p>
                <p class="text-muted text-sm">Download several PDFs as a ZIP.</p>
              </div>

              <div class="border-default flex items-center gap-0.5 rounded-lg border p-0.5">
                <UButton
                  v-for="mode in rangeModes"
                  :key="mode.value"
                  size="sm"
                  block
                  :color="store.rangeMode === mode.value ? 'primary' : 'neutral'"
                  :variant="store.rangeMode === mode.value ? 'soft' : 'ghost'"
                  @click="store.setRangeMode(mode.value)"
                >
                  {{ mode.label }}
                </UButton>
              </div>

              <UInput
                v-if="store.rangeMode === 'ranges'"
                v-model="rangeModel"
                placeholder="e.g. 1-3, 4, 5-8"
                icon="i-lucide-list"
              />

              <UButton
                color="primary"
                icon="i-lucide-package"
                size="lg"
                block
                @click="store.splitToZip()"
              >
                Split into ZIP
              </UButton>
            </div>
          </AppCard>
        </div>
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
