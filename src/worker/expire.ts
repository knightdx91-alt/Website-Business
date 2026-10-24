/** Which leads the daily cron expires: new after 30 days, shown after 60, not interested 30 days after the last contact. Sold and live never. */
export const EXPIRE_SQL = `SELECT id FROM leads WHERE status != 'expired' AND place_id != 'paytest' AND place_id NOT LIKE 'manual:%' AND (
       (sales_status = 'new' AND created_at < ?1)
    OR (sales_status = 'shown' AND created_at < ?2)
    OR (sales_status = 'not_interested' AND COALESCE(last_contact, updated_at) < ?1))
  AND NOT (COALESCE(follow_up, '') >= ?3 AND created_at >= ?4)
  AND NOT (COALESCE(mail_code_at, 0) >= ?4 AND created_at >= ?4) LIMIT 200`;

const DAY = 86_400_000;

export interface ExpiryInput {
  place_id: string;
  status: string;
  sales_status: string;
  created_at: number;
  updated_at: number;
  last_contact?: number | null;
  follow_up?: string | null;
  mail_code_at?: number | null;
}

/**
 * When the daily cron will take this lead's preview down (the same rules as EXPIRE_SQL), for the lead card / page.
 * `at` is the moment the lead becomes eligible (the cron runs once a day at 08:17 UTC, so it goes at the next run);
 * `kept` says what is holding it past the normal 30 / 60 days: a callback in the future or a handed-out flyer code
 * (both only up to 90 days after the lead was found, the Google data limit). Null = never expires (sold, live, the
 * practice lead, a typed-in business, or already expired).
 */
export function leadExpiry(l: ExpiryInput, nowMs = Date.now()): { at: number; kept: "callback" | "flyer" | null } | null {
  if (l.status === "expired" || l.place_id === "paytest" || l.place_id.startsWith("manual:")) return null;
  let base: number;
  if (l.sales_status === "new") base = l.created_at + 30 * DAY;
  else if (l.sales_status === "shown") base = l.created_at + 60 * DAY;
  else if (l.sales_status === "not_interested") base = (l.last_contact ?? l.updated_at) + 30 * DAY;
  else return null;
  const cap = l.created_at + 90 * DAY;
  let at = base;
  let kept: "callback" | "flyer" | null = null;
  // A callback date keeps it until the day after that date (Cullman time ≈ UTC−5/−6; the end of the day is close enough).
  if (l.follow_up && /^\d{4}-\d{2}-\d{2}$/.test(l.follow_up)) {
    const end = Math.min(Date.parse(`${l.follow_up}T00:00:00Z`) + DAY + 6 * 3_600_000, cap);
    if (end > at) {
      at = end;
      kept = "callback";
    }
  }
  if (l.mail_code_at) {
    const end = Math.min(l.mail_code_at + 90 * DAY, cap);
    if (end > at) {
      at = end;
      kept = "flyer";
    }
  }
  return { at: Math.max(at, nowMs), kept };
}

/** "Expires Nov 12 (in 19 days)" / "Expires today" / "Expires tomorrow", Cullman time. */
export function expiryLabel(at: number, nowMs = Date.now()): string {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" });
  const day = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date(ms));
  const days = Math.round((Date.parse(day(at)) - Date.parse(day(nowMs))) / DAY);
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires ${fmt.format(new Date(at))} (in ${days} days)`;
}
