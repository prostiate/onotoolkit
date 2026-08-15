<script setup lang="ts">
import { backgroundRemovalQualityOption } from "~/schemas/backgroundRemover";
import type { BackgroundMode } from "~/stores/backgroundRemover";
import type { BackgroundRemovalQuality } from "~/types/tools";
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "Background Remover - Ono Toolkit",
  description:
    "Remove or recolour an image background right in your browser. Fast, private, and free - your image is never uploaded."
});

const store = useBackgroundRemoverStore();
const { downloadBlob } = useFileDownload();

/** Size the busy panel quotes must match the quality the run actually uses. */
const modelSize = computed(
  () => `~${formatBytes(backgroundRemovalQualityOption(store.quality).downloadBytes, 0)}`
);

function onSelect(file: File): void {
  void store.setFile(file);
}
function onDownload(): void {
  if (store.resultBlob) downloadBlob(store.resultBlob, store.resultName);
}

onMounted(() => store.hydrate());
onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Background Remover"
    description="Erase the background or drop in a solid colour - without losing image quality."
    icon="i-lucide-scissors-line-dashed"
    wide
    privacy-note="Your image is processed locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <AppCard v-if="store.status === 'idle' || store.status === 'error'">
        <div class="space-y-5">
          <BackgroundQualityControls
            :quality="store.quality"
            @update:quality="(q: BackgroundRemovalQuality) => store.setQuality(q)"
          />
          <ToolDropzone
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            hint="JPG, PNG or WebP - up to 50 MB"
            label="Drop an image here, or tap to browse"
            @select="onSelect"
          />
        </div>
      </AppCard>

      <UAlert
        v-if="store.addError"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :description="store.addError"
      />

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="store.errorMessage ?? 'Please try a different image.'"
      />

      <ImageModelProgress
        v-if="store.status === 'working'"
        :phase="store.phase"
        :progress="store.progress"
        :model-size="modelSize"
        processing-label="Removing background"
      />

      <template v-if="store.status === 'done' && store.resultUrl">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-2">
            <p class="text-muted text-xs font-medium">Original</p>
            <div class="bg-muted flex items-center justify-center overflow-hidden rounded-lg">
              <img
                v-if="store.originalUrl"
                :src="store.originalUrl"
                alt="Original image"
                class="max-h-[60vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
          <div class="space-y-2">
            <p class="text-muted text-xs font-medium">Result</p>
            <div
              v-if="store.mode === 'color'"
              class="flex items-center justify-center overflow-hidden rounded-lg"
              :style="{ backgroundColor: store.color }"
            >
              <img
                :src="store.resultUrl"
                alt="Image with new background"
                class="max-h-[60vh] w-auto max-w-full object-contain"
              />
            </div>
            <CheckerboardImage v-else :src="store.resultUrl" alt="Image with background removed" />
          </div>
        </div>

        <AppCard>
          <div class="space-y-4">
            <BackgroundControls
              :mode="store.mode"
              :color="store.color"
              @update:mode="(m: BackgroundMode) => store.setMode(m)"
              @update:color="(c: string) => store.setColor(c)"
            />
            <div class="flex flex-col gap-2 sm:flex-row">
              <UButton
                color="primary"
                icon="i-lucide-download"
                size="lg"
                block
                @click="onDownload()"
              >
                Download PNG
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                size="lg"
                block
                @click="store.reset()"
              >
                Start over
              </UButton>
            </div>
            <p class="text-dimmed text-xs">
              {{ store.resultName }} · exported as a lossless PNG<span v-if="store.originalSize">
                · original {{ formatBytes(store.originalSize) }}</span
              >
            </p>
          </div>
        </AppCard>
      </template>
    </div>
  </ToolLayout>
</template>
