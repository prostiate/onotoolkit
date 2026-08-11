<script setup lang="ts">
import { CONVERT_FORMATS, FORMAT_INFO, needsFlatten } from "~/utils/imageConvert";
import {
  clampDimension,
  clampPercentage,
  clampTargetKb,
  RESIZE_MAX_DIMENSION,
  RESIZE_MAX_PERCENTAGE,
  RESIZE_MIN_PERCENTAGE,
  TARGET_KB_MAX,
  TARGET_KB_MIN,
  type FitMode,
  type ResizeMode
} from "~/utils/imageResize";
import type { ResizeOutputFormat, ResizerSettings } from "~/stores/imageResizer";

const props = defineProps<{
  settings: ResizerSettings;
  /** Whether any queued image may carry transparency (shows flatten controls). */
  showTransparency: boolean;
  /** False disables the AVIF option (browser cannot encode it). */
  avifSupported: boolean;
}>();

const emit = defineEmits<{
  "update:settings": [patch: Partial<ResizerSettings>];
}>();

const modes: { value: ResizeMode; label: string; description: string }[] = [
  {
    value: "percentage",
    label: "Percentage",
    description: "Scale by a percentage of the original."
  },
  {
    value: "dimensions",
    label: "Exact size",
    description: "Resize to pixel dimensions, keeping or overriding the aspect ratio."
  },
  {
    value: "size",
    label: "Target file size",
    description: "Fit under a file size budget by adjusting quality and scale."
  }
];

const fits: { value: FitMode; label: string; description: string }[] = [
  {
    value: "contain",
    label: "Fit",
    description: "Scale to fit inside the box, keeping the aspect ratio."
  },
  { value: "cover", label: "Fill", description: "Fill the box, cropping any overflow." },
  {
    value: "stretch",
    label: "Stretch",
    description: "Force the exact dimensions, distorting if needed."
  }
];

const outputFormats: { value: ResizeOutputFormat; label: string }[] = [
  { value: "original", label: "Original" },
  ...CONVERT_FORMATS.map((format) => ({
    value: format as ResizeOutputFormat,
    label: FORMAT_INFO[format].label
  }))
];

const qualityVisible = computed(
  () => props.settings.format !== "original" && FORMAT_INFO[props.settings.format].lossy
);

const bgColorVisible = computed(
  () =>
    props.showTransparency &&
    props.settings.format !== "original" &&
    needsFlatten(props.settings.format, true)
);

const selectedMode = computed(
  () => modes.find((m) => m.value === props.settings.mode) ?? modes[0]!
);

const widthModel = computed({
  get: () => props.settings.width ?? "",
  set: (value: string) => {
    const parsed = Number(value);
    emit("update:settings", {
      width: value.trim() === "" ? null : clampDimension(parsed)
    });
  }
});

const heightModel = computed({
  get: () => props.settings.height ?? "",
  set: (value: string) => {
    const parsed = Number(value);
    emit("update:settings", {
      height: value.trim() === "" ? null : clampDimension(parsed)
    });
  }
});
</script>

