<script setup lang="ts">
useSeoMeta({
  title: "Watermark Remover - Ono Toolkit",
  description:
    "Brush over a watermark and erase it with in-browser AI inpainting. Only the marked pixels change - the rest of your image stays untouched. Nothing is uploaded."
});

const store = useWatermarkRemoverStore();
const { downloadBlob } = useFileDownload();

const canvasRef = ref<{
  undo: () => void;
  clear: () => void;
  getSourceImage: () => import("~/utils/image").RgbaImage;
  getMaskOverlay: () => import("~/utils/image").RgbaImage;
} | null>(null);
const hasStrokes = ref(false);

function onSelect(file: File): void {
  hasStrokes.value = false;
  void store.setFile(file);
}
function onStrokesChanged(value: boolean): void {
  hasStrokes.value = value;
}
function onUndo(): void {
  canvasRef.value?.undo();
}
function onClear(): void {
  canvasRef.value?.clear();
  hasStrokes.value = false;
}
function onRemove(): void {
  if (!canvasRef.value) return;
  const source = canvasRef.value.getSourceImage();
  const overlay = canvasRef.value.getMaskOverlay();
  void store.run(source, overlay);
}
function onDownload(): void {
  if (store.resultBlob) downloadBlob(store.resultBlob, store.resultName);
}
function onBack(): void {
  hasStrokes.value = false;
  store.backToEdit();
}

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Watermark Remover"
    description="Paint over the watermark and inpaint it away - the rest of the image is left untouched."
    icon="i-lucide-eraser"
    wide
    privacy-note="Your image is processed locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <ToolDropzone
        v-if="store.status === 'idle'"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hint="JPG, PNG or WebP - up to 50 MB"
        label="Drop an image here, or tap to browse"
        @select="onSelect"
      />

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
        :description="store.errorMessage ?? 'Please try again.'"
      />

      <template v-if="store.status === 'ready' && store.sourceUrl">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Brush over the watermark"
          description="Cover the whole watermark in red. Only the pixels you paint are regenerated; everything else stays exactly as-is."
        />

        <WatermarkToolbar
          :brush-size="store.brushSize"
          :can-undo="hasStrokes"
          :can-clear="hasStrokes"
          @update:brush-size="store.setBrushSize"
          @undo="onUndo"
          @clear="onClear"
        />

        <WatermarkCanvas
          ref="canvasRef"
          :src="store.sourceUrl"
          :width="store.width"
          :height="store.height"
          :brush-size="store.brushSize"
          @strokes-changed="onStrokesChanged"
        />

        <div class="flex flex-col gap-2 sm:flex-row">
          <UButton
            color="primary"
            icon="i-lucide-sparkles"
            size="lg"
            block
            :disabled="!hasStrokes"
            @click="onRemove()"
          >
            Remove watermark
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
      </template>

      <ImageModelProgress
        v-if="store.status === 'working'"
        :phase="store.phase"
        :progress="store.progress"
        model-size="~28 MB"
        processing-label="Removing watermark"
      />

      <template v-if="store.status === 'done' && store.resultUrl">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-2">
            <p class="text-muted text-xs font-medium">Before</p>
            <div class="bg-muted flex items-center justify-center overflow-hidden rounded-lg">
              <img
                v-if="store.sourceUrl"
                :src="store.sourceUrl"
                alt="Original image"
                class="max-h-[60vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
          <div class="space-y-2">
            <p class="text-muted text-xs font-medium">After</p>
            <div class="bg-muted flex items-center justify-center overflow-hidden rounded-lg">
              <img
                :src="store.resultUrl"
                alt="Image with watermark removed"
                class="max-h-[60vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row">
          <UButton color="primary" icon="i-lucide-download" size="lg" block @click="onDownload()">
            Download PNG
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-brush"
            size="lg"
            block
            @click="onBack()"
          >
            Touch up more
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-ccw"
            size="lg"
            block
            @click="store.reset()"
          >
            New image
          </UButton>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>
