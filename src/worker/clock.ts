import { z } from "zod";
import type { Session } from "./auth.ts";
import { HttpError, newId, now, type Env } from "./env.ts";
import { notify } from "./notify.ts";
import { chicagoToUtc, TZ } from "./tasks.ts";

/**
 * Time clock (Oct 2026, owner's ask: some of the team work hourly as well as on commission). A team member whose hourly
 * pay is set (Settings → Team) gets a Clock in / Clock out card on the Tasks screen; the owner and full-access people see
 * everyone's timesheet by week, can fix a forgotten punch, add a missed shift and download the week as a CSV for payroll.
 * Each entry keeps the pay rate it started with, so a raise never rewrites old weeks. Weeks run Monday to Sunday, Cullman
 * time; a shift counts on the day it started.
 */

export interface EntryRow {
  id: string;
  user_id: string;
  user_name: string | null;
  clock_in: number;
  clock_out: number | null;
  note: string | null;
  rate_cents: number | null;
  edited_by: string | null;
  edited_at: number | null;
  reminded: number;
  created_at: number;
}

export interface Entry {
  id: string;
  userId: string;
  userName: string;
  clockIn: number;
  clockOut: number | null;
  /** Cullman date the shift started on (YYYY-MM-DD). */
  day: string;
  minutes: number;
  note: string;
  rateCents: number | null;
  payCents: number;
  editedBy: string | null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SHIFT_MS = 24 * 3_600_000;
/** After this long on the clock, the owner gets one "still clocked in?" alert. */
export const REMIND_AFTER_MS = 10 * 3_600_000;

/** Cullman calendar date of an instant. */
export function chicagoDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The Monday on or before a date. */
export function weekStart(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

const dayStartMs = (day: string) => chicagoToUtc(day, "00:00").getTime();

export function minutesOf(r: Pick<EntryRow, "clock_in" | "clock_out">, at = now()): number {
  return Math.max(0, Math.round(((r.clock_out ?? at) - r.clock_in) / 60_000));
}

export function payOf(minutes: number, rateCents: number | null): number {
  return rateCents ? Math.round((minutes * rateCents) / 60) : 0;
}

export function toEntry(r: EntryRow, at = now()): Entry {
  const minutes = minutesOf(r, at);
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name ?? "",
    clockIn: r.clock_in,
    clockOut: r.clock_out,
    day: chicagoDay(r.clock_in),
    minutes,
    note: r.note ?? "",
    rateCents: r.rate_cents,
    payCents: payOf(minutes, r.rate_cents),
    editedBy: r.edited_by,
  };
}

async function rateOf(env: Env, userId: string): Promise<number | null> {
  if (userId === "owner") return null;
  const u = await env.DB.prepare("SELECT hourly_cents FROM users WHERE id = ?").bind(userId).first<{ hourly_cents: number | null }>();
  return u?.hourly_cents ?? null;
}

async function openEntry(env: Env, userId: string): Promise<EntryRow | null> {
  return env.DB.prepare("SELECT * FROM time_entries WHERE user_id = ? AND clock_out IS NULL").bind(userId).first<EntryRow>();
}

async function entriesBetween(env: Env, from: number, to: number, userId?: string): Promise<EntryRow[]> {
  const rows = userId
    ? await env.DB.prepare("SELECT * FROM time_entries WHERE user_id = ? AND clock_in >= ? AND clock_in < ? ORDER BY clock_in DESC").bind(userId, from, to).all<EntryRow>()
    : await env.DB.prepare("SELECT * FROM time_entries WHERE clock_in >= ? AND clock_in < ? ORDER BY clock_in DESC").bind(from, to).all<EntryRow>();
  return rows.results;
}

export interface ClockStatus {
  /** Hourly pay is set for this person (or they're on the clock): show the Clock in / out card. */
  canClock: boolean;
  hourlyCents: number | null;
  open: Entry | null;
  today: { minutes: number };
  week: { from: string; minutes: number; payCents: number };
  /** This week and last week, newest first. */
  entries: Entry[];
}

export async function clockStatus(env: Env, userId: string, at = now()): Promise<ClockStatus> {
  const rate = await rateOf(env, userId);
  const open = await openEntry(env, userId);
  const today = chicagoDay(at);
  const from = weekStart(today);
  const rows = await entriesBetween(env, dayStartMs(addDays(from, -7)), dayStartMs(addDays(from, 7)), userId);
  const entries = rows.map((r) => toEntry(r, at));
  const week = entries.filter((e) => e.day >= from);
  return {
    canClock: !!rate || !!open,
    hourlyCents: rate,
    open: open ? toEntry(open, at) : null,
    today: { minutes: entries.filter((e) => e.day === today).reduce((s, e) => s + e.minutes, 0) },
    week: { from, minutes: week.reduce((s, e) => s + e.minutes, 0), payCents: week.reduce((s, e) => s + e.payCents, 0) },
    entries,
  };
}

const hoursText = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;

export async function clockIn(env: Env, session: Session, note = ""): Promise<Entry> {
  const rate = await rateOf(env, session.userId);
  if (!rate) throw new HttpError(403, "Your hourly pay isn't set up yet. Ask the owner to add it in Settings → Team.");
  if (await openEntry(env, session.userId)) throw new HttpError(409, "You're already clocked in.");
  const t = now();
  const row: EntryRow = { id: newId(), user_id: session.userId, user_name: session.name, clock_in: t, clock_out: null, note: note.trim().slice(0, 300) || null, rate_cents: rate, edited_by: null, edited_at: null, reminded: 0, created_at: t };
  try {
    await env.DB.prepare("INSERT INTO time_entries (id, user_id, user_name, clock_in, clock_out, note, rate_cents, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?)")
      .bind(row.id, row.user_id, row.user_name, row.clock_in, row.note, row.rate_cents, row.created_at)
      .run();
  } catch {
    throw new HttpError(409, "You're already clocked in."); // the one-open-entry index caught a double tap
  }
  await notify(env, { kind: "clock", actor: session, text: `⏱ ${session.name} clocked in${row.note ? `: ${row.note}` : ""}.` });
  return toEntry(row, t);
}

export async function clockOut(env: Env, session: Session, note = ""): Promise<Entry> {
  const open = await openEntry(env, session.userId);
  if (!open) throw new HttpError(409, "You're not clocked in.");
  const t = now();
  const extra = note.trim().slice(0, 300);
  const merged = [open.note, extra].filter(Boolean).join(" · ").slice(0, 300) || null;
  await env.DB.prepare("UPDATE time_entries SET clock_out = ?, note = ? WHERE id = ?").bind(t, merged, open.id).run();
  const e = toEntry({ ...open, clock_out: t, note: merged }, t);
  await notify(env, { kind: "clock", actor: session, text: `⏱ ${session.name} clocked out after ${hoursText(e.minutes)}.` });
  return e;
}

export interface TeamWeek {
  from: string;
  to: string;
  people: { userId: string; name: string; hourlyCents: number | null; minutes: number; payCents: number; open: boolean; entries: Entry[] }[];
  totalMinutes: number;
  totalPayCents: number;
}

/** Everyone's hours for the week starting `from` (a Monday), plus anyone with hourly pay who hasn't worked yet. */
export async function teamWeek(env: Env, from: string, at = now()): Promise<TeamWeek> {
  const start = weekStart(from);
  const end = addDays(start, 7);
  const rows = await entriesBetween(env, dayStartMs(start), dayStartMs(end));
  const users = await env.DB.prepare("SELECT id, name, hourly_cents, disabled FROM users ORDER BY name").all<{ id: string; name: string; hourly_cents: number | null; disabled: number }>();
  const people = new Map<string, TeamWeek["people"][number]>();
  for (const u of users.results)
    if (u.hourly_cents && !u.disabled) people.set(u.id, { userId: u.id, name: u.name, hourlyCents: u.hourly_cents, minutes: 0, payCents: 0, open: false, entries: [] });
  for (const r of rows) {
    const e = toEntry(r, at);
    let p = people.get(r.user_id);
    if (!p) {
      const u = users.results.find((x) => x.id === r.user_id);
      p = { userId: r.user_id, name: u?.name ?? r.user_name ?? "Someone", hourlyCents: u?.hourly_cents ?? null, minutes: 0, payCents: 0, open: false, entries: [] };
      people.set(r.user_id, p);
    }
    p.entries.push(e);
    p.minutes += e.minutes;
    p.payCents += e.payCents;
    if (!r.clock_out) p.open = true;
  }
  const list = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    from: start,
    to: addDays(start, 6),
    people: list,
    totalMinutes: list.reduce((s, p) => s + p.minutes, 0),
    totalPayCents: list.reduce((s, p) => s + p.payCents, 0),
  };
}

