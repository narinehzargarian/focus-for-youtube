import { DEFAULT_SETTINGS } from "../../src/settings";
import { expect, test } from "./fixtures";

test.skip(!!process.env.LIVE, "fixture tests don't run in live mode");

test("the Shorts tab goes to the home page instead of a random Short", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/shorts/");
  await expect(page).toHaveURL("https://www.youtube.com/");
});

test("hides home recommendations and Shorts, and shows a message instead", async ({ context, worker }) => {
  void worker;  // Waits for the extension to install and save its defaults.
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/");
  await expect(page.locator("#grid")).toBeHidden();
  await expect(page.locator("#chips-wrapper")).toBeHidden();
  await expect(page.locator("#guide-shorts")).toBeHidden();
  await expect(page.locator("#guide-home")).toBeVisible();
  await expect(page.locator("#mini-shorts")).toBeHidden();
  await expect(page.locator("#mini-home")).toBeVisible();
  const message = await page.locator("ytd-browse").evaluate((el) => getComputedStyle(el, "::before").content);
  expect(message).toContain("Focus mode is on");
});

test("hides related videos and end-screen suggestions, and turns off autoplay", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/watch?v=aaaaaaaaaaa");
  await expect(page.locator("#title")).toBeVisible();
  await expect(page.locator("#related")).toBeHidden();
  await expect(page.locator("#endscreen")).toBeHidden();
  await expect(page.locator("#card")).toBeHidden();
  await expect(page.locator("#autoplay")).toHaveAttribute("aria-checked", "false");
  // Comments stay visible by default.
  await expect(page.locator("#comments")).toBeVisible();
});

test("cancels YouTube's Up-next countdown if it starts anyway", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/watch?v=aaaaaaaaaaa");
  await page.evaluate(() => (document.getElementById("countdown")!.hidden = false));
  await expect(page.locator("#countdown")).toBeHidden();
});

test("hides Shorts in search results but keeps normal videos", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/results?search_query=rice");
  await expect(page.locator("#normal")).toBeVisible();
  await expect(page.locator("#short-result")).toBeHidden();
  await expect(page.locator("#reel-shelf")).toBeHidden();
});

test("opens Shorts links in the normal player", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/shorts/ddddddddddd");
  await expect(page).toHaveURL("https://www.youtube.com/watch?v=ddddddddddd");
});

test("settings changes apply to an open page without reloading", async ({ context, setSettings }) => {
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/watch?v=aaaaaaaaaaa");
  await expect(page.locator("#related")).toBeHidden();

  await setSettings({ hide: { ...DEFAULT_SETTINGS.hide, comments: true, related: false } });
  await expect(page.locator("#comments")).toBeHidden();
  await expect(page.locator("#related")).toBeVisible();

  await setSettings({ enabled: false });
  await expect(page.locator("#comments")).toBeVisible();
});

test("asks YouTube to lay out the page again after a change, and only then", async ({ context, setSettings }) => {
  const page = await context.newPage();
  await page.addInitScript(() => {
    const w = window as unknown as { resizes: number };
    w.resizes = 0;
    window.addEventListener("resize", () => w.resizes++);
  });
  await page.goto("https://www.youtube.com/");
  await expect(page.locator("#grid")).toBeHidden();
  const resizes = () => page.evaluate(() => (window as unknown as { resizes: number }).resizes);
  const before = await resizes();

  await setSettings({ enabled: false });
  await expect(page.locator("#grid")).toBeVisible();
  await expect.poll(resizes).toBe(before + 1);

  // Saving the same settings again changes nothing on the page, so no extra layout pass.
  await setSettings({ enabled: false });
  await page.waitForTimeout(500);
  expect(await resizes()).toBe(before + 1);
});

test("shows everything outside the scheduled hours", async ({ context, setSettings }) => {
  const now = new Date();
  // A one-minute window on a different day than today.
  const otherDay = (now.getDay() + 3) % 7;
  await setSettings({ schedule: { enabled: true, days: [otherDay], start: "09:00", end: "09:01" } });
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/");
  await expect(page.locator("#grid")).toBeVisible();
});

test("the popup starts a break, which shows everything until it ends", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/");
  await expect(page.locator("#grid")).toBeHidden();

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator("#status")).toHaveText("Focus mode is on.");
  await popup.getByRole("button", { name: "Take a 10-minute break" }).click();
  await expect(popup.locator("#status")).toHaveText(/On a break: (10:00|9:5\d) left\./);
  await expect(page.locator("#grid")).toBeVisible();

  await popup.getByRole("button", { name: "End break now" }).click();
  await expect(page.locator("#grid")).toBeHidden();
});

test("the popup toggles single features", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/watch?v=aaaaaaaaaaa");
  await expect(page.locator("#comments")).toBeVisible();
  await expect(page.locator("#comments-panel")).toBeVisible();

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByLabel("Comments").check();
  // Below the video, in the side panel, and live chat.
  await expect(page.locator("#comments")).toBeHidden();
  await expect(page.locator("#comments-panel")).toBeHidden();
  await expect(page.locator("#chat")).toBeHidden();
  await expect(page.locator("#teaser-carousel")).toBeHidden();
});

test("hides the Shorts tab on channel pages and keeps the others", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/@SomeChannel");
  await expect(page.locator("#tab-shorts")).toBeHidden();
  await expect(page.locator("#tab-videos")).toBeVisible();
  await expect(page.locator("#tab-live")).toBeVisible();
});

test("a channel's Shorts page goes to the channel's home page", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/@SomeChannel/shorts");
  await expect(page).toHaveURL("https://www.youtube.com/@SomeChannel");
});

test("the options page saves a schedule", async ({ context, extensionId, worker }) => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByLabel("Only during these hours").check();
  await options.getByLabel("Sat").check();
  await options.locator("#start").fill("22:00");
  await options.locator("#start").dispatchEvent("change");
  await expect
    .poll(() => worker.evaluate(async () => (await chrome.storage.sync.get("settings")).settings.schedule))
    .toEqual({ enabled: true, days: [1, 2, 3, 4, 5, 6], start: "22:00", end: "17:00" });
  // The typed time is still in the box after all the saves finish.
  await expect(options.locator("#start")).toHaveValue("22:00");
});
