<script setup lang="ts">
import { Motion } from "motion-v";
import { toolGroups, getToolsByGroup } from "~/tools/registry";

useSeoMeta({
  title: "Ono Toolkit - Fast, private, in-browser tools",
  description:
    "A suite of small, fast tools that run entirely in your browser - compress PDFs and more. Private by design: your files never leave your device."
});
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-12">
    <Motion
      :initial="{ opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ type: 'spring', stiffness: 220, damping: 24 }"
    >
      <section class="space-y-4 text-center">
        <UBadge color="primary" variant="soft" size="lg">
          <UIcon name="i-lucide-shield-check" class="mr-1 size-4" />
          100% in your browser
        </UBadge>
        <h1 class="text-highlighted text-4xl font-extrabold tracking-tight sm:text-5xl">
          Your <span class="text-primary">private</span> toolkit
        </h1>
        <p class="text-muted mx-auto max-w-xl text-base sm:text-lg">
          A growing set of fast, focused tools that run entirely on your device. No uploads, no
          accounts - just open a tool and go.
        </p>
      </section>
    </Motion>

    <section v-for="group in toolGroups" :key="group.id" class="space-y-4">
      <div class="px-1">
        <h2 class="text-highlighted text-xl font-bold">{{ group.title }}</h2>
        <p class="text-muted text-sm">{{ group.description }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Motion
          v-for="(tool, index) in getToolsByGroup(group.id)"
          :key="tool.slug"
          :initial="{ opacity: 0, y: 14 }"
          :while-in-view="{ opacity: 1, y: 0 }"
          :in-view-options="{ once: true, margin: '-40px' }"
          :transition="{ delay: index * 0.05, type: 'spring', stiffness: 240, damping: 24 }"
          class="h-full"
        >
          <ToolCard :tool="tool" />
        </Motion>
      </div>
    </section>
  </div>
</template>
