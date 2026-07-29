<script setup lang="ts">
import type { PDFDocumentProxy } from "pdfjs-dist";

const props = defineProps<{
  originalFile: File;
  compressedBytes: Uint8Array;
}>();

const TARGET_WIDTH = 560;

const { openDocument, renderPage } = usePdfRender();

const originalDoc = shallowRef<PDFDocumentProxy | null>(null);
const compressedDoc = shallowRef<PDFDocumentProxy | null>(null);

const page = ref(1);
const numPages = ref(1);
const beforeSrc = ref("");
const afterSrc = ref("");
const loading = ref(true);
const failed = ref(false);

async function renderCurrent(): Promise<void> {
  if (!originalDoc.value || !compressedDoc.value) return;
  loading.value = true;
  try {
    const [before, after] = await Promise.all([
      renderPage(originalDoc.value, page.value, TARGET_WIDTH),
      renderPage(compressedDoc.value, page.value, TARGET_WIDTH)
    ]);
    beforeSrc.value = before.dataUrl;
    afterSrc.value = after.dataUrl;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

function goTo(next: number): void {
  const clamped = Math.min(numPages.value, Math.max(1, next));
  if (clamped !== page.value) page.value = clamped;
}

watch(page, () => {
  void renderCurrent();
});

onMounted(async () => {
  try {
    const originalBytes = new Uint8Array(await props.originalFile.arrayBuffer());
    const [original, compressed] = await Promise.all([
      openDocument(originalBytes),
      openDocument(props.compressedBytes)
    ]);
    originalDoc.value = original;
    compressedDoc.value = compressed;
    numPages.value = Math.min(original.numPages, compressed.numPages);
    await renderCurrent();
  } catch {
    failed.value = true;
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  void originalDoc.value?.cleanup();
  void compressedDoc.value?.cleanup();
});
</script>

<template>
  <AppCard>
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-highlighted font-semibold">Preview</p>
          <p class="text-dimmed text-xs">Drag the divider to compare quality.</p>
        </div>
        <div v-if="numPages > 1 && !failed" class="flex items-center gap-1">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="page <= 1 || loading"
            aria-label="Previous page"
            @click="goTo(page - 1)"
          />
          <span class="text-muted min-w-16 text-center text-xs">
            Page {{ page }} / {{ numPages }}
          </span>
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="page >= numPages || loading"
            aria-label="Next page"
            @click="goTo(page + 1)"
          />
        </div>
      </div>

      <div v-if="failed" class="text-muted bg-muted rounded-lg px-4 py-8 text-center text-sm">
        A preview could not be generated for this PDF, but your download is ready above.
      </div>

      <div v-else class="relative">
        <div
          v-if="loading"
          class="bg-muted text-dimmed flex h-64 items-center justify-center rounded-lg"
        >
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        </div>
        <BeforeAfterSlider
          v-else-if="beforeSrc && afterSrc"
          :before-src="beforeSrc"
          :after-src="afterSrc"
          before-label="Before"
          after-label="After"
        />
      </div>
    </div>
  </AppCard>
</template>