export const EntryInput = z.object({
  inDay: z.string().regex(DAY, "Pick the start date"),
  inTime: z.string().regex(TIME, "Pick the start time"),
  outDay: z.string().regex(DAY).nullish(),
  outTime: z.string().regex(TIME).nullish(),
  note: z.string().trim().max(300).nullish(),
});
export type EntryInputT = z.infer<typeof EntryInput>;

/** Turns the picked Cullman date + times into instants and checks them. */
export function entryTimes(i: EntryInputT, at = now()): { clockIn: number; clockOut: number | null } {
  const clockIn = chicagoToUtc(i.inDay, i.inTime).getTime();
  const clockOut = i.outTime ? chicagoToUtc(i.outDay || i.inDay, i.outTime).getTime() : null;
  if (clockIn > at + 5 * 60_000) throw new HttpError(400, "The start time is in the future.");
  if (clockOut !== null) {
    if (clockOut <= clockIn) throw new HttpError(400, "Clock out has to be after clock in. For a shift past midnight, pick the next day for clock out.");
    if (clockOut - clockIn > MAX_SHIFT_MS) throw new HttpError(400, "That's more than 24 hours. Split it into two shifts.");
    if (clockOut > at + 5 * 60_000) throw new HttpError(400, "The clock-out time is in the future.");
  }
  return { clockIn, clockOut };
}

