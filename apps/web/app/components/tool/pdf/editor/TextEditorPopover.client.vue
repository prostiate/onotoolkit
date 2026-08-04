<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import type { SimpleTextValue, TextSavePayload } from "~/types/editPdf";

type Align = SimpleTextValue["align"];

const props = defineProps<{
  initialMode: "rich" | "simple";
  lockMode: boolean;
  initialHtml: string;
  initialSimple: SimpleTextValue;
}>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ save: [payload: TextSavePayload] }>();

const busy = ref(false);
const content = ref<HTMLElement | null>(null);
const mode = ref<"rich" | "simple">(props.initialMode);
const simple = ref<SimpleTextValue>({ ...props.initialSimple });

watch(open, (value) => {
  if (!value) return;
  mode.value = props.initialMode;
  simple.value = { ...props.initialSimple };
  if (editor.value) editor.value.commands.setContent(props.initialHtml || "<p>Type here…</p>");
});

/* --------------------------------- rich ---------------------------------- */

const editor = useEditor({
  content: props.initialHtml || "<p>Type here…</p>",
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    Image.configure({ inline: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] })
  ],
  editorProps: { attributes: { class: "tiptap-surface" } }
});

const richColor = ref("#111827");
function insertImage(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      editor.value
        ?.chain()
        .focus()
        .setImage({ src: reader.result as string })
        .run();
    reader.readAsDataURL(file);
  };
  input.click();
}

interface ToolbarAction {
  icon: string;
  label: string;
  run: () => void;
  active?: () => boolean;
}
const richActions = computed<ToolbarAction[]>(() => {
  const e = editor.value;
  return [
    {
      icon: "i-lucide-bold",
      label: "Bold",
      run: () => e?.chain().focus().toggleBold().run(),
      active: () => !!e?.isActive("bold")
    },
    {
      icon: "i-lucide-italic",
      label: "Italic",
      run: () => e?.chain().focus().toggleItalic().run(),
      active: () => !!e?.isActive("italic")
    },
    {
      icon: "i-lucide-underline",
      label: "Underline",
      run: () => e?.chain().focus().toggleUnderline().run(),
      active: () => !!e?.isActive("underline")
    },
    {
      icon: "i-lucide-list",
      label: "Bullet list",
      run: () => e?.chain().focus().toggleBulletList().run(),
      active: () => !!e?.isActive("bulletList")
    },
    {
      icon: "i-lucide-list-ordered",
      label: "Numbered list",
      run: () => e?.chain().focus().toggleOrderedList().run(),
      active: () => !!e?.isActive("orderedList")
    },
    {
      icon: "i-lucide-align-left",
      label: "Align left",
      run: () => e?.chain().focus().setTextAlign("left").run(),
      active: () => !!e?.isActive({ textAlign: "left" })
    },
    {
      icon: "i-lucide-align-center",
      label: "Align centre",
      run: () => e?.chain().focus().setTextAlign("center").run(),
      active: () => !!e?.isActive({ textAlign: "center" })
    },
    {
      icon: "i-lucide-align-right",
      label: "Align right",
      run: () => e?.chain().focus().setTextAlign("right").run(),
      active: () => !!e?.isActive({ textAlign: "right" })
    }
  ];
});

/* ------------------------------- save ------------------------------------ */

async function save(): Promise<void> {
  busy.value = true;
  try {
    if (mode.value === "rich") {
      const surface = content.value?.querySelector<HTMLElement>(".tiptap-surface");
      if (!surface || !editor.value) return;
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(surface, { backgroundColor: null, scale: 2 });
      emit("save", {
        mode: "rich",
        html: editor.value.getHTML(),
        dataUrl: canvas.toDataURL("image/png"),
        width: surface.offsetWidth,
        height: surface.offsetHeight
      });
    } else {
      const lines = simple.value.text.split("\n").length;
      emit("save", {
        mode: "simple",
        ...simple.value,
        width: 260,
        height: Math.max(simple.value.fontSize * 1.6, lines * simple.value.fontSize * 1.3)
      });
    }
    open.value = false;
  } finally {
    busy.value = false;
  }
}

onBeforeUnmount(() => editor.value?.destroy());

const aligns: { value: Align; icon: string; label: string }[] = [
  { value: "left", icon: "i-lucide-align-left", label: "Align left" },
  { value: "center", icon: "i-lucide-align-center", label: "Align centre" },
  { value: "right", icon: "i-lucide-align-right", label: "Align right" }
];
</script>

