<script setup lang="ts">
defineProps<{ brushSize: number; canUndo: boolean; canClear: boolean }>();
const emit = defineEmits<{
  "update:brushSize": [size: number];
  undo: [];
  clear: [];
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-4">
    <div class="flex min-w-48 flex-1 items-center gap-2">
      <UIcon name="i-lucide-brush" class="text-muted size-4 shrink-0" />
      <label class="text-muted shrink-0 text-xs font-medium">Brush</label>
      <USlider
        :model-value="brushSize"
        :min="8"
        :max="120"
        :step="1"
        class="flex-1"
        @update:model-value="emit('update:brushSize', ($event as number) ?? brushSize)"
      />
      <span class="text-dimmed w-10 text-right text-xs tabular-nums">{{ brushSize }}px</span>
    </div>
    <div class="flex items-center gap-2">
      <UButton
        icon="i-lucide-undo-2"
        size="sm"
        color="neutral"
        variant="outline"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        Undo
      </UButton>
      <UButton
        icon="i-lucide-eraser"
        size="sm"
        color="neutral"
        variant="ghost"
        :disabled="!canClear"
        @click="emit('clear')"
      >
        Clear
      </UButton>
    </div>
  </div>
</template>
