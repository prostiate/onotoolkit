<script setup lang="ts">
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
    <UButton
      :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
      color="neutral"
      variant="ghost"
      size="md"
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="isDark = !isDark"
    />
    <template #fallback>
      <div class="h-9 w-9" />
    </template>
  </ClientOnly>
</template>
