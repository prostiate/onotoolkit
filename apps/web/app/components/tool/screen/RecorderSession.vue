<script setup lang="ts">
import { formatRecordingDuration } from "~/utils/screenRecorder";

const store = useScreenRecorderStore();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvas");

onMounted(() => {
  if (canvasRef.value) store.setCanvas(canvasRef.value);
});

onBeforeUnmount(() => {
  store.setCanvas(null);
});
</script>

<template>
  <div class="space-y-4">
    <AppCard class="p-2">
      <!-- The live composite: the recorder draws the screen + webcam overlay
           onto this canvas while MediaRecorder encodes it. -->
      <canvas
        ref="canvas"
        class="mx-auto block max-h-[62vh] w-full rounded-xl bg-black"
        aria-label="Live preview of the recording"
      />
    </AppCard>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <span
        class="border-default bg-muted flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm font-semibold"
        aria-label="Recording duration"
      >
        <span
          class="size-2.5 rounded-full"
          :class="store.isPaused ? 'bg-dimmed' : 'bg-red-500 animate-pulse'"
        />
        {{ formatRecordingDuration(store.elapsedMs) }}
      </span>

      <UButton
        v-if="!store.isPaused"
        color="primary"
        icon="i-lucide-pause"
        aria-label="Pause recording"
        @click="store.pauseRecording()"
      >
        Pause
      </UButton>
      <UButton
        v-else
        color="primary"
        icon="i-lucide-play"
        aria-label="Resume recording"
        @click="store.resumeRecording()"
      >
        Resume
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        :icon="store.overlayVisible ? 'i-lucide-video' : 'i-lucide-video-off'"
        :aria-label="store.overlayVisible ? 'Hide webcam overlay' : 'Show webcam overlay'"
        @click="() => store.toggleOverlay()"
      >
        {{ store.overlayVisible ? "Hide webcam" : "Show webcam" }}
      </UButton>

      <UButton color="error" variant="solid" icon="i-lucide-square" @click="store.stopRecording()">
        Stop
      </UButton>
    </div>

    <p
      class="text-dimmed mx-auto flex max-w-md items-center justify-center gap-1.5 text-center text-xs"
    >
      <UIcon name="i-lucide-info" class="text-primary size-3.5" />
      Keep this tab open while recording. Use your browser's "Stop sharing" to finish early, or
      press Stop above.
    </p>
  </div>
</template>