<template>
  <UModal v-model:open="open" title="Text" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <div class="space-y-3">
        <!-- Mode -->
        <div class="flex items-center gap-2" role="group" aria-label="Text mode">
          <UButton
            :color="mode === 'rich' ? 'primary' : 'neutral'"
            :variant="mode === 'rich' ? 'solid' : 'outline'"
            :aria-pressed="mode === 'rich'"
            :disabled="lockMode && initialMode !== 'rich'"
            size="xs"
            @click="mode = 'rich'"
          >
            Rich (image)
          </UButton>
          <UButton
            :color="mode === 'simple' ? 'primary' : 'neutral'"
            :variant="mode === 'simple' ? 'solid' : 'outline'"
            :aria-pressed="mode === 'simple'"
            :disabled="lockMode && initialMode !== 'simple'"
            size="xs"
            @click="mode = 'simple'"
          >
            Simple (selectable)
          </UButton>
          <span class="text-dimmed text-xs">
            {{
              mode === "rich"
                ? "Full formatting, embedded as an image."
                : "Real selectable text (Latin, basic styling)."
            }}
          </span>
        </div>

        <!-- Rich editor -->
        <template v-if="mode === 'rich'">
          <div class="border-default flex flex-wrap items-center gap-1 rounded-lg border p-1">
            <UButton
              v-for="a in richActions"
              :key="a.label"
              :icon="a.icon"
              :color="a.active && a.active() ? 'primary' : 'neutral'"
              :variant="a.active && a.active() ? 'solid' : 'ghost'"
              size="xs"
              square
              :aria-label="a.label"
              @click="a.run()"
            />
            <div class="bg-default mx-1 h-5 w-px" />
            <input
              v-model="richColor"
              type="color"
              class="border-default h-6 w-7 cursor-pointer rounded border bg-transparent p-0"
              aria-label="Text colour"
              @input="editor?.chain().focus().setColor(richColor).run()"
            />
            <UButton
              icon="i-lucide-image-plus"
              size="xs"
              color="neutral"
              variant="ghost"
              square
              aria-label="Insert image"
              @click="insertImage()"
            />
          </div>
          <div
            ref="content"
            class="border-default max-h-[50vh] overflow-auto rounded-lg border p-3"
          >
            <EditorContent :editor="editor" />
          </div>
        </template>

        <!-- Simple editor -->
        <template v-else>
          <div class="border-default flex flex-wrap items-center gap-2 rounded-lg border p-2">
            <label class="flex items-center gap-1 text-xs">
              <span class="text-muted">Size</span>
              <input
                v-model.number="simple.fontSize"
                type="number"
                min="8"
                max="96"
                class="border-default w-14 rounded border px-1 py-0.5"
                aria-label="Font size"
              />
            </label>
            <input
              v-model="simple.color"
              type="color"
              class="border-default h-6 w-7 cursor-pointer rounded border bg-transparent p-0"
              aria-label="Text colour"
            />
            <UButton
              :color="simple.bold ? 'primary' : 'neutral'"
              :variant="simple.bold ? 'solid' : 'ghost'"
              :aria-pressed="simple.bold"
              size="xs"
              square
              icon="i-lucide-bold"
              aria-label="Bold"
              @click="simple.bold = !simple.bold"
            />
            <UButton
              :color="simple.italic ? 'primary' : 'neutral'"
              :variant="simple.italic ? 'solid' : 'ghost'"
              :aria-pressed="simple.italic"
              size="xs"
              square
              icon="i-lucide-italic"
              aria-label="Italic"
              @click="simple.italic = !simple.italic"
            />
            <UButton
              v-for="a in aligns"
              :key="a.value"
              :color="simple.align === a.value ? 'primary' : 'neutral'"
              :variant="simple.align === a.value ? 'solid' : 'ghost'"
              :aria-pressed="simple.align === a.value"
              size="xs"
              square
              :icon="a.icon"
              :aria-label="a.label"
              @click="simple.align = a.value"
            />
          </div>
          <textarea
            v-model="simple.text"
            rows="4"
            placeholder="Type selectable text…"
            aria-label="Selectable text"
            class="border-default w-full rounded-lg border p-3 text-sm"
          />
        </template>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton color="primary" icon="i-lucide-check" :loading="busy" @click="save()">
          Add to page
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
:deep(.tiptap-surface) {
  width: 360px;
  max-width: 100%;
  min-height: 60px;
  outline: none;
  font-size: 16px;
  line-height: 1.5;
  color: #111827;
}
:deep(.tiptap-surface:focus) {
  outline: none;
}
:deep(.tiptap-surface ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
:deep(.tiptap-surface ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
:deep(.tiptap-surface img) {
  max-width: 100%;
}
</style>
