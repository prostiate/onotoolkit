<script setup lang="ts">
import type { CompressItem } from "~/stores/compressImage";

/** Compressor-specific wrapper around the shared {@link ImageCompareModal}. */
const props = defineProps<{ item: CompressItem | null }>();
const open = defineModel<boolean>("open", { default: false });
</script>

<template>
  <ImageCompareModal
    v-model:open="open"
    :item="props.item"
    before-label="Original"
    after-label="Compressed"
  />
</template>
