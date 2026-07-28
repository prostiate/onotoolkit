<script setup lang="ts">
import { Motion } from "motion-v";
import type { WorkerStage } from "~/types/worker";

const props = defineProps<{
  stage: WorkerStage | null;
  fileName: string | null;
}>();

const stageLabels: Record<WorkerStage, string> = {
  "loading-engine": "Loading the compression engine...",
  compressing: "Compressing your PDF...",
  finalizing: "Finishing up..."
};

const label = computed(() => (props.stage ? stageLabels[props.stage] : "Working..."));
</script>

<template>
  <AppCard>
    <div class="flex flex-col items-center gap-4 py-4 text-center">
      <span
        class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </span>

      <div class="space-y-1">
        <p class="text-highlighted font-semibold">{{ label }}</p>
        <p v-if="fileName" class="text-dimmed max-w-xs truncate text-xs">{{ fileName }}</p>
      </div>

      <div class="bg-muted h-2 w-full max-w-xs overflow-hidden rounded-full">
        <Motion
          class="bg-primary h-full rounded-full"
          :animate="{ x: ['-100%', '260%'] }"
          :transition="{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }"
          style="width: 40%"
        />
      </div>
    </div>
  </AppCard>
</template>
