<script setup lang="ts">
import type { OrganizerPage } from "~/types/pdf";

const props = defineProps<{
  page: OrganizerPage;
  index: number;
  total: number;
  selectable?: boolean;
  rotatable?: boolean;
  removable?: boolean;
  reorderable?: boolean;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  toggle: [];
  rotate: [direction: -1 | 1];
  move: [direction: -1 | 1];
  remove: [];
  "request-thumb": [];
  dragstart: [];
  dragenter: [];
  dragend: [];
}>();

const root = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function requestIfNeeded(): void {
  if (!props.page.thumbnail && !props.page.loading) emit("request-thumb");
}

function onCardClick(): void {
  if (props.selectable && !props.disabled) emit("toggle");
}

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") {
    requestIfNeeded();
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) requestIfNeeded();
    },
    { rootMargin: "300px" }
  );
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    ref="root"
    class="border-default bg-default relative flex flex-col gap-2 rounded-lg border p-2"
    :class="[
      selectable && page.selected ? 'ring-primary/50 ring-2' : '',
      selectable && !disabled ? 'cursor-pointer' : ''
    ]"
    :draggable="reorderable && !disabled"
    @click="onCardClick"
    @dragstart="emit('dragstart')"
    @dragenter="emit('dragenter')"
    @dragover.prevent
    @dragend="emit('dragend')"
    @drop.prevent
  >
    <div v-if="selectable" class="absolute top-3 left-3 z-10" @click.stop>
      <UCheckbox
        :model-value="page.selected"
        :disabled="disabled"
        aria-label="Select page"
        @update:model-value="emit('toggle')"
      />
    </div>

    <div
      class="bg-muted flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded"
    >
      <img
        v-if="page.thumbnail"
        :src="page.thumbnail"
        alt=""
        class="max-h-full max-w-full object-contain transition-transform"
        :style="{ transform: `rotate(${page.rotation}deg)` }"
      />
      <UIcon v-else name="i-lucide-loader-circle" class="text-dimmed size-5 animate-spin" />
    </div>

    <div class="flex items-center justify-between gap-1">
      <span class="text-dimmed text-xs">Page {{ page.pageIndex + 1 }}</span>
      <div class="flex items-center gap-0.5" @click.stop>
        <UButton
          v-if="reorderable"
          icon="i-lucide-chevron-left"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="disabled || index === 0"
          aria-label="Move left"
          @click="emit('move', -1)"
        />
        <UButton
          v-if="reorderable"
          icon="i-lucide-chevron-right"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="disabled || index === total - 1"
          aria-label="Move right"
          @click="emit('move', 1)"
        />
        <UButton
          v-if="rotatable"
          icon="i-lucide-rotate-ccw"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="disabled"
          aria-label="Rotate left"
          @click="emit('rotate', -1)"
        />
        <UButton
          v-if="rotatable"
          icon="i-lucide-rotate-cw"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="disabled"
          aria-label="Rotate right"
          @click="emit('rotate', 1)"
        />
        <UButton
          v-if="removable"
          icon="i-lucide-trash-2"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="disabled"
          aria-label="Remove page"
          @click="emit('remove')"
        />
      </div>
    </div>
  </div>
</template>
