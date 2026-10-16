import { z } from "zod";
import type { Session } from "./auth.ts";
import { getSettings } from "./db.ts";
import { HttpError, newId, now, type Env } from "./env.ts";
import { gcalDelete, gcalUpsert, onDomain, type CalEvent } from "./gcal.ts";
import { sendEmailDetailed } from "./mail.ts";
import { notify } from "./notify.ts";

/**
 * Tasks: a shared to-do list for the team (Tasks screen), each optionally tied to a lead and assigned to someone.
 * Calendar: a task with a date is mirrored to the Google Calendar of everyone it's for as ordinary email invites
 * (iCalendar METHOD:REQUEST; the owner at Settings → calendar email, team members at their Settings → Team email; a task
 * for anyone goes to the owner). An update bumps SEQUENCE, finishing or deleting sends CANCEL, someone taken off gets a
 * CANCEL and someone added gets the invite (`tasks.cal_to` = who holds it now).
 * That needs no Google login from the app: Google Calendar treats them like any meeting invite.
 */

export const TZ = "America/Chicago";

export interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  due: string | null;
  due_time: string | null;
  assignee: string | null;
  lead_id: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: number;
  updated_at: number;
  done_at: number | null;
  done_by_name: string | null;
  cal_uid: string | null;
  cal_seq: number;
  cal_to?: string | null;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  due: string | null;
  dueTime: string | null;
  /** First person it's for (older app builds read only this). */
  assignee: string | null;
  /** Everyone it's for, joined with commas ("Chris, Brenda"); null = anyone. */
  assigneeName: string | null;
  /** Everyone it's for (Oct 2026: a task can be for several people); empty = anyone. */
  assignees: string[];
  assigneeNames: string[];
  leadId: string | null;
  leadName: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: number;
  updatedAt: number;
  doneAt: number | null;
  doneByName: string | null;
  onCalendar: boolean;
  /** Names of the people it's for whose calendar can't get it (no email on file). */
  noCalendar?: string[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const TaskInput = z.object({
  title: z.string().trim().min(1, "Give the task a name").max(200),
  notes: z.string().trim().max(2000).optional().default(""),
  due: z
    .string()
    .regex(DAY, "Use a date like 2026-10-14")
    .nullable()
    .optional(),
  dueTime: z
    .string()
    .regex(TIME, "Use a time like 14:30")
    .nullable()
    .optional(),
  assignee: z.string().trim().max(40).nullable().optional(),
  /** Several people (wins over `assignee`); empty or null = anyone. */
  assignees: z.array(z.string().trim().min(1).max(40)).max(20).nullable().optional(),
  leadId: z.string().trim().max(40).nullable().optional(),
});
export const TaskPatch = TaskInput.partial().extend({
  done: z.boolean().optional(),
});

type Names = Map<string, string>;

/** The `assignee` column holds one id or several, comma-joined (no migration; older builds send one). */
export const assigneeIds = (v: string | null | undefined): string[] => (v ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);

/** The column value from a create / patch: `assignees` when sent, else `assignee`; undefined = not touched. */
function assigneeValue(input: { assignee?: string | null; assignees?: string[] | null }): string | null | undefined {
  if (input.assignees !== undefined) return input.assignees?.length ? [...new Set(input.assignees)].join(",") : null;
  if (input.assignee !== undefined) return input.assignee || null;
  return undefined;
}

/** Validates with a 400 and a readable message instead of a crash. */
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const r = schema.safeParse(raw);
  if (!r.success)
    throw new HttpError(400, r.error.issues.map((i) => i.message).join("; "));
  return r.data;
}

async function teamNames(env: Env): Promise<Names> {
  const s = await getSettings(env);
  const rows = await env.DB.prepare("SELECT id, name FROM users").all<{
    id: string;
    name: string;
  }>();
  const names: Names = new Map(rows.results.map((u) => [u.id, u.name]));
  names.set("owner", s.callerName || "Owner");
  return names;
}

function toTask(
  r: TaskRow & { lead_name?: string | null },
  names: Names,
): Task {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes ?? "",
    due: r.due,
    dueTime: r.due_time,
    ...(() => {
      const list = assigneeIds(r.assignee);
      const nameList = list.map((id) => names.get(id) ?? "Someone");
      return { assignee: list[0] ?? null, assigneeName: nameList.length ? nameList.join(", ") : null, assignees: list, assigneeNames: nameList };
    })(),
    leadId: r.lead_id,
    leadName: r.lead_name ?? null,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    doneAt: r.done_at,
    doneByName: r.done_by_name,
    onCalendar: !!r.cal_uid && !r.done_at,
  };
}

