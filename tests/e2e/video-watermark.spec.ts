import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

// Real Chrome provides the H.264 encoder used by the browser export pipeline.
test.use({ channel: "chrome" });
const sample = fileURLToPath(new URL("../fixtures/gemini-video/gemini.mp4", import.meta.url));
const veo = fileURLToPath(new URL("../fixtures/gemini-video/veo.mp4", import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ono-toolkit-consent", "accepted"));
  await page.goto("/tools/video-watermark-remover");
  await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  const optIn = page.getByRole("button", { name: "Try on this device" });
  if (await optIn.isVisible()) await optIn.click();
});

test("discloses downloads, rejects invalid files and does not fetch models on selection", async ({
  page
}) => {
  const modelRequests: string[] = [];
  page.on("request", (request) => {
    if (/\.onnx|ort-wasm/.test(request.url())) modelRequests.push(request.url());
  });
  await expect(page.getByRole("heading", { name: "Gemini Video Watermark Remover" })).toBeVisible();
  await expect(page.getByText(/First use downloads about 16 MB/)).toBeVisible();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("image") });
  await expect(page.getByText("Choose an MP4, WebM or MOV video.")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(sample);
  await expect(page.getByRole("button", { name: "Remove watermark", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Original video")).toBeVisible();
  expect(modelRequests).toEqual([]);
});

test("cancels processing and can reset without a stale result", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(sample);
  await page.getByRole("button", { name: "Remove watermark", exact: true }).click();
  await page.getByRole("button", { name: "Cancel processing" }).click();
  await expect(page.getByText(/Processing cancelled/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Download MP4" })).toHaveCount(0);
  await page.getByRole("button", { name: "New video" }).click();
  await expect(page.getByText(/Drop a Gemini or Veo video/)).toBeVisible();
});

test("reports an unreadable video without losing the selected file", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "broken.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("not a video")
  });
  await page.getByRole("button", { name: "Remove watermark", exact: true }).click();
  await expect(page.getByText("Could not finish this video")).toBeVisible();
  await expect(page.getByText("broken.mp4", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New video" })).toBeEnabled();
});

for (const [name, fixture] of [
  ["Gemini", sample],
  ["Veo", veo]
] as const) {
  test(`cleans a real ${name} clip and exports a playable MP4`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    const uploads: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (["POST", "PUT"].includes(request.method())) uploads.push(request.url());
    });
    await page.locator('input[type="file"]').setInputFiles(fixture);
    await page.getByRole("button", { name: "Remove watermark", exact: true }).click();
    await expect(page.getByRole("button", { name: "Download MP4" })).toBeVisible({
      timeout: 160_000
    });
    await expect(page.getByLabel("Cleaned video")).toBeVisible();
    await expect
      .poll(() =>
        page.getByLabel("Cleaned video").evaluate((element: HTMLVideoElement) => element.readyState)
      )
      .toBeGreaterThanOrEqual(2);
    const details = await page
      .getByLabel("Cleaned video")
      .evaluate((element: HTMLVideoElement) => ({
        width: element.videoWidth,
        height: element.videoHeight,
        duration: element.duration
      }));
    expect(details.width).toBe(name === "Gemini" ? 1280 : 720);
    expect(details.height).toBe(name === "Gemini" ? 720 : 1280);
    expect(details.duration).toBeGreaterThan(0);
    // Independently checked fixture coordinates: the visible star or Veo text.
    // Catch an export that merely re-encodes without actually cleaning the mark.
    const difference = await page.evaluate((kind) => {
      const before = document.querySelector<HTMLVideoElement>('video[aria-label="Original video"]');
      const after = document.querySelector<HTMLVideoElement>('video[aria-label="Cleaned video"]');
      if (!before || !after) throw new Error("Comparison videos missing");
      const regionDifference = (x: number, y: number, width: number, height: number): number => {
        const pixels = [before, after].map((video) => {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas unavailable");
          ctx.drawImage(video, x, y, width, height, 0, 0, width, height);
          return ctx.getImageData(0, 0, width, height).data;
        });
        let total = 0;
        for (let i = 0; i < pixels[0]!.length; i++) {
          if (i % 4 !== 3) total += Math.abs(pixels[0]![i]! - pixels[1]![i]!);
        }
        return total / (width * height * 3);
      };
      return {
        watermark:
          kind === "Gemini"
            ? regionDifference(1138, 578, 48, 48)
            : regionDifference(682, 1254, 24, 12),
        scene: regionDifference(100, 100, 64, 64)
      };
    }, name);
    expect(difference.watermark).toBeGreaterThan(3);
    expect(difference.scene).toBeLessThan(8);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download MP4" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-no-watermark\.mp4$/);
    const output = testInfo.outputPath(`${name.toLowerCase()}-clean.mp4`);
    await download.saveAs(output);
    expect((await stat(output)).size).toBeGreaterThan(1000);
    expect(errors).toEqual([]);
    expect(uploads).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("result.png"), fullPage: true });
  });
}
