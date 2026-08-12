<script setup lang="ts">
import type { OverlaySize, WebcamCorner } from "~/types/screenRecorder";

const store = useScreenRecorderStore();

const corners: { value: WebcamCorner; label: string; icon: string }[] = [
  { value: "top-left", label: "Top left", icon: "i-lucide-arrow-up-left" },
  { value: "top-right", label: "Top right", icon: "i-lucide-arrow-up-right" },
  { value: "bottom-left", label: "Bottom left", icon: "i-lucide-arrow-down-left" },
  { value: "bottom-right", label: "Bottom right", icon: "i-lucide-arrow-down-right" }
];

const sizes: { value: OverlaySize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" }
];

function onSizeChange(value: unknown): void {
  if (value === "small" || value === "medium" || value === "large") {
    store.setOverlaySize(value);
  }
}
</script>

<template>
  <div class="space-y-3">
    <div>
      <p class="text-highlighted text-sm font-semibold">Webcam overlay</p>
      <p class="text-dimmed text-xs">Position the picture-in-picture camera on the recording.</p>
    </div>

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="grid grid-cols-2 gap-2" role="group" aria-label="Overlay corner">
        <UButton
          v-for="corner in corners"
          :key="corner.value"
          :icon="corner.icon"
          :label="corner.label"
          size="sm"
          :color="store.settings.overlayCorner === corner.value ? 'primary' : 'neutral'"
          :variant="store.settings.overlayCorner === corner.value ? 'solid' : 'soft'"
          :aria-pressed="store.settings.overlayCorner === corner.value"
          @click="store.setOverlayCorner(corner.value)"
        />
      </div>

      <div class="w-32">
        <label class="text-muted mb-1.5 block text-xs font-medium" for="recorder-overlay-size">
          Size
        </label>
        <USelect
          id="recorder-overlay-size"
          :model-value="store.settings.overlaySize"
          :items="sizes"
          value-key="value"
          size="sm"
          :aria-label="`Webcam overlay size ${store.settings.overlaySize}`"
          @update:model-value="onSizeChange"
        />
      </div>
    </div>
  </div>
</template>