const SELECT =
  "SELECT t.*, l.name AS lead_name FROM tasks t LEFT JOIN leads l ON l.id = t.lead_id";

export async function listTasks(
  env: Env,
  o: {
    scope: "open" | "done";
    assignee?: string;
    leadId?: string;
    limit?: number;
  },
): Promise<Task[]> {
  const where = [
    o.scope === "open" ? "t.done_at IS NULL" : "t.done_at IS NOT NULL",
  ];
  const binds: unknown[] = [];
  if (o.assignee) {
    where.push("(t.assignee IS NULL OR instr(',' || t.assignee || ',', ?) > 0)");
    binds.push(`,${o.assignee},`);
  }
  if (o.leadId) {
    where.push("t.lead_id = ?");
    binds.push(o.leadId);
  }
  // Open: dated ones first by date and time, then undated by newest. Done: newest first.
  const order =
    o.scope === "open"
      ? "ORDER BY t.due IS NULL, t.due, t.due_time IS NULL, t.due_time, t.created_at DESC"
      : "ORDER BY t.done_at DESC";
  const rows = await env.DB.prepare(
    `${SELECT} WHERE ${where.join(" AND ")} ${order} LIMIT ?`,
  )
    .bind(...binds, o.limit ?? 200)
    .all<TaskRow & { lead_name: string | null }>();
  const names = await teamNames(env);
  return rows.results.map((r) => toTask(r, names));
}

export async function getTask(
  env: Env,
  id: string,
): Promise<(TaskRow & { lead_name: string | null }) | null> {
  return env.DB.prepare(`${SELECT} WHERE t.id = ?`)
    .bind(id)
    .first<TaskRow & { lead_name: string | null }>();
}

async function checkRefs(
  env: Env,
  names: Names,
  input: {
    assignee?: string | null;
    leadId?: string | null;
    due?: string | null;
    dueTime?: string | null;
  },
) {
  if (assigneeIds(input.assignee).some((id) => !names.has(id)))
    throw new HttpError(400, "That person isn't on the team");
  if (input.leadId) {
    const lead = await env.DB.prepare("SELECT id FROM leads WHERE id = ?")
      .bind(input.leadId)
      .first();
    if (!lead) throw new HttpError(404, "That lead is gone");
  }
  if (input.dueTime && !input.due)
    throw new HttpError(400, "A time needs a date");
}

