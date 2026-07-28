<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  icon: string;
}>();
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <UButton
        to="/"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        class="mb-4"
      >
        All tools
      </UButton>

      <div class="flex items-center gap-3">
        <span
          class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl"
        >
          <UIcon :name="icon" class="size-7" />
        </span>
        <div>
          <h1 class="text-highlighted text-2xl font-bold">{{ title }}</h1>
          <p class="text-muted text-sm">{{ description }}</p>
        </div>
      </div>
    </div>

    <slot />

    <p class="text-dimmed flex items-center justify-center gap-1.5 text-xs">
      <UIcon name="i-lucide-lock" class="text-primary size-3.5" />
      Files are processed locally in your browser and never uploaded.
    </p>
  </div>
</template>
