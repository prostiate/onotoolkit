<script setup lang="ts">
import { youtubeUrlSchema } from "~/schemas/youtubeUrl";

useSeoMeta({
  title: "YouTube Downloader - Ono Toolkit",
  description:
    "Download a YouTube video as combined video + audio (MP4) or audio only (M4A). Powered by yt-dlp."
});

const store = useYoutubeDownloaderStore();

const urlModel = computed<string>({
  get: () => store.url,
  set: (value) => store.setUrl(value)
});

const urlError = ref<string | null>(null);

async function onSubmit(): Promise<void> {
  const parsed = youtubeUrlSchema.safeParse(store.url);
  if (!parsed.success) {
    urlError.value = parsed.error.issues[0]?.message ?? "Enter a valid YouTube link.";
    return;
  }
  urlError.value = null;
  await store.fetchInfo();
}

// Clear the inline validation hint as soon as the user edits the field.
watch(urlModel, () => {
  if (urlError.value) urlError.value = null;
});
</script>

<template>
  <ToolLayout
    title="YouTube Downloader"
    description="Save a video as combined video + audio (MP4) or audio only (M4A)."
    icon="i-lucide-youtube"
    privacy-note="This tool sends the video link to the Ono Toolkit download server (not YouTube). The video is processed there and streamed back to you - it is not stored."
  >
    <!-- Transparency: this is the one tool that uses a backend. -->
    <UAlert
      color="neutral"
      variant="soft"
      icon="i-lucide-server"
      title="Uses a download server"
      description="Unlike the other tools, downloading from YouTube can't happen fully in your browser, so the link is sent to a small backend that runs yt-dlp. Only the link is sent - no account or personal data."
    />

    <AppCard>
      <div class="space-y-3">
        <YoutubeUrlForm
          v-model="urlModel"
          :loading="store.status === 'loading'"
          :disabled="store.isBusy"
          @submit="onSubmit"
        />
        <p v-if="urlError" class="flex items-center gap-1.5 text-sm text-red-500">
          <UIcon name="i-lucide-circle-x" class="size-4 shrink-0" />
          {{ urlError }}
        </p>
      </div>
    </AppCard>

    <UAlert
      v-if="store.status === 'error' && store.error"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="store.error"
    />

    <AppCard v-if="store.info">
      <div class="space-y-6">
        <YoutubeVideoPreview :info="store.info" />

        <hr class="border-default" />

        <YoutubeFormatPicker
          :info="store.info"
          :mode="store.mode"
          :quality="store.quality"
          @update:mode="store.setMode($event)"
          @update:quality="store.setQuality($event)"
        />

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-dimmed text-xs">
            <template v-if="store.mode === 'audio'">Best available audio, saved as M4A.</template>
            <template v-else>Video and audio are merged into a single MP4 on the server.</template>
          </p>
          <UButton
            icon="i-lucide-download"
            size="lg"
            :loading="store.status === 'downloading'"
            :disabled="store.isBusy"
            class="justify-center"
            @click="store.download()"
          >
            {{ store.status === "downloading" ? "Preparing download..." : "Download" }}
          </UButton>
        </div>

        <p
          v-if="store.status === 'downloading'"
          class="text-muted flex items-center justify-center gap-2 text-xs"
        >
          <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
          Fetching and processing on the server - this can take a moment for large videos.
        </p>
      </div>
    </AppCard>
  </ToolLayout>
</template>
