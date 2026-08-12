<script setup lang="ts">
useSeoMeta({
  title: "Screen Recorder - Ono Toolkit",
  description:
    "Record your screen, webcam, and microphone entirely in your browser. Zoom-style pre-recording settings with remembered preferences - nothing is uploaded."
});

const store = useScreenRecorderStore();

function onStart(): void {
  void store.startRecording();
}

function onRestart(): void {
  store.reset();
}

onMounted(() => {
  void store.restoreSession();
});

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Screen Recorder"
    description="Record your screen, webcam, and microphone."
    icon="i-lucide-video"
    wide
    privacy-note="Your recording is captured locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="store.errorMessage ?? 'Please try again.'"
        class="mx-auto max-w-2xl"
      />

      <!-- All three views stay mounted (v-show) so the recording canvas and
           media streams survive the state transitions. -->
      <RecorderPreScreen
        v-show="store.status === 'idle' || store.status === 'error'"
        @start="onStart"
      />
      <RecorderSession v-show="store.hasSession" />
      <RecorderResult v-show="store.status === 'done'" @restart="onRestart" />

      <ClientOnly>
        <RecorderLibrary v-if="!store.hasSession" />
      </ClientOnly>
    </div>
  </ToolLayout>
</template>
