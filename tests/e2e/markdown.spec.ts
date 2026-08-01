import { expect, test } from "@playwright/test";

test.describe("markdown studio", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/markdown");
    // Wait for hydration (the client-only theme toggle mounts) before interacting.
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the sample document in the source editor", async ({ page }) => {
    await expect(page.getByText("# Markdown Studio")).toBeVisible();
  });

  test("renders the sample in the live preview", async ({ page }) => {
    const preview = page.locator(".markdown-preview");
    await expect(preview.getByRole("heading", { name: "Features" })).toBeVisible();
  });

  test("reports a word and character count", async ({ page }) => {
    await expect(page.getByText(/\d+ words/)).toBeVisible();
    await expect(page.getByText(/\d+ characters/)).toBeVisible();
  });

  test("tags preview blocks with source lines for scroll sync", async ({ page }) => {
    // The scroll-sync feature relies on data-source-line attributes on the
    // rendered blocks; assert they are present.
    await expect(page.locator(".markdown-preview [data-source-line]").first()).toBeAttached();
  });

  test("switches to preview-only and back to editor-only", async ({ page }) => {
    await page.getByRole("button", { name: "Preview only" }).click();
    await expect(page.getByText("# Markdown Studio")).toBeHidden();
    await expect(
      page.locator(".markdown-preview").getByRole("heading", { name: "Features" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Editor only" }).click();
    await expect(page.getByText("# Markdown Studio")).toBeVisible();
    await expect(page.locator(".markdown-preview")).toBeHidden();
  });

  test("exports the document as Markdown", async ({ page }) => {
    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Markdown (.md)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("document.md");
  });

  test("exports the document as DOCX", async ({ page }) => {
    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Word (.docx)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("document.docx");
  });
});
