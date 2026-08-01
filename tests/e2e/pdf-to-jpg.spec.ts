import { expect, test } from "@playwright/test";
import { SAMPLE_PDF_PATH } from "./fixture";

test.describe("pdf to jpg", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/pdf-to-jpg");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("converts selected pages to a JPG ZIP", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);
    // Two-page sample => a ZIP of two JPGs.
    await expect(page.getByRole("button", { name: /Convert 2 pages to JPG/ })).toBeVisible({
      timeout: 30_000
    });
    await page.getByRole("button", { name: /Convert 2 pages to JPG/ }).click();

    await expect(page.getByText("Ready!")).toBeVisible({ timeout: 30_000 });
    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-jpg\.zip$/);
  });
});
