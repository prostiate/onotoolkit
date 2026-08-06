import { expect, test } from "@playwright/test";

// The backend is always mocked here so e2e never touches real YouTube. The app
// calls its own same-origin proxy routes (/api/yt/*), so these page.route mocks
// intercept the requests before they ever reach the Nitro server or Render.
const sampleInfo = {
  id: "dQw4w9WgXcQ",
  title: "Never Gonna Give You Up",
  duration: 213,
  thumbnail: "",
  uploader: "Rick Astley",
  heights: [1080, 720, 360],
  hasAudio: true
};

test.describe("youtube downloader", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });

    await page.route("**/api/yt/info**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sampleInfo)
      })
    );

    await page.goto("/tools/youtube-downloader");
    // Wait for hydration (the client-only theme toggle mounts) before interacting.
    await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).waitFor();
  });

  test("renders the tool with its backend transparency notice", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "YouTube Downloader" })).toBeVisible();
    await expect(page.getByText("Uses a download server")).toBeVisible();
  });

  test("rejects a non-YouTube link with an inline message", async ({ page }) => {
    await page.getByRole("textbox").fill("https://vimeo.com/12345");
    await page.getByRole("button", { name: "Fetch video" }).click();
    await expect(page.getByText("That doesn't look like a YouTube link.")).toBeVisible();
  });

  test("fetches a video and shows the format options", async ({ page }) => {
    await page.getByRole("textbox").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Fetch video" }).click();

    await expect(page.getByRole("heading", { name: sampleInfo.title })).toBeVisible();
    await expect(page.getByRole("button", { name: /Video \+ Audio/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Audio only/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  });

  test("downloads the file the backend returns", async ({ page }) => {
    await page.route("**/api/yt/download", (route) =>
      route.fulfill({
        status: 200,
        contentType: "audio/mp4",
        headers: {
          "Content-Disposition": `attachment; filename="Test Song.m4a"; filename*=UTF-8''Test%20Song.m4a`
        },
        body: "fake-audio-bytes"
      })
    );

    await page.getByRole("textbox").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Fetch video" }).click();
    await expect(page.getByRole("heading", { name: sampleInfo.title })).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download" }).click()
    ]);
    expect(download.suggestedFilename()).toBe("Test Song.m4a");
  });

  test("surfaces a backend error", async ({ page }) => {
    await page.route("**/api/yt/info**", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "That video is unavailable, private, or region-locked." })
      })
    );

    await page.getByRole("textbox").fill("https://www.youtube.com/watch?v=private");
    await page.getByRole("button", { name: "Fetch video" }).click();
    await expect(
      page.getByText("That video is unavailable, private, or region-locked.")
    ).toBeVisible();
  });
});
