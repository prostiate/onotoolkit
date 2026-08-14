<script setup lang="ts">
import { computed } from "vue";

const store = useScreenRecorderStore();

const emit = defineEmits<{ start: [] }>();

const isCameraMode = computed(() => store.settings.recordMode === "camera");
// Screen-only starts clean: do not reserve half of the setup card for an
// inactive camera. The preview appears after the user explicitly enables the
// webcam, or automatically for the camera-based modes.
const showsCameraPreview = computed(
  () => store.settings.recordMode !== "screen" || store.settings.webcamOn
);
const showsWebcamToggle = computed(() => store.settings.recordMode === "screen");
const showsOverlaySettings = computed(
  () => store.settings.recordMode !== "camera" && store.settings.webcamOn
);

const startLabel = computed(() => {
  if (isCameraMode.value) return "Start camera recording";
  return "Start recording";
});

function onWebcamToggle(): void {
  void store.setWebcamOn(!store.settings.webcamOn);
}
</script>

<template>
  <div class="space-y-5">
    <AppCard>
      <RecorderModeSelect />
    </AppCard>

    <AppCard>
      <div class="space-y-5">
        <RecorderCameraPreview v-if="showsCameraPreview" />

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div v-if="showsWebcamToggle" class="flex items-center gap-2">
            <UButton
              :icon="store.settings.webcamOn ? 'i-lucide-video' : 'i-lucide-video-off'"
              :color="store.settings.webcamOn ? 'primary' : 'neutral'"
              :variant="store.settings.webcamOn ? 'solid' : 'soft'"
              :aria-label="store.settings.webcamOn ? 'Turn webcam off' : 'Turn webcam on'"
              :aria-pressed="store.settings.webcamOn"
              @click="onWebcamToggle"
            >
              {{ store.settings.webcamOn ? "Webcam on" : "Add webcam" }}
            </UButton>
            <span class="text-dimmed text-xs">
              {{ store.settings.webcamOn ? "Camera bubble on your screen" : "Optional" }}
            </span>
          </div>
          <p v-else class="text-dimmed flex items-center gap-1.5 text-xs">
            <UIcon name="i-lucide-info" class="text-primary size-3.5" />
            {{
              isCameraMode
                ? "You can add your screen once recording starts."
                : "You can move the camera bubble while recording."
            }}
          </p>

          <RecorderDeviceSelect
            v-if="store.cameraStream"
            id="recorder-camera-device"
            label="Camera"
            :devices="store.devices.cameras"
            :model-value="store.settings.cameraDeviceId"
            device-kind="camera"
            class="w-64"
            @update:model-value="(id: string | null) => store.setCameraDevice(id)"
          />
        </div>

        <div class="border-default border-t pt-4">
          <RecorderAudioSettings />
        </div>
      </div>
    </AppCard>

    <AppCard v-if="showsOverlaySettings">
      <RecorderOverlaySettings />
    </AppCard>

    <AppCard>
      <RecorderQualitySettings />
    </AppCard>

    <p class="text-dimmed flex items-center gap-1.5 text-xs">
      <UIcon name="i-lucide-rotate-ccw" class="text-primary size-3.5" />
      Your choices are remembered on this device for next time.
    </p>

    <UButton color="primary" icon="i-lucide-circle-dot" size="lg" block @click="emit('start')">
      {{ startLabel }}
    </UButton>
  </div>
</template>
