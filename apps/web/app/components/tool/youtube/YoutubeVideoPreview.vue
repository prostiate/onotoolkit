<script setup lang="ts">
import type { YoutubeVideoInfo } from "~/types/youtube";
import { formatDuration } from "~/utils/youtube";

defineProps<{ info: YoutubeVideoInfo }>();
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row">
    <div class="relative w-full shrink-0 overflow-hidden rounded-xl sm:w-64">
      <img
        v-if="info.thumbnail"
        :src="info.thumbnail"
        :alt="`Thumbnail for ${info.title}`"
        class="aspect-video h-full w-full object-cover"
        loading="lazy"
      />
      <span
        v-if="info.duration > 0"
        class="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums"
      >
        {{ formatDuration(info.duration) }}
      </span>
    </div>

    <div class="min-w-0 flex-1">
      <h2 class="text-highlighted line-clamp-2 text-base font-semibold">{{ info.title }}</h2>
      <p v-if="info.uploader" class="text-muted mt-1 flex items-center gap-1.5 text-sm">
        <UIcon name="i-lucide-user" class="size-4 shrink-0" />
        {{ info.uploader }}
      </p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <UBadge v-if="info.heights.length" color="primary" variant="soft" size="sm">
          Up to {{ info.heights[0] }}p
        </UBadge>
        <UBadge v-if="info.hasAudio" color="neutral" variant="soft" size="sm">
          Audio available
        </UBadge>
      </div>
    </div>
  </div>
</template>
