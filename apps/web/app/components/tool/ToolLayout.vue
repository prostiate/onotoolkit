<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description: string;
    icon: string;
    wide?: boolean;
    privacyNote?: string;
  }>(),
  {
    wide: false,
    privacyNote: "Files are processed locally in your browser and never uploaded."
  }
);
</script>

<template>
  <div class="mx-auto space-y-6" :class="wide ? 'max-w-[96rem]' : 'max-w-3xl'">
    <div>
      <ToolBackButton class="mb-4" />

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
      {{ privacyNote }}
    </p>
  </div>
</template>
