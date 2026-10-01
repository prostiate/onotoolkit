<script setup lang="ts">
const props = defineProps<{ original: string; processed?: string | null }>();
const originalRef = ref<HTMLVideoElement | null>(null);
const processedRef = ref<HTMLVideoElement | null>(null);

function syncTime(): void {
  const before = originalRef.value;
  const after = processedRef.value;
  if (!before || !after || after.readyState < 1) return;
  if (Math.abs(after.currentTime - before.currentTime) > 0.15)
    after.currentTime = before.currentTime;
  after.playbackRate = before.playbackRate;
}
function syncPlayback(): void {
  syncTime();
  const before = originalRef.value;
  const after = processedRef.value;
  if (!before || !after) return;
  if (before.paused || before.ended) after.pause();
  else
    void after.play().catch(() => {
      /* Playback remains available on the original player. */
    });
}
watch(
  () => props.processed,
  () => {
    originalRef.value?.pause();
  }
);
onBeforeUnmount(() => {
  originalRef.value?.pause();
  processedRef.value?.pause();
});
</script>

<template>
  <div class="space-y-3">
    <div class="grid items-start gap-4 lg:grid-cols-2">
      <figure class="min-w-0 space-y-2">
        <figcaption class="text-muted text-sm font-medium">Original</figcaption>
        <video
          ref="originalRef"
          :src="original"
          controls
          playsinline
          preload="metadata"
          aria-label="Original video"
          class="bg-muted aspect-video w-full rounded-xl object-contain"
          @play="syncPlayback"
          @pause="syncPlayback"
          @ended="syncPlayback"
          @seeking="syncTime"
          @timeupdate="syncTime"
          @ratechange="syncTime"
        />
      </figure>
      <figure class="min-w-0 space-y-2">
        <figcaption class="text-muted text-sm font-medium">Cleaned</figcaption>
        <video
          v-if="processed"
          ref="processedRef"
          :src="processed"
          muted
          playsinline
          preload="metadata"
          aria-label="Cleaned video"
          class="bg-muted aspect-video w-full rounded-xl object-contain"
          @loadedmetadata="syncPlayback"
        />
        <div
          v-else
          class="border-default bg-muted/40 text-muted flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border px-6 text-center"
        >
          <UIcon name="i-lucide-sparkles" class="text-primary size-8" />
          <p class="text-sm">Your cleaned video will appear here.</p>
        </div>
      </figure>
    </div>
    <p v-if="processed" class="text-dimmed text-xs">
      Use the original video's controls to play and seek both previews together. Audio plays once,
      from the original.
    </p>
  </div>
</template>
