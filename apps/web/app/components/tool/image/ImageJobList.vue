<script setup lang="ts">
import type { ImageJobItem } from "~/stores/imageJob";
import type { ConvertFormat, EncodeSettings } from "~/utils/imageConvert";

withDefaults(
  defineProps<{
    items: ImageJobItem[];
    /** What the status badge communicates for this tool. */
    badgeKind?: "savings" | "format";
    downloadAriaLabel?: string;
    /** Renders the per-image format/quality overrides (converter only). */
    showPerItemSettings?: boolean;
    bulkFormat?: ConvertFormat;
    bulkQuality?: number;
    useSourceQuality?: boolean;
    avifSupported?: boolean;
  }>(),
  {
    badgeKind: "format",
    downloadAriaLabel: "Download converted image",
    showPerItemSettings: false,
    bulkFormat: "png",
    bulkQuality: 80,
    useSourceQuality: false,
    avifSupported: true
  }
);

defineEmits<{
  remove: [id: string];
  download: [id: string];
  preview: [id: string];
  "settings-override": [id: string, patch: Partial<EncodeSettings> | null];
}>();
</script>

<template>
  <ul class="space-y-2">
    <li v-for="item in items" :key="item.id">
      <ImageJobItem
        :item="item"
        :badge-kind="badgeKind"
        :download-aria-label="downloadAriaLabel"
        :show-per-item-settings="showPerItemSettings"
        :bulk-format="bulkFormat"
        :bulk-quality="bulkQuality"
        :use-source-quality="useSourceQuality"
        :avif-supported="avifSupported"
        @remove="$emit('remove', $event)"
        @download="$emit('download', $event)"
        @preview="$emit('preview', $event)"
        @settings-override="(id, patch) => $emit('settings-override', id, patch)"
      />
    </li>
  </ul>
</template>
