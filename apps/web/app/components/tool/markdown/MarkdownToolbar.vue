<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { MarkdownView } from "~/stores/markdown";

const store = useMarkdownStore();

const viewOptions: { value: MarkdownView; icon: string; label: string }[] = [
  { value: "editor", icon: "i-lucide-pen-line", label: "Editor only" },
  { value: "split", icon: "i-lucide-columns-2", label: "Split view" },
  { value: "preview", icon: "i-lucide-eye", label: "Preview only" }
];

const mdInput = ref<HTMLInputElement | null>(null);
const docxInput = ref<HTMLInputElement | null>(null);

function pickMarkdown(): void {
  mdInput.value?.click();
}
function pickDocx(): void {
  docxInput.value?.click();
}

async function onMarkdownFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await store.importMarkdownFile(file);
  input.value = "";
}
async function onDocxFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await store.importDocxFile(file);
  input.value = "";
}

const importItems: DropdownMenuItem[] = [
  { label: "Markdown (.md)", icon: "i-lucide-file-text", onSelect: () => pickMarkdown() },
  { label: "Word (.docx)", icon: "i-lucide-file-type", onSelect: () => pickDocx() }
];

const exportItems: DropdownMenuItem[] = [
  { label: "Markdown (.md)", icon: "i-lucide-file-text", onSelect: () => store.exportMarkdown() },
  { label: "PDF", icon: "i-lucide-file-down", onSelect: () => store.exportPdf() },
  { label: "Word (.docx)", icon: "i-lucide-file-type", onSelect: () => store.exportDocx() }
];

const copied = ref(false);
async function copyMarkdown(): Promise<void> {
  if (!store.markdown) return;
  await navigator.clipboard.writeText(store.markdown);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1200);
}
</script>

<template>
  <AppCard :padded="false">
    <div class="flex flex-wrap items-center gap-2 p-3">
      <UDropdownMenu :items="importItems">
        <UButton
          icon="i-lucide-upload"
          size="sm"
          color="primary"
          trailing-icon="i-lucide-chevron-down"
          :loading="store.busy"
        >
          Import
        </UButton>
      </UDropdownMenu>

      <UDropdownMenu :items="exportItems">
        <UButton
          icon="i-lucide-download"
          size="sm"
          color="neutral"
          variant="soft"
          trailing-icon="i-lucide-chevron-down"
          :loading="store.busy"
        >
          Export
        </UButton>
      </UDropdownMenu>

      <div class="bg-border-default hidden h-6 w-px sm:block" />

      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        size="sm"
        color="neutral"
        variant="ghost"
        :disabled="!store.markdown"
        @click="copyMarkdown()"
      >
        Copy
      </UButton>

      <div class="grow" />

      <div class="border-default flex items-center gap-0.5 rounded-lg border p-0.5">
        <UButton
          v-for="option in viewOptions"
          :key="option.value"
          :icon="option.icon"
          size="sm"
          :color="store.view === option.value ? 'primary' : 'neutral'"
          :variant="store.view === option.value ? 'soft' : 'ghost'"
          :aria-label="option.label"
          :aria-pressed="store.view === option.value"
          @click="store.setView(option.value)"
        />
      </div>

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
        ref="mdInput"
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        class="hidden"
        @change="onMarkdownFile"
      />
      <input
        ref="docxInput"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        class="hidden"
        @change="onDocxFile"
      />
    </div>
  </AppCard>
</template>
