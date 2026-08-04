<script setup lang="ts">
import type { SimpleTextValue, TextSavePayload } from "~/types/editPdf";
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "Edit PDF - Ono Toolkit",
  description:
    "Add rich text, images, shapes, drawings, highlights, and signatures onto any PDF page - right in your browser. Private and free; nothing is uploaded."
});

const store = useEditPdfStore();
const { download } = useFileDownload();

const DEFAULT_SIMPLE: SimpleTextValue = {
  text: "",
  fontSize: 16,
  color: "#111827",
  align: "left",
  bold: false,
  italic: false
};

const textOpen = ref(false);
const textEditingId = ref<string | null>(null);
const textMode = ref<"rich" | "simple">("rich");
const textLockMode = ref(false);
const textInitialHtml = ref("");
const textInitialSimple = ref<SimpleTextValue>({ ...DEFAULT_SIMPLE });
const textTarget = ref<{ x: number; y: number }>({ x: 0, y: 0 });

function onSelect(file: File): void {
  void store.setFile(file);
}

function onRequestText(id: string | null, x: number, y: number): void {
  textEditingId.value = id;
  const obj = id ? store.activeObjects.find((o) => o.id === id) : null;
  if (obj && obj.type === "text") {
    textMode.value = "rich";
    textLockMode.value = true;
    textInitialHtml.value = obj.html;
    textInitialSimple.value = { ...DEFAULT_SIMPLE };
  } else if (obj && obj.type === "nativeText") {
    textMode.value = "simple";
    textLockMode.value = true;
    textInitialHtml.value = "";
    textInitialSimple.value = {
      text: obj.text,
      fontSize: obj.fontSize,
      color: obj.color,
      align: obj.align,
      bold: obj.bold,
      italic: obj.italic
    };
  } else {
    textMode.value = "rich";
    textLockMode.value = false;
    textInitialHtml.value = "";
    textInitialSimple.value = { ...DEFAULT_SIMPLE };
    textTarget.value = { x, y };
  }
  textOpen.value = true;
}

function onTextSave(payload: TextSavePayload): void {
  const editingId = textEditingId.value;
  if (payload.mode === "rich") {
    if (editingId) {
      store.pushHistory();
      store.updateObject(editingId, {
        html: payload.html,
        dataUrl: payload.dataUrl,
        width: payload.width,
        height: payload.height
      });
    } else {
      store.addObject({
        id: crypto.randomUUID(),
        type: "text",
        cx: textTarget.value.x,
        cy: textTarget.value.y,
        width: payload.width,
        height: payload.height,
        rotation: 0,
        html: payload.html,
        dataUrl: payload.dataUrl
      });
    }
    return;
  }
  const fields = {
    text: payload.text,
    fontSize: payload.fontSize,
    color: payload.color,
    align: payload.align,
    bold: payload.bold,
    italic: payload.italic,
    width: payload.width,
    height: payload.height
  };
  if (editingId) {
    store.pushHistory();
    store.updateObject(editingId, fields);
  } else {
    store.addObject({
      id: crypto.randomUUID(),
      type: "nativeText",
      cx: textTarget.value.x,
      cy: textTarget.value.y,
      rotation: 0,
      ...fields
    });
  }
}

function onExport(): void {
  void store.exportPdf();
}
function onDownload(): void {
  if (store.resultBytes) download(store.resultBytes, store.resultName, "application/pdf");
}

/** Keyboard shortcuts, ignored while typing in a field or the text editor. */
function onKeydown(event: KeyboardEvent): void {
  if (store.status !== "ready" || textOpen.value) return;
  const el = event.target as HTMLElement | null;
  if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
  const meta = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (meta && key === "z") {
    event.preventDefault();
    if (event.shiftKey) store.redo();
    else store.undo();
  } else if (meta && key === "y") {
    event.preventDefault();
    store.redo();
  } else if (meta && key === "d") {
    event.preventDefault();
    store.duplicateSelected();
  } else if ((event.key === "Delete" || event.key === "Backspace") && store.selectedId) {
    event.preventDefault();
    store.removeSelected();
  } else if (event.key === "Escape") {
    store.select(null);
  } else if (event.key.startsWith("Arrow") && store.selectedId) {
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    };
    const delta = map[event.key];
    if (delta) store.nudgeSelected(delta[0], delta[1]);
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  store.reset();
});
</script>

<template>
  <ToolLayout
    title="Edit PDF"
    description="Add rich text, images, shapes, drawings, and signatures onto your PDF pages."
    icon="i-lucide-pen-tool"
    wide
    privacy-note="Your PDF is edited locally in your browser and never uploaded."
  >
    <div class="space-y-4">
      <ToolDropzone
        v-if="store.status === 'idle' || store.status === 'error'"
        accept="application/pdf,.pdf"
        hint="PDF up to 500 MB"
        label="Drop a PDF here, or tap to browse"
        @select="onSelect"
      />

      <UAlert
        v-if="store.status === 'error'"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Something went wrong"
        :description="store.errorMessage ?? 'Please try a different PDF.'"
      />

      <div
        v-if="store.status === 'loading'"
        class="text-muted flex items-center justify-center gap-2 py-16 text-sm"
      >
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" /> Opening PDF…
      </div>

      <template v-if="store.status === 'ready' || store.status === 'exporting'">
        <ClientOnly>
          <div class="space-y-3">
            <EditorToolbar />
            <EditorProperties />
            <EditorPageNav />
            <EditorCanvas @request-text="onRequestText" />

            <div class="flex flex-col gap-2 sm:flex-row">
              <UButton
                color="primary"
                icon="i-lucide-download"
                size="lg"
                block
                :loading="store.status === 'exporting'"
                @click="onExport()"
              >
                Export PDF
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

            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-info"
              class="text-xs"
              description="Whiteout boxes visually cover content but do not remove the underlying text. For sensitive data, avoid relying on it as redaction."
            />
          </div>
          <template #fallback>
            <div class="text-muted flex items-center justify-center gap-2 py-16 text-sm">
              <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" /> Loading editor…
            </div>
          </template>
        </ClientOnly>

        <ClientOnly>
          <TextEditorPopover
            v-model:open="textOpen"
            :initial-mode="textMode"
            :lock-mode="textLockMode"
            :initial-html="textInitialHtml"
            :initial-simple="textInitialSimple"
            @save="onTextSave"
          />
        </ClientOnly>
      </template>

      <template v-if="store.status === 'done' && store.resultBytes">
        <AppCard>
          <div class="space-y-5">
            <div class="flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <UIcon name="i-lucide-circle-check" class="size-6" />
              </span>
              <div>
                <p class="text-highlighted font-semibold">PDF ready!</p>
                <p class="text-dimmed max-w-xs truncate text-xs">
                  {{ store.resultName }} · {{ formatBytes(store.resultBytes.length) }}
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UButton
                color="primary"
                icon="i-lucide-download"
                size="lg"
                block
                @click="onDownload()"
              >
                Download
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-pen-tool"
                size="lg"
                block
                @click="store.backToEditing()"
              >
                Keep editing
              </UButton>
            </div>
          </div>
        </AppCard>
      </template>
    </div>
  </ToolLayout>
</template>
