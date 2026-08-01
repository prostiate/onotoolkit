<script setup lang="ts">
const props = defineProps<{ html: string }>();

const clean = ref("");
let timer: ReturnType<typeof setTimeout> | null = null;
const { sanitize } = useSanitize();

async function render(): Promise<void> {
  clean.value = await sanitize(props.html);
}

watch(
  () => props.html,
  () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(render, 120);
  }
);

onMounted(render);
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div class="border-default bg-default h-full overflow-auto rounded-lg border">
    <ClientOnly>
      <!-- eslint-disable-next-line vue/no-v-html -- content is sanitized with DOMPurify -->
      <div class="markdown-preview p-5" v-html="clean" />
      <template #fallback>
        <div class="text-muted p-5 text-sm">Loading preview...</div>
      </template>
    </ClientOnly>
  </div>
</template>
