<script setup lang="ts">
import type { CompressItem } from "~/stores/compressImage";

defineProps<{ items: CompressItem[] }>();
const emit = defineEmits<{ remove: [id: string]; download: [id: string] }>();
</script>

<template>
  <div class="space-y-2">
    <CompressFileItem
      v-for="item in items"
      :key="item.id"
      :item="item"
      @remove="emit('remove', $event)"
      @download="emit('download', $event)"
    />
  </div>
</template>
