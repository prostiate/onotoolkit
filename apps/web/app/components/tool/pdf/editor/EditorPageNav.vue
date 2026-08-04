<script setup lang="ts">
const store = useEditPdfStore();
const { openDocument, renderPage } = usePdfRender();

const thumbs = ref<Record<string, string>>({});
let doc: import("pdfjs-dist").PDFDocumentProxy | null = null;

async function renderThumbs(): Promise<void> {
  if (!store.sourceBytes) return;
  if (!doc) doc = await openDocument(store.sourceBytes);
  for (const page of store.pages) {
    if (page.sourceIndex === null || thumbs.value[page.id]) continue;
    try {
      const rendered = await renderPage(doc, page.sourceIndex + 1, 72);
      thumbs.value = { ...thumbs.value, [page.id]: rendered.dataUrl };
    } catch {
      /* leave a blank placeholder for pages that fail to render */
    }
  }
}

onMounted(() => void renderThumbs());
watch(
  () => store.pages.map((p) => p.id).join(","),
  () => void renderThumbs()
);
onBeforeUnmount(() => void (doc as { destroy?: () => Promise<void> } | null)?.destroy?.());
</script>

<template>
  <div
    class="border-default bg-default flex items-stretch gap-2 overflow-x-auto rounded-lg border p-2"
  >
    <div
      v-for="(page, index) in store.pages"
      :key="page.id"
      class="flex shrink-0 flex-col items-center gap-1"
    >
      <button
        type="button"
        class="relative overflow-hidden rounded border-2 transition-colors"
        :class="
          page.id === store.activePageId
            ? 'border-primary'
            : 'border-default hover:border-primary/50'
        "
        :aria-label="`Go to page ${index + 1}`"
        :aria-current="page.id === store.activePageId"
        @click="store.setActivePage(page.id)"
      >
        <div class="flex h-20 w-16 items-center justify-center bg-white">
          <img
            v-if="thumbs[page.id]"
            :src="thumbs[page.id]"
            alt=""
            class="max-h-full max-w-full object-contain"
            :style="{ transform: `rotate(${page.rotation}deg)` }"
          />
          <UIcon v-else name="i-lucide-file" class="text-dimmed size-6" />
        </div>
        <span
          class="bg-default/80 text-highlighted absolute bottom-0 left-0 rounded-tr px-1 text-[10px] font-medium"
        >
          {{ index + 1 }}
        </span>
      </button>
      <div class="flex items-center">
        <UButton
          icon="i-lucide-chevron-left"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="index === 0"
          aria-label="Move page left"
          @click="store.movePage(page.id, -1)"
        />
        <UButton
          icon="i-lucide-rotate-cw"
          size="xs"
          color="neutral"
          variant="ghost"
          aria-label="Rotate page"
          @click="store.rotatePage(page.id)"
        />
        <UButton
          icon="i-lucide-chevron-right"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="index === store.pages.length - 1"
          aria-label="Move page right"
          @click="store.movePage(page.id, 1)"
        />
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="store.pages.length <= 1"
          aria-label="Delete page"
          @click="store.deletePage(page.id)"
        />
      </div>
    </div>

    <button
      type="button"
      class="border-default hover:border-primary/50 text-muted flex h-20 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded border-2 border-dashed text-xs"
      @click="store.addBlankPage()"
    >
      <UIcon name="i-lucide-plus" class="size-5" />
      Blank
    </button>
  </div>
</template>
