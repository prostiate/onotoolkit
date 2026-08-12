<script setup lang="ts">
import { useTemplateRef, watch } from "vue";

const store = useScreenRecorderStore();

// The <video> is always mounted (never v-if) so switching streams never
// remounts it — that remount was what made the preview flash on then off.
const videoRef = useTemplateRef<HTMLVideoElement>("video");

watch(
  () => store.cameraStream,
  (stream) => {
    const el = videoRef.value;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  },
  { immediate: true }
);
</script>

<template>
  <div class="bg-muted relative aspect-video overflow-hidden rounded-xl">
    <video
      ref="video"
      autoplay
      muted
      playsinline
      class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
      :class="store.cameraStream ? 'opacity-100' : 'opacity-0'"
      data-testid="camera-preview"
    />
    <div
      v-if="!store.cameraStream"
      class="text-dimmed absolute inset-0 flex flex-col items-center justify-center gap-2"
    >
      <UIcon name="i-lucide-video-off" class="size-10" />
      <p class="text-sm font-medium">Webcam is off</p>
    </div>

    <span
      class="border-default/50 bg-default/80 absolute right-2 top-2 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur"
    >
      <span
        class="size-1.5 rounded-full"
        :class="store.cameraStream ? 'bg-emerald-500' : 'bg-dimmed'"
      />
      <span :class="store.cameraStream ? 'text-emerald-600 dark:text-emerald-400' : 'text-dimmed'">
        {{ store.cameraStream ? "Camera live" : "Camera off" }}
      </span>
    </span>
  </div>
</template>