function when(due: string | null, dueTime: string | null): string {
  if (!due) return "";
  const d = new Date(`${due}T12:00:00Z`);
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (!dueTime) return day;
  const [h, m] = dueTime.split(":").map(Number) as [number, number];
  const hh = h % 12 || 12;
  return `${day} ${hh}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}

export async function createTask(
  env: Env,
  session: Session,
  raw: unknown,
): Promise<Task> {
  const parsed = parse(TaskInput, raw);
  const input = { ...parsed, assignee: assigneeValue(parsed) ?? null };
  const names = await teamNames(env);
  await checkRefs(env, names, input);
  const id = newId();
  const t = now();
  await env.DB.prepare(
    "INSERT INTO tasks (id, title, notes, due, due_time, assignee, lead_id, created_by, created_by_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      input.title,
      input.notes || null,
      input.due ?? null,
      input.due ? (input.dueTime ?? null) : null,
      input.assignee || null,
      input.leadId || null,
      session.userId,
      session.name,
      t,
      t,
    )
    .run();
  const row = (await getTask(env, id))!;
  const task = toTask(row, names);
  const forWhom = !task.assignees.length
    ? "anyone"
    : task.assignees.length === 1 && task.assignees[0] === session.userId
      ? "themselves"
      : task.assigneeNames.join(" & ");
  await notify(env, {
    kind: "task",
    actor: session,
    leadId: task.leadId,
    text: `📝 ${session.name} added a task for ${forWhom}: ${task.title}${task.due ? ` (${when(task.due, task.dueTime)})` : ""}`,
  });
  await syncCalendar(env, row);
  return withNoCalendar(env, task, row, names);
}

export async function updateTask(
  env: Env,
  session: Session,
  id: string,
  raw: unknown,
): Promise<Task> {
  const patch = parse(TaskPatch, raw);
  const before = await getTask(env, id);
  if (!before) throw new HttpError(404, "Task not found");
  const names = await teamNames(env);
  const next = {
    title: patch.title ?? before.title,
    notes: patch.notes !== undefined ? patch.notes : (before.notes ?? ""),
    due: patch.due !== undefined ? patch.due : before.due,
    dueTime: patch.dueTime !== undefined ? patch.dueTime : before.due_time,
    assignee: assigneeValue(patch) !== undefined ? assigneeValue(patch)! : before.assignee,
    leadId: patch.leadId !== undefined ? patch.leadId || null : before.lead_id,
  };
  if (!next.due) next.dueTime = null;
  await checkRefs(env, names, next);
  const t = now();
  const doneAt =
    patch.done === undefined
      ? before.done_at
      : patch.done
        ? (before.done_at ?? t)
        : null;
  const doneBy =
    patch.done === undefined
      ? before.done_by_name
      : patch.done
        ? (before.done_by_name ?? session.name)
        : null;
  await env.DB.prepare(
    "UPDATE tasks SET title = ?, notes = ?, due = ?, due_time = ?, assignee = ?, lead_id = ?, updated_at = ?, done_at = ?, done_by_name = ? WHERE id = ?",
  )
    .bind(
      next.title,
      next.notes || null,
      next.due,
      next.dueTime,
      next.assignee,
      next.leadId,
      t,
      doneAt,
      doneBy,
      id,
    )
    .run();
  const row = (await getTask(env, id))!;
  const task = toTask(row, names);
  if (patch.done === true && !before.done_at) {
    await notify(env, {
      kind: "task",
      actor: session,
      leadId: task.leadId,
      text: `✅ ${session.name} finished: ${task.title}`,
    });
  }
  await syncCalendar(env, row, before);
  return withNoCalendar(env, task, row, names);
}

export async function deleteTask(
  env: Env,
  session: Session,
  id: string,
): Promise<void> {
  const row = await getTask(env, id);
  if (!row) return;
  if (session.role !== "owner" && row.created_by !== session.userId)
    throw new HttpError(
      403,
      "Only the owner or whoever added it can delete a task",
    );
  await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
  if (row.cal_uid) {
    const s = await getSettings(env);
    for (const h of heldBy(row, s)) await takeOff(env, row, h, row.cal_seq + 1).catch(() => false);
  }
}

/* ---------- calendar invites ---------- */

/** Adds the names of the people it's for whose calendar can't get it (no email on file), so the app can say so. */
async function withNoCalendar(env: Env, task: Task, row: TaskRow, names: Names): Promise<Task> {
  if (!row.due || row.done_at || !assigneeIds(row.assignee).length) return task;
  try {
    const { missing } = await calendarRecipients(env, row.assignee, await getSettings(env), names);
    return missing.length ? { ...task, noCalendar: missing } : task;
  } catch {
    return task;
  }
}

type CalSettings = { calendarEmail?: string | null; directEmail?: string | null; googleDomain?: string | null };
const ownerCal = (s: CalSettings) => (s.calendarEmail || s.directEmail || "").trim().toLowerCase();
const splitTo = (v: string | null | undefined) => (v ? v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : []);

/** Who holds the task now: "g:<email>" = written straight into their calendar (gcal.ts), "<email>" = an emailed invite.
 * Older rows: the owner's calendar, the only one invited before. */
function heldBy(r: TaskRow, s: CalSettings): string[] {
  if (r.cal_to != null) return splitTo(r.cal_to);
  const o = ownerCal(s);
  return r.cal_uid && o ? [o] : [];
}
const bare = (h: string) => h.replace(/^g:/, "");

/** Takes it off one person's calendar the way it got there. */
async function takeOff(env: Env, row: TaskRow, held: string, seq: number): Promise<boolean> {
  return held.startsWith("g:") ? gcalDelete(env, bare(held), row.id) : sendInvite(env, row, "CANCEL", seq, held);
}

async function calEvent(env: Env, row: TaskRow): Promise<CalEvent> {
  const lead = row.lead_id
    ? await env.DB.prepare("SELECT name FROM leads WHERE id = ?").bind(row.lead_id).first<{ name: string | null }>()
    : null;
  return {
    title: row.title,
    notes: row.notes ?? "",
    due: row.due!,
    dueTime: row.due_time,
    leadName: lead?.name ?? null,
    leadUrl: row.lead_id ? `https://app.undergroundassociates.com/#/lead/${row.lead_id}` : null,
  };
}

