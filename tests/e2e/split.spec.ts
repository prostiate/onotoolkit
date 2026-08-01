import { expect, test } from "@playwright/test";
import { SAMPLE_PDF_PATH } from "./fixture";

test.describe("split pdf", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/split");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("extracts selected pages into one PDF", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByRole("button", { name: "Extract to one PDF" })).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByText(/of 2 selected/)).toBeVisible();

    await page.getByRole("button", { name: "Extract to one PDF" }).click();
    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 30_000 });

    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-extracted\.pdf$/);
  });

  test("splits into a ZIP with one file per page", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByRole("button", { name: "Split into ZIP" })).toBeVisible({
      timeout: 30_000
    });

    await page.getByRole("button", { name: "One file per page" }).click();
    await page.getByRole("button", { name: "Split into ZIP" }).click();
    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 30_000 });

    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-split\.zip$/);
  });

  test("toggles page selection by clicking the card", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText(/2 of 2 selected/)).toBeVisible({ timeout: 30_000 });
    // Clicking the card body (the page label), not the checkbox, toggles it.
    await page.getByText("Page 1", { exact: true }).click();
    await expect(page.getByText(/1 of 2 selected/)).toBeVisible();
  });

  test("rejects a non-PDF file", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from([1, 2, 3, 4])
    });
    await expect(page.getByText(/Please choose a PDF file/)).toBeVisible();
  });
});
