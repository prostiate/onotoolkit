import { expect, test } from "@playwright/test";
import { SAMPLE_TEXT_PDF_PATH } from "./fixture";

async function seedConsent(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("ono-toolkit-consent", "accepted");
    } catch {
      /* ignore */
    }
  });
}

test.describe("pdf to markdown", () => {
  test.beforeEach(async ({ page }) => {
    await seedConsent(page);
    await page.goto("/tools/pdf-to-markdown");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("extracts a heading into editable Markdown and downloads .md", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_TEXT_PDF_PATH);
    // The extracted source shows the inferred heading.
    await expect(page.getByText("# Sample Heading")).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator(".markdown-preview").getByRole("heading", { name: "Sample Heading" })
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .md" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });
});

test.describe("pdf to word", () => {
  test.beforeEach(async ({ page }) => {
    await seedConsent(page);
    await page.goto("/tools/pdf-to-word");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("extracts a PDF and downloads a Word file", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_TEXT_PDF_PATH);
    await expect(
      page.locator(".markdown-preview").getByRole("heading", { name: "Sample Heading" })
    ).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Word" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });
});
