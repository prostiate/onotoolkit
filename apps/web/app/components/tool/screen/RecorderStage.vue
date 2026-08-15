<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import type { NormalizedRect } from "~/types/screenRecorder";
import {
  moveNormalizedRect,
  overlayShapeNormalizedRect,
  resizeNormalizedRect
} from "~/utils/screenRecorder";

const store = useScreenRecorderStore();
const annotations = useRecorderAnnotations();

const stageRef = useTemplateRef<HTMLDivElement>("stage");
const stageSize = ref({ width: 0, height: 0 });
let stageObserver: ResizeObserver | null = null;

function measureStage(): void {
  const bounds = stageRef.value?.getBoundingClientRect();
  if (!bounds) return;
  stageSize.value = { width: bounds.width, height: bounds.height };
}

onMounted(() => {
  measureStage();
  if (typeof ResizeObserver === "undefined" || !stageRef.value) return;
  stageObserver = new ResizeObserver(measureStage);
  stageObserver.observe(stageRef.value);
});

onBeforeUnmount(() => stageObserver?.disconnect());

// Show the draggable webcam frame only when the camera is a PiP over a screen.
const showWebcamFrame = computed(
  () => store.displayActive && store.overlayVisible && store.cameraStream !== null
);

const rect = computed(() => store.settings.overlayRect);
const shapeRect = computed(() =>
  overlayShapeNormalizedRect(
    rect.value,
    store.settings.overlayShape,
    stageSize.value.width,
    stageSize.value.height
  )
);

const shapeClass = computed(() => {
  if (store.settings.overlayShape === "circle") return "rounded-full";
  if (store.settings.overlayShape === "rounded") return "rounded-2xl";
  return "rounded-none";
});

function normalizedPoint(event: PointerEvent): { x: number; y: number } {
  const el = stageRef.value;
  if (!el) return { x: 0, y: 0 };
  const bounds = el.getBoundingClientRect();
  const x = bounds.width ? (event.clientX - bounds.left) / bounds.width : 0;
  const y = bounds.height ? (event.clientY - bounds.top) / bounds.height : 0;
  return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) };
}

// ---- Webcam drag / resize -------------------------------------------------
type DragMode = "move" | "resize" | null;
const dragMode = ref<DragMode>(null);
let dragStart = { x: 0, y: 0 };
let rectStart: NormalizedRect = { x: 0, y: 0, width: 0, height: 0 };

function beginDrag(event: PointerEvent, mode: "move" | "resize"): void {
  // The webcam frame is above the drawing surface, so moving it remains
  // possible while annotation mode is active. Drawing still wins everywhere
  // else on the stage.
  event.preventDefault();
  event.stopPropagation();
  dragMode.value = mode;
  dragStart = normalizedPoint(event);
  rectStart = { ...rect.value };
  (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onWebcamPointerMove(event: PointerEvent): void {
  if (!dragMode.value) return;
  const point = normalizedPoint(event);
  const dx = point.x - dragStart.x;
  const dy = point.y - dragStart.y;
  if (dragMode.value === "move") {
    store.setOverlayRect(moveNormalizedRect(rectStart, dx, dy));
  } else {
    store.setOverlayRect(resizeNormalizedRect(rectStart, dx, dy));
  }
}

function endDrag(): void {
  dragMode.value = null;
}

// ---- Annotation drawing ---------------------------------------------------
const drawing = ref(false);

function onDrawDown(event: PointerEvent): void {
  if (!annotations.active.value) return;
  event.preventDefault();
  event.stopPropagation();
  drawing.value = true;
  const point = normalizedPoint(event);
  annotations.startStroke(point.x, point.y);
  (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onDrawMove(event: PointerEvent): void {
  if (!drawing.value) return;
  const point = normalizedPoint(event);
  annotations.extendStroke(point.x, point.y);
}

function onDrawUp(): void {
  if (!drawing.value) return;
  drawing.value = false;
  annotations.endStroke();
}
</script>

<template>
  <div ref="stage" class="pointer-events-none absolute inset-0">
    <!-- Annotation capture layer: only grabs pointer events while drawing. -->
    <div
      v-if="annotations.active.value"
      class="pointer-events-auto absolute inset-0 z-0 touch-none cursor-crosshair"
      data-testid="annotation-surface"
      @pointerdown="onDrawDown"
      @pointermove="onDrawMove"
      @pointerup="onDrawUp"
      @pointercancel="onDrawUp"
      @pointerleave="onDrawUp"
    />

    <!-- Draggable / resizable webcam frame (WYSIWYG over the canvas PiP). -->
    <div
      v-if="showWebcamFrame"
      class="pointer-events-auto absolute z-10 touch-none select-none border-2 border-white/80 shadow-lg"
      :class="[shapeClass, 'cursor-move', annotations.active.value ? 'opacity-60' : '']"
      :style="{
        left: `${shapeRect.x * 100}%`,
        top: `${shapeRect.y * 100}%`,
        width: `${shapeRect.width * 100}%`,
        height: `${shapeRect.height * 100}%`
      }"
      data-testid="webcam-frame"
      @pointerdown="(e) => beginDrag(e, 'move')"
      @pointermove="onWebcamPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <span
        class="bg-primary/90 text-inverted absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-medium shadow"
      >
        <UIcon name="i-lucide-move" class="size-3 align-middle" /> Camera
      </span>
      <!-- Resize handle -->
      <button
        type="button"
        aria-label="Resize webcam"
        class="bg-primary absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-full border-2 border-white shadow"
        data-testid="webcam-resize"
        @pointerdown="(e) => beginDrag(e, 'resize')"
      />
    </div>
  </div>
</template>
