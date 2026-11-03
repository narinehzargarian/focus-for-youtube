/*
 * Turns off YouTube's autoplay toggle. This runs in the page's own context ("world": "MAIN"),
 * because YouTube's player ignores clicks that come from an extension's isolated context.
 * It has no access to extension settings: it acts only while content.ts has set
 * data-ytf-autoplay on <html>, meaning focus mode is on and autoplay hiding is enabled.
 */

let lastClick = 0;

function check(): void {
  if (!document.documentElement.hasAttribute("data-ytf-autoplay")) return;

  // Safety net: some versions of YouTube's player don't respond to the toggle. If the
  // "Up next" countdown starts anyway, cancel it, as a person would.
  const cancel = document.querySelector<HTMLElement>(".ytp-autonav-endscreen-upnext-cancel-button");
  if (cancel?.offsetParent) cancel.click();

  const toggle = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');
  if (!toggle) return;
  const button = toggle.closest<HTMLElement>("button") ?? (toggle as HTMLElement);
  // The player ignores clicks until it's ready, which is when the button gets its label.
  if (!button.getAttribute("aria-label") && !button.getAttribute("title")) return;
  // YouTube updates the toggle's state a moment after a click. Without this pause, a second
  // check could see the old state and click again, turning autoplay back on.
  if (Date.now() - lastClick < 3000) return;
  lastClick = Date.now();
  button.click();
}

// The toggle appears after the player loads, and again on each new video, so check
// whenever the page changes, at most twice a second.
let pending = false;
new MutationObserver(() => {
  if (pending) return;
  pending = true;
  setTimeout(() => {
    pending = false;
    check();
  }, 500);
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ytf-autoplay", "aria-checked"] });

// Also checks on start and every few seconds, in case the flag was set before this script ran.
check();
setInterval(check, 2000);
