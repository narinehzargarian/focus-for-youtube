import { expect, test } from "./fixtures";

// Captures the images in docs/. Run with: SCREENSHOTS=1 npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to update docs/ images");

test("popup and options", async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 328, height: 380 });
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator("#status")).toHaveText("Focus mode is on.");
  await popup.screenshot({ path: "docs/popup.png", fullPage: true });

  const options = await context.newPage();
  await options.setViewportSize({ width: 640, height: 420 });
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByLabel("Only during these hours").check();
  await options.screenshot({ path: "docs/options.png", fullPage: true });
});