async function checkOverlap(env: Env, userId: string, clockIn: number, clockOut: number | null, skipId?: string): Promise<void> {
  const end = clockOut ?? now();
  const hit = await env.DB.prepare(
    "SELECT id FROM time_entries WHERE user_id = ? AND id != ? AND clock_in < ? AND COALESCE(clock_out, ?) > ? LIMIT 1",
  )
    .bind(userId, skipId ?? "", end, now(), clockIn)
    .first();
  if (hit) throw new HttpError(409, "That overlaps another shift for the same person.");
}

/** Owner fixes a punch (forgot to clock out, wrong time). Leaving clock out blank keeps them on the clock. */
export async function editEntry(env: Env, id: string, input: EntryInputT, byName: string): Promise<Entry> {
  const row = await env.DB.prepare("SELECT * FROM time_entries WHERE id = ?").bind(id).first<EntryRow>();
  if (!row) throw new HttpError(404, "That shift is gone.");
  const { clockIn, clockOut } = entryTimes(input);
  if (clockOut === null && row.clock_out !== null && (await openEntry(env, row.user_id)))
    throw new HttpError(409, "They're already on the clock in another shift. Give this one a clock-out time.");
  await checkOverlap(env, row.user_id, clockIn, clockOut, id);
  const t = now();
  const note = input.note === undefined ? row.note : input.note || null;
  await env.DB.prepare("UPDATE time_entries SET clock_in = ?, clock_out = ?, note = ?, edited_by = ?, edited_at = ? WHERE id = ?")
    .bind(clockIn, clockOut, note, byName, t, id)
    .run();
  return toEntry({ ...row, clock_in: clockIn, clock_out: clockOut, note, edited_by: byName, edited_at: t });
}

