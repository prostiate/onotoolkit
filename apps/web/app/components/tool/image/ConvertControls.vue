<script setup lang="ts">
import { CONVERT_FORMATS, FORMAT_INFO, needsFlatten } from "~/utils/imageConvert";
import type { ConverterSettings } from "~/stores/imageConverter";

const props = defineProps<{
  settings: ConverterSettings;
  /** Whether any queued image may carry transparency (shows flatten controls). */
  showTransparency: boolean;
  /** False disables the AVIF option (browser cannot encode it). */
  avifSupported: boolean;
}>();

const emit = defineEmits<{
  "update:format": [value: ConverterSettings["format"]];
  "update:quality": [value: number];
  "update:bgColor": [value: string];
  "update:useSourceQuality": [value: boolean];
}>();

const hint = computed(() => {
  switch (props.settings.format) {
    case "jpeg":
      return "Lossy JPEG - transparent areas are flattened onto the background colour.";
    case "png":
      return "Lossless PNG (oxipng) - keeps transparency.";
    case "webp":
      return "Lossy WebP - smaller files, keeps transparency.";
    case "gif":
      return "Static GIF, up to 256 colours - transparent areas are flattened.";
    case "bmp":
      return "Uncompressed BMP (32-bit) - large files, keeps transparency.";
    case "ico":
      return "Windows icon with 16-256 px sizes embedded - great for favicons.";
    case "avif":
      return "Modern lossy AVIF (browser encoder) - keeps transparency.";
    default:
      return "";
  }
});

// Quality only affects lossy encodes; GIF is palette-limited but has no slider.
const showQuality = computed(() => FORMAT_INFO[props.settings.format].lossy);
// Flatten controls appear when the chosen format cannot store alpha.
const showBgColor = computed(
  () => props.showTransparency && needsFlatten(props.settings.format, true)
);
</script>

<template>
  <AppCard>
    <div class="space-y-5">
      <!-- Output format -->
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Output format">
        <span class="text-muted w-28 shrink-0 text-xs font-medium">Output format</span>
        <UButton
          v-for="format in CONVERT_FORMATS"
          :key="format"
          :color="settings.format === format ? 'primary' : 'neutral'"
          :variant="settings.format === format ? 'solid' : 'outline'"
          :aria-pressed="settings.format === format"
          :disabled="format === 'avif' && !avifSupported"
          size="sm"
          @click="emit('update:format', format)"
        >
          {{ FORMAT_INFO[format].label }}
        </UButton>
      </div>
      <p class="text-dimmed -mt-3 pl-28 text-xs">
        {{ hint }}
        <span v-if="settings.format === 'avif' && !avifSupported" class="text-warning">
          AVIF is not available in this browser (needs Chrome or Edge).
        </span>
      </p>

      <!-- Quality (lossy JPEG / WebP / AVIF encodes) -->
      <div v-if="showQuality" class="space-y-3">
        <div v-if="!settings.useSourceQuality" class="flex items-center gap-3">
          <label class="text-muted w-28 shrink-0 text-xs font-medium">Quality</label>
          <USlider
            :model-value="settings.quality"
            :min="30"
            :max="100"
            :step="1"
            aria-label="Conversion quality"
            class="flex-1"
            @update:model-value="emit('update:quality', ($event as number) ?? settings.quality)"
          />
          <span class="text-dimmed w-8 text-right text-xs tabular-nums">{{
            settings.quality
          }}</span>
        </div>
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <UCheckbox
            :model-value="settings.useSourceQuality"
            aria-label="Use source quality"
            @update:model-value="emit('update:useSourceQuality', ($event as boolean) ?? false)"
          />
          <span class="text-highlighted">Use source quality</span>
        </label>
        <p v-if="settings.useSourceQuality" class="text-dimmed -mt-1 pl-7 text-xs">
          Each image is re-encoded at its own quality (estimated from JPEG files, best quality for
          lossless sources) instead of a fixed value.
        </p>
      </div>

      <!-- Background colour for formats that flatten transparency -->
      <div v-if="showBgColor" class="flex items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Background</label>
        <input
          type="color"
          :value="settings.bgColor"
          class="border-default h-7 w-9 cursor-pointer rounded border bg-transparent p-0"
          aria-label="Background colour for transparent areas"
          @input="emit('update:bgColor', ($event.target as HTMLInputElement).value)"
        />
        <span class="text-dimmed text-xs">Used where transparent pixels become opaque.</span>
      </div>
    </div>
  </AppCard>
</template>
