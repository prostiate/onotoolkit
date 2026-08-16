<script setup lang="ts">
/**
 * Quality picker for the background remover, shown *before* an image is chosen
 * so the one-time model download is a decision rather than a surprise: each
 * option states what it will fetch on the first run.
 */
import { backgroundRemovalQualityOptions } from "~/schemas/backgroundRemover";
import type { BackgroundRemovalQuality } from "~/types/tools";
import { formatBytes } from "~/utils/formatBytes";

const props = defineProps<{ quality: BackgroundRemovalQuality; disabled?: boolean }>();
const emit = defineEmits<{ "update:quality": [quality: BackgroundRemovalQuality] }>();

const active = computed(
  () =>
    backgroundRemovalQualityOptions.find((option) => option.value === props.quality) ??
    backgroundRemovalQualityOptions[0]!
);

/** Whole megabytes - a decimal place implies a precision nobody needs here. */
function downloadLabel(bytes: number): string {
  return `~${formatBytes(bytes, 0)}`;
}

function select(quality: BackgroundRemovalQuality): void {
  if (!props.disabled) emit("update:quality", quality);
}
</script>

<template>
  <div class="space-y-2">
    <p class="text-highlighted text-sm font-semibold">Cutout quality</p>
    <div class="grid gap-2 sm:grid-cols-2" role="group" aria-label="Cutout quality">
      <button
        v-for="option in backgroundRemovalQualityOptions"
        :key="option.value"
        type="button"
        :aria-pressed="quality === option.value"
        :disabled="disabled"
        class="rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60"
        :class="
          quality === option.value
            ? 'border-primary bg-primary/10 ring-primary/30 ring-2'
            : 'border-default bg-default hover:bg-muted'
        "
        @click="select(option.value)"
      >
        <span
          class="block text-sm font-semibold"
          :class="quality === option.value ? 'text-primary' : 'text-highlighted'"
        >
          {{ option.label
          }}<span v-if="option.value === 'small'" class="font-normal"> · default</span>
        </span>
        <span class="text-dimmed block text-xs">
          {{ downloadLabel(option.downloadBytes) }} one-time download
        </span>
      </button>
    </div>
    <p class="text-muted text-xs">{{ active.description }}</p>
    <p class="text-dimmed text-xs">
      The model is downloaded to your browser the first time you use this tool ({{
        downloadLabel(active.downloadBytes)
      }}
      for {{ active.label }}) and cached afterwards, so later images start instantly. Switching
      quality later downloads that model too. Nothing is uploaded - the download only ever goes one
      way.
    </p>
  </div>
</template>
