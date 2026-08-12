<script setup lang="ts">
import type { RecorderFrameRate, RecorderResolution } from "~/types/screenRecorder";

const store = useScreenRecorderStore();

const resolutions: { value: RecorderResolution; label: string }[] = [
  { value: "auto", label: "Auto (native)" },
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "720p", label: "720p (HD)" }
];

const frameRates: { value: RecorderFrameRate; label: string }[] = [
  { value: 30, label: "30 fps" },
  { value: 60, label: "60 fps" }
];

function onResolutionChange(value: unknown): void {
  if (value === "auto" || value === "1080p" || value === "720p") store.setResolution(value);
}

function onFrameRateChange(value: unknown): void {
  if (value === 30 || value === 60) store.setFrameRate(value);
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <label class="text-muted mb-1.5 block text-xs font-medium" for="recorder-resolution">
        Resolution
      </label>
      <USelect
        id="recorder-resolution"
        :model-value="store.settings.resolution"
        :items="resolutions"
        value-key="value"
        size="sm"
        block
        :aria-label="`Recording resolution ${store.settings.resolution}`"
        @update:model-value="onResolutionChange"
      />
    </div>

    <div>
      <label class="text-muted mb-1.5 block text-xs font-medium" for="recorder-frame-rate">
        Frame rate
      </label>
      <USelect
        id="recorder-frame-rate"
        :model-value="store.settings.frameRate"
        :items="frameRates"
        value-key="value"
        size="sm"
        block
        :aria-label="`Recording frame rate ${store.settings.frameRate}`"
        @update:model-value="onFrameRateChange"
      />
    </div>
  </div>
</template>
