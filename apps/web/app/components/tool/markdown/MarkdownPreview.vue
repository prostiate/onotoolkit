<script setup lang="ts">
const props = defineProps<{ markdown: string }>();
const emit = defineEmits<{ ready: [element: HTMLElement] }>();

const root = ref<HTMLElement | null>(null);
const html = ref("");
let timer: ReturnType<typeof setTimeout> | null = null;

const { markdownToHtml, sanitizeHtml } = useMarkdownConvert();

async function render(): Promise<void> {
  html.value = await sanitizeHtml(await markdownToHtml(props.markdown));
}

watch(
  () => props.markdown,
  () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(render, 120);
  }
);

onMounted(async () => {
  await render();
  if (root.value) emit("ready", root.value);
});
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div ref="root" class="border-default bg-default h-full overflow-auto rounded-lg border">
    <ClientOnly>
      <!-- eslint-disable-next-line vue/no-v-html -- content is sanitized with DOMPurify -->
      <div class="markdown-preview p-5" v-html="html" />
      <template #fallback>
        <div class="text-muted p-5 text-sm">Loading preview...</div>
      </template>
    </ClientOnly>
  </div>
</template>
