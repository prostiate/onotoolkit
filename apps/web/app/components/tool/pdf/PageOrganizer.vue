<script setup lang="ts">
import type { OrganizerPage } from "~/types/pdf";

const props = defineProps<{
  pages: OrganizerPage[];
  selectable?: boolean;
  rotatable?: boolean;
  removable?: boolean;
  reorderable?: boolean;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  toggle: [id: string];
  rotate: [id: string, direction: -1 | 1];
  move: [id: string, direction: -1 | 1];
  remove: [id: string];
  reorder: [fromIndex: number, toIndex: number];
  "request-thumb": [id: string];
  "select-all": [];
  "select-none": [];
  "rotate-all": [direction: -1 | 1];
}>();

const dragIndex = ref<number | null>(null);

function onDragStart(index: number): void {
  if (!props.disabled && props.reorderable) dragIndex.value = index;
}
function onDragEnter(index: number): void {
  if (dragIndex.value === null || dragIndex.value === index) return;
  emit("reorder", dragIndex.value, index);
  dragIndex.value = index;
}
function onDragEnd(): void {
  dragIndex.value = null;
}

const selectedCount = computed(() => props.pages.filter((page) => page.selected).length);
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <template v-if="selectable">
        <span class="text-muted text-sm">{{ selectedCount }} of {{ pages.length }} selected</span>
        <UButton
          size="xs"
          color="neutral"
          variant="soft"
          :disabled="disabled"
          @click="emit('select-all')"
        >
          Select all
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="disabled"
          @click="emit('select-none')"
        >
          Select none
        </UButton>
      </template>
      <span v-else class="text-muted text-sm">
        {{ pages.length }} page{{ pages.length > 1 ? "s" : "" }}
      </span>

      <div class="grow" />

      <template v-if="rotatable">
        <UButton
          size="xs"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="soft"
          :disabled="disabled"
          aria-label="Rotate all left"
          @click="emit('rotate-all', -1)"
        >
          All left
        </UButton>
        <UButton
          size="xs"
          icon="i-lucide-rotate-cw"
          color="neutral"
          variant="soft"
          :disabled="disabled"
          aria-label="Rotate all right"
          @click="emit('rotate-all', 1)"
        >
          All right
        </UButton>
      </template>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <PageOrganizerItem
        v-for="(page, index) in pages"
        :key="page.id"
        :page="page"
        :index="index"
        :total="pages.length"
        :selectable="selectable"
        :rotatable="rotatable"
        :removable="removable"
        :reorderable="reorderable"
        :disabled="disabled"
        @toggle="emit('toggle', page.id)"
        @rotate="(direction) => emit('rotate', page.id, direction)"
        @move="(direction) => emit('move', page.id, direction)"
        @remove="emit('remove', page.id)"
        @request-thumb="emit('request-thumb', page.id)"
        @dragstart="onDragStart(index)"
        @dragenter="onDragEnter(index)"
        @dragend="onDragEnd"
      />
    </div>
  </div>
</template>
