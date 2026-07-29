<script setup lang="ts">
import { resolveComponent } from "vue";
import { Motion } from "motion-v";
import type { ToolDefinition } from "~/types/tools";

const props = defineProps<{ tool: ToolDefinition }>();

const NuxtLink = resolveComponent("NuxtLink");
const isAvailable = computed(() => props.tool.status === "available" && props.tool.route !== null);
const rootComponent = computed(() => (isAvailable.value ? NuxtLink : "div"));
</script>

<template>
  <Motion
    :while-hover="isAvailable ? { y: -3 } : undefined"
    :transition="{ type: 'spring', stiffness: 320, damping: 24 }"
    class="h-full"
  >
    <component
      :is="rootComponent"
      :to="isAvailable ? tool.route : undefined"
      class="border-default bg-default flex h-full flex-col gap-3 rounded-xl border p-5 shadow-sm transition-colors"
      :class="
        isAvailable
          ? 'hover:border-primary/60 hover:ring-primary/20 cursor-pointer hover:ring-4'
          : 'opacity-75'
      "
      :aria-disabled="!isAvailable"
    >
      <div class="flex items-start justify-between gap-3">
        <span
          class="flex h-11 w-11 items-center justify-center rounded-lg"
          :class="isAvailable ? 'bg-primary/10 text-primary' : 'bg-elevated text-dimmed'"
        >
          <UIcon :name="tool.icon" class="size-6" />
        </span>
        <UBadge
          :color="isAvailable ? 'primary' : 'neutral'"
          :variant="isAvailable ? 'solid' : 'soft'"
          size="sm"
          class="shrink-0"
        >
          {{ isAvailable ? "Ready" : "Coming soon" }}
        </UBadge>
      </div>

      <div class="space-y-1">
        <h3 class="text-highlighted text-base font-semibold">{{ tool.title }}</h3>
        <p class="text-muted text-sm leading-relaxed">{{ tool.description }}</p>
      </div>

      <div
        v-if="isAvailable"
        class="text-primary mt-auto flex items-center gap-1 pt-1 text-sm font-medium"
      >
        Open tool
        <UIcon name="i-lucide-arrow-right" class="size-4" />
      </div>
    </component>
  </Motion>
</template>
