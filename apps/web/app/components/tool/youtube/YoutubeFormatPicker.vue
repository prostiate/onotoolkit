<script setup lang="ts">
import type { DownloadMode, YoutubeVideoInfo } from "~/types/youtube";
import { qualityLabel } from "~/utils/youtube";

const props = defineProps<{ info: YoutubeVideoInfo }>();

const mode = defineModel<DownloadMode>("mode", { required: true });
const quality = defineModel<number>("quality", { required: true });

const hasVideo = computed(() => props.info.heights.length > 0);

const qualityItems = computed(() =>
  props.info.heights.map((height) => ({ label: qualityLabel(height), value: height }))
);

interface ModeOption {
  value: DownloadMode;
  label: string;
  hint: string;
  icon: string;
  disabled: boolean;
}

const modeOptions = computed<ModeOption[]>(() => [
  {
    value: "video",
    label: "Video + Audio",
    hint: "MP4",
    icon: "i-lucide-film",
    disabled: !hasVideo.value
  },
  {
    value: "audio",
    label: "Audio only",
    hint: "M4A",
    icon: "i-lucide-music",
    disabled: false
  }
]);
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="text-highlighted mb-2 text-sm font-semibold">Format</p>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="option in modeOptions"
          :key="option.value"
          type="button"
          :disabled="option.disabled"
          class="flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            mode === option.value
              ? 'border-primary bg-primary/5 ring-primary/40 ring-1'
              : 'border-default hover:bg-muted'
          "
          :aria-pressed="mode === option.value"
          @click="mode = option.value"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-lg"
            :class="mode === option.value ? 'bg-primary text-inverted' : 'bg-muted text-muted'"
          >
            <UIcon :name="option.icon" class="size-4.5" />
          </span>
          <span class="min-w-0">
            <span class="text-highlighted block text-sm font-medium">{{ option.label }}</span>
            <span class="text-dimmed block text-xs">{{ option.hint }}</span>
          </span>
        </button>
      </div>
    </div>

    <div v-if="mode === 'video' && hasVideo">
      <label class="text-highlighted mb-2 block text-sm font-semibold">Quality</label>
      <USelect
        v-model="quality"
        :items="qualityItems"
        value-key="value"
        size="lg"
        class="w-full sm:w-48"
        aria-label="Video quality"
      />
    </div>
  </div>
</template>
