import { computed, ref } from "vue";
import type { StoredRecording } from "~/types/screenRecorder";
import { recordingsDb } from "~/utils/recordingsDb";

/** A recording plus freshly-minted object URLs for playback and its poster. */
export interface LibraryItem {
  recording: StoredRecording;
  url: string;
  thumbnailUrl: string | null;
}

const items = ref<LibraryItem[]>([]);
const loaded = ref(false);

function revokeItem(item: LibraryItem): void {
  URL.revokeObjectURL(item.url);
  if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
}

function toItem(recording: StoredRecording): LibraryItem {
  return {
    recording,
    url: URL.createObjectURL(recording.blob),
    thumbnailUrl: recording.thumbnail ? URL.createObjectURL(recording.thumbnail) : null
  };
}

export function useRecordingsLibrary() {
  async function refresh(): Promise<void> {
    for (const item of items.value) revokeItem(item);
    const recordings = await recordingsDb.list();
    items.value = recordings.map(toItem);
    loaded.value = true;
  }

  async function add(recording: StoredRecording): Promise<void> {
    await recordingsDb.add(recording);
    items.value = [toItem(recording), ...items.value];
  }

  async function rename(id: string, name: string): Promise<void> {
    await recordingsDb.rename(id, name);
    items.value = items.value.map((item) =>
      item.recording.id === id ? { ...item, recording: { ...item.recording, name } } : item
    );
  }

  async function remove(id: string): Promise<void> {
    await recordingsDb.remove(id);
    const target = items.value.find((item) => item.recording.id === id);
    if (target) revokeItem(target);
    items.value = items.value.filter((item) => item.recording.id !== id);
  }

  async function clear(): Promise<void> {
    await recordingsDb.clear();
    for (const item of items.value) revokeItem(item);
    items.value = [];
  }

  return {
    items,
    loaded,
    supported: recordingsDb.isSupported(),
    totalSize: computed(() => items.value.reduce((sum, item) => sum + item.recording.size, 0)),
    count: computed(() => items.value.length),
    refresh,
    add,
    rename,
    remove,
    clear
  };
}
