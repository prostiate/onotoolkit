import { expect, test, type Download } from "@playwright/test";
import { makeNoisePng } from "../../apps/web/tests/support/makeSamplePdf";

const png = Buffer.from(makeNoisePng(200));

async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test.describe("image resizer", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/image-resizer");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the tool and its dropzone", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Image Resizer" })).toBeVisible();
    await expect(page.getByText(/Drop your images here/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Percentage" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Exact size" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Target file size" })).toBeVisible();
  });

  test("resizes by percentage and reports the new dimensions", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);
    // Defaults: percentage mode, 50% -> 100 x 100 for a 200 x 200 source.
    await page.getByRole("button", { name: "Resize images" }).click();
    await expect(page.getByText(/Resized 1 of 1/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("100 × 100")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download resized image" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^photo-resized\.png$/);
  });

  test("resizes to exact dimensions, keeping the aspect ratio", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);
    await page.getByRole("button", { name: "Exact size" }).click();
    await page.getByLabel("Output width in pixels").fill("80");
    await page.getByRole("button", { name: "Resize images" }).click();
    await expect(page.getByText(/Resized 1 of 1/)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("80 × 80")).toBeVisible();
  });

  test("warns when exact size has no dimensions", async ({ page }) => {
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);
    await page.getByRole("button", { name: "Exact size" }).click();
    await expect(page.getByText(/Enter a width or a height/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Resize images" })).toBeDisabled();
  });

  test("hits a target file size with JPEG", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);
    await page.getByRole("button", { name: "Target file size" }).click();
    await page.getByLabel("Target file size in kilobytes").fill("25");
    await page.getByRole("button", { name: "JPEG", exact: true }).click();
    await page.getByRole("button", { name: "Resize images" }).click();
    await expect(page.getByText(/Resized 1 of 1/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download resized image" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.jpg$/);
    const bytes = await readDownload(download);
    expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
    // The binary search targets <= 25 KB; allow a small slack.
    expect(bytes.length).toBeLessThanOrEqual(25 * 1024 + 512);
  });

  test("quality slider changes JPEG output size (q10 < q90)", async ({ page }) => {
    test.setTimeout(180_000);
    const sizes: number[] = [];

    for (const quality of [10, 90]) {
      await page
        .locator('input[type="file"]')
        .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);
      await page.getByRole("button", { name: "JPEG", exact: true }).click();
      await page.getByLabel("Output quality").evaluate((el, value) => {
        const slider = el as HTMLInputElement;
        slider.value = String(value);
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      }, quality);
      await page.getByRole("button", { name: "Resize images" }).click();
      await expect(page.getByText(/Resized 1 of 1/)).toBeVisible({ timeout: 90_000 });
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Download resized image" }).click()
      ]);
      sizes.push((await readDownload(download)).length);
      await page.getByRole("button", { name: "Start over" }).click();
    }

    expect(sizes[0]!).toBeLessThan(sizes[1]!);
  });

  test("downloads all resized files as a ZIP", async ({ page }) => {
    test.setTimeout(120_000);
    await page.locator('input[type="file"]').setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png }
    ]);
    await expect(page.getByText("2 images")).toBeVisible();
    await page.getByRole("button", { name: "Resize images" }).click();
    await expect(page.getByText(/Resized 2 of 2/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "As ZIP" }).click()
    ]);
    expect(download.suggestedFilename()).toBe("resized-images.zip");
  });
});
