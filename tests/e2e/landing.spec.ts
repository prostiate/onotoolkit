import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows the hero and lists available + coming-soon tools", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("toolkit");
    await expect(page.getByRole("heading", { name: "Compress PDF" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "JWT Debugger" })).toBeVisible();
    await expect(page.getByText("Ready").first()).toBeVisible();
    await expect(page.getByText("Coming soon").first()).toBeVisible();
  });

  test("navigates to the compress tool", async ({ page }) => {
    await page
      .locator("main")
      .getByRole("link", { name: /Compress PDF/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/tools\/compress$/);
    await expect(page.getByRole("heading", { name: "Compress PDF" })).toBeVisible();
  });

  test("navigates to the JWT debugger", async ({ page }) => {
    await page
      .locator("main")
      .getByRole("link", { name: /JWT Debugger/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/tools\/jwt$/);
    await expect(page.getByRole("heading", { name: "JWT Debugger" })).toBeVisible();
  });

  test("states the privacy promise and links to the privacy page", async ({ page }) => {
    await expect(page.getByText("Nothing is ever uploaded.")).toBeVisible();
    await page.getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  });

  test("defaults to light and persists the dark theme across reloads", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveClass(/light/);

    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(html).toHaveClass(/light/);
  });
});
