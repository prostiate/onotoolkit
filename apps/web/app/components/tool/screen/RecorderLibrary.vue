<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { LibraryItem } from "~/composables/useRecordingsLibrary";
import { formatBytes } from "~/utils/formatBytes";
import { formatRecordingDuration } from "~/utils/screenRecorder";

const library = useRecordingsLibrary();
const { downloadBlob } = useFileDownload();

const playing = ref<LibraryItem | null>(null);
const renamingId = ref<string | null>(null);
const renameDraft = ref("");

onMounted(() => {
  void library.refresh();
});

function startRename(item: LibraryItem): void {
  renamingId.value = item.recording.id;
  renameDraft.value = item.recording.name;
}

async function commitRename(): Promise<void> {
  const id = renamingId.value;
  if (id && renameDraft.value.trim()) await library.rename(id, renameDraft.value.trim());
  renamingId.value = null;
}

function onDownload(item: LibraryItem): void {
  downloadBlob(item.recording.blob, item.recording.name);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
</script>

<template>
  <AppCard v-if="library.supported">
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span
            class="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg"
          >
            <UIcon name="i-lucide-clapperboard" class="size-5" />
          </span>
          <div>
            <p class="text-highlighted text-sm font-semibold">Your library</p>
            <p class="text-dimmed text-xs">
              {{ library.count.value }}
              {{ library.count.value === 1 ? "recording" : "recordings" }} ·
              {{ formatBytes(library.totalSize.value) }} · saved on this device
            </p>
          </div>
        </div>
        <UButton
          v-if="library.count.value > 0"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          @click="() => library.clear()"
        >
          Clear all
        </UButton>
      </div>

      <p
        v-if="library.loaded.value && library.count.value === 0"
        class="text-dimmed border-default rounded-xl border border-dashed py-8 text-center text-sm"
      >
        Recordings you make are saved here, right in your browser.
      </p>

      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in library.items.value"
          :key="item.recording.id"
          class="border-default group overflow-hidden rounded-xl border"
          data-testid="library-item"
        >
          <button
            type="button"
            class="relative block aspect-video w-full bg-black"
            :aria-label="`Play ${item.recording.name}`"
            @click="playing = item"
          >
            <img
              v-if="item.thumbnailUrl"
              :src="item.thumbnailUrl"
              alt=""
              class="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
            />
            <span
              class="absolute inset-0 flex items-center justify-center text-white/90 transition group-hover:scale-110"
            >
              <UIcon name="i-lucide-play-circle" class="size-10 drop-shadow" />
            </span>
            <span
              class="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white"
            >
              {{ formatRecordingDuration(item.recording.durationMs) }}
            </span>
          </button>

          <div class="space-y-2 p-3">
            <UInput
              v-if="renamingId === item.recording.id"
              v-model="renameDraft"
              size="xs"
              autofocus
              @blur="commitRename"
              @keydown.enter="commitRename"
            />
            <button
              v-else
              type="button"
              class="text-highlighted hover:text-primary block w-full truncate text-left text-xs font-medium"
              :title="item.recording.name"
              @click="startRename(item)"
            >
              {{ item.recording.name }}
            </button>
            <div class="text-dimmed flex items-center justify-between text-[11px]">
              <span>{{ formatDate(item.recording.createdAt) }}</span>
              <span>{{ formatBytes(item.recording.size) }}</span>
            </div>
            <div class="flex gap-1">
              <UButton
                icon="i-lucide-download"
                size="xs"
                color="neutral"
                variant="soft"
                block
                aria-label="Download recording"
                @click="onDownload(item)"
              />
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="soft"
                aria-label="Rename recording"
                @click="startRename(item)"
              />
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                color="error"
                variant="soft"
                aria-label="Delete recording"
                @click="() => library.remove(item.recording.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <UModal
      :open="playing !== null"
      :title="playing?.recording.name"
      @update:open="
        (value: boolean) => {
          if (!value) playing = null;
        }
      "
    >
      <template #content>
        <div class="p-2">
          <video
            v-if="playing"
            :src="playing.url"
            controls
            autoplay
            class="max-h-[70vh] w-full rounded-lg bg-black"
          />
        </div>
      </template>
    </UModal>
  </AppCard>
</template>
