<script setup lang="ts">
import type { CompressItem } from "~/stores/compressImage";
import { formatBytes, reductionPercent } from "~/utils/formatBytes";

const props = defineProps<{ item: CompressItem | null }>();
const open = defineModel<boolean>("open", { default: false });

const saved = computed(() =>
  props.item ? reductionPercent(props.item.originalSize, props.item.resultSize) : 0
);
</script>

<template>
  <UModal v-model:open="open" :title="item?.name ?? 'Preview'" :ui="{ content: 'max-w-3xl' }">
    <template #body>
      <div v-if="item && item.resultUrl" class="space-y-4">
        <div class="checkerboard overflow-hidden rounded-lg">
          <BeforeAfterSlider
            :before-src="item.previewUrl"
            :after-src="item.resultUrl"
            before-label="Original"
            after-label="Compressed"
          />
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Original</p>
            <p class="text-highlighted font-semibold">{{ formatBytes(item.originalSize) }}</p>
          </div>
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Compressed</p>
            <p class="text-highlighted font-semibold">{{ formatBytes(item.resultSize) }}</p>
          </div>
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Saved</p>
            <p
              class="font-bold"
              :class="saved > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'"
            >
              {{ saved > 0 ? `${saved}%` : "-" }}
            </p>
          </div>
        </div>
        <p class="text-dimmed text-center text-xs">Drag the divider to compare quality.</p>
      </div>
    </template>
  </UModal>
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
:global(.dark) .checkerboard {
  background-color: #1e293b;
  background-image:
    linear-gradient(45deg, #334155 25%, transparent 25%),
    linear-gradient(-45deg, #334155 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #334155 75%),
    linear-gradient(-45deg, transparent 75%, #334155 75%);
}
</style>
