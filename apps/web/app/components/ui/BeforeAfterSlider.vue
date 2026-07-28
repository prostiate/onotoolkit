<script setup lang="ts">
withDefaults(
  defineProps<{
    beforeSrc: string;
    afterSrc: string;
    beforeLabel?: string;
    afterLabel?: string;
  }>(),
  {
    beforeLabel: "Before",
    afterLabel: "After"
  }
);

const container = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const position = ref(50);
const dragging = ref(false);

let observer: ResizeObserver | null = null;

function measure(): void {
  if (container.value) containerWidth.value = container.value.clientWidth;
}

function setFromClientX(clientX: number): void {
  const el = container.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  position.value = Math.min(100, Math.max(0, ratio * 100));
}

function onPointerDown(event: PointerEvent): void {
  dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  setFromClientX(event.clientX);
}

function onPointerMove(event: PointerEvent): void {
  if (dragging.value) setFromClientX(event.clientX);
}

function onPointerUp(): void {
  dragging.value = false;
}

function nudge(delta: number): void {
  position.value = Math.min(100, Math.max(0, position.value + delta));
}

onMounted(() => {
  measure();
  observer = new ResizeObserver(measure);
  if (container.value) observer.observe(container.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    ref="container"
    class="border-default relative touch-none overflow-hidden rounded-lg border select-none"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <!-- Base layer: the "after" image sets the intrinsic height. -->
    <img :src="afterSrc" :alt="afterLabel" class="block w-full" draggable="false" />

    <!-- Clipped overlay: the "before" image, revealed from the left. -->
    <div class="absolute inset-y-0 left-0 overflow-hidden" :style="{ width: `${position}%` }">
      <img
        :src="beforeSrc"
        :alt="beforeLabel"
        class="block max-w-none"
        draggable="false"
        :style="{ width: `${containerWidth}px` }"
      />
    </div>

    <span
      class="bg-inverted text-inverted absolute top-2 left-2 rounded px-2 py-0.5 text-xs font-medium opacity-80"
    >
      {{ beforeLabel }}
    </span>
    <span
      class="bg-inverted text-inverted absolute top-2 right-2 rounded px-2 py-0.5 text-xs font-medium opacity-80"
    >
      {{ afterLabel }}
    </span>

    <!-- Divider + handle. Soft-black line with a thin light outline so it stays
         visible on both light (white) and dark PDF page content. -->
    <div
      class="absolute inset-y-0 w-0.5 bg-slate-800/80 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
      :style="{ left: `${position}%` }"
    >
      <button
        type="button"
        role="slider"
        :aria-valuenow="Math.round(position)"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Comparison position"
        class="bg-primary text-inverted absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full shadow-lg ring-2 ring-white/70"
        @keydown.left.prevent="nudge(-4)"
        @keydown.right.prevent="nudge(4)"
      >
        <UIcon name="i-lucide-chevrons-left-right" class="size-5" />
      </button>
    </div>
  </div>
</template>
