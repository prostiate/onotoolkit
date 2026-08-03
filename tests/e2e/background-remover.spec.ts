import { expect, test } from "@playwright/test";
import { makeNoisePng } from "../../apps/web/tests/support/makeSamplePdf";

const png = Buffer.from(makeNoisePng(80));

test.describe("background remover", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/background-remover");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the tool and its dropzone", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Background Remover" })).toBeVisible();
    await expect(page.getByText(/Drop an image here/)).toBeVisible();
  });

  test("starts an in-browser run with a first-time model-download notice", async ({ page }) => {
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);

    // The run begins immediately; the model-download notice must be explicit so
    // a slow first run does not look like a hang.
    await expect(page.getByText(/Preparing the model|Removing background/)).toBeVisible({
      timeout: 20_000
    });
    await expect(page.getByText(/First run downloads the AI model/)).toBeVisible();
  });

  test("completes an in-browser removal and offers a PNG download", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);

    // Downloads the ~40MB model then runs matting fully in the browser.
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeVisible({
      timeout: 110_000
    });
    await expect(page.getByText("Result")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download PNG" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/-no-bg\.png$/);
  });
});
