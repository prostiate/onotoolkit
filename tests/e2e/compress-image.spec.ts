import { expect, test } from "@playwright/test";
import { makeNoisePng } from "../../apps/web/tests/support/makeSamplePdf";

const png = Buffer.from(makeNoisePng(200));

test.describe("compress images", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/compress-image");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the tool and its dropzone", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Compress Images" })).toBeVisible();
    await expect(page.getByText(/Drop your images here/)).toBeVisible();
  });

  test("compresses a batch and downloads a ZIP", async ({ page }) => {
    test.setTimeout(120_000);
    await page.locator('input[type="file"]').setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png }
    ]);

    await expect(page.getByText("2 images")).toBeVisible();
    await page.getByRole("button", { name: "Compress images" }).click();

    // Both images finish (lossless PNG via oxipng), summary appears.
    await expect(page.getByText(/Compressed 2 of 2/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download all (ZIP)" }).click()
    ]);
    expect(download.suggestedFilename()).toBe("compressed-images.zip");
  });

  test("offers WebP conversion and per-image download", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);

    await page.getByRole("button", { name: "WebP", exact: true }).click();
    await page.getByRole("button", { name: "Compress images" }).click();

    await expect(page.getByText(/Compressed 1 of 1/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download compressed image" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.webp$/);
  });
});
