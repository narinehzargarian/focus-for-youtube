import { DEFAULT_SETTINGS } from "../../src/settings";
import { expect, test } from "./fixtures";

/*
 * Checks the extension against the real youtube.com. Run with: npm run test:live
 * Not part of CI, because YouTube's pages vary by region, sign-in, and experiments.
 */
test.skip(!process.env.LIVE, "set LIVE=1 to run against youtube.com");

// "Me at the zoo", 19 seconds long, so the test can reach the end quickly.
const VIDEO = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

test("home page recommendations are hidden on youtube.com", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/");
  await page.waitForSelector('ytd-browse[page-subtype="home"]', { state: "attached" });
  await page.waitForTimeout(3000);
  const grid = page.locator('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer');
  if (await grid.count()) await expect(grid.first()).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-ytf-home", "");
  // No way into Shorts from the sidebar.
  const visibleShortsLinks = await page.evaluate(
    () => [...document.querySelectorAll<HTMLElement>('a[href^="/shorts"]')].filter((a) => a.offsetParent !== null).length,
  );
  expect(visibleShortsLinks).toBe(0);
  // The wide sidebar, whose Shorts link has no address, only a title.
  const visibleShortsEntries = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>("ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer")].filter(
        (entry) => entry.textContent?.trim() === "Shorts" && getComputedStyle(entry).display !== "none",
      ).length,
  );
  expect(visibleShortsEntries).toBe(0);
});

test("a real channel page hides its Shorts tab", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto("https://www.youtube.com/@CNN");
  await page.waitForSelector('yt-tab-shape[tab-title="Videos"]', { state: "visible" });
  await expect(page.locator('yt-tab-shape[tab-title="Videos"]')).toBeVisible();
  await expect(page.locator('yt-tab-shape[tab-title="Shorts"]')).toBeHidden();
});

test("related videos are hidden next to a real video", async ({ context, worker }) => {
  void worker;
  const page = await context.newPage();
  await page.goto(VIDEO);
  await page.waitForSelector("ytd-watch-flexy #related", { state: "attached" });
  await expect(page.locator("ytd-watch-flexy #related").first()).toBeHidden();
});

test("the next video doesn't start when a real video ends", async ({ context, setSettings }) => {
  // Related videos stay visible, so only the autoplay feature is being tested.
  await setSettings({ hide: { ...DEFAULT_SETTINGS.hide, related: false } });
  const page = await context.newPage();
  await page.goto(VIDEO);
  await page.waitForSelector("video", { state: "attached" });
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    const video = document.querySelector("video")!;
    video.muted = true;
    void video.play();
    video.currentTime = video.duration - 1.5;
  });
  // YouTube's countdown to the next video runs about 5 to 10 seconds.
  await page.waitForTimeout(15_000);
  expect(page.url()).toBe(VIDEO);
});
