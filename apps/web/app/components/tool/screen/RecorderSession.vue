<script setup lang="ts">
import { ref } from "vue";
import { formatRecordingDuration } from "~/utils/screenRecorder";

const store = useScreenRecorderStore();

const canToggleWebcam = computed(() => store.displayActive);
const overlaySettingsOpen = ref(false);

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
      <!-- The stage wraps the canvas so the annotation layer and draggable
           webcam frame line up 1:1 with the composited output. -->
      <div class="relative mx-auto w-full">
        <canvas
          ref="canvas"
          class="mx-auto block max-h-[62vh] w-full rounded-xl bg-black"
          aria-label="Live preview of the recording"
        />
        <RecorderStage />
        <RecorderAnnotationToolbar />

        <!-- A floating dock keeps the controls next to the recording surface,
             like a screen-recorder overlay, instead of making users hunt below
             the preview. It stays above the canvas but never enters the video. -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3"
          data-testid="recorder-control-dock"
        >
          <div
            class="border-default bg-default/90 pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl border p-2 shadow-xl backdrop-blur-md sm:gap-2 sm:rounded-full"
            aria-label="Recording controls"
          >
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
              size="sm"
              @click="store.pauseRecording()"
            >
              Pause
            </UButton>
            <UButton
              v-else
              color="primary"
              icon="i-lucide-play"
              aria-label="Resume recording"
              size="sm"
              @click="store.resumeRecording()"
            >
              Resume
            </UButton>

            <div v-if="canToggleWebcam" class="relative">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-sliders-horizontal"
                aria-label="Open webcam controls"
                :aria-expanded="overlaySettingsOpen"
                size="sm"
                @click="overlaySettingsOpen = !overlaySettingsOpen"
              >
                Webcam style
              </UButton>
              <div
                v-if="overlaySettingsOpen"
                class="border-default bg-default absolute bottom-full right-0 z-40 mb-2 w-[min(23rem,calc(100vw-2rem))] rounded-xl border p-4 shadow-2xl"
                data-testid="webcam-controls"
              >
                <RecorderOverlaySettings />
              </div>
            </div>

            <UButton
              v-if="canToggleWebcam"
              color="neutral"
              variant="outline"
              :icon="store.overlayVisible ? 'i-lucide-video' : 'i-lucide-video-off'"
              :aria-label="store.overlayVisible ? 'Hide webcam overlay' : 'Show webcam overlay'"
              size="sm"
              @click="() => store.toggleOverlay()"
            >
              {{ store.overlayVisible ? "Hide webcam" : "Show webcam" }}
            </UButton>

            <UButton
              v-if="!store.displayActive"
              color="neutral"
              variant="outline"
              icon="i-lucide-monitor-up"
              aria-label="Add screen"
              data-testid="add-screen"
              size="sm"
              @click="() => store.addScreenMidSession()"
            >
              Add screen
            </UButton>

            <UButton
              color="error"
              variant="solid"
              icon="i-lucide-square"
              aria-label="Stop recording"
              size="sm"
              @click="store.stopRecording()"
            >
              Stop
            </UButton>
          </div>
        </div>
      </div>
    </AppCard>

    <p
      class="text-dimmed mx-auto flex max-w-md items-center justify-center gap-1.5 text-center text-xs"
    >
      <UIcon name="i-lucide-info" class="text-primary size-3.5" />
      Drag the webcam bubble or draw with the pen. Use the floating controls to pause, toggle your
      webcam, or stop recording.
    </p>
  </div>
</template>
