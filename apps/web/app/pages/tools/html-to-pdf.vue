<script setup lang="ts">
useSeoMeta({
  title: "HTML to PDF - Ono Toolkit",
  description:
    "Convert HTML to PDF in your browser - paste or upload HTML, preview it live, and save as a vector PDF. Private and free; nothing is uploaded."
});

const store = useHtmlToPdfStore();

const htmlModel = computed<string>({
  get: () => store.html,
  set: (value) => store.setHtml(value)
});

const fileInput = ref<HTMLInputElement | null>(null);
function pickFile(): void {
  fileInput.value?.click();
}
async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await store.loadFile(file);
  input.value = "";
}
</script>

<template>
  <ToolLayout
    title="HTML to PDF"
    description="Paste or upload HTML, preview it, and save as PDF."
    icon="i-lucide-code-2"
    wide
    privacy-note="Your HTML is rendered locally in your browser and never uploaded."
  >
    <div class="space-y-4">
      <AppCard :padded="false">
        <div class="flex flex-wrap items-center gap-2 p-3">
          <UButton
            icon="i-lucide-printer"
            size="sm"
            color="primary"
            :loading="store.busy"
            @click="store.printPdf()"
          >
            Save as PDF
          </UButton>
          <UButton
            icon="i-lucide-download"
            size="sm"
            color="neutral"
            variant="soft"
            :loading="store.busy"
            @click="store.quickDownload()"
          >
            Quick download
          </UButton>
          <div class="grow" />
          <UButton
            icon="i-lucide-upload"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="pickFile()"
          >
            Upload .html
          </UButton>
          <UButton
            icon="i-lucide-file-plus-2"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="store.loadSample()"
          >
            Sample
          </UButton>
          <UButton
            icon="i-lucide-eraser"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="store.clear()"
          >
            Clear
          </UButton>
          <input
            ref="fileInput"
            type="file"
            accept=".html,.htm,text/html"
            class="hidden"
            @change="onFile"
          />
        </div>
      </AppCard>

      <UAlert
        v-if="store.errorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :description="store.errorMessage"
      />

      <p class="text-dimmed text-xs">
        <strong>Save as PDF</strong> opens your browser's print dialog (choose "Save as PDF") for
        crisp, searchable output. <strong>Quick download</strong> saves a file directly, but the PDF
        is image-based (not searchable). Pasted/uploaded HTML only - remote URLs and external
        stylesheets are not fetched.
      </p>

      <div class="grid gap-5 lg:grid-cols-2">
        <div
          class="flex h-[calc(100dvh-22rem)] min-h-[24rem] flex-col gap-2 lg:h-[calc(100dvh-16rem)]"
        >
          <p class="text-highlighted text-sm font-semibold">HTML</p>
          <textarea
            v-model="htmlModel"
            spellcheck="false"
            class="border-default bg-default text-highlighted min-h-0 flex-1 resize-none rounded-lg border p-3 font-mono text-[13px] leading-relaxed outline-none"
            placeholder="Paste your HTML here..."
          />
        </div>
        <div
          class="flex h-[calc(100dvh-22rem)] min-h-[24rem] flex-col gap-2 lg:h-[calc(100dvh-16rem)]"
        >
          <p class="text-highlighted text-sm font-semibold">Preview</p>
          <HtmlPreview :html="store.html" class="min-h-0 flex-1" />
        </div>
      </div>
    </div>
  </ToolLayout>
</template>
