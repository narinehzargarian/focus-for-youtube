import { channelShortsTab, FEATURES, isFocusActive, normalize, shortsVideoId, type Settings } from "./settings";

/*
 * Runs on every youtube.com page, before it draws. Hiding is done in content.css, and autoplay
 * in autoplay.ts; this script only decides which of them apply, by setting attributes on <html>.
 * YouTube changes pages without reloading, so this also follows its in-page navigation.
 */

let settings: Settings | undefined;

function apply(): void {
  if (!settings) return;
  const active = isFocusActive(settings, new Date());
  const root = document.documentElement;
  for (const feature of FEATURES) {
    root.toggleAttribute(`data-ytf-${feature}`, active && settings.hide[feature]);
  }
  if (active && settings.hide.shorts) redirectShorts();
}

/**
 * Opens a link to a specific Short in the normal player, where the Shorts feed can't take over.
 * The Shorts tab itself (/shorts with no video) goes to the home page instead of a random Short.
 */
function redirectShorts(): void {
  if (/^\/shorts\/?$/.test(location.pathname)) {
    location.replace("/");
    return;
  }
  // A channel's Shorts tab, such as /@CNN/shorts, goes to the channel's home page.
  const channel = channelShortsTab(location.pathname);
  if (channel) {
    location.replace(channel);
    return;
  }
  const id = shortsVideoId(location.pathname);
  if (id) location.replace(`/watch?v=${encodeURIComponent(id)}`);
}

async function load(): Promise<void> {
  settings = normalize((await chrome.storage.sync.get("settings")).settings);
  apply();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.settings) {
    settings = normalize(changes.settings.newValue);
    apply();
  }
});

// YouTube's own event after in-page navigation, plus the browser's back and forward.
document.addEventListener("yt-navigate-finish", apply);
window.addEventListener("popstate", apply);

// Re-checks every 30 seconds, so a break or a schedule boundary takes effect on an open page.
setInterval(apply, 30_000);

void load();
