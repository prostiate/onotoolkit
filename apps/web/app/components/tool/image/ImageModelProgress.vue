<script setup lang="ts">
/**
 * Shared busy/progress panel for the in-browser image tools. Makes the one-time
 * model download explicit so a slow first run does not look like a hang.
 */
const props = defineProps<{
  /** "downloading-model" shows the first-run notice; "processing" = inference. */
  phase: "downloading-model" | "loading-model" | "processing" | null;
  /** 0..1 when known, otherwise null for an indeterminate bar. */
  progress: number | null;
  /** Human-readable model size, e.g. "~28 MB". */
  modelSize: string;
  /** Verb shown while actually crunching, e.g. "Removing background". */
  processingLabel: string;
}>();

const percent = computed(() =>
  props.progress === null ? null : Math.max(0, Math.min(100, Math.round(props.progress * 100)))
);

const isDownloading = computed(() => props.phase === "downloading-model");
const isProcessing = computed(() => props.phase === "processing");
const heading = computed(() =>
  isProcessing.value ? `${props.processingLabel}…` : "Preparing the model…"
);
</script>

<template>
  <AppCard>
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <span
          class="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-lg"
        >
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        </span>
        <div class="min-w-0">
          <p class="text-highlighted font-semibold">{{ heading }}</p>
          <p class="text-dimmed text-xs">
            <template v-if="isDownloading">
              First run downloads the AI model ({{ modelSize }}) to your device. It is cached
              afterwards, so later runs start instantly.
            </template>
            <template v-else>
              Everything runs locally in your browser - nothing is uploaded.
            </template>
          </p>
        </div>
      </div>

      <UProgress v-if="percent !== null" :model-value="percent" :max="100" size="md" />
      <UProgress v-else animation="carousel" size="md" />

      <p v-if="percent !== null" class="text-dimmed text-right text-xs tabular-nums">
        {{ percent }}%
      </p>
    </div>
  </AppCard>
</template>
