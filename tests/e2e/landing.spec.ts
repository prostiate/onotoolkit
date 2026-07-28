import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("shows the hero and lists tools", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("toolkit");
    await expect(page.getByRole("heading", { name: "Compress PDF" })).toBeVisible();
    await expect(page.getByText("Coming soon").first()).toBeVisible();
  });

  test("states the privacy promise", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Nothing is ever uploaded.")).toBeVisible();
  });

  test("navigates to the compress tool", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Compress PDF/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/tools\/compress$/);
    await expect(page.getByRole("heading", { name: "Compress PDF" })).toBeVisible();
  });

  test("defaults to light mode and toggles to dark and back", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/light/);

    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(html).toHaveClass(/light/);
  });
});
