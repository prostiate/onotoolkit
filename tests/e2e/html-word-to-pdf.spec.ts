import { expect, test } from "@playwright/test";
import { SAMPLE_DOCX_PATH } from "./fixture";

async function seedConsent(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("ono-toolkit-consent", "accepted");
    } catch {
      /* ignore */
    }
  });
}

test.describe("html to pdf", () => {
  test.beforeEach(async ({ page }) => {
    await seedConsent(page);
    await page.goto("/tools/html-to-pdf");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("previews the sample and can Save as PDF (print)", async ({ page }) => {
    const preview = page.locator(".markdown-preview");
    await expect(preview.getByRole("heading", { name: "HTML to PDF" })).toBeVisible();
    // Native print opens the browser dialog (no download event); assert no error.
    await page.getByRole("button", { name: "Save as PDF" }).click();
    await expect(page.getByText(/Something went wrong|Could not/)).toHaveCount(0);
  });

  test("quick-downloads a rasterized PDF file", async ({ page }) => {
    await expect(
      page.locator(".markdown-preview").getByRole("heading", { name: "HTML to PDF" })
    ).toBeVisible();
    const downloadPromise = page.waitForEvent("download", { timeout: 45_000 });
    await page.getByRole("button", { name: "Quick download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});

test.describe("word to pdf", () => {
  test.beforeEach(async ({ page }) => {
    await seedConsent(page);
    await page.goto("/tools/word-to-pdf");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("converts a DOCX and shows a preview", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_DOCX_PATH);
    const preview = page.locator(".markdown-preview");
    await expect(preview.getByRole("heading", { name: /Sample document/ })).toBeVisible({
      timeout: 30_000
    });
    await page.getByRole("button", { name: "Save as PDF" }).click();
    await expect(page.getByText(/Something went wrong/)).toHaveCount(0);
  });
});
