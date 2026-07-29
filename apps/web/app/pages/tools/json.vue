<script setup lang="ts">
import type { IndentOption, OutputFormat } from "~/utils/json";
import { outputFileName, outputMime } from "~/utils/json";

useSeoMeta({
  title: "JSON Formatter - Ono Toolkit",
  description:
    "Pretty-print, minify, validate, and convert JSON to YAML, CSV, or XML in your browser. Nothing is uploaded."
});

const store = useJsonStore();
const { download } = useDownload();

onMounted(() => store.checkValid());

const indentItems: { label: string; value: IndentOption }[] = [
  { label: "2 spaces", value: 2 },
  { label: "3 spaces", value: 3 },
  { label: "4 spaces", value: 4 },
  { label: "Tab", value: "tab" }
];

const formatItems: { label: string; value: OutputFormat }[] = [
  { label: "JSON", value: "json" },
  { label: "YAML", value: "yaml" },
  { label: "CSV", value: "csv" },
  { label: "XML", value: "xml" }
];

const targetFormat = ref<OutputFormat>("json");

const inputModel = computed<string>({
  get: () => store.input,
  set: (v) => store.setInput(v)
});

const indentModel = computed<IndentOption>({
  get: () => store.indent,
  set: (v) => store.setIndent(v)
});

async function runConvert(): Promise<void> {
  await store.convert(targetFormat.value);
}

const fileInput = ref<HTMLInputElement | null>(null);
function pickFile(): void {
  fileInput.value?.click();
}
async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  store.setInput(await file.text());
  input.value = "";
}

const copiedInput = ref(false);
const copiedOutput = ref(false);
async function copyInput(): Promise<void> {
  if (!store.input) return;
  await navigator.clipboard.writeText(store.input);
  copiedInput.value = true;
  setTimeout(() => (copiedInput.value = false), 1200);
}
async function copyOutput(): Promise<void> {
  if (!store.output) return;
  await navigator.clipboard.writeText(store.output);
  copiedOutput.value = true;
  setTimeout(() => (copiedOutput.value = false), 1200);
}

function downloadOutput(): void {
  if (!store.output) return;
  download(store.output, outputFileName(store.format), outputMime(store.format));
}
</script>

<template>
  <ToolLayout
    title="JSON Formatter"
    description="Pretty-print, minify, validate, and convert JSON."
    icon="i-lucide-braces"
    wide
    privacy-note="Your JSON is parsed and converted locally and never leaves your browser."
  >
    <!-- Toolbar -->
    <AppCard :padded="false">
      <div class="flex flex-wrap items-center gap-2 p-3">
        <UButton icon="i-lucide-sparkles" size="sm" color="primary" @click="store.beautify()">
          Beautify
        </UButton>
        <UButton
          icon="i-lucide-minimize-2"
          size="sm"
          color="neutral"
          variant="soft"
          @click="store.minify()"
        >
          Minify
        </UButton>
        <UButton
          icon="i-lucide-arrow-down-a-z"
          size="sm"
          color="neutral"
          variant="soft"
          @click="store.sortKeys()"
        >
          Sort keys
        </UButton>

        <div class="bg-border-default hidden h-6 w-px sm:block" />

        <div class="flex items-center gap-1.5">
          <label class="text-muted text-xs font-medium">Indent</label>
          <USelect
            v-model="indentModel"
            :items="indentItems"
            value-key="value"
            size="sm"
            class="w-28"
          />
        </div>

        <div class="bg-border-default hidden h-6 w-px sm:block" />

        <div class="flex items-center gap-1.5">
          <label class="text-muted text-xs font-medium">Convert to</label>
          <USelect
            v-model="targetFormat"
            :items="formatItems"
            value-key="value"
            size="sm"
            class="w-24"
          />
          <UButton
            icon="i-lucide-arrow-right-left"
            size="sm"
            color="neutral"
            variant="soft"
            @click="runConvert()"
          >
            Convert
          </UButton>
        </div>

        <div class="grow" />

        <UButton
          icon="i-lucide-upload"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="pickFile()"
        >
          Upload
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
          accept=".json,application/json,text/plain"
          class="hidden"
          @change="onFile"
        />
      </div>
    </AppCard>

    <!-- Validation status -->
    <div class="flex min-h-6 items-center gap-2 text-sm">
      <template v-if="store.valid === true">
        <UIcon name="i-lucide-circle-check" class="text-primary size-4" />
        <span class="text-muted">Valid JSON</span>
      </template>
      <template v-else-if="store.valid === false">
        <UIcon name="i-lucide-circle-x" class="size-4 text-red-500" />
        <span class="text-red-500">{{ store.error }}</span>
      </template>
    </div>

    <!-- Editors -->
    <div class="grid gap-5 lg:grid-cols-2">
      <div class="flex min-h-[28rem] flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-highlighted text-sm font-semibold">Input</p>
          <UButton
            :icon="copiedInput ? 'i-lucide-check' : 'i-lucide-copy'"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!store.input"
            aria-label="Copy input"
            @click="copyInput()"
          />
        </div>
        <JsonEditor v-model="inputModel" lint aria-label="JSON input" class="min-h-0 flex-1" />
      </div>

      <div class="flex min-h-[28rem] flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-highlighted text-sm font-semibold">
            Output
            <span class="text-dimmed font-normal uppercase">· {{ store.format }}</span>
          </p>
          <div class="flex items-center gap-1">
            <UButton
              :icon="copiedOutput ? 'i-lucide-check' : 'i-lucide-copy'"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="!store.output"
              aria-label="Copy output"
              @click="copyOutput()"
            />
            <UButton
              icon="i-lucide-download"
              size="xs"
              color="neutral"
              variant="ghost"
              :disabled="!store.output"
              aria-label="Download output"
              @click="downloadOutput()"
            />
          </div>
        </div>
        <JsonEditor
          :model-value="store.output"
          readonly
          aria-label="Converted output"
          class="min-h-0 flex-1"
        />
      </div>
    </div>
  </ToolLayout>
</template>
