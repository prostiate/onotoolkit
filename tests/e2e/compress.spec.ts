import { expect, test } from "@playwright/test";
import { SAMPLE_PDF_PATH } from "./fixture";

test.describe("compress pdf", () => {
  test("compresses a PDF entirely in the browser and offers a download", async ({ page }) => {
    await page.goto("/tools/compress");

    await expect(page.getByText("Drop your PDF here")).toBeVisible();

    // The file input is visually hidden but present in the DOM.
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);

    // Result card should appear once compression finishes.
    await expect(page.getByText("Done!")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Saved")).toBeVisible();

    // Before/after preview renders client-side (pdf.js) with a comparison slider.
    await expect(page.getByText("Drag the divider to compare quality.")).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByRole("slider")).toBeVisible();

    const downloadButton = page.getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeEnabled();

    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-compressed\.pdf$/);
  });

  test("shows an error for a non-PDF file", async ({ page }) => {
    await page.goto("/tools/compress");
    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from([1, 2, 3, 4])
    });
    await expect(page.getByText("Could not compress this file")).toBeVisible();
  });
});
