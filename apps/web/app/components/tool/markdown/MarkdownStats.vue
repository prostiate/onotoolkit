<script setup lang="ts">
defineProps<{ words: number; characters: number }>();
</script>

<template>
  <div class="text-dimmed flex items-center gap-3 text-xs">
    <span>{{ words }} {{ words === 1 ? "word" : "words" }}</span>
    <span aria-hidden="true">·</span>
    <span>{{ characters }} {{ characters === 1 ? "character" : "characters" }}</span>
  </div>
</template>
