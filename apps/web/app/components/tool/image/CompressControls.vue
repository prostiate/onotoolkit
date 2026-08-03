<script setup lang="ts">
import type { CompressSettings, OutputFormatChoice } from "~/utils/image";

const props = defineProps<{ settings: CompressSettings; showTransparency: boolean }>();
const emit = defineEmits<{
  "update:quality": [value: number];
  "update:format": [value: OutputFormatChoice];
  "update:bgColor": [value: string];
}>();

const formats: { value: OutputFormatChoice; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" }
];

const hint = computed(() => {
  switch (props.settings.format) {
    case "jpeg":
      return "Lossy JPEG. Transparent images are flattened onto the background colour.";
    case "png":
      return "Lossless PNG (oxipng) - keeps transparency.";
    case "webp":
      return "Lossy WebP - smaller files, keeps transparency.";
    default:
      return "Keep each file's format: JPEG→JPEG, PNG→PNG (lossless), WebP→WebP.";
  }
});

// Quality has no effect on a pure-PNG output.
const showQuality = computed(() => props.settings.format !== "png");
// A JPEG target needs a background colour only when transparency is in play.
const showBgColor = computed(() => props.settings.format === "jpeg" && props.showTransparency);
</script>

<template>
  <AppCard>
    <div class="space-y-5">
      <!-- Output format -->
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Output format</label>
        <UButton
          v-for="option in formats"
          :key="option.value"
          :color="settings.format === option.value ? 'primary' : 'neutral'"
          :variant="settings.format === option.value ? 'solid' : 'outline'"
          size="sm"
          @click="emit('update:format', option.value)"
        >
          {{ option.label }}
        </UButton>
      </div>
      <p class="text-dimmed -mt-3 pl-28 text-xs">{{ hint }}</p>

      <!-- Quality (lossy JPEG/WebP encodes) -->
      <div v-if="showQuality" class="flex items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Quality</label>
        <USlider
          :model-value="settings.quality"
          :min="30"
          :max="100"
          :step="1"
          class="flex-1"
          @update:model-value="emit('update:quality', ($event as number) ?? settings.quality)"
        />
        <span class="text-dimmed w-8 text-right text-xs tabular-nums">{{ settings.quality }}</span>
      </div>

      <!-- Background colour for JPEG flattening -->
      <div v-if="showBgColor" class="flex items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Background</label>
        <input
          type="color"
          :value="settings.bgColor"
          class="border-default h-7 w-9 cursor-pointer rounded border bg-transparent p-0"
          aria-label="JPEG background colour for transparent images"
          @input="emit('update:bgColor', ($event.target as HTMLInputElement).value)"
        />
        <span class="text-dimmed text-xs">Used where transparent pixels become opaque.</span>
      </div>
    </div>
  </AppCard>
</template>
