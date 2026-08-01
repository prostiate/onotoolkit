<script setup lang="ts">
useSeoMeta({
  title: "PDF to Markdown - Ono Toolkit",
  description:
    "Extract a PDF's text into editable Markdown in your browser, then fix it up and export to Markdown, PDF, or Word. Best-effort; private and free - nothing is uploaded."
});

const store = usePdfToMarkdownStore();

function onSelect(file: File): void {
  void store.load(file);
}

const markdownModel = computed<string>({
  get: () => store.markdown,
  set: (value) => store.setMarkdown(value)
});

const copied = ref(false);
async function copy(): Promise<void> {
  if (!store.markdown) return;
  await navigator.clipboard.writeText(store.markdown);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1200);
}

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="PDF to Markdown"
    description="Extract a PDF into editable Markdown, then export."
    icon="i-lucide-file-text"
    wide
    privacy-note="Your PDF is read locally in your browser and never uploaded."
  >
    <div class="space-y-4">
      <ToolDropzone
        v-if="store.status === 'idle' || (store.status === 'error' && !store.markdown)"
        @select="onSelect"
      />

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Could not extract text"
        :description="store.errorMessage ?? 'Please try a different PDF.'"
      />

      <AppCard v-if="store.status === 'working'">
        <div class="flex flex-col items-center gap-3 py-4 text-center">
          <UIcon name="i-lucide-loader-circle" class="text-primary size-6 animate-spin" />
          <p class="text-highlighted font-semibold">Extracting text...</p>
        </div>
      </AppCard>

      <template v-if="store.status === 'ready'">
        <AppCard :padded="false">
          <div class="flex flex-wrap items-center gap-2 p-3">
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              size="sm"
              color="neutral"
              variant="soft"
              @click="copy()"
            >
              Copy
            </UButton>
            <UButton
              icon="i-lucide-file-text"
              size="sm"
              color="primary"
              @click="store.exportMarkdown()"
            >
              Download .md
            </UButton>
            <UButton
              icon="i-lucide-printer"
              size="sm"
              color="neutral"
              variant="soft"
              :loading="store.busy"
              @click="store.savePdf()"
            >
              Save as PDF
            </UButton>
            <UButton
              icon="i-lucide-file-down"
              size="sm"
              color="neutral"
              variant="soft"
              :loading="store.busy"
              @click="store.quickPdf()"
            >
              Quick PDF
            </UButton>
            <UButton
              icon="i-lucide-file-type"
              size="sm"
              color="neutral"
              variant="soft"
              :loading="store.busy"
              @click="store.exportWord()"
            >
              Word
            </UButton>
            <div class="grow" />
            <UButton
              icon="i-lucide-rotate-ccw"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="store.reset()"
            >
              Choose another
            </UButton>
          </div>
        </AppCard>

        <p class="text-dimmed text-xs">
          Best-effort extraction: headings, paragraphs, and lists are inferred from the PDF. Tables
          and complex layouts may need touch-ups - edit on the left before exporting.
        </p>

        <div class="grid gap-5 lg:grid-cols-2">
          <div
            class="flex h-[calc(100dvh-24rem)] min-h-[22rem] flex-col gap-2 lg:h-[calc(100dvh-18rem)]"
          >
            <p class="text-highlighted text-sm font-semibold">Markdown</p>
            <MarkdownSourceEditor v-model="markdownModel" class="min-h-0 flex-1" />
          </div>
          <div
            class="flex h-[calc(100dvh-24rem)] min-h-[22rem] flex-col gap-2 lg:h-[calc(100dvh-18rem)]"
          >
            <p class="text-highlighted text-sm font-semibold">Preview</p>
            <MarkdownPreview :markdown="store.markdown" class="min-h-0 flex-1" />
          </div>
        </div>
      </template>
    </div>
  </ToolLayout>
</template>
