import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { SAMPLE_PDF_PATH } from "./fixture";

const pdf = readFileSync(SAMPLE_PDF_PATH);

/**
 * Drives the Konva stage by dispatching real PointerEvents in-page. Playwright's
 * `page.mouse` does not reliably deliver pointer events to canvas elements
 * (microsoft/playwright#27156), so we dispatch them on the Konva canvas with
 * coordinates computed from its bounding rect - which also avoids viewport-fold
 * issues on a tall page.
 */
async function pointerStroke(page: Page, steps: { x: number; y: number }[]): Promise<void> {
  await page.evaluate((frac) => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid=edit-canvas] canvas");
    if (!canvas) throw new Error("konva canvas not found");
    const r = canvas.getBoundingClientRect();
    const at = (i: number) => ({
      clientX: r.left + r.width * frac[i]!.x,
      clientY: r.top + r.height * frac[i]!.y
    });
    const fire = (type: string, i: number, buttons: number) =>
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
          button: 0,
          buttons,
          ...at(i)
        })
      );
    fire("pointerdown", 0, 1);
    for (let i = 1; i < frac.length; i += 1) fire("pointermove", i, 1);
    fire("pointerup", frac.length - 1, 0);
  }, steps);
}

async function loadEditor(page: Page): Promise<void> {
  await page
    .locator('input[type="file"]')
    .setInputFiles([{ name: "sample.pdf", mimeType: "application/pdf", buffer: pdf }]);
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("edit-canvas").locator("canvas").first()).toBeVisible({
    timeout: 30_000
  });
}

test.describe("edit pdf", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/edit-pdf");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the tool and its dropzone", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Edit PDF" })).toBeVisible();
    await expect(page.getByText(/Drop a PDF here/)).toBeVisible();
  });

  test("draws a shape and exports the edited PDF", async ({ page }) => {
    test.setTimeout(120_000);
    await loadEditor(page);

    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    await pointerStroke(page, [
      { x: 0.25, y: 0.2 },
      { x: 0.45, y: 0.3 },
      { x: 0.6, y: 0.4 }
    ]);

    // The drawing created an object (undo becomes available).
    await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
    // The tool stays sticky (still Rectangle) so several can be added.
    await expect(page.getByRole("button", { name: "Rectangle", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await page.getByRole("button", { name: "Export PDF" }).click();
    await expect(page.getByText("PDF ready!")).toBeVisible({ timeout: 30_000 });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download", exact: true }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/-edited\.pdf$/);
  });

  test("adds rich text via the TipTap editor", async ({ page }) => {
    test.setTimeout(120_000);
    await loadEditor(page);

    await page.getByRole("button", { name: "Text", exact: true }).click();
    await pointerStroke(page, [{ x: 0.3, y: 0.25 }]);

    // The rich-text popover opens.
    await expect(page.getByRole("button", { name: "Add to page" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();

    // Type and add it (exercises html2canvas rasterisation + object creation).
    await page.locator(".tiptap-surface").click();
    await page.keyboard.type("Hello PDF");
    await page.getByRole("button", { name: "Add to page" }).click();
    await expect(page.getByRole("button", { name: "Add to page" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  });

  test("adds selectable text and exports", async ({ page }) => {
    test.setTimeout(120_000);
    await loadEditor(page);

    await page.getByRole("button", { name: "Text", exact: true }).click();
    await pointerStroke(page, [{ x: 0.3, y: 0.25 }]);

    await page.getByRole("button", { name: "Simple (selectable)" }).click();
    await page.getByRole("textbox", { name: "Selectable text" }).fill("Selectable line");
    await page.getByRole("button", { name: "Add to page" }).click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();

    await page.getByRole("button", { name: "Export PDF" }).click();
    await expect(page.getByText("PDF ready!")).toBeVisible({ timeout: 30_000 });
  });

  test("zoom controls adjust the zoom level", async ({ page }) => {
    await loadEditor(page);
    const zoomLabel = page.getByRole("button", { name: "Reset zoom" });
    await expect(zoomLabel).toContainText("100%");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(zoomLabel).toContainText("110%");
  });

  test("the highlighter draws a brush stroke, not a rectangle", async ({ page }) => {
    await loadEditor(page);
    await page.getByRole("button", { name: "Highlight", exact: true }).click();
    await pointerStroke(page, [
      { x: 0.25, y: 0.3 },
      { x: 0.45, y: 0.3 },
      { x: 0.6, y: 0.32 }
    ]);
    await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
    const className = await page.evaluate(() => {
      const konva = (window as unknown as { Konva?: { stages: unknown[] } }).Konva;
      const stages = konva?.stages ?? [];
      const stage = stages[stages.length - 1] as {
        find: (s: string) => { id: () => string; getClassName: () => string }[];
      };
      const shapes = stage.find("Shape").filter((n) => /[0-9a-f-]{36}/.test(n.id()));
      return shapes[shapes.length - 1]?.getClassName();
    });
    expect(className).toBe("Line");
  });

  test("placed objects become draggable under the Select tool", async ({ page }) => {
    await loadEditor(page);
    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    await pointerStroke(page, [
      { x: 0.3, y: 0.2 },
      { x: 0.5, y: 0.35 }
    ]);
    await page.getByRole("button", { name: "Select", exact: true }).click();

    // The placed rectangle exists and is draggable (movable) in Select mode.
    const draggable = await page.evaluate(() => {
      const konva = (window as unknown as { Konva?: { stages: unknown[] } }).Konva;
      const stages = konva?.stages ?? [];
      const stage = stages[stages.length - 1] as {
        find: (s: string) => { id: () => string; draggable: () => boolean }[];
      };
      const node = stage.find("Rect").find((n) => /[0-9a-f-]{36}/.test(n.id()));
      return node?.draggable() ?? false;
    });
    expect(draggable).toBe(true);
  });
});
