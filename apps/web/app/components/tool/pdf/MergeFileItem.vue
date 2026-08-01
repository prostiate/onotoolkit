<script setup lang="ts">
import type { MergeItem } from "~/stores/merge";
import { formatBytes } from "~/utils/formatBytes";

defineProps<{ item: MergeItem; index: number; total: number; disabled?: boolean }>();
const emit = defineEmits<{
  move: [direction: -1 | 1];
  remove: [];
  dragstart: [];
  dragenter: [];
  dragend: [];
}>();
</script>

<template>
  <div
    class="border-default bg-default flex items-center gap-3 rounded-lg border p-2.5"
    :draggable="!disabled"
    @dragstart="emit('dragstart')"
    @dragenter="emit('dragenter')"
    @dragover.prevent
    @dragend="emit('dragend')"
    @drop.prevent
  >
    <UIcon
      name="i-lucide-grip-vertical"
      class="text-dimmed size-5 shrink-0"
      :class="disabled ? 'opacity-40' : 'cursor-grab'"
    />

    <div
      class="border-default bg-muted flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded border"
    >
      <img v-if="item.thumbnail" :src="item.thumbnail" alt="" class="h-full w-full object-cover" />
      <UIcon
        v-else-if="item.loading"
        name="i-lucide-loader-circle"
        class="text-dimmed size-4 animate-spin"
      />
      <UIcon v-else name="i-lucide-file-text" class="text-dimmed size-5" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-highlighted truncate text-sm font-medium">{{ item.name }}</p>
      <p class="text-dimmed text-xs">
        {{ formatBytes(item.size) }}
        <span v-if="item.pageCount">
          · {{ item.pageCount }} page{{ item.pageCount > 1 ? "s" : "" }}</span
        >
      </p>
    </div>

    <div class="flex items-center gap-0.5">
      <UButton
        icon="i-lucide-chevron-up"
        size="xs"
        color="neutral"
        variant="ghost"
        :disabled="disabled || index === 0"
        aria-label="Move up"
        @click="emit('move', -1)"
      />
      <UButton
        icon="i-lucide-chevron-down"
        size="xs"
        color="neutral"
        variant="ghost"
        :disabled="disabled || index === total - 1"
        aria-label="Move down"
        @click="emit('move', 1)"
      />
      <UButton
        icon="i-lucide-x"
        size="xs"
        color="neutral"
        variant="ghost"
        :disabled="disabled"
        aria-label="Remove"
        @click="emit('remove')"
      />
    </div>
  </div>
</template>
