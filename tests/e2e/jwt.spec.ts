import { expect, test } from "@playwright/test";

const b64 = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");

test.describe("jwt debugger", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/tools/jwt");
  });

  test("decoder: generates an example and verifies it", async ({ page }) => {
    await page.getByRole("button", { name: "Generate example" }).click();
    await expect(page.getByText('"HS256"')).toBeVisible();
    await expect(page.getByText("John Doe")).toBeVisible();

    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Signature verified")).toBeVisible({ timeout: 15_000 });
  });

  test("decoder: rejects a wrong secret", async ({ page }) => {
    await page.getByRole("button", { name: "Generate example" }).click();
    await page.getByPlaceholder("HMAC secret").fill("wrong-secret");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Invalid signature")).toBeVisible({ timeout: 15_000 });
  });

  test("decoder: Base64URL switch changes verification", async ({ page }) => {
    await page.getByRole("button", { name: "Generate example" }).click();
    await page.getByText("Secret is Base64URL encoded").click();
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Invalid signature")).toBeVisible({ timeout: 15_000 });
  });

  test("decoder: shows the claims breakdown", async ({ page }) => {
    await page.getByRole("button", { name: "Generate example" }).click();
    await page.getByRole("button", { name: "Claims" }).click();
    await expect(page.getByText("Subject")).toBeVisible();
    await expect(page.getByText("Issued At")).toBeVisible();
  });

  test("decoder: warns about unsigned tokens (alg: none)", async ({ page }) => {
    const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "x" })}.`;
    await page.getByRole("textbox", { name: "Encoded JWT" }).fill(token);
    await expect(page.getByText(/no signature/i)).toBeVisible();
  });

  test("decoder: reports a malformed token and clears", async ({ page }) => {
    await page.getByRole("textbox", { name: "Encoded JWT" }).fill("not-a-jwt");
    await expect(page.getByText(/three parts/i)).toBeVisible();
    await page.getByRole("button", { name: "Generate example" }).click();
    await expect(page.getByText("John Doe")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("Paste a JWT on the left")).toBeVisible();
  });

  test("encoder: produces a signed token", async ({ page }) => {
    await page.getByRole("button", { name: "Encoder" }).click();
    await expect(page.getByText("Algorithm & claims")).toBeVisible();

    // Default HS256 claims + secret encode live on load.
    const encoded = page.getByRole("textbox", { name: "Encoded JWT" });
    await expect(encoded).toHaveValue(/^eyJ/, { timeout: 15_000 });

    // Generate example keeps a valid token in the output.
    await page.getByRole("button", { name: "Generate example" }).click();
    await expect(encoded).toHaveValue(/^eyJ/, { timeout: 15_000 });
  });

  test("switches between decoder and encoder tabs", async ({ page }) => {
    await expect(page.getByText("Encoded token")).toBeVisible();
    await page.getByRole("button", { name: "Encoder" }).click();
    await expect(page.getByText("Algorithm & claims")).toBeVisible();
    await page.getByRole("button", { name: "Decoder" }).click();
    await expect(page.getByText("Encoded token")).toBeVisible();
  });
});
