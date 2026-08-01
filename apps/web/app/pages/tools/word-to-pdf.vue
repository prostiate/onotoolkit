<script setup lang="ts">
useSeoMeta({
  title: "Word to PDF - Ono Toolkit",
  description:
    "Convert Word (DOCX) to PDF in your browser - upload a .docx, preview it, and save as PDF. Private and free; nothing is uploaded."
});

const store = useWordToPdfStore();

function onSelect(file: File): void {
  void store.load(file);
}

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Word to PDF"
    description="Convert a Word document (DOCX) to PDF."
    icon="i-lucide-file-type"
    wide
    privacy-note="Your document is converted locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <ToolDropzone
        v-if="store.status === 'idle' || store.status === 'error'"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hint="Word .docx file"
        label="Drop your Word document here, or tap to browse"
        @select="onSelect"
      />

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="store.errorMessage ?? 'Please try a different file.'"
      />

      <AppCard v-if="store.status === 'working'">
        <div class="flex flex-col items-center gap-3 py-4 text-center">
          <UIcon name="i-lucide-loader-circle" class="text-primary size-6 animate-spin" />
          <p class="text-highlighted font-semibold">Converting...</p>
        </div>
      </AppCard>

      <template v-if="store.status === 'ready'">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-highlighted text-sm font-semibold">{{ store.fileName }}</p>
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-printer" size="sm" color="primary" @click="store.printPdf()">
              Save as PDF
            </UButton>
            <UButton
              icon="i-lucide-download"
              size="sm"
              color="neutral"
              variant="soft"
              @click="store.quickDownload()"
            >
              Quick download
            </UButton>
            <UButton
              icon="i-lucide-trash-2"
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
          Preview reflects the converted content. Complex layouts may differ from the original.
        </p>

        <HtmlPreview :html="store.html" class="h-[calc(100dvh-20rem)] min-h-[24rem]" />
      </template>
    </div>
  </ToolLayout>
</template>
