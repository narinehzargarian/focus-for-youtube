import { normalize, parseTime, type Settings } from "./settings";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const scheduleEnabled = document.getElementById("schedule-enabled") as HTMLInputElement;
const days = document.getElementById("days")!;
const start = document.getElementById("start") as HTMLInputElement;
const end = document.getElementById("end") as HTMLInputElement;
const breakMinutes = document.getElementById("break-minutes") as HTMLInputElement;
const saved = document.getElementById("saved")!;

let settings: Settings;

// Saves run one at a time, in order, so a slow save can't undo a newer one.
let queue = Promise.resolve();
function save(): void {
  queue = queue.then(saveNow);
}

async function saveNow(): Promise<void> {
  // Re-reads first, so a change made in the popup meanwhile isn't overwritten.
  const latest = normalize((await chrome.storage.sync.get("settings")).settings);
  const minutes = Number(breakMinutes.value);
  settings = normalize({
    ...latest,
    schedule: {
      enabled: scheduleEnabled.checked,
      days: [...days.querySelectorAll<HTMLInputElement>("input:checked")].map((input) => Number(input.value)),
      start: parseTime(start.value) === undefined ? latest.schedule.start : start.value,
      end: parseTime(end.value) === undefined ? latest.schedule.end : end.value,
    },
    breakMinutes: Number.isInteger(minutes) && minutes >= 1 && minutes <= 120 ? minutes : latest.breakMinutes,
  });
  await chrome.storage.sync.set({ settings });
  saved.textContent = "Saved.";
  // Only the number box is corrected after saving; redrawing every field would undo typing in progress.
  breakMinutes.value = String(settings.breakMinutes);
}

function render(): void {
  scheduleEnabled.checked = settings.schedule.enabled;
  for (const input of days.querySelectorAll<HTMLInputElement>("input")) {
    input.checked = settings.schedule.days.includes(Number(input.value));
  }
  start.value = settings.schedule.start;
  end.value = settings.schedule.end;
  breakMinutes.value = String(settings.breakMinutes);
}

async function init(): Promise<void> {
  settings = normalize((await chrome.storage.sync.get("settings")).settings);
  DAY_NAMES.forEach((name, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(index);
    input.addEventListener("change", save);
    label.append(input, ` ${name}`);
    days.append(label);
  });
  for (const input of [scheduleEnabled, start, end, breakMinutes]) {
    input.addEventListener("change", save);
  }
  render();
}

void init();
