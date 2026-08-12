<script setup lang="ts">
import { Motion } from "motion-v";
import { formatBytes } from "~/utils/formatBytes";
import { formatRecordingDuration } from "~/utils/screenRecorder";

const store = useScreenRecorderStore();

const result = computed(() => store.result);

const emit = defineEmits<{ restart: [] }>();

function onDownload(): void {
  if (!result.value) return;
  const { downloadBlob } = useFileDownload();
  downloadBlob(result.value.blob, result.value.fileName);
}
</script>

<template>
  <Motion
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ type: 'spring', stiffness: 260, damping: 22 }"
  >
    <AppCard>
      <div v-if="result" class="space-y-5">
        <div class="flex items-center gap-3">
          <span
            class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <UIcon name="i-lucide-circle-check" class="size-6" />
          </span>
          <div>
            <p class="text-highlighted font-semibold">Recording ready</p>
            <p class="text-dimmed max-w-xs truncate text-xs">{{ result.fileName }}</p>
          </div>
        </div>

        <video
          :src="result.url"
          controls
          class="bg-black max-h-[56vh] w-full rounded-xl"
          data-testid="recording-preview"
        />

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Duration</p>
            <p class="text-highlighted font-semibold">
              {{ formatRecordingDuration(result.durationMs) }}
            </p>
          </div>
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Size</p>
            <p class="text-highlighted font-semibold">{{ formatBytes(result.blob.size) }}</p>
          </div>
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Format</p>
            <p class="text-highlighted font-semibold uppercase">
              {{ result.mimeType.includes("mp4") ? "MP4" : "WebM" }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row">
          <UButton color="primary" icon="i-lucide-download" size="lg" block @click="onDownload()">
            Download
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-ccw"
            size="lg"
            block
            @click="emit('restart')"
          >
            Record another
          </UButton>
        </div>
      </div>
    </AppCard>
  </Motion>
</template>
