import { expect, test } from "@playwright/test";
import { makeNoisePng } from "../../apps/web/tests/support/makeSamplePdf";

const png = Buffer.from(makeNoisePng(120));

test.describe("watermark remover", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/watermark-remover");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the tool and its dropzone", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Watermark Remover" })).toBeVisible();
    await expect(page.getByText(/Drop an image here/)).toBeVisible();
  });

  test("enters the brush editor and enables removal only after painting", async ({ page }) => {
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "poster.png", mimeType: "image/png", buffer: png }]);

    await expect(page.getByText("Brush over the watermark")).toBeVisible();
    const removeButton = page.getByRole("button", { name: "Remove watermark" });
    await expect(removeButton).toBeDisabled();

    // Paint a stroke across the overlay canvas (the last canvas is the overlay).
    const overlay = page.locator("canvas").last();
    await expect(overlay).toBeVisible();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay canvas has no bounding box");
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 });
    await page.mouse.up();

    await expect(removeButton).toBeEnabled();
  });

  test("clear resets the painted mask", async ({ page }) => {
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "poster.png", mimeType: "image/png", buffer: png }]);

    const overlay = page.locator("canvas").last();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay canvas has no bounding box");
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 5 });
    await page.mouse.up();

    await expect(page.getByRole("button", { name: "Remove watermark" })).toBeEnabled();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByRole("button", { name: "Remove watermark" })).toBeDisabled();
  });

  test("inpaints the brushed region and offers a PNG download", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "poster.png", mimeType: "image/png", buffer: png }]);

    const overlay = page.locator("canvas").last();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("overlay canvas has no bounding box");
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.65, { steps: 10 });
    await page.mouse.up();

    await page.getByRole("button", { name: "Remove watermark" }).click();

    // Downloads the ~28MB MI-GAN model then inpaints fully in the browser.
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible({
      timeout: 110_000
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download PNG" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/-clean\.png$/);
  });
});
