<script setup lang="ts">
import { Motion } from "motion-v";

withDefaults(defineProps<{ to?: string; label?: string }>(), {
  to: "/",
  label: "All tools"
});
</script>

<template>
  <Motion
    :while-hover="{ x: -3 }"
    :while-press="{ scale: 0.96 }"
    :transition="{ type: 'spring', stiffness: 420, damping: 26 }"
    class="inline-block"
  >
    <NuxtLink
      :to="to"
      class="group border-default bg-default text-muted hover:text-highlighted hover:border-primary/50 inline-flex items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-sm font-medium shadow-sm transition-colors"
    >
      <span
        class="bg-muted text-dimmed group-hover:bg-primary group-hover:text-inverted flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-200"
      >
        <UIcon
          name="i-lucide-arrow-left"
          class="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
      </span>
      {{ label }}
    </NuxtLink>
  </Motion>
</template>
