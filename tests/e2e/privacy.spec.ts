import { expect, test } from "@playwright/test";

test.describe("privacy page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
  });

  test("renders the privacy notice", async ({ page }) => {
    await page.goto("/privacy");
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
    await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    await expect(page.getByText("Your files never leave your device")).toBeVisible();
    await expect(page.getByText("No accounts, no tracking")).toBeVisible();
    await expect(page.getByText("What is stored locally")).toBeVisible();
    await expect(page.getByText("No warranty")).toBeVisible();
  });
});
