<script setup lang="ts">
import type { CompressSettings } from "~/utils/image";
import { formatBytes, reductionPercent } from "~/utils/formatBytes";

useSeoMeta({
  title: "Compress Images - Ono Toolkit",
  description:
    "Compress JPG, PNG, and WebP images in your browser with MozJPEG, oxipng, and WebP. Keep PNG transparency or flatten it. Private and free - nothing is uploaded."
});

const store = useCompressImageStore();
const { downloadBlob, download } = useFileDownload();

function onSelectFiles(files: File[]): void {
  store.addFiles(files);
}
function onDownload(id: string): void {
  const item = store.items.find((entry) => entry.id === id);
  if (item?.resultBlob) downloadBlob(item.resultBlob, item.resultName);
}
async function onDownloadAll(): Promise<void> {
  const done = store.items.filter((item) => item.resultBlob);
  if (done.length === 0) return;
  const { zip } = useZip();
  const entries: Record<string, Uint8Array> = {};
  const seen = new Map<string, number>();
  for (const item of done) {
    // De-dupe identical output names within the ZIP.
    const count = seen.get(item.resultName) ?? 0;
    seen.set(item.resultName, count + 1);
    const name =
      count === 0 ? item.resultName : item.resultName.replace(/(\.[^.]+)$/, `-${count}$1`);
    entries[name] = new Uint8Array(await item.resultBlob!.arrayBuffer());
  }
  download(await zip(entries), "compressed-images.zip", "application/zip");
}

const totalSaved = computed(() => reductionPercent(store.totalOriginalSize, store.totalResultSize));

onBeforeUnmount(() => store.reset());
</script>

<template>
  <ToolLayout
    title="Compress Images"
    description="Shrink JPG, PNG, and WebP files - keep transparency, or flatten it - all in your browser."
    icon="i-lucide-image-minus"
    wide
    privacy-note="Your images are compressed locally in your browser and never uploaded."
  >
    <div class="space-y-5">
      <ToolDropzone
        v-if="store.status === 'idle'"
        multiple
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        hint="JPG, PNG or WebP - add one or more"
        label="Drop your images here, or tap to browse"
        @select-files="onSelectFiles"
      />

      <UAlert
        v-if="store.addError"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :description="store.addError"
      />

      <template v-if="store.items.length > 0">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-muted text-sm font-medium">
            {{ store.items.length }} image{{ store.items.length > 1 ? "s" : "" }}
          </p>
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="store.reset()"
          >
            Clear all
          </UButton>
        </div>

        <CompressControls
          :settings="store.settings"
          :show-transparency="store.hasTransparentCandidate"
          @update:quality="store.setQuality"
          @update:format="(v: CompressSettings['format']) => store.setFormat(v)"
          @update:png-lossless="store.setPngLossless"
          @update:flatten-transparent="store.setFlattenTransparent"
          @update:flatten-color="store.setFlattenColor"
        />

        <CompressFileList :items="store.items" @remove="store.remove" @download="onDownload" />

        <UButton
          v-if="store.status !== 'done'"
          color="primary"
          icon="i-lucide-minimize-2"
          size="lg"
          block
          :loading="store.isBusy"
          :disabled="!store.canCompress"
          @click="store.compressAll()"
        >
          {{ store.isBusy ? "Compressing…" : "Compress images" }}
        </UButton>

        <AppCard v-if="store.status === 'done'">
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <UIcon name="i-lucide-circle-check" class="size-6" />
              </span>
              <div>
                <p class="text-highlighted font-semibold">
                  Compressed {{ store.doneCount }} of {{ store.items.length }}
                </p>
                <p class="text-dimmed text-xs">
                  {{ formatBytes(store.totalOriginalSize) }} →
                  {{ formatBytes(store.totalResultSize) }}
                  <span v-if="totalSaved > 0" class="text-emerald-600 dark:text-emerald-400">
                    (saved {{ totalSaved }}%)
                  </span>
                </p>
              </div>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UButton
                color="primary"
                icon="i-lucide-download"
                size="lg"
                block
                @click="onDownloadAll()"
              >
                Download all (ZIP)
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
          </div>
        </AppCard>
      </template>
    </div>
  </ToolLayout>
</template>
