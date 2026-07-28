import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCompressStore } from "~/stores/compress";

describe("useCompressStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts idle with the default preset", () => {
    const store = useCompressStore();
    expect(store.status).toBe("idle");
    expect(store.preset).toBe("ebook");
    expect(store.isBusy).toBe(false);
  });

  it("updates the selected preset", () => {
    const store = useCompressStore();
    store.setPreset("screen");
    expect(store.preset).toBe("screen");
  });

  it("resets back to idle", () => {
    const store = useCompressStore();
    store.status = "done";
    store.errorMessage = "boom";
    store.reset();
    expect(store.status).toBe("idle");
    expect(store.errorMessage).toBeNull();
  });

  it("rejects an invalid file before touching the engine", async () => {
    const store = useCompressStore();
    const file = new File([new Uint8Array(4)], "photo.png", { type: "image/png" });
    await store.run(file);
    expect(store.status).toBe("error");
    expect(store.errorMessage).toBeTruthy();
  });
});
