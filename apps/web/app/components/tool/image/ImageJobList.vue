<script setup lang="ts">
import type { ImageJobItem } from "~/stores/imageJob";

withDefaults(
  defineProps<{
    items: ImageJobItem[];
    /** What the status badge communicates for this tool. */
    badgeKind?: "savings" | "format";
    downloadAriaLabel?: string;
  }>(),
  {
    badgeKind: "format",
    downloadAriaLabel: "Download converted image"
  }
);

defineEmits<{ remove: [id: string]; download: [id: string]; preview: [id: string] }>();
</script>

<template>
  <ul class="space-y-2">
    <li v-for="item in items" :key="item.id">
      <ImageJobItem
        :item="item"
        :badge-kind="badgeKind"
        :download-aria-label="downloadAriaLabel"
        @remove="$emit('remove', $event)"
        @download="$emit('download', $event)"
        @preview="$emit('preview', $event)"
      />
    </li>
  </ul>
</template>
