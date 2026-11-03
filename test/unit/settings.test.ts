import { describe, expect, it } from "vitest";
import { breakRemaining, DEFAULT_SETTINGS, isFocusActive, normalize, parseTime, shortsVideoId, type Settings } from "../../src/settings";

// Local time: 2026-03-02 is a Monday.
const monday = (hour: number, minute = 0) => new Date(2026, 2, 2, hour, minute);
const sunday = (hour: number, minute = 0) => new Date(2026, 2, 1, hour, minute);
const withSchedule = (schedule: Partial<Settings["schedule"]>): Settings => ({
  ...DEFAULT_SETTINGS,
  schedule: { ...DEFAULT_SETTINGS.schedule, enabled: true, ...schedule },
});

describe("isFocusActive", () => {
  it("is on by default, and off when disabled", () => {
    expect(isFocusActive(DEFAULT_SETTINGS, monday(23))).toBe(true);
    expect(isFocusActive({ ...DEFAULT_SETTINGS, enabled: false }, monday(10))).toBe(false);
  });

  it("pauses during a break, and resumes when it ends", () => {
    const now = monday(10);
    const onBreak = { ...DEFAULT_SETTINGS, breakUntil: now.getTime() + 60_000 };
    expect(isFocusActive(onBreak, now)).toBe(false);
    expect(isFocusActive(onBreak, new Date(now.getTime() + 60_000))).toBe(true);
  });

  it("follows a daytime schedule, with the end time excluded", () => {
    const settings = withSchedule({ days: [1], start: "09:00", end: "17:00" });
    expect(isFocusActive(settings, monday(8, 59))).toBe(false);
    expect(isFocusActive(settings, monday(9))).toBe(true);
    expect(isFocusActive(settings, monday(16, 59))).toBe(true);
    expect(isFocusActive(settings, monday(17))).toBe(false);
    expect(isFocusActive(settings, sunday(10))).toBe(false);
  });

  it("handles a schedule that runs past midnight", () => {
    // Sunday 22:00 to 02:00: the early hours of Monday belong to Sunday's range.
    const settings = withSchedule({ days: [0], start: "22:00", end: "02:00" });
    expect(isFocusActive(settings, sunday(23))).toBe(true);
    expect(isFocusActive(settings, monday(1, 30))).toBe(true);
    expect(isFocusActive(settings, monday(2))).toBe(false);
    expect(isFocusActive(settings, monday(23))).toBe(false);
  });

  it("treats equal start and end as all day", () => {
    expect(isFocusActive(withSchedule({ days: [1], start: "00:00", end: "00:00" }), monday(3))).toBe(true);
  });
});

describe("normalize", () => {
  it("fills in defaults for empty or corrupted storage", () => {
    expect(normalize(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalize("garbage")).toEqual(DEFAULT_SETTINGS);
    const fixed = normalize({ enabled: "yes", hide: { shorts: false, comments: 1 }, schedule: { days: [1, 1, 9, -1, 2.5, 3], start: "25:00" }, breakMinutes: 500 });
    expect(fixed.enabled).toBe(true);
    expect(fixed.hide.shorts).toBe(false);
    expect(fixed.hide.comments).toBe(false);
    expect(fixed.schedule.days).toEqual([1, 3]);
    expect(fixed.schedule.start).toBe("09:00");
    expect(fixed.breakMinutes).toBe(10);
  });
});

describe("helpers", () => {
  it("parses only valid 24-hour times", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("23:59")).toBe(1439);
    for (const bad of ["24:00", "9:00", "12:60", "", "noon"]) expect(parseTime(bad)).toBeUndefined();
  });

  it("extracts Shorts video IDs", () => {
    expect(shortsVideoId("/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(shortsVideoId("/shorts/abc_DEF-123?feature=share")).toBe("abc_DEF-123");
    expect(shortsVideoId("/watch")).toBeUndefined();
    expect(shortsVideoId("/shorts/")).toBeUndefined();
    expect(shortsVideoId("/shorts/<script>")).toBeUndefined();
  });

  it("formats the time left on a break", () => {
    const settings = { ...DEFAULT_SETTINGS, breakUntil: 10 * 60_000 };
    expect(breakRemaining(settings, 0)).toBe("10:00");
    expect(breakRemaining(settings, 10 * 60_000 - 1500)).toBe("0:02");
    expect(breakRemaining(settings, 10 * 60_000)).toBeUndefined();
  });
});
