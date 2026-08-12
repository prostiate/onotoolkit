import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { recordingsDb } from "~/utils/recordingsDb";
import type { StoredRecording } from "~/types/screenRecorder";

function makeRecording(id: string, createdAt: number): StoredRecording {
  return {
    id,
    name: `rec-${id}.webm`,
    blob: new Blob(["x".repeat(10)], { type: "video/webm" }),
    mimeType: "video/webm",
    durationMs: 1000,
    size: 10,
    createdAt,
    thumbnail: null
  };
}

describe("recordingsDb", () => {
  beforeEach(async () => {
    await recordingsDb.clear();
  });

  it("reports IndexedDB support in the test environment", () => {
    expect(recordingsDb.isSupported()).toBe(true);
  });

  it("adds and lists recordings newest-first", async () => {
    await recordingsDb.add(makeRecording("a", 100));
    await recordingsDb.add(makeRecording("b", 300));
    await recordingsDb.add(makeRecording("c", 200));
    const list = await recordingsDb.list();
    expect(list.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("renames a recording", async () => {
    await recordingsDb.add(makeRecording("a", 100));
    await recordingsDb.rename("a", "My clip.webm");
    const list = await recordingsDb.list();
    expect(list[0]?.name).toBe("My clip.webm");
  });

  it("removes a single recording", async () => {
    await recordingsDb.add(makeRecording("a", 100));
    await recordingsDb.add(makeRecording("b", 200));
    await recordingsDb.remove("a");
    const list = await recordingsDb.list();
    expect(list.map((r) => r.id)).toEqual(["b"]);
  });

  it("clears everything", async () => {
    await recordingsDb.add(makeRecording("a", 100));
    await recordingsDb.clear();
    expect(await recordingsDb.list()).toHaveLength(0);
  });
});