/** Owner adds a shift someone forgot to clock (both times required). */
export async function addEntry(env: Env, userId: string, input: EntryInputT, byName: string): Promise<Entry> {
  const u = await env.DB.prepare("SELECT id, name, hourly_cents FROM users WHERE id = ?").bind(userId).first<{ id: string; name: string; hourly_cents: number | null }>();
  if (!u) throw new HttpError(404, "Pick someone on the team.");
  const { clockIn, clockOut } = entryTimes(input);
  if (clockOut === null) throw new HttpError(400, "Pick the clock-out time too.");
  await checkOverlap(env, userId, clockIn, clockOut);
  const t = now();
  const row: EntryRow = { id: newId(), user_id: u.id, user_name: u.name, clock_in: clockIn, clock_out: clockOut, note: input.note || null, rate_cents: u.hourly_cents, edited_by: byName, edited_at: t, reminded: 1, created_at: t };
  await env.DB.prepare("INSERT INTO time_entries (id, user_id, user_name, clock_in, clock_out, note, rate_cents, edited_by, edited_at, reminded, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)")
    .bind(row.id, row.user_id, row.user_name, row.clock_in, row.clock_out, row.note, row.rate_cents, byName, t, t)
    .run();
  return toEntry(row);
}

export async function deleteEntry(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM time_entries WHERE id = ?").bind(id).run();
}

export async function setHourly(env: Env, userId: string, cents: number | null): Promise<void> {
  const r = await env.DB.prepare("UPDATE users SET hourly_cents = ? WHERE id = ?").bind(cents && cents > 0 ? cents : null, userId).run();
  if (!r.meta.changes) throw new HttpError(404, "Pick someone on the team.");
}

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const dollars = (c: number) => (c / 100).toFixed(2);

/** The week as a spreadsheet for payroll: one row per shift, then a total per person. */
export function timesheetCsv(w: TeamWeek): string {
  const rows: string[][] = [["Name", "Date", "Clock in", "Clock out", "Hours", "Hourly pay", "Pay", "Note", "Changed by hand"]];
  for (const p of w.people) {
    for (const e of [...p.entries].reverse())
      rows.push([
        p.name,
        e.day,
        timeFmt.format(new Date(e.clockIn)),
        e.clockOut ? timeFmt.format(new Date(e.clockOut)) : "still on the clock",
        (e.minutes / 60).toFixed(2),
        e.rateCents ? dollars(e.rateCents) : "",
        dollars(e.payCents),
        e.note,
        e.editedBy ? `yes (${e.editedBy})` : "",
      ]);
    if (p.entries.length) rows.push([`${p.name} total`, "", "", "", (p.minutes / 60).toFixed(2), "", dollars(p.payCents), "", ""]);
  }
  rows.push(["Everyone", `${w.from} to ${w.to}`, "", "", (w.totalMinutes / 60).toFixed(2), "", dollars(w.totalPayCents), "", ""]);
  return rows.map((r) => r.map((c) => csvCell(c)).join(",")).join("\r\n") + "\r\n";
}

/** Minute cron: one alert per shift that has run past REMIND_AFTER_MS (somebody probably forgot to clock out). */
export async function remindOpenShifts(env: Env, at = now()): Promise<number> {
  const rows = await env.DB.prepare("SELECT * FROM time_entries WHERE clock_out IS NULL AND reminded = 0 AND clock_in < ? LIMIT 10")
    .bind(at - REMIND_AFTER_MS)
    .all<EntryRow>();
  for (const r of rows.results) {
    await env.DB.prepare("UPDATE time_entries SET reminded = 1 WHERE id = ?").bind(r.id).run();
    await notify(env, {
      kind: "clock",
      actorName: "Time clock",
      text: `⏱ ${r.user_name ?? "Someone"} has been clocked in for ${hoursText(minutesOf(r, at))}. Forgot to clock out? Fix it in Tasks → Timesheets.`,
    });
  }
  return rows.results.length;
}
