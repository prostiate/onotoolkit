<script setup lang="ts">
import type { ImageItem } from "~/stores/jpgToPdf";
import { formatBytes } from "~/utils/formatBytes";

const props = defineProps<{ items: ImageItem[]; disabled?: boolean }>();
const emit = defineEmits<{
  move: [id: string, direction: -1 | 1];
  remove: [id: string];
  reorder: [fromIndex: number, toIndex: number];
}>();

const dragIndex = ref<number | null>(null);
function onDragStart(index: number): void {
  if (!props.disabled) dragIndex.value = index;
}
function onDragEnter(index: number): void {
  if (dragIndex.value === null || dragIndex.value === index) return;
  emit("reorder", dragIndex.value, index);
  dragIndex.value = index;
}
function onDragEnd(): void {
  dragIndex.value = null;
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="border-default bg-default flex flex-col gap-2 rounded-lg border p-2"
      :draggable="!disabled"
      @dragstart="onDragStart(index)"
      @dragenter="onDragEnter(index)"
      @dragover.prevent
      @dragend="onDragEnd"
      @drop.prevent
    >
      <div
        class="bg-muted flex aspect-square w-full items-center justify-center overflow-hidden rounded"
      >
        <img :src="item.previewUrl" alt="" class="max-h-full max-w-full object-contain" />
      </div>
      <div class="min-w-0">
        <p class="text-highlighted truncate text-xs font-medium">{{ item.name }}</p>
        <p class="text-dimmed text-xs">{{ formatBytes(item.size) }}</p>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-dimmed text-xs">#{{ index + 1 }}</span>
        <div class="flex items-center gap-0.5">
          <UButton
            icon="i-lucide-chevron-left"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="disabled || index === 0"
            aria-label="Move left"
            @click="emit('move', item.id, -1)"
          />
          <UButton
            icon="i-lucide-chevron-right"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="disabled || index === items.length - 1"
            aria-label="Move right"
            @click="emit('move', item.id, 1)"
          />
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="disabled"
            aria-label="Remove"
            @click="emit('remove', item.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
