import { expect, test } from "@playwright/test";

test.describe("consent popup", () => {
  test("appears on first visit and stays dismissed", async ({ page }) => {
    await page.goto("/");

    const popup = page.getByRole("dialog", { name: "Privacy notice" });
    await expect(popup).toBeVisible();
    await expect(popup.getByText("Private by design")).toBeVisible();

    await popup.getByRole("button", { name: "Got it" }).click();
    await expect(popup).toBeHidden();

    // Reload: the choice is remembered, so it does not reappear.
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Privacy notice" })).toHaveCount(0);
  });
});
