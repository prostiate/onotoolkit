<script setup lang="ts">
import type { NormalizedRect, WebcamCorner, WebcamShape } from "~/types/screenRecorder";

const store = useScreenRecorderStore();

const shapes: { value: WebcamShape; label: string; icon: string }[] = [
  { value: "circle", label: "Circle", icon: "i-lucide-circle" },
  { value: "rounded", label: "Rounded", icon: "i-lucide-square-rounded-corner" },
  { value: "square", label: "Square", icon: "i-lucide-square" }
];

const corners: { value: WebcamCorner; icon: string }[] = [
  { value: "top-left", icon: "i-lucide-arrow-up-left" },
  { value: "top-right", icon: "i-lucide-arrow-up-right" },
  { value: "bottom-left", icon: "i-lucide-arrow-down-left" },
  { value: "bottom-right", icon: "i-lucide-arrow-down-right" }
];

const sizes: { value: "small" | "medium" | "large"; label: string; frac: number }[] = [
  { value: "small", label: "S", frac: 0.18 },
  { value: "medium", label: "M", frac: 0.26 },
  { value: "large", label: "L", frac: 0.34 }
];

const MARGIN = 0.03;

function positionFor(corner: WebcamCorner, width: number, height: number): NormalizedRect {
  const x = corner.endsWith("left") ? MARGIN : 1 - width - MARGIN;
  const y = corner.startsWith("top") ? MARGIN : 1 - height - MARGIN;
  return { x, y, width, height };
}

function applyCorner(corner: WebcamCorner): void {
  store.setOverlayCorner(corner);
  const { width, height } = store.settings.overlayRect;
  store.setOverlayRect(positionFor(corner, width, height));
}

function applySize(size: "small" | "medium" | "large", frac: number): void {
  store.setOverlaySize(size);
  const width = frac;
  // Keep it visually squarer on a 16:9 canvas while preserving the user's
  // current corner choice. Direct drag/resize can refine this starting size.
  const height = frac * 1.15;
  store.setOverlayRect(positionFor(store.settings.overlayCorner, width, height));
}

function isActiveSize(frac: number): boolean {
  return Math.abs(store.settings.overlayRect.width - frac) < 0.02;
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="text-highlighted text-sm font-semibold">Webcam bubble</p>
      <p class="text-dimmed text-xs">
        Pick a starting shape and spot — then drag or resize it right on the preview while you
        record.
      </p>
    </div>

    <div class="flex flex-wrap items-end gap-5">
      <div>
        <span class="text-muted mb-1.5 block text-xs font-medium">Shape</span>
        <div class="flex gap-2" role="group" aria-label="Webcam shape">
          <UButton
            v-for="shape in shapes"
            :key="shape.value"
            :icon="shape.icon"
            :label="shape.label"
            size="sm"
            :color="store.settings.overlayShape === shape.value ? 'primary' : 'neutral'"
            :variant="store.settings.overlayShape === shape.value ? 'solid' : 'soft'"
            :aria-pressed="store.settings.overlayShape === shape.value"
            @click="store.setOverlayShape(shape.value)"
          />
        </div>
      </div>

      <div>
        <span class="text-muted mb-1.5 block text-xs font-medium">Size</span>
        <div class="flex gap-2" role="group" aria-label="Webcam size">
          <UButton
            v-for="size in sizes"
            :key="size.value"
            :label="size.label"
            size="sm"
            square
            :color="isActiveSize(size.frac) ? 'primary' : 'neutral'"
            :variant="isActiveSize(size.frac) ? 'solid' : 'soft'"
            @click="applySize(size.value, size.frac)"
          />
        </div>
      </div>

      <div>
        <span class="text-muted mb-1.5 block text-xs font-medium">Corner</span>
        <div class="grid grid-cols-2 gap-1.5" role="group" aria-label="Webcam corner">
          <UButton
            v-for="corner in corners"
            :key="corner.value"
            :icon="corner.icon"
            :aria-label="corner.value"
            size="sm"
            square
            :color="store.settings.overlayCorner === corner.value ? 'primary' : 'neutral'"
            :variant="store.settings.overlayCorner === corner.value ? 'solid' : 'soft'"
            :aria-pressed="store.settings.overlayCorner === corner.value"
            @click="applyCorner(corner.value)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
