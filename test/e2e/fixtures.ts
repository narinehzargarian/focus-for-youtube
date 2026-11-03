import { test as base, chromium, expect, type BrowserContext, type Worker } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Settings } from "../../src/settings";

const dist = fileURLToPath(new URL("../../dist", import.meta.url));
const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`../fixtures/${name}.html`, import.meta.url)), "utf8");

/** Serves saved copies of YouTube pages at youtube.com addresses, so the content script runs on them. */
async function serveFixtures(context: BrowserContext): Promise<void> {
  await context.route("https://www.youtube.com/**", (route) => {
    const url = new URL(route.request().url());
    const page =
      url.pathname === "/" ? "home" : url.pathname === "/results" ? "results" : url.pathname.startsWith("/@") ? "channel" : "watch";
    return route.fulfill({ contentType: "text/html", body: fixture(page) });
  });
}

export const test = base.extend<{
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  setSettings: (change: Partial<Settings>) => Promise<void>;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        ...(process.env.HEADED ? [] : ["--headless=new"]),
        `--disable-extensions-except=${dist}`,
        `--load-extension=${dist}`,
      ],
    });
    if (!process.env.LIVE) await serveFixtures(context);
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    const ours = (w: Worker) => w.url().endsWith("/background.js");
    const worker =
      context.serviceWorkers().find(ours) ?? (await context.waitForEvent("serviceworker", { predicate: ours }));
    // Waits for Chrome to attach its APIs and for the install handler to save the defaults,
    // so tests don't race either one.
    await expect
      .poll(() =>
        worker.evaluate(async () =>
          typeof chrome !== "undefined" && chrome.storage !== undefined
            ? (await chrome.storage.sync.get("settings")).settings !== undefined
            : false,
        ),
      )
      .toBe(true);
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
  setSettings: async ({ worker }, use) => {
    await use(async (change) => {
      await worker.evaluate(async (change) => {
        const { settings } = await chrome.storage.sync.get("settings");
        await chrome.storage.sync.set({ settings: { ...settings, ...change } });
      }, change);
    });
  },
});

export { expect } from "@playwright/test";
