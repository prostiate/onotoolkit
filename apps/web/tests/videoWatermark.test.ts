import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { videoFileSchema, parseVideoWatermarkSettings } from "../app/schemas/videoWatermark";
import { useVideoWatermarkStore } from "../app/stores/videoWatermark";

const workers = vi.hoisted(
  () =>
    [] as {
      onmessage: ((event: MessageEvent) => void) | null;
      onerror: (() => void) | null;
      terminate: ReturnType<typeof vi.fn>;
    }[]
);

describe("video watermark input", () => {
  it("accepts video containers even when the OS omits the MIME type", () => {
    expect(videoFileSchema.safeParse(new File(["clip"], "clip.MOV")).success).toBe(true);
    expect(
      videoFileSchema.safeParse(new File(["clip"], "clip.webm", { type: "video/webm" })).success
    ).toBe(true);
  });
  it("rejects empty, unrelated and oversized files before decoding", () => {
    expect(videoFileSchema.safeParse(new File([], "clip.mp4")).success).toBe(false);
    expect(
      videoFileSchema.safeParse(new File(["image"], "photo.png", { type: "image/png" })).success
    ).toBe(false);
    const file = new File(["clip"], "clip.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 100_000_001 });
    expect(videoFileSchema.safeParse(file).success).toBe(false);
  });
  it("restores safe settings when storage is malformed or outside limits", () => {
    expect(parseVideoWatermarkSettings("bad")).toEqual({
      bitrateMbps: 12,
      allowLowConfidence: false
    });
    expect(parseVideoWatermarkSettings('{"bitrateMbps":-4}')).toEqual({
      bitrateMbps: 12,
      allowLowConfidence: false
    });
    expect(parseVideoWatermarkSettings('{"bitrateMbps":20,"allowLowConfidence":true}')).toEqual({
      bitrateMbps: 20,
      allowLowConfidence: true
    });
  });
});

describe("video watermark lifecycle", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    workers.length = 0;
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal(
      "Worker",
      class {
        onmessage = null;
        onerror = null;
        terminate = vi.fn();
        postMessage(): void {}
        constructor() {
          workers.push(this);
        }
      }
    );
    vi.stubGlobal("OffscreenCanvas", vi.fn());
    vi.stubGlobal("VideoEncoder", vi.fn());
    vi.stubGlobal("VideoDecoder", vi.fn());
  });
  it("keeps a valid selection when a replacement is invalid", () => {
    const store = useVideoWatermarkStore();
    store.selectFile(new File(["clip"], "my.video.mp4"));
    expect(store.status).toBe("ready");
    expect(store.resultName).toBe("my.video-no-watermark.mp4");
    store.selectFile(new File(["image"], "photo.png"));
    expect(store.file?.name).toBe("my.video.mp4");
    expect(store.addError).toBeTruthy();
    store.reset();
    expect(store.sourceUrl).toBeNull();
    expect(store.file).toBeNull();
  });
  it("persists export preferences without persisting user files", () => {
    const store = useVideoWatermarkStore();
    store.setSettings({ bitrateMbps: 20, allowLowConfidence: true });
    const next = useVideoWatermarkStore(createPinia());
    next.hydrate();
    expect(next.settings).toEqual({ bitrateMbps: 20, allowLowConfidence: true });
    expect(next.file).toBeNull();
  });
  it("does not start a cancelled job after the worker chunk loads", async () => {
    const store = useVideoWatermarkStore();
    store.selectFile(new File(["clip"], "clip.mp4"));
    const first = store.run();
    store.cancel();
    const second = store.run();
    await Promise.all([first, second]);
    expect(workers).toHaveLength(1);
    expect(store.status).toBe("working");
    store.cancel();
    expect(workers[0]?.terminate).toHaveBeenCalledOnce();
    expect(store.status).toBe("ready");
    expect(store.resultBlob).toBeNull();
  });
});
