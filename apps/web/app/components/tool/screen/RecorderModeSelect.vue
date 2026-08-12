<script setup lang="ts">
import type { RecorderMode } from "~/types/screenRecorder";

const store = useScreenRecorderStore();

const modes: { value: RecorderMode; label: string; hint: string; icon: string }[] = [
  {
    value: "screen",
    label: "Screen only",
    hint: "Capture a window, tab, or your whole display. Add a webcam anytime.",
    icon: "i-lucide-monitor"
  },
  {
    value: "screen-camera",
    label: "Screen + camera",
    hint: "Your screen with a movable webcam bubble on top.",
    icon: "i-lucide-monitor-play"
  },
  {
    value: "camera",
    label: "Camera only",
    hint: "Just your webcam, full frame. Add the screen later if you want.",
    icon: "i-lucide-user"
  }
];

function onSelect(mode: RecorderMode): void {
  void store.setRecordMode(mode);
}
</script>

<template>
  <div class="space-y-3">
    <div>
      <p class="text-highlighted text-sm font-semibold">What do you want to record?</p>
      <p class="text-dimmed text-xs">You can still add or drop a source once you're rolling.</p>
    </div>

    <div
      class="grid gap-3 sm:grid-cols-3"
      role="radiogroup"
      aria-label="What do you want to record?"
    >
      <button
        v-for="mode in modes"
        :key="mode.value"
        type="button"
        role="radio"
        :aria-checked="store.settings.recordMode === mode.value"
        :data-testid="`record-mode-${mode.value}`"
        class="group focus-visible:ring-primary relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2"
        :class="
          store.settings.recordMode === mode.value
            ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
            : 'border-default bg-default hover:border-primary/40 hover:bg-muted'
        "
        @click="onSelect(mode.value)"
      >
        <span
          class="flex size-10 items-center justify-center rounded-lg transition"
          :class="
            store.settings.recordMode === mode.value
              ? 'bg-primary text-inverted'
              : 'bg-muted text-dimmed group-hover:text-primary'
          "
        >
          <UIcon :name="mode.icon" class="size-5" />
        </span>
        <span class="text-highlighted text-sm font-semibold">{{ mode.label }}</span>
        <span class="text-dimmed text-xs leading-snug">{{ mode.hint }}</span>
        <UIcon
          v-if="store.settings.recordMode === mode.value"
          name="i-lucide-check-circle-2"
          class="text-primary absolute right-3 top-3 size-4"
        />
      </button>
    </div>
  </div>
</template>
