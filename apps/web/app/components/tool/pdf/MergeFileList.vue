<script setup lang="ts">
import type { MergeItem } from "~/stores/merge";

const props = defineProps<{ items: MergeItem[]; disabled?: boolean }>();
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
  <div class="space-y-2">
    <MergeFileItem
      v-for="(item, index) in items"
      :key="item.id"
      :item="item"
      :index="index"
      :total="items.length"
      :disabled="disabled"
      @dragstart="onDragStart(index)"
      @dragenter="onDragEnter(index)"
      @dragend="onDragEnd"
      @move="(direction) => emit('move', item.id, direction)"
      @remove="emit('remove', item.id)"
    />
  </div>
</template>
