import { breakRemaining, FEATURE_LABELS, FEATURES, isFocusActive, normalize, type Settings } from "./settings";

const enabled = document.getElementById("enabled") as HTMLInputElement;
const status = document.getElementById("status")!;
const breakButton = document.getElementById("break") as HTMLButtonElement;
const features = document.getElementById("features")!;

let settings: Settings;

async function save(): Promise<void> {
  await chrome.storage.sync.set({ settings });
  render();
}

function render(): void {
  const now = Date.now();
  enabled.checked = settings.enabled;
  const remaining = breakRemaining(settings, now);
  if (!settings.enabled) {
    status.textContent = "Focus mode is off.";
  } else if (remaining) {
    status.textContent = `On a break: ${remaining} left.`;
  } else if (isFocusActive(settings, new Date(now))) {
    status.textContent = "Focus mode is on.";
  } else {
    status.textContent = "Outside your scheduled hours.";
  }
  breakButton.textContent = remaining ? "End break now" : `Take a ${settings.breakMinutes}-minute break`;
  breakButton.disabled = !settings.enabled;
  for (const input of features.querySelectorAll<HTMLInputElement>("input")) {
    input.checked = settings.hide[input.value as keyof Settings["hide"]];
  }
}

function buildFeatureList(): void {
  for (const feature of FEATURES) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = feature;
    input.addEventListener("change", () => {
      settings.hide[feature] = input.checked;
      void save();
    });
    label.append(input, ` ${FEATURE_LABELS[feature]}`);
    features.append(label);
  }
}

enabled.addEventListener("change", () => {
  settings.enabled = enabled.checked;
  void save();
});

breakButton.addEventListener("click", () => {
  const onBreak = settings.breakUntil > Date.now();
  settings.breakUntil = onBreak ? 0 : Date.now() + settings.breakMinutes * 60_000;
  void save();
});

async function init(): Promise<void> {
  settings = normalize((await chrome.storage.sync.get("settings")).settings);
  buildFeatureList();
  render();
  // Keeps the break countdown current while the popup is open.
  setInterval(render, 1000);
}

void init();
