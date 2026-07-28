<script setup lang="ts">
import { Motion } from "motion-v";
import type { CompressResult } from "~/types/tools";
import { formatBytes, reductionPercent } from "~/utils/formatBytes";

const props = defineProps<{ result: CompressResult }>();

const emit = defineEmits<{ download: []; reset: [] }>();

const reduction = computed(() =>
  reductionPercent(props.result.originalSize, props.result.compressedSize)
);
const grew = computed(() => props.result.compressedSize >= props.result.originalSize);
</script>

<template>
  <Motion
    :initial="{ opacity: 0, y: 12 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ type: 'spring', stiffness: 260, damping: 22 }"
  >
    <AppCard>
      <div class="space-y-5">
        <div class="flex items-center gap-3">
          <span
            class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <UIcon name="i-lucide-circle-check" class="size-6" />
          </span>
          <div>
            <p class="text-highlighted font-semibold">Done!</p>
            <p class="text-dimmed max-w-xs truncate text-xs">{{ result.fileName }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Before</p>
            <p class="text-highlighted font-semibold">{{ formatBytes(result.originalSize) }}</p>
          </div>
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">After</p>
            <p class="text-highlighted font-semibold">{{ formatBytes(result.compressedSize) }}</p>
          </div>
          <div class="bg-muted rounded-lg px-2 py-3">
            <p class="text-dimmed text-xs">Saved</p>
            <p
              class="font-bold"
              :class="grew ? 'text-muted' : 'text-emerald-600 dark:text-emerald-400'"
            >
              {{ grew ? "0%" : `${reduction}%` }}
            </p>
          </div>
        </div>

        <p v-if="grew" class="text-muted text-center text-xs">
          This PDF was already well optimized, so it could not get smaller. Your download keeps the
          original quality.
        </p>

        <div class="flex flex-col gap-2 sm:flex-row">
          <UButton
            color="primary"
            icon="i-lucide-download"
            size="lg"
            block
            @click="emit('download')"
          >
            Download
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-ccw"
            size="lg"
            block
            @click="emit('reset')"
          >
            Compress another
          </UButton>
        </div>
      </div>
    </AppCard>
  </Motion>
</template>
