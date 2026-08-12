import { expect, test, type Download } from "@playwright/test";
import { makeNoisePng } from "../../apps/web/tests/support/makeSamplePdf";

const png = Buffer.from(makeNoisePng(200));

async function readDownload(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/** Draws the noise PNG into a canvas and exports it as a real JPEG. */
async function makeJpeg(page: import("@playwright/test").Page): Promise<Buffer> {
  const bytes = await page.evaluate(async (pngBase64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${pngBase64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    if (!blob) throw new Error("JPEG export failed");
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, png.toString("base64"));
  return Buffer.from(bytes);
}

test.describe("image converter", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/image-converter");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the tool and its dropzone", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Image Converter" })).toBeVisible();
    await expect(page.getByText(/Drop your images here/)).toBeVisible();
    // Format buttons appear together with the controls once files are queued.
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: png }]);
    await expect(page.getByRole("button", { name: "ICO", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "AVIF", exact: true })).toBeVisible();
    // The quality section (and its source-quality checkbox) needs a lossy format.
    await page.getByRole("button", { name: "JPEG", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Use source quality" })).toBeVisible();
  });

  test("converts PNG to ICO with a valid multi-size container", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "favicon.png", mimeType: "image/png", buffer: png }]);
    await page.getByRole("button", { name: "ICO", exact: true }).click();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 1 of 1/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.ico$/);

    const ico = await readDownload(download);
    // ICONDIR: reserved(2)=0, type(2)=1, count(2)=5 (16/32/48/64/128 - 256 px
    // does not fit a 200 px source).
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(5);
    // Each ICONDIRENTRY points at a PNG payload (89 50 4E 47...).
    for (let i = 0; i < 5; i += 1) {
      const entry = 6 + i * 16;
      const size = ico[entry] === 0 ? 256 : ico[entry];
      expect(ico[entry + 1]).toBe(ico[entry]);
      expect(ico.readUInt32LE(entry + 8)).toBeGreaterThan(0);
      const offset = ico.readUInt32LE(entry + 12);
      expect(ico.subarray(offset, offset + 4).toString("hex")).toBe("89504e47");
      expect([16, 32, 48, 64, 128]).toContain(size);
    }
  });

  test("converts PNG to JPEG and back (vice versa)", async ({ page }) => {
    test.setTimeout(120_000);
    const jpeg = await makeJpeg(page);

    // PNG -> JPEG
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);
    await page.getByRole("button", { name: "JPEG", exact: true }).click();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 1 of 1/)).toBeVisible({ timeout: 90_000 });
    const [jpgDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).click()
    ]);
    expect(jpgDownload.suggestedFilename()).toMatch(/\.jpg$/);
    expect((await readDownload(jpgDownload)).subarray(0, 2).toString("hex")).toBe("ffd8");

    // JPEG -> PNG
    await page.getByRole("button", { name: "Start over" }).click();
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.jpg", mimeType: "image/jpeg", buffer: jpeg }]);
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 1 of 1/)).toBeVisible({ timeout: 90_000 });
    const [pngDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).click()
    ]);
    expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);
    expect((await readDownload(pngDownload)).subarray(0, 4).toString("hex")).toBe("89504e47");
  });

  test("converts PNG to WebP, GIF, and BMP", async ({ page }) => {
    test.setTimeout(180_000);
    const expectations: { format: string; magic: string; bytes: number }[] = [
      { format: "WebP", magic: "52494646", bytes: 4 }, // RIFF
      { format: "GIF", magic: "47494638", bytes: 4 }, // GIF8
      { format: "BMP", magic: "424d", bytes: 2 } // BM
    ];

    for (const { format, magic, bytes } of expectations) {
      await page
        .locator('input[type="file"]')
        .setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: png }]);
      await page.getByRole("button", { name: format, exact: true }).click();
      await page.getByRole("button", { name: "Convert images" }).click();
      await expect(page.getByText(/Converted 1 of 1/)).toBeVisible({ timeout: 90_000 });
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Download converted image" }).click()
      ]);
      expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
      expect((await readDownload(download)).subarray(0, bytes).toString("hex")).toBe(magic);
      await page.getByRole("button", { name: "Start over" }).click();
    }
  });

  test("round-trips a downloaded ICO back to PNG", async ({ page }) => {
    test.setTimeout(120_000);
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "favicon.png", mimeType: "image/png", buffer: png }]);
    await page.getByRole("button", { name: "ICO", exact: true }).click();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 1 of 1/)).toBeVisible({ timeout: 90_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).click()
    ]);
    const ico = await readDownload(download);

    // Re-upload the ICO and convert it back to PNG (browser decodes ICO).
    await page.getByRole("button", { name: "Start over" }).click();
    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "favicon.ico", mimeType: "image/x-icon", buffer: ico }]);
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 1 of 1/)).toBeVisible({ timeout: 90_000 });
    const [pngDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).click()
    ]);
    expect(pngDownload.suggestedFilename()).toMatch(/\.png$/);
    expect((await readDownload(pngDownload)).subarray(0, 4).toString("hex")).toBe("89504e47");
  });

  test("downloads all converted files as a ZIP", async ({ page }) => {
    test.setTimeout(120_000);
    await page.locator('input[type="file"]').setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png }
    ]);
    await expect(page.getByText("2 images")).toBeVisible();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 2 of 2/)).toBeVisible({ timeout: 90_000 });

    await page.getByRole("button", { name: "Download all" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "As ZIP" }).click()
    ]);
    expect(download.suggestedFilename()).toBe("converted-images.zip");
  });

  test("converts PNG to AVIF when the browser supports it", async ({ page }) => {
    test.setTimeout(120_000);
    const supported = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/avif", 0.5)
      );
      return blob?.type === "image/avif";
    });
    test.skip(!supported, "This browser cannot encode AVIF.");

    await page
      .locator('input[type="file"]')
      .setInputFiles([{ name: "photo.png", mimeType: "image/png", buffer: png }]);
    await page.getByRole("button", { name: "AVIF", exact: true }).click();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 1 of 1/)).toBeVisible({ timeout: 90_000 });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.avif$/);
  });

  test("applies per-image format overrides while the rest follow the bulk format", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.locator('input[type="file"]').setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png }
    ]);
    // Bulk format = JPEG; image "a" overrides to WebP.
    await page.getByRole("button", { name: "JPEG", exact: true }).click();
    await page.getByLabel("Output format for a.png").click();
    await page.getByRole("option", { name: "WebP", exact: true }).click();
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 2 of 2/)).toBeVisible({ timeout: 90_000 });

    const [aDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).first().click()
    ]);
    expect(aDownload.suggestedFilename()).toBe("a-converted.webp");
    const [bDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download converted image" }).nth(1).click()
    ]);
    expect(bDownload.suggestedFilename()).toBe("b-converted.jpg");
  });

  test("use source quality swaps in per-image quality mode", async ({ page }) => {
    test.setTimeout(120_000);
    await page.locator('input[type="file"]').setInputFiles([
      { name: "photo.png", mimeType: "image/png", buffer: png },
      { name: "photo.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page) }
    ]);
    await page.getByRole("button", { name: "JPEG", exact: true }).click();

    // Fixed quality controls are visible first.
    await expect(page.getByLabel("Conversion quality")).toBeVisible();
    await expect(page.getByLabel("Quality for photo.png")).toBeVisible();

    // Checking the checkbox hides the fixed quality slider and per-image inputs.
    await page.getByLabel("Use source quality").check();
    await expect(page.getByLabel("Conversion quality")).toBeHidden();
    await expect(page.getByLabel("Quality for photo.png")).toBeHidden();
    await expect(page.getByText(/estimated from JPEG files/)).toBeVisible();

    // Converting still succeeds; the JPEG source re-encodes at its own quality.
    await page.getByRole("button", { name: "Convert images" }).click();
    await expect(page.getByText(/Converted 2 of 2/)).toBeVisible({ timeout: 90_000 });

    // Unchecking restores the fixed controls.
    await page.getByLabel("Use source quality").uncheck();
    await expect(page.getByLabel("Conversion quality")).toBeVisible();
    await expect(page.getByLabel("Quality for photo.png")).toBeVisible();
  });
});
