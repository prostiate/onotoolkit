<script setup lang="ts">
import type { CompressSettings } from "~/utils/image";

defineProps<{ settings: CompressSettings; showTransparency: boolean }>();
const emit = defineEmits<{
  "update:quality": [value: number];
  "update:format": [value: CompressSettings["format"]];
  "update:pngLossless": [value: boolean];
  "update:flattenTransparent": [value: boolean];
  "update:flattenColor": [value: string];
}>();

const formats: { value: CompressSettings["format"]; label: string }[] = [
  { value: "original", label: "Keep original" },
  { value: "webp", label: "WebP" }
];
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
        <span class="text-dimmed text-xs">
          {{
            settings.format === "webp"
              ? "Smaller files, keeps transparency."
              : "JPEG stays JPEG, PNG stays PNG."
          }}
        </span>
      </div>

      <!-- Quality (lossy JPEG/WebP encodes) -->
      <div class="flex items-center gap-3">
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

      <!-- PNG lossless (only when keeping original format) -->
      <div v-if="settings.format === 'original' && showTransparency" class="flex items-start gap-3">
        <label class="text-muted w-28 shrink-0 pt-0.5 text-xs font-medium">PNG mode</label>
        <div class="space-y-2">
          <USwitch
            :model-value="settings.pngLossless"
            label="Lossless (keeps transparency)"
            @update:model-value="emit('update:pngLossless', $event)"
          />
          <p class="text-dimmed text-xs">
            {{
              settings.pngLossless
                ? "PNGs are optimised losslessly with oxipng."
                : "PNGs are re-encoded as lossy WebP (transparency kept, much smaller)."
            }}
          </p>
        </div>
      </div>

      <!-- Flatten transparency (only when keeping original format) -->
      <div v-if="settings.format === 'original' && showTransparency" class="flex items-start gap-3">
        <label class="text-muted w-28 shrink-0 pt-0.5 text-xs font-medium">Transparency</label>
        <div class="space-y-2">
          <USwitch
            :model-value="settings.flattenTransparent"
            label="Flatten onto a colour (saves as JPEG)"
            @update:model-value="emit('update:flattenTransparent', $event)"
          />
          <div v-if="settings.flattenTransparent" class="flex items-center gap-2">
            <span class="text-muted text-xs">Background</span>
            <input
              type="color"
              :value="settings.flattenColor"
              class="border-default h-7 w-9 cursor-pointer rounded border bg-transparent p-0"
              aria-label="Flatten background colour"
              @input="emit('update:flattenColor', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>
