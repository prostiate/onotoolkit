import { expect, test } from "@playwright/test";
import { SAMPLE_PDF_PATH } from "./fixture";

test.describe("merge pdf", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/merge");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("queues files, merges them, and downloads", async ({ page }) => {
    await expect(page.getByText("Drop your PDFs here")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles([SAMPLE_PDF_PATH, SAMPLE_PDF_PATH]);

    await expect(page.getByText(/2 files/)).toBeVisible();
    await page.getByRole("button", { name: "Merge PDFs" }).click();

    await expect(page.getByText("Merged!")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Pages")).toBeVisible();

    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-merged\.pdf$/);
  });

  test("offers to compress the merged result", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles([SAMPLE_PDF_PATH, SAMPLE_PDF_PATH]);
    await page.getByRole("button", { name: "Merge PDFs" }).click();
    await expect(page.getByText("Merged!")).toBeVisible({ timeout: 60_000 });

    await expect(page.getByText("Reduce the file size?")).toBeVisible();
    await page.getByRole("button", { name: /Balanced/ }).click();
    await page.getByRole("button", { name: "Compress merged PDF" }).click();

    await expect(page.getByText("Done!")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Saved")).toBeVisible();

    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-compressed\.pdf$/);
  });

  test("removes a queued file", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles([SAMPLE_PDF_PATH, SAMPLE_PDF_PATH]);
    await expect(page.getByText(/2 files/)).toBeVisible();
    await page.getByRole("button", { name: "Remove" }).first().click();
    await expect(page.getByText(/1 file/)).toBeVisible();
  });

  test("merges at the page level", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles([SAMPLE_PDF_PATH, SAMPLE_PDF_PATH]);
    await expect(page.getByText(/2 files/)).toBeVisible();

    await page.getByRole("button", { name: "Pages" }).click();
    // Two 2-page samples => 4 pages, all selected.
    await expect(page.getByText(/of 4 selected/)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /Merge 4 pages/ }).click();
    await expect(page.getByText("Merged!")).toBeVisible({ timeout: 60_000 });

    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-merged\.pdf$/);
  });

  test("skips a non-PDF file", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from([1, 2, 3, 4])
    });
    await expect(page.getByText(/Skipped 1 file/)).toBeVisible();
  });
});
