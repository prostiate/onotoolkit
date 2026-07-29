<script setup lang="ts">
import { Motion } from "motion-v";

const reduce = ref(false);
onMounted(() => {
  reduce.value = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
});
</script>

<template>
  <Motion
    class="text-highlighted inline-block text-[15px] font-semibold tracking-tight"
    :animate="reduce ? undefined : { y: [0, -1.5, 0] }"
    :transition="{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }"
    :while-hover="{ scale: 1.06 }"
    :while-press="{ scale: 0.97 }"
  >
    Ono <span class="text-primary">Toolkit</span>
  </Motion>
</template>
