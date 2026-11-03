import { normalize } from "./settings";

// Saves complete settings on install and update, so new options get their defaults.
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.sync.get("settings");
  await chrome.storage.sync.set({ settings: normalize(settings) });
});
