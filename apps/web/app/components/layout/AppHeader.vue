<script setup lang="ts">
const links = [
  { label: "GitHub", icon: "i-lucide-github", to: "https://github.com/prostiate/onotoolkit" },
  {
    label: "LinkedIn",
    icon: "i-lucide-linkedin",
    to: "https://www.linkedin.com/in/muhammad-irfan-kurniawan"
  }
];
</script>

<template>
  <header class="border-default bg-default/80 sticky top-0 z-40 border-b backdrop-blur">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <span
          class="bg-primary text-inverted flex h-9 w-9 items-center justify-center rounded-lg shadow-sm"
        >
          <UIcon name="i-lucide-wrench" class="size-5" />
        </span>
        <span class="text-highlighted text-lg font-bold tracking-tight">
          Ono <span class="text-primary">Toolkit</span>
        </span>
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <UButton
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          :icon="link.icon"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="ghost"
          size="md"
          :aria-label="link.label"
        >
          <span class="hidden sm:inline">{{ link.label }}</span>
        </UButton>
        <ThemeToggle />
      </nav>
    </div>
  </header>
</template>