/** Calendar addresses of everyone a task is for (anyone = the owner), plus the names that have no email on file. */
export async function calendarRecipients(
  env: Env,
  assignee: string | null,
  s: CalSettings,
  names?: Names,
): Promise<{ emails: string[]; missing: string[] }> {
  const ids = assigneeIds(assignee);
  const who = ids.length ? ids : ["owner"];
  const emails: string[] = [];
  const missing: string[] = [];
  const userIds = who.filter((id) => id !== "owner");
  const users = userIds.length
    ? (
        await env.DB.prepare(`SELECT id, name, email, disabled FROM users WHERE id IN (${userIds.map(() => "?").join(",")})`)
          .bind(...userIds)
          .all<{ id: string; name: string; email: string | null; disabled: number }>()
      ).results
    : [];
  for (const id of who) {
    if (id === "owner") {
      const o = ownerCal(s);
      if (o) emails.push(o);
      else if (ids.length) missing.push(names?.get("owner") ?? "Owner");
      continue;
    }
    const u = users.find((x) => x.id === id);
    if (!u || u.disabled) continue;
    const e = (u.email ?? "").trim().toLowerCase();
    if (e) emails.push(e);
    else missing.push(u.name);
  }
  return { emails: [...new Set(emails)], missing };
}

/** What to send: the invite to new people (and to everyone when the task changed), a cancel to people taken off. */
export function calendarPlan(held: string[], want: string[], changed: boolean): { request: string[]; cancel: string[] } {
  return {
    request: want.filter((e) => changed || !held.includes(e)),
    cancel: held.filter((e) => !want.includes(e)),
  };
}

/**
 * Puts the task on, updates it on, or takes it off everyone's calendar as it changes. People on the company Google domain get
 * it written straight into their calendar (nothing to accept) once the owner's one-time setup is done (gcal.ts); everyone
 * else, and everyone until then, gets an emailed invite. Never throws.
 */
export async function syncCalendar(
  env: Env,
  row: TaskRow,
  before?: TaskRow | null,
): Promise<void> {
  try {
    const s = await getSettings(env);
    const domain = s.googleDomain || "undergroundassociates.com";
    const held = heldBy(row, s);
    const heldOf = new Map(held.map((h) => [bare(h), h]));
    const want = row.due && !row.done_at ? (await calendarRecipients(env, row.assignee, s)).emails : [];
    const changed =
      !before ||
      before.title !== row.title ||
      before.notes !== row.notes ||
      before.due !== row.due ||
      before.due_time !== row.due_time ||
      !row.cal_uid;
    const plan = calendarPlan([...heldOf.keys()], want, changed);
    // An emailed invite to someone on the domain is moved into their calendar directly once that works.
    const upgrade = want.filter((e) => !plan.request.includes(e) && heldOf.get(e) === e && onDomain(e, domain));
    if (!plan.request.length && !plan.cancel.length && !upgrade.length) return;
    const seq = row.cal_uid ? row.cal_seq + 1 : 0;
    const now = new Map(heldOf);
    for (const e of plan.cancel) if (await takeOff(env, row, heldOf.get(e)!, seq)) now.delete(e);
    const ev = row.due ? await calEvent(env, row) : null;
    for (const e of [...plan.request, ...upgrade]) {
      const had = heldOf.get(e);
      if (ev && onDomain(e, domain) && (await gcalUpsert(env, e, row.id, ev))) {
        if (had === e) await sendInvite(env, row, "CANCEL", seq, e); // the emailed copy it replaces
        now.set(e, `g:${e}`);
      } else if (plan.request.includes(e) && (await sendInvite(env, row, "REQUEST", seq, e))) now.set(e, e);
    }
    await env.DB.prepare("UPDATE tasks SET cal_uid = ?, cal_seq = ?, cal_to = ? WHERE id = ?")
      .bind(row.cal_uid ?? `task-${row.id}@undergroundassociates.com`, seq, [...now.values()].join(",") || null, row.id)
      .run();
  } catch (err) {
    console.error("calendar sync failed", err);
  }
}

