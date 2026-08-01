import { expect, test } from "@playwright/test";
import { SAMPLE_PDF_PATH } from "./fixture";

test.describe("rotate pdf", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/rotate");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("rotates a page and downloads the result", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByRole("button", { name: /Rotate a page to continue/ })).toBeVisible({
      timeout: 30_000
    });

    await page.getByRole("button", { name: "Rotate right" }).first().click();
    const apply = page.getByRole("button", { name: /Apply rotation & download/ });
    await expect(apply).toBeEnabled();
    await apply.click();

    await expect(page.getByText("Rotated!")).toBeVisible({ timeout: 30_000 });
    const downloadButton = page.getByRole("button", { name: "Download", exact: true });
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/-rotated\.pdf$/);
  });
});
