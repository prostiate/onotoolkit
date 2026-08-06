import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useYoutubeDownloaderStore } from "~/stores/youtubeDownloader";
import type { YoutubeVideoInfo } from "~/types/youtube";

const sampleInfo: YoutubeVideoInfo = {
  id: "abc",
  title: "Never Gonna Give You Up",
  duration: 213,
  thumbnail: "https://example.com/t.webp",
  uploader: "Rick Astley",
  heights: [1080, 720, 360],
  hasAudio: true
};

describe("youtubeDownloader store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts idle", () => {
    const store = useYoutubeDownloaderStore();
    expect(store.status).toBe("idle");
    expect(store.info).toBeNull();
    expect(store.canFetch).toBe(false);
  });

  it("enables fetching for a valid URL", () => {
    const store = useYoutubeDownloaderStore();
    store.setUrl("https://youtu.be/abc");
    expect(store.canFetch).toBe(true);
  });

  it("applies fetched info and derives defaults", () => {
    const store = useYoutubeDownloaderStore();
    store.applyInfo(sampleInfo);
    expect(store.status).toBe("ready");
    expect(store.mode).toBe("video");
    expect(store.quality).toBe(1080); // highest <= 1080p
    expect(store.canPickVideo).toBe(true);
  });

  it("defaults to audio when no video heights are available", () => {
    const store = useYoutubeDownloaderStore();
    store.applyInfo({ ...sampleInfo, heights: [] });
    expect(store.mode).toBe("audio");
    expect(store.quality).toBe(0);
    expect(store.canPickVideo).toBe(false);
  });

  it("invalidates loaded info when the URL is edited", () => {
    const store = useYoutubeDownloaderStore();
    store.applyInfo(sampleInfo);
    store.setUrl("https://youtu.be/other");
    expect(store.info).toBeNull();
    expect(store.status).toBe("idle");
  });

  it("fails fast on an invalid URL without calling the backend", async () => {
    const store = useYoutubeDownloaderStore();
    store.setUrl("https://vimeo.com/1");
    await store.fetchInfo();
    expect(store.status).toBe("error");
    expect(store.error).toMatch(/YouTube link/);
  });

  it("updates mode and quality", () => {
    const store = useYoutubeDownloaderStore();
    store.applyInfo(sampleInfo);
    store.setMode("audio");
    store.setQuality(720);
    expect(store.mode).toBe("audio");
    expect(store.quality).toBe(720);
  });

  it("resets back to the initial state", () => {
    const store = useYoutubeDownloaderStore();
    store.setUrl("https://youtu.be/abc");
    store.applyInfo(sampleInfo);
    store.reset();
    expect(store.url).toBe("");
    expect(store.info).toBeNull();
    expect(store.status).toBe("idle");
  });
});