async function sendInvite(
  env: Env,
  row: TaskRow,
  method: "REQUEST" | "CANCEL",
  seq: number,
  to: string,
): Promise<boolean> {
  const s = await getSettings(env);
  if (!to || !s.companyEmail) return false;
  const uid = row.cal_uid ?? `task-${row.id}@undergroundassociates.com`;
  const lead = row.lead_id
    ? await env.DB.prepare("SELECT name FROM leads WHERE id = ?")
        .bind(row.lead_id)
        .first<{ name: string | null }>()
    : null;
  const ics = taskIcs({
    uid,
    seq,
    method,
    title: row.title,
    notes: row.notes ?? "",
    due: row.due!,
    dueTime: row.due_time,
    leadName: lead?.name ?? null,
    leadUrl: row.lead_id
      ? `https://app.undergroundassociates.com/#/lead/${row.lead_id}`
      : null,
    organizer: {
      name: s.companyName || "Underground Associates",
      email: s.companyEmail,
    },
    attendee: to,
  });
  const r = await sendEmailDetailed(env, {
    from: s.companyEmail,
    fromName: `${s.companyName || "Underground Associates"} tasks`,
    to,
    subject:
      method === "CANCEL"
        ? `Done: ${row.title}`
        : `Task: ${row.title}${row.due ? ` (${when(row.due, row.due_time)})` : ""}`,
    text:
      method === "CANCEL"
        ? `"${row.title}" is finished, removed or handed to someone else, so it's off your calendar.`
        : `${row.title}${row.notes ? `\n\n${row.notes}` : ""}${lead?.name ? `\n\nAbout: ${lead.name}` : ""}\n\nFrom the Website Business app. Accept the invite to keep it on your calendar.`,
    attachments: [
      {
        filename: "invite.ics",
        content: btoa(unescape(encodeURIComponent(ics))),
        contentType: `text/calendar; method=${method}; charset=utf-8`,
      },
    ],
  });
  return r.ok;
}

/** Cullman wall-clock date + time → UTC instant (handles daylight saving by checking the zone's own offset). */
export function chicagoToUtc(due: string, time: string): Date {
  const [y, mo, d] = due.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(guess));
    const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    const asLocal = Date.UTC(
      g("year"),
      g("month") - 1,
      g("day"),
      g("hour") % 24,
      g("minute"),
    );
    guess += Date.UTC(y, mo - 1, d, h, mi) - asLocal;
  }
  return new Date(guess);
}

const icsText = (t: string) =>
  t
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
const stamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
/** iCalendar lines fold at 75 octets. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function taskIcs(o: {
  uid: string;
  seq: number;
  method: "REQUEST" | "CANCEL";
  title: string;
  notes: string;
  due: string;
  dueTime: string | null;
  leadName: string | null;
  leadUrl: string | null;
  organizer: { name: string; email: string };
  attendee: string;
  now?: Date;
}): string {
  const desc = [
    o.notes,
    o.leadName ? `About: ${o.leadName}` : "",
    o.leadUrl ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  let dt: string[];
  if (o.dueTime) {
    const start = chicagoToUtc(o.due, o.dueTime);
    dt = [
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(new Date(start.getTime() + 30 * 60_000))}`,
    ];
  } else {
    const d = o.due.replace(/-/g, "");
    const next = new Date(`${o.due}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    dt = [
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${stamp(next).slice(0, 8)}`,
      "TRANSP:TRANSPARENT",
    ];
  }
  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Underground Associates//Website Business//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${o.method}`,
    "BEGIN:VEVENT",
    `UID:${o.uid}`,
    `SEQUENCE:${o.seq}`,
    `DTSTAMP:${stamp(o.now ?? new Date())}`,
    ...dt,
    `SUMMARY:${icsText(o.title)}`,
    ...(desc ? [`DESCRIPTION:${icsText(desc)}`] : []),
    ...(o.leadUrl ? [`URL:${o.leadUrl}`] : []),
    `ORGANIZER;CN=${icsText(o.organizer.name)}:mailto:${o.organizer.email}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=${o.method === "CANCEL" ? "DECLINED" : "NEEDS-ACTION"};RSVP=TRUE:mailto:${o.attendee}`,
    `STATUS:${o.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    `TRIGGER:${o.dueTime ? "-PT30M" : "-PT0M"}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
