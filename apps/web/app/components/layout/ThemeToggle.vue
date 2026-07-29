<script setup lang="ts">
import { AnimatePresence, Motion } from "motion-v";

const colorMode = useColorMode();

const isDark = computed<boolean>({
  get: () => colorMode.value === "dark",
  set: (value) => {
    colorMode.preference = value ? "dark" : "light";
  }
});
</script>

<template>
  <ClientOnly>
    <Motion
      :while-hover="{ scale: 1.12, rotate: 12 }"
      :while-press="{ scale: 0.9 }"
      class="inline-flex"
    >
      <button
        type="button"
        class="text-muted hover:text-highlighted hover:bg-muted flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg transition-colors"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="isDark = !isDark"
      >
        <AnimatePresence mode="wait" :initial="false">
          <Motion
            :key="isDark ? 'moon' : 'sun'"
            :initial="{ rotate: -90, scale: 0.4, opacity: 0 }"
            :animate="{ rotate: 0, scale: 1, opacity: 1 }"
            :exit="{ rotate: 90, scale: 0.4, opacity: 0 }"
            :transition="{ duration: 0.22, ease: 'easeOut' }"
            class="flex"
          >
            <UIcon :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'" class="size-4.5" />
          </Motion>
        </AnimatePresence>
      </button>
    </Motion>
    <template #fallback>
      <div class="h-8 w-8" />
    </template>
  </ClientOnly>
</template>
