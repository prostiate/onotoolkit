<script setup lang="ts">
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "Rotate PDF - Ono Toolkit",
  description:
    "Rotate PDF pages in your browser - turn individual pages or the whole document to the correct orientation, then download. Private and free - nothing is uploaded."
});

const store = useRotateStore();
const { download } = useFileDownload();

function onSelect(file: File): void {
  void store.load(file);
}

function onDownload(): void {
  if (store.result) download(store.result.bytes, store.result.fileName);
}

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Rotate PDF"
    description="Turn pages to the correct orientation, then download."
    icon="i-lucide-rotate-cw"
    wide
    privacy-note="Your PDF is rotated locally in your browser and never uploaded."
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
          rotatable
          @rotate="store.rotate"
          @rotate-all="store.rotateAll"
          @request-thumb="store.ensureThumbnail"
        />

        <UButton
          color="primary"
          icon="i-lucide-download"
          size="lg"
          block
          :disabled="!store.hasRotation"
          @click="store.apply()"
        >
          {{ store.hasRotation ? "Apply rotation & download" : "Rotate a page to continue" }}
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
                <p class="text-highlighted font-semibold">Rotated!</p>
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
      </template>
    </div>
  </ToolLayout>
</template>
