<script setup lang="ts">
import type { RgbaImage } from "~/utils/image";

/**
 * Two stacked, natural-resolution canvases: the base image and a transparent
 * brush overlay the user paints on. Keeping them separate lets us read a clean
 * mask (overlay alpha) and the untouched source pixels independently. Strokes
 * are tinted red purely for display; only their alpha drives the mask.
 */
const props = defineProps<{ src: string; width: number; height: number; brushSize: number }>();
const emit = defineEmits<{ "strokes-changed": [hasStrokes: boolean] }>();

const baseCanvas = ref<HTMLCanvasElement | null>(null);
const overlayCanvas = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);

const undoStack: ImageData[] = [];
const MAX_UNDO = 25;
let strokeCount = 0;

function overlayCtx(): CanvasRenderingContext2D {
  const ctx = overlayCanvas.value?.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context is unavailable.");
  return ctx;
}

async function paintBase(): Promise<void> {
  const canvas = baseCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const bitmap = await createImageBitmap(await (await fetch(props.src)).blob(), {
    imageOrientation: "from-image"
  });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
}

/** Maps a pointer event to natural-resolution canvas coordinates. */
function toCanvasPoint(event: PointerEvent): { x: number; y: number } {
  const canvas = overlayCanvas.value!;
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, props.brushSize / 2, 0, Math.PI * 2);
  ctx.fill();
}

function onPointerDown(event: PointerEvent): void {
  const ctx = overlayCtx();
  const canvas = overlayCanvas.value!;
  // Snapshot for undo (bounded history).
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > MAX_UNDO) undoStack.shift();

  isDrawing.value = true;
  canvas.setPointerCapture(event.pointerId);
  ctx.fillStyle = "rgba(220, 38, 38, 0.55)";
  ctx.strokeStyle = "rgba(220, 38, 38, 0.55)";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = props.brushSize;
  const { x, y } = toCanvasPoint(event);
  ctx.beginPath();
  ctx.moveTo(x, y);
  drawDot(ctx, x, y);
}

function onPointerMove(event: PointerEvent): void {
  if (!isDrawing.value) return;
  const ctx = overlayCtx();
  const { x, y } = toCanvasPoint(event);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function onPointerUp(event: PointerEvent): void {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  overlayCanvas.value?.releasePointerCapture(event.pointerId);
  strokeCount += 1;
  emit("strokes-changed", true);
}

function undo(): void {
  const previous = undoStack.pop();
  if (!previous) return;
  overlayCtx().putImageData(previous, 0, 0);
  strokeCount = Math.max(0, strokeCount - 1);
  emit("strokes-changed", strokeCount > 0 || undoStack.length > 0);
}

function clear(): void {
  const canvas = overlayCanvas.value;
  if (!canvas) return;
  overlayCtx().clearRect(0, 0, canvas.width, canvas.height);
  undoStack.length = 0;
  strokeCount = 0;
  emit("strokes-changed", false);
}

function readCanvas(canvas: HTMLCanvasElement | null): RgbaImage {
  if (!canvas) throw new Error("Canvas is not ready.");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context is unavailable.");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: data.width, height: data.height, data: data.data };
}

function getSourceImage(): RgbaImage {
  return readCanvas(baseCanvas.value);
}
function getMaskOverlay(): RgbaImage {
  return readCanvas(overlayCanvas.value);
}

onMounted(() => {
  void paintBase();
});
watch(
  () => props.src,
  () => void paintBase()
);

defineExpose({ undo, clear, getSourceImage, getMaskOverlay });
</script>

<template>
  <div
    class="checkerboard relative mx-auto w-fit max-w-full overflow-hidden rounded-lg select-none"
  >
    <canvas
      ref="baseCanvas"
      :width="width"
      :height="height"
      class="block h-auto max-h-[60vh] w-auto max-w-full"
    />
    <canvas
      ref="overlayCanvas"
      :width="width"
      :height="height"
      class="absolute inset-0 h-full w-full cursor-crosshair touch-none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    />
  </div>
</template>

<style scoped>
.checkerboard {
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
}
</style>
