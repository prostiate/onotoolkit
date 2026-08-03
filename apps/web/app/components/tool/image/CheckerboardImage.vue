<script setup lang="ts">
/** Displays an image over a checkerboard so transparent regions are obvious. */
defineProps<{ src: string; alt?: string }>();
</script>

<template>
  <div class="checkerboard flex items-center justify-center overflow-hidden rounded-lg">
    <img :src="src" :alt="alt ?? ''" class="max-h-[60vh] w-auto max-w-full object-contain" />
  </div>
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
