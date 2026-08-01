import { expect, test } from "@playwright/test";
import { makeNoisePng } from "../../apps/web/tests/support/makeSamplePdf";

const png = Buffer.from(makeNoisePng(100));

test.describe("jpg to pdf", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/jpg-to-pdf");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("combines images into a PDF and downloads", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png }
    ]);

    await expect(page.getByRole("button", { name: "Create PDF" })).toBeVisible();
    await page.getByRole("button", { name: "Create PDF" }).click();

    await expect(page.getByText("PDF ready!")).toBeVisible({ timeout: 30_000 });
    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
