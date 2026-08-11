<script setup lang="ts">
import type { ImageJobItem } from "~/stores/imageJob";
import { formatBytes, reductionPercent } from "~/utils/formatBytes";

const props = withDefaults(
  defineProps<{
    item: ImageJobItem;
    /** What the status badge communicates for this tool. */
    badgeKind?: "savings" | "format";
    downloadAriaLabel?: string;
  }>(),
  {
    badgeKind: "format",
    downloadAriaLabel: "Download converted image"
  }
);

const emit = defineEmits<{ remove: [id: string]; download: [id: string]; preview: [id: string] }>();

const canPreview = computed(() => props.item.status === "done" && props.item.resultUrl !== null);

const saved = computed(() => reductionPercent(props.item.originalSize, props.item.resultSize));
const grew = computed(
  () => props.item.status === "done" && props.item.resultSize >= props.item.originalSize
);
const resultExtension = computed(() => {
  const match = props.item.resultName.match(/\.([^.]+)$/);
  return match ? match[1]!.toUpperCase() : "";
});
</script>

<template>
  <div class="border-default bg-default flex items-center gap-3 rounded-lg border p-2.5">
    <component
      :is="canPreview ? 'button' : 'div'"
      :type="canPreview ? 'button' : undefined"
      class="bg-muted group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded"
      :class="canPreview ? 'hover:ring-primary/40 cursor-zoom-in hover:ring-2' : ''"
      :aria-label="canPreview ? `Preview before and after for ${item.name}` : undefined"
      @click="canPreview && emit('preview', item.id)"
    >
      <img :src="item.previewUrl" alt="" class="max-h-full max-w-full object-contain" />
      <span
        v-if="canPreview"
        class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <UIcon name="i-lucide-eye" class="size-4 text-white" />
      </span>
    </component>

    <div class="min-w-0 flex-1">
      <p class="text-highlighted truncate text-sm font-medium">{{ item.name }}</p>
      <p class="text-dimmed text-xs">
        <template v-if="item.status === 'done'">
          {{ formatBytes(item.originalSize) }} → {{ formatBytes(item.resultSize) }}
          <span v-if="item.resultDimensions">
            · {{ item.resultDimensions.width }} × {{ item.resultDimensions.height }}</span
          >
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
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Processing
      </span>

      <UBadge
        v-else-if="item.status === 'done'"
        :color="badgeKind === 'savings' && grew ? 'warning' : 'success'"
        variant="soft"
        size="sm"
      >
        <template v-if="badgeKind === 'savings'">{{ grew ? "No gain" : `-${saved}%` }}</template>
        <template v-else>→ {{ resultExtension }}</template>
      </UBadge>

      <UButton
        v-if="item.status === 'done'"
        icon="i-lucide-download"
        size="xs"
        color="primary"
        variant="soft"
        :aria-label="downloadAriaLabel"
        @click="emit('download', item.id)"
      />
      <UButton
        icon="i-lucide-x"
        size="xs"
        color="neutral"
        variant="ghost"
        :aria-label="`Remove ${item.name}`"
        @click="emit('remove', item.id)"
      />
    </div>
  </div>
</template>
