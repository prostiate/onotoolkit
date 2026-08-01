<script setup lang="ts">
import { compressPresetOptions } from "~/schemas/compress";
import { formatBytes } from "~/utils/formatBytes";

const store = useMergeStore();
</script>

<template>
  <AppCard>
    <div class="space-y-4">
      <div class="flex items-start gap-3">
        <span
          class="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        >
          <UIcon name="i-lucide-file-archive" class="size-5" />
        </span>
        <div>
          <p class="text-highlighted font-semibold">Reduce the file size?</p>
          <p class="text-muted text-sm">
            Your merged PDF is {{ formatBytes(store.mergedSize ?? 0) }}. Compress it without leaving
            this page.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          v-for="option in compressPresetOptions"
          :key="option.value"
          type="button"
          class="rounded-lg border px-3 py-2 text-left transition-colors"
          :class="
            store.preset === option.value
              ? 'border-primary bg-primary/10 ring-primary/30 ring-2'
              : 'border-default bg-default hover:bg-muted'
          "
          @click="store.setPreset(option.value)"
        >
          <span
            class="block text-sm font-semibold"
            :class="store.preset === option.value ? 'text-primary' : 'text-highlighted'"
          >
            {{ option.label }}
          </span>
          <span class="text-dimmed block text-xs">{{ option.dpi }} dpi</span>
        </button>
      </div>

      <UButton
        color="primary"
        icon="i-lucide-file-archive"
        size="lg"
        block
        @click="store.compress()"
      >
        Compress merged PDF
      </UButton>
    </div>
  </AppCard>
</template>
