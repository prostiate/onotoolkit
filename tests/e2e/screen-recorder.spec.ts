import { expect, test } from "@playwright/test";

/**
 * Screen recorder e2e. The browser cannot drive the real screen-picker, so
 * getDisplayMedia is replaced with a synthetic canvas stream; the camera and
 * microphone use Chromium's built-in fake devices.
 */

function fakeDisplayMedia(): string {
  return `
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      configurable: true,
      value: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");
        let hue = 0;
        const paint = () => {
          hue = (hue + 2) % 360;
          ctx.fillStyle = "hsl(" + hue + " 80% 50%)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          requestAnimationFrame(paint);
        };
        paint();
        return canvas.captureStream(30);
      }
    });
  `;
}

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--autoplay-policy=no-user-gesture-required"
    ]
  }
});

test.describe("screen recorder", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ono-toolkit-consent", "accepted");
      } catch {
        /* ignore */
      }
    });
    await page.addInitScript(fakeDisplayMedia);
  });

  test("shows the pre-screen with mode selection and remembered defaults", async ({ page }) => {
    await page.goto("/tools/screen-recorder");
    await expect(page.getByRole("heading", { name: "Screen Recorder" })).toBeVisible();
    await expect(page.getByText("What do you want to record?")).toBeVisible();
    await expect(page.getByTestId("record-mode-screen")).toHaveAttribute("aria-checked", "true");
    // Screen-only keeps the setup compact until the user opts into a camera.
    await expect(page.getByText("Webcam is off")).toBeHidden();
    await expect(page.getByTestId("camera-preview")).toBeHidden();
    await expect(page.getByRole("button", { name: "Turn webcam on" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start recording" })).toBeVisible();
    await expect(page.getByText("Your choices are remembered on this device")).toBeVisible();
    // Microphone is on by default; system audio is off by default.
    await expect(page.getByRole("button", { name: "Turn microphone off" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Turn system audio on" })).toBeVisible();
  });

  test("camera-only mode records without a screen and saves to the library", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/tools/screen-recorder");
    await page.getByTestId("record-mode-camera").click();
    await expect(page.getByTestId("camera-preview")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start camera recording" })).toBeVisible();

    await page.getByRole("button", { name: "Start camera recording" }).click();
    await expect(page.getByLabel("Recording duration")).toBeVisible({ timeout: 20_000 });
    // Camera-only sessions can still add a screen mid-recording.
    await expect(page.getByTestId("add-screen")).toBeVisible();
    await page.waitForTimeout(1_200);
    await page.getByRole("button", { name: "Stop recording", exact: true }).click();
    await expect(page.getByText("Recording ready")).toBeVisible({ timeout: 30_000 });

    // The finished clip lands in the persistent local library.
    await expect(page.getByTestId("library-item").first()).toBeVisible();
    await page.getByRole("button", { name: "Record another" }).click();
    await expect(page.getByTestId("library-item").first()).toBeVisible();
  });

  test("webcam toggle shows a live preview and the choice is remembered", async ({ page }) => {
    await page.goto("/tools/screen-recorder");
    await page.getByRole("button", { name: "Turn webcam on" }).click();
    await expect(page.getByTestId("camera-preview")).toBeVisible();
    await expect(page.getByRole("button", { name: "Turn webcam off" })).toBeVisible();
    // The saved preference is restored on the next visit (webcam on by default).
    await page.reload();
    await expect(page.getByRole("button", { name: "Turn webcam off" })).toBeVisible();
    await expect(page.getByTestId("camera-preview")).toBeVisible();
  });

  test("records the screen, pauses, resumes, and delivers a downloadable video", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.goto("/tools/screen-recorder");

    // Pre-screen: webcam on, circle bubble tucked top-left, system audio on.
    await page.getByRole("button", { name: "Turn webcam on" }).click();
    await page.getByRole("button", { name: "Turn system audio on" }).click();
    await page.getByRole("button", { name: "Circle" }).click();
    await page.getByRole("button", { name: "top-left" }).click();

    await page.getByRole("button", { name: "Start recording" }).click();

    // Recording surface + timer appear.
    await expect(page.getByLabel("Recording duration")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Live preview of the recording")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause recording" })).toBeEnabled();

    // The floating dock, live webcam styling popup, draggable frame, and
    // annotation tools are available while recording.
    await expect(page.getByTestId("recorder-control-dock")).toBeVisible();
    await page.getByRole("button", { name: "Open webcam controls" }).click();
    await expect(page.getByTestId("webcam-controls")).toBeVisible();
    await expect(
      page.getByTestId("webcam-controls").getByRole("button", { name: "Circle" })
    ).toBeVisible();
    await expect(page.getByTestId("webcam-frame")).toBeVisible();
    await page.getByTestId("annotation-toggle").click();
    await expect(page.getByTestId("annotation-surface")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pen" })).toBeVisible();

    // Pause and resume.
    await page.getByRole("button", { name: "Pause recording" }).click();
    await expect(page.getByRole("button", { name: "Resume recording" })).toBeVisible();
    await page.getByRole("button", { name: "Resume recording" }).click();

    // Stop the recording.
    await page.waitForTimeout(1_500);
    await page.getByRole("button", { name: "Stop recording", exact: true }).click();

    // Result screen with a playable preview and stats.
    await expect(page.getByText("Recording ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("recording-preview")).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download", exact: true }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(
      /^screen-recording-\d{4}-\d{2}-\d{2}-\d{6}\.(webm|mp4)$/
    );

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(1_000);
    const hex = bytes.subarray(0, 12).toString("hex");
    // WebM starts with the EBML magic; MP4 starts with "ftyp".
    expect(hex.startsWith("1a45dfa3") || bytes.subarray(4, 8).toString("ascii") === "ftyp").toBe(
      true
    );
  });

  test("records another after finishing", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/tools/screen-recorder");
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(page.getByLabel("Recording duration")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1_000);
    await page.getByRole("button", { name: "Stop recording", exact: true }).click();
    await expect(page.getByText("Recording ready")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Record another" }).click();
    await expect(page.getByRole("button", { name: "Start recording" })).toBeVisible();
    await expect(page.getByText("Webcam is off")).toBeHidden();
    await expect(page.getByTestId("camera-preview")).toBeHidden();
  });

  test("shows a helpful error when screen sharing is denied", async ({ page }) => {
    // Registered before navigation: init scripts only run on new documents,
    // and this one runs after the beforeEach fake, so it wins.
    await page.addInitScript(`
      Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("Permission denied", "NotAllowedError");
        }
      });
    `);
    await page.goto("/tools/screen-recorder");
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(page.getByText("Screen sharing was cancelled or denied")).toBeVisible();
  });
});