<template>
  <AppCard>
    <div class="space-y-5">
      <!-- Resize mode -->
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Resize mode">
          <span class="text-muted w-28 shrink-0 text-xs font-medium">Resize by</span>
          <UButton
            v-for="mode in modes"
            :key="mode.value"
            :color="settings.mode === mode.value ? 'primary' : 'neutral'"
            :variant="settings.mode === mode.value ? 'solid' : 'outline'"
            :aria-pressed="settings.mode === mode.value"
            size="sm"
            @click="emit('update:settings', { mode: mode.value })"
          >
            {{ mode.label }}
          </UButton>
        </div>
        <p class="text-dimmed -mt-1 pl-28 text-xs">{{ selectedMode.description }}</p>
      </div>

      <!-- Percentage mode -->
      <div v-if="settings.mode === 'percentage'" class="flex items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Scale</label>
        <USlider
          :model-value="settings.percentage"
          :min="RESIZE_MIN_PERCENTAGE"
          :max="RESIZE_MAX_PERCENTAGE"
          :step="5"
          aria-label="Scale percentage"
          class="flex-1"
          @update:model-value="
            emit('update:settings', { percentage: clampPercentage($event as number) })
          "
        />
        <input
          :value="settings.percentage"
          type="number"
          :min="RESIZE_MIN_PERCENTAGE"
          :max="RESIZE_MAX_PERCENTAGE"
          class="border-default w-16 rounded border bg-transparent px-1 py-0.5 text-right text-xs tabular-nums"
          aria-label="Scale percentage value"
          @change="
            emit('update:settings', {
              percentage: clampPercentage(Number(($event.target as HTMLInputElement).value))
            })
          "
        />
        <span class="text-dimmed text-xs">%</span>
      </div>

      <!-- Exact dimensions mode -->
      <div v-if="settings.mode === 'dimensions'" class="flex flex-wrap items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Dimensions</label>
        <input
          v-model="widthModel"
          type="number"
          min="1"
          :max="RESIZE_MAX_DIMENSION"
          placeholder="Width"
          class="border-default w-24 rounded border bg-transparent px-2 py-1 text-xs"
          aria-label="Output width in pixels"
        />
        <span class="text-dimmed text-xs">×</span>
        <input
          v-model="heightModel"
          type="number"
          min="1"
          :max="RESIZE_MAX_DIMENSION"
          placeholder="Height"
          class="border-default w-24 rounded border bg-transparent px-2 py-1 text-xs"
          aria-label="Output height in pixels"
        />
        <USelect
          :model-value="settings.fit"
          :items="fits"
          value-key="value"
          size="sm"
          class="w-36"
          aria-label="Fit mode"
          @update:model-value="emit('update:settings', { fit: $event as FitMode })"
        />
      </div>
      <p v-if="settings.mode === 'dimensions'" class="text-dimmed -mt-3 pl-28 text-xs">
        Leave a field empty to keep the aspect ratio. Fit scales inside the box, Fill crops to it,
        Stretch forces it.
      </p>

      <!-- Target file size mode -->
      <div v-if="settings.mode === 'size'" class="flex items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Target size</label>
        <input
          :value="settings.targetKb"
          type="number"
          :min="TARGET_KB_MIN"
          :max="TARGET_KB_MAX"
          class="border-default w-24 rounded border bg-transparent px-2 py-1 text-xs"
          aria-label="Target file size in kilobytes"
          @change="
            emit('update:settings', {
              targetKb: clampTargetKb(Number(($event.target as HTMLInputElement).value))
            })
          "
        />
        <span class="text-dimmed text-xs">
          KB — the tool adjusts quality (and scale if needed) to fit under the budget.
        </span>
      </div>

      <!-- Output format -->
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Output format">
        <span class="text-muted w-28 shrink-0 text-xs font-medium">Output format</span>
        <UButton
          v-for="option in outputFormats"
          :key="option.value"
          :color="settings.format === option.value ? 'primary' : 'neutral'"
          :variant="settings.format === option.value ? 'solid' : 'outline'"
          :aria-pressed="settings.format === option.value"
          :disabled="option.value === 'avif' && !avifSupported"
          size="sm"
          @click="emit('update:settings', { format: option.value })"
        >
          {{ option.label }}
        </UButton>
      </div>
      <p
        v-if="settings.format === 'avif' && !avifSupported"
        class="text-dimmed -mt-3 pl-28 text-xs"
      >
        <span class="text-warning"
          >AVIF is not available in this browser (needs Chrome or Edge).</span
        >
      </p>

      <!-- Quality (lossy JPEG / WebP / AVIF encodes) -->
      <div v-if="qualityVisible" class="flex items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Quality</label>
        <USlider
          :model-value="settings.quality"
          :min="30"
          :max="100"
          :step="1"
          aria-label="Output quality"
          class="flex-1"
          @update:model-value="
            emit('update:settings', { quality: ($event as number) ?? settings.quality })
          "
        />
        <span class="text-dimmed w-8 text-right text-xs tabular-nums">{{ settings.quality }}</span>
      </div>

      <!-- Background colour for formats that flatten transparency -->
      <div v-if="bgColorVisible" class="flex items-center gap-3">
        <label class="text-muted w-28 shrink-0 text-xs font-medium">Background</label>
        <input
          type="color"
          :value="settings.bgColor"
          class="border-default h-7 w-9 cursor-pointer rounded border bg-transparent p-0"
          aria-label="Background colour for transparent areas"
          @input="emit('update:settings', { bgColor: ($event.target as HTMLInputElement).value })"
        />
        <span class="text-dimmed text-xs">Used where transparent pixels become opaque.</span>
      </div>
    </div>
  </AppCard>
</template>
