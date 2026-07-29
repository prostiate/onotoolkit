import { expect, test } from "@playwright/test";
import { SAMPLE_PDF_PATH } from "./fixture";

test.describe("compress pdf", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/compress");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("selecting a preset updates the description", async ({ page }) => {
    await expect(page.getByText("Compression level")).toBeVisible();
    await page.getByRole("button", { name: /Smallest/ }).click();
    await expect(page.getByText(/Lowest quality/i)).toBeVisible();
    await page.getByRole("button", { name: /Maximum quality/ }).click();
    await expect(page.getByText(/Preserves the most detail/i)).toBeVisible();
  });

  test("compresses a PDF, previews it, and downloads", async ({ page }) => {
    await expect(page.getByText("Drop your PDF here")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByText("Done!")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Saved")).toBeVisible();

    // Before/after preview with a comparison slider and a pager (sample = 2 pages).
    await expect(page.getByText("Drag the divider to compare quality.")).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("slider")).toBeVisible();
    await expect(page.getByText(/Page 1 \/ 2/)).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText(/Page 2 \/ 2/)).toBeVisible();

    const downloadButton = page.getByRole("button", { name: "Download" });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-compressed\.pdf$/);
  });

  test("'Compress another' resets to the dropzone", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText("Done!")).toBeVisible({ timeout: 90_000 });
    await page.getByRole("button", { name: "Compress another" }).click();
    await expect(page.getByText("Drop your PDF here")).toBeVisible();
  });

  test("shows an error for a non-PDF file", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from([1, 2, 3, 4])
    });
    await expect(page.getByText("Could not compress this file")).toBeVisible();
  });
});
