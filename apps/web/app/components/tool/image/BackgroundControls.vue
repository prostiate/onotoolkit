<script setup lang="ts">
import type { BackgroundMode } from "~/stores/backgroundRemover";

defineProps<{ mode: BackgroundMode; color: string }>();
const emit = defineEmits<{
  "update:mode": [mode: BackgroundMode];
  "update:color": [color: string];
}>();

const modes: { value: BackgroundMode; label: string; icon: string }[] = [
  { value: "transparent", label: "Transparent", icon: "i-lucide-grid-2x2" },
  { value: "color", label: "Solid colour", icon: "i-lucide-paint-bucket" }
];

/** A small, friendly palette; the native picker covers everything else. */
const presets = [
  "#ffffff",
  "#000000",
  "#0891b2",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#7c3aed"
] as const;
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="option in modes"
        :key="option.value"
        :icon="option.icon"
        :color="mode === option.value ? 'primary' : 'neutral'"
        :variant="mode === option.value ? 'solid' : 'outline'"
        size="sm"
        @click="emit('update:mode', option.value)"
      >
        {{ option.label }}
      </UButton>
    </div>

    <div v-if="mode === 'color'" class="flex flex-wrap items-center gap-2">
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        class="border-default h-7 w-7 rounded-full border transition-transform hover:scale-110"
        :class="color.toLowerCase() === preset ? 'ring-primary ring-2 ring-offset-2' : ''"
        :style="{ backgroundColor: preset }"
        :aria-label="`Use ${preset}`"
        @click="emit('update:color', preset)"
      />
      <label class="border-default ml-1 inline-flex items-center gap-2 rounded-md border px-2 py-1">
        <span class="text-muted text-xs">Custom</span>
        <input
          type="color"
          :value="color"
          class="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label="Pick a custom background colour"
          @input="emit('update:color', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </div>
</template>
