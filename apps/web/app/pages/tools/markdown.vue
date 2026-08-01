<script setup lang="ts">
import type { EditorView } from "@codemirror/view";

useSeoMeta({
  title: "Markdown Studio - Ono Toolkit",
  description:
    "Write Markdown with a live split-screen preview and a formatting toolbar, then export to PDF or Word (DOCX) - or import DOCX to Markdown. All in your browser; nothing is uploaded."
});

const store = useMarkdownStore();
const editorView = shallowRef<EditorView | null>(null);
const previewEl = shallowRef<HTMLElement | null>(null);

const { scrollPreviewToLine } = useMarkdownScrollSync(editorView, previewEl);

const markdownModel = computed<string>({
  get: () => store.markdown,
  set: (value) => store.setMarkdown(value)
});

const showEditor = computed(() => store.view !== "preview");
const showPreview = computed(() => store.view !== "editor");
</script>

<template>
  <ToolLayout
    title="Markdown Studio"
    description="Write Markdown with a live preview, then export to PDF or Word."
    icon="i-lucide-file-code-2"
    wide
    privacy-note="Your document is edited and converted locally and never leaves your browser."
  >
    <MarkdownToolbar />
    <MarkdownFormatToolbar :view="editorView" />

    <div v-if="store.error" class="flex min-h-6 items-center gap-2 text-sm">
      <UIcon name="i-lucide-circle-x" class="size-4 text-red-500" />
      <span class="text-red-500">{{ store.error }}</span>
    </div>

    <!--
      Each pane has a fixed, equal height and scrolls internally so a large
      document scrolls inside the editor/preview instead of growing the page.
    -->
    <div class="grid gap-5" :class="store.view === 'split' ? 'lg:grid-cols-2' : ''">
      <div
        v-if="showEditor"
        class="flex h-[calc(100dvh-19rem)] min-h-[24rem] flex-col gap-2 lg:h-[calc(100dvh-12rem)]"
      >
        <p class="text-highlighted text-sm font-semibold">Editor</p>
        <MarkdownSourceEditor
          v-model="markdownModel"
          class="min-h-0 flex-1"
          @ready="editorView = $event"
          @cursor-line="scrollPreviewToLine"
        />
      </div>

      <div
        v-if="showPreview"
        class="flex h-[calc(100dvh-19rem)] min-h-[24rem] flex-col gap-2 lg:h-[calc(100dvh-12rem)]"
      >
        <p class="text-highlighted text-sm font-semibold">Preview</p>
        <MarkdownPreview
          :markdown="store.markdown"
          class="min-h-0 flex-1"
          @ready="previewEl = $event"
        />
      </div>
    </div>

    <MarkdownStats :words="store.words" :characters="store.characters" />
  </ToolLayout>
</template>
