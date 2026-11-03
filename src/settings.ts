/** Everything the extension can hide. */
export const FEATURES = ["home", "related", "shorts", "comments", "endscreen", "autoplay"] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_LABELS: Record<Feature, string> = {
  home: "Home page recommendations",
  related: "Related videos next to the player",
  shorts: "Shorts",
  comments: "Comments and live chat",
  endscreen: "Suggestions when a video ends",
  autoplay: "Autoplay of the next video",
};

export interface Schedule {
  enabled: boolean;
  /** 0 is Sunday. */
  days: number[];
  /** "HH:MM", 24-hour. An end before the start runs past midnight. */
  start: string;
  end: string;
}

export interface Settings {
  enabled: boolean;
  hide: Record<Feature, boolean>;
  /** When on, focus mode only applies during these hours. */
  schedule: Schedule;
  breakMinutes: number;
  /** Milliseconds since the epoch. Focus mode is paused until then. */
  breakUntil: number;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  hide: { home: true, related: true, shorts: true, comments: false, endscreen: true, autoplay: true },
  schedule: { enabled: false, days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
  breakMinutes: 10,
  breakUntil: 0,
};

/** Fills in anything missing or invalid, so old or hand-edited storage can't break the extension. */
export function normalize(stored: unknown): Settings {
  const s = (stored ?? {}) as Partial<Settings>;
  const hide = { ...DEFAULT_SETTINGS.hide };
  for (const feature of FEATURES) {
    if (typeof s.hide?.[feature] === "boolean") hide[feature] = s.hide[feature];
  }
  const schedule = s.schedule ?? DEFAULT_SETTINGS.schedule;
  const validTime = (value: unknown, fallback: string) => (typeof value === "string" && parseTime(value) !== undefined ? value : fallback);
  return {
    enabled: typeof s.enabled === "boolean" ? s.enabled : DEFAULT_SETTINGS.enabled,
    hide,
    schedule: {
      enabled: typeof schedule.enabled === "boolean" ? schedule.enabled : false,
      days: Array.isArray(schedule.days)
        ? [...new Set(schedule.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
        : DEFAULT_SETTINGS.schedule.days,
      start: validTime(schedule.start, DEFAULT_SETTINGS.schedule.start),
      end: validTime(schedule.end, DEFAULT_SETTINGS.schedule.end),
    },
    breakMinutes: Number.isInteger(s.breakMinutes) && s.breakMinutes! >= 1 && s.breakMinutes! <= 120 ? s.breakMinutes! : DEFAULT_SETTINGS.breakMinutes,
    breakUntil: typeof s.breakUntil === "number" && s.breakUntil >= 0 ? s.breakUntil : 0,
  };
}

export function parseTime(value: string): number | undefined {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

/** Whether focus mode applies at this moment, in the browser's local time. */
export function isFocusActive(settings: Settings, now: Date): boolean {
  if (!settings.enabled || settings.breakUntil > now.getTime()) return false;
  if (!settings.schedule.enabled) return true;
  const start = parseTime(settings.schedule.start)!;
  const end = parseTime(settings.schedule.end)!;
  const minute = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();
  const days = settings.schedule.days;
  if (start === end) return days.includes(today);  // All day on the chosen days.
  if (start < end) return days.includes(today) && minute >= start && minute < end;
  // Overnight: after midnight still belongs to the day the range started on.
  const yesterday = (today + 6) % 7;
  return (days.includes(today) && minute >= start) || (days.includes(yesterday) && minute < end);
}

/** The ID from a Shorts link, so it can open in the normal player instead. */
export function shortsVideoId(pathname: string): string | undefined {
  const match = /^\/shorts\/([A-Za-z0-9_-]{6,20})/.exec(pathname);
  return match?.[1];
}

/** For a channel's Shorts tab, such as /@CNN/shorts, the channel's own address. */
export function channelShortsTab(pathname: string): string | undefined {
  const match = /^(\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+))\/shorts\/?$/.exec(pathname);
  return match?.[1];
}

/** Minutes and seconds left on a break, or undefined if there's no break. */
export function breakRemaining(settings: Settings, now: number): string | undefined {
  const ms = settings.breakUntil - now;
  if (ms <= 0) return undefined;
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
