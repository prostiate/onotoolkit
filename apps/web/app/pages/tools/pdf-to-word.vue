<script setup lang="ts">
useSeoMeta({
  title: "PDF to Word - Ono Toolkit",
  description:
    "Convert a PDF into an editable Word (DOCX) document in your browser. Best-effort text extraction; private and free - nothing is uploaded."
});

const store = usePdfToWordStore();

function onSelect(file: File): void {
  void store.load(file);
}

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="PDF to Word"
    description="Turn a PDF into an editable Word (DOCX) document."
    icon="i-lucide-file-type"
    wide
    privacy-note="Your PDF is read locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <ToolDropzone v-if="store.status === 'idle' || store.status === 'error'" @select="onSelect" />

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
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-highlighted text-sm font-semibold">{{ store.fileName }}</p>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-file-type"
              size="sm"
              color="primary"
              :loading="store.busy"
              @click="store.downloadWord()"
            >
              Download Word
            </UButton>
            <UButton
              icon="i-lucide-file-text"
              size="sm"
              color="neutral"
              variant="soft"
              @click="store.downloadMarkdown()"
            >
              Download .md
            </UButton>
            <UButton
              icon="i-lucide-rotate-ccw"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="store.reset()"
            >
              Choose another
            </UButton>
          </div>
        </div>

        <p class="text-dimmed text-xs">
          Best-effort conversion: headings, paragraphs, and lists are inferred. Tables and complex
          layouts may differ from the original.
        </p>

        <MarkdownPreview :markdown="store.markdown" class="h-[calc(100dvh-20rem)] min-h-[24rem]" />
      </template>
    </div>
  </ToolLayout>
</template>
