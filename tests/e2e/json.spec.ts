import { expect, test } from "@playwright/test";

test.describe("json formatter", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/json");
    // Wait for hydration (the client-only theme toggle mounts) before interacting.
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("shows valid status for the sample on load", async ({ page }) => {
    await expect(page.getByText("Valid JSON")).toBeVisible();
  });

  test("beautifies the sample into the output editor", async ({ page }) => {
    await page.getByRole("button", { name: "Beautify" }).click();
    await expect(page.getByText('"Ono Toolkit"').last()).toBeVisible();
  });

  test("minifies to a single compact line", async ({ page }) => {
    await page.getByRole("button", { name: "Minify" }).click();
    await expect(page.getByText('{"name":"Ono Toolkit"', { exact: false })).toBeVisible();
  });

  test("converts JSON to YAML", async ({ page }) => {
    // Open the "Convert to" format select (shows JSON by default) and pick YAML.
    await page.getByRole("combobox").filter({ hasText: "JSON" }).click();
    await page.getByRole("option", { name: "YAML" }).click();
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByText("name: Ono Toolkit")).toBeVisible();
  });

  test("clears both editors", async ({ page }) => {
    await page.getByRole("button", { name: "Beautify" }).click();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("Valid JSON")).toBeHidden();
  });
});
