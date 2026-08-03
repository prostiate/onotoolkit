<script setup lang="ts">
import type { CompressItem } from "~/stores/compressImage";
import { formatBytes, reductionPercent } from "~/utils/formatBytes";

const props = defineProps<{ item: CompressItem }>();
const emit = defineEmits<{ remove: [id: string]; download: [id: string] }>();

const saved = computed(() => reductionPercent(props.item.originalSize, props.item.resultSize));
const grew = computed(
  () => props.item.status === "done" && props.item.resultSize >= props.item.originalSize
);
</script>

<template>
  <div class="border-default bg-default flex items-center gap-3 rounded-lg border p-2.5">
    <div
      class="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded"
    >
      <img :src="item.previewUrl" alt="" class="max-h-full max-w-full object-contain" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-highlighted truncate text-sm font-medium">{{ item.name }}</p>
      <p class="text-dimmed text-xs">
        <template v-if="item.status === 'done'">
          {{ formatBytes(item.originalSize) }} → {{ formatBytes(item.resultSize) }}
        </template>
        <template v-else-if="item.status === 'error'">
          <span class="text-error">{{ item.error ?? "Failed" }}</span>
        </template>
        <template v-else>{{ formatBytes(item.originalSize) }}</template>
      </p>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <span
        v-if="item.status === 'working'"
        class="text-dimmed flex items-center gap-1 text-xs"
        aria-live="polite"
      >
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Compressing
      </span>

      <UBadge
        v-else-if="item.status === 'done'"
        :color="grew ? 'warning' : 'success'"
        variant="soft"
        size="sm"
      >
        {{ grew ? "No gain" : `-${saved}%` }}
      </UBadge>

      <UButton
        v-if="item.status === 'done'"
        icon="i-lucide-download"
        size="xs"
        color="primary"
        variant="soft"
        aria-label="Download compressed image"
        @click="emit('download', item.id)"
      />
      <UButton
        icon="i-lucide-x"
        size="xs"
        color="neutral"
        variant="ghost"
        aria-label="Remove image"
        @click="emit('remove', item.id)"
      />
    </div>
  </div>
</template>
