<script setup lang="ts">
import { ref } from "vue";
import type { AnnotationTool } from "~/types/screenRecorder";
import { ANNOTATION_COLORS, type AnnotationWidthKey } from "~/composables/useRecorderAnnotations";

const annotations = useRecorderAnnotations();

const tools: { value: AnnotationTool; icon: string; label: string }[] = [
  { value: "pen", icon: "i-lucide-pen", label: "Pen" },
  { value: "highlighter", icon: "i-lucide-highlighter", label: "Highlighter" },
  { value: "rect", icon: "i-lucide-square", label: "Rectangle" },
  { value: "arrow", icon: "i-lucide-move-up-right", label: "Arrow" }
];

const widths: { value: AnnotationWidthKey; dot: string }[] = [
  { value: "thin", dot: "size-1.5" },
  { value: "medium", dot: "size-2.5" },
  { value: "thick", dot: "size-3.5" }
];

// Draggable dock ------------------------------------------------------------
const pos = ref({ x: 16, y: 16 });
const dragging = ref(false);
let start = { px: 0, py: 0, x: 0, y: 0 };

function onHandleDown(event: PointerEvent): void {
  dragging.value = true;
  start = { px: event.clientX, py: event.clientY, x: pos.value.x, y: pos.value.y };
  (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onHandleMove(event: PointerEvent): void {
  if (!dragging.value) return;
  pos.value = {
    x: Math.max(0, start.x + (event.clientX - start.px)),
    y: Math.max(0, start.y + (event.clientY - start.py))
  };
}

function onHandleUp(): void {
  dragging.value = false;
}
</script>

<template>
  <div
    class="border-default bg-default/85 pointer-events-auto absolute z-20 flex flex-col gap-2 rounded-2xl border p-2 shadow-xl backdrop-blur-md"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    data-testid="annotation-toolbar"
  >
    <!-- Drag handle + mode toggle -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        aria-label="Move toolbar"
        class="text-dimmed hover:text-highlighted flex cursor-move items-center px-1"
        @pointerdown="onHandleDown"
        @pointermove="onHandleMove"
        @pointerup="onHandleUp"
        @pointercancel="onHandleUp"
      >
        <UIcon name="i-lucide-grip-vertical" class="size-4" />
      </button>
      <UButton
        :color="annotations.active.value ? 'primary' : 'neutral'"
        :variant="annotations.active.value ? 'solid' : 'soft'"
        size="xs"
        :icon="annotations.active.value ? 'i-lucide-pencil' : 'i-lucide-pencil-off'"
        :aria-pressed="annotations.active.value"
        data-testid="annotation-toggle"
        @click="annotations.setActive(!annotations.active.value)"
      >
        {{ annotations.active.value ? "Drawing" : "Draw" }}
      </UButton>
    </div>

    <template v-if="annotations.active.value">
      <div class="flex items-center gap-1" role="group" aria-label="Annotation tool">
        <UButton
          v-for="tool in tools"
          :key="tool.value"
          :icon="tool.icon"
          :aria-label="tool.label"
          :aria-pressed="annotations.tool.value === tool.value"
          size="xs"
          square
          :color="annotations.tool.value === tool.value ? 'primary' : 'neutral'"
          :variant="annotations.tool.value === tool.value ? 'solid' : 'ghost'"
          @click="annotations.setTool(tool.value)"
        />
      </div>

      <div class="flex items-center gap-1.5" role="group" aria-label="Ink color">
        <button
          v-for="swatch in ANNOTATION_COLORS"
          :key="swatch"
          type="button"
          :aria-label="`Color ${swatch}`"
          :aria-pressed="annotations.color.value === swatch"
          class="size-5 rounded-full border transition"
          :class="
            annotations.color.value === swatch
              ? 'border-primary scale-110 ring-2 ring-primary/40'
              : 'border-default/60'
          "
          :style="{ backgroundColor: swatch }"
          @click="annotations.setColor(swatch)"
        />
      </div>

      <div class="flex items-center justify-between gap-1">
        <div class="flex items-center gap-1" role="group" aria-label="Stroke width">
          <button
            v-for="width in widths"
            :key="width.value"
            type="button"
            :aria-label="`${width.value} stroke`"
            :aria-pressed="annotations.widthKey.value === width.value"
            class="flex size-6 items-center justify-center rounded-md transition"
            :class="
              annotations.widthKey.value === width.value
                ? 'bg-primary/15 text-primary'
                : 'text-dimmed hover:bg-muted'
            "
            @click="annotations.setWidth(width.value)"
          >
            <span class="rounded-full bg-current" :class="width.dot" />
          </button>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-undo-2"
            aria-label="Undo last stroke"
            size="xs"
            square
            color="neutral"
            variant="ghost"
            :disabled="!annotations.hasStrokes.value"
            @click="annotations.undo()"
          />
          <UButton
            icon="i-lucide-trash-2"
            aria-label="Clear annotations"
            size="xs"
            square
            color="error"
            variant="ghost"
            :disabled="!annotations.hasStrokes.value"
            @click="annotations.clear()"
          />
        </div>
      </div>
    </template>
  </div>
</template>
