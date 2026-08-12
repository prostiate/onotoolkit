<script setup lang="ts">
const store = useScreenRecorderStore();
</script>

<template>
  <div class="bg-muted relative aspect-video overflow-hidden rounded-xl">
    <video
      v-if="store.cameraStream"
      :src-object="store.cameraStream"
      autoplay
      muted
      playsinline
      class="absolute inset-0 h-full w-full object-cover"
      data-testid="camera-preview"
    />
    <div
      v-else
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
      <span :class="store.cameraStream ? 'text-emerald-600' : 'text-dimmed'">
        {{ store.cameraStream ? "Webcam on" : "Webcam off" }}
      </span>
    </span>
  </div>
</template>
