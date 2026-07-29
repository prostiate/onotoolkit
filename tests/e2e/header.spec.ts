import { expect, test } from "@playwright/test";

test.describe("header navigation", () => {
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

  test("desktop: hovering a category reveals its tools and navigates", async ({
    page,
    isMobile
  }) => {
    test.skip(Boolean(isMobile), "hover dropdowns are desktop-only");

    const header = page.locator("header");
    await header.getByRole("button", { name: "PDF tools" }).hover();

    const link = header.getByRole("link", { name: /Compress PDF/ });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/tools\/compress$/);
  });

  test("mobile: menu button opens tools", async ({ page, isMobile }) => {
    test.skip(!isMobile, "menu button is mobile-only");

    await page.getByRole("button", { name: "Open menu" }).click();
    const header = page.locator("header");
    await header.getByRole("link", { name: /JWT Debugger/ }).click();
    await expect(page).toHaveURL(/\/tools\/jwt$/);
  });

  test("social links are icon-only", async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), "header socials collapse into the menu on mobile");
    const github = page.locator("header").getByRole("link", { name: "GitHub" });
    await expect(github).toHaveAttribute("href", /github\.com\/prostiate\/onotoolkit/);
    await expect(github).toHaveText(""); // icon only, no visible label
  });
});
