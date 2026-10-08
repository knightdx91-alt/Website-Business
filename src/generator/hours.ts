import type { Hours, Interval } from "./types.ts";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** US week display order: Monday first. */
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function formatTime(hhmm: string): string {
  if (hhmm === "24:00" || hhmm === "00:00") return "midnight";
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (h === 12 && m === 0) return "noon";
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatIntervals(intervals: Interval[]): string {
  if (intervals.length === 0) return "Closed";
  if (intervals.length === 1 && intervals[0]!.open === "00:00" && intervals[0]!.close === "24:00") return "Open 24 hours";
  return intervals.map((i) => `${formatTime(i.open)} – ${formatTime(i.close)}`).join(", ");
}

export interface HoursRow {
  day: number;
  label: string;
  text: string;
}

export function weeklyRows(hours: Hours): HoursRow[] {
  return DISPLAY_ORDER.map((d) => ({
    day: d,
    label: DAY_NAMES[d],
    text: hours.open24_7 ? "Open 24 hours" : formatIntervals(hours.weekly[d] ?? []),
  }));
}

/** Compact summary for footers, e.g. "Mon–Fri 11 AM – 8 PM · Sat 7 AM – 2 PM · Sun Closed". */
export function hoursSummary(hours: Hours): string {
  if (hours.open24_7) return "Open 24 hours, 7 days";
  const rows = weeklyRows(hours);
  const groups: Array<{ from: number; to: number; text: string }> = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.text === row.text) last.to = row.day;
    else groups.push({ from: row.day, to: row.day, text: row.text });
  }
  return groups
    .map((g) => (g.from === g.to ? `${DAY_SHORT[g.from]} ${g.text}` : `${DAY_SHORT[g.from]}–${DAY_SHORT[g.to]} ${g.text}`))
    .join(" · ");
}

export function hasAnyHours(hours: Hours | undefined): hours is Hours {
  return !!hours && (hours.open24_7 === true || hours.weekly.some((d) => d.length > 0));
}

/** schema.org OpeningHoursSpecification, from the same data the page shows. */
export function openingHoursSpecification(hours: Hours): object[] {
  const all = DAY_NAMES.map((d) => `https://schema.org/${d}`);
  if (hours.open24_7) {
    return [{ "@type": "OpeningHoursSpecification", dayOfWeek: all, opens: "00:00", closes: "23:59" }];
  }
  const specs: object[] = [];
  hours.weekly.forEach((intervals, day) => {
    for (const i of intervals) {
      specs.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DAY_NAMES[day]}`,
        opens: i.open,
        closes: i.close === "24:00" ? "23:59" : i.close,
      });
    }
  });
  return specs;
}
