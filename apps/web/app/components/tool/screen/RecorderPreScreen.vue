<script setup lang="ts">
const store = useScreenRecorderStore();

const emit = defineEmits<{ start: [] }>();

function onWebcamToggle(): void {
  void store.setWebcamOn(!store.settings.webcamOn);
}
</script>

<template>
  <div class="space-y-5">
    <AppCard>
      <div class="space-y-5">
        <RecorderCameraPreview />

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UButton
              :icon="store.settings.webcamOn ? 'i-lucide-video' : 'i-lucide-video-off'"
              :color="store.settings.webcamOn ? 'primary' : 'neutral'"
              :variant="store.settings.webcamOn ? 'solid' : 'soft'"
              :aria-label="store.settings.webcamOn ? 'Turn webcam off' : 'Turn webcam on'"
              :aria-pressed="store.settings.webcamOn"
              @click="onWebcamToggle"
            >
              {{ store.settings.webcamOn ? "Webcam on" : "Webcam off" }}
            </UButton>
            <span class="text-dimmed text-xs">
              {{ store.settings.webcamOn ? "Your camera is live" : "Start without the camera" }}
            </span>
          </div>

          <RecorderDeviceSelect
            v-if="store.settings.webcamOn"
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

    <AppCard>
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
      Start recording
    </UButton>
  </div>
</template>
