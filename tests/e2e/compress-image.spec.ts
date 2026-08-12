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

  test("adds more images after the first selection", async ({ page }) => {
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: png }]);
    await expect(page.getByText("1 image")).toBeVisible();

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Add more images" }).click();
    await (await chooser).setFiles([{ name: "b.png", mimeType: "image/png", buffer: png }]);
    await expect(page.getByText("2 images")).toBeVisible();
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

    await page.getByRole("button", { name: "Download all" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "As ZIP" }).click()
    ]);
    expect(download.suggestedFilename()).toBe("compressed-images.zip");
  });

  test("keeps PNG as .png in 'Keep original' mode (regression)", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "big.png", mimeType: "image/png", buffer: png }]);

    // Default settings are "Keep original"; a PNG must download as .png.
    await page.getByRole("button", { name: "Compress images" }).click();
    await expect(page.getByText(/Compressed 1 of 1/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download compressed image" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test("saves each file separately and previews before/after", async ({ page }) => {
    test.setTimeout(120_000);
    await page.locator('input[type="file"]').setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png }
    ]);
    await page.getByRole("button", { name: "Compress images" }).click();
    await expect(page.getByText(/Compressed 2 of 2/)).toBeVisible({ timeout: 90_000 });

    // Before/after preview modal opens from the thumbnail.
    await page
      .getByRole("button", { name: /Preview before and after/ })
      .first()
      .click();
    await expect(page.getByText("Drag the divider to compare quality.")).toBeVisible();
    await page.keyboard.press("Escape");

    // "Separate files" triggers one download per image.
    const downloads: string[] = [];
    page.on("download", (d) => downloads.push(d.suggestedFilename()));
    await page.getByRole("button", { name: "Download all" }).click();
    await page.getByRole("menuitem", { name: "Separate files" }).click();
    await expect.poll(() => downloads.length, { timeout: 15_000 }).toBe(2);
    for (const name of downloads) expect(name).toMatch(/-min\.png$/);
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

  test("targets an explicit JPEG output", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);

    await page.getByRole("button", { name: "JPEG", exact: true }).click();
    await page.getByRole("button", { name: "Compress images" }).click();

    await expect(page.getByText(/Compressed 1 of 1/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download compressed image" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.jpg$/);
  });
});
