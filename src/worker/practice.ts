import { addSampleStock } from "../generator/sample-stock.ts";
import type { BusinessRecord } from "../generator/types.ts";
import { getLead, isPayTest, type LeadRow } from "./db.ts";
import { HttpError, type Env } from "./env.ts";
import { deleteProject } from "./pages.ts";
import { renderPreview } from "./pipeline.ts";
import { refundable, refundSignup } from "./tap.ts";

/**
 * The practice lead ("Payment test (not a real business)", place_id `paytest`) is the training aid: trainees take it from New to
 * Live, $1 at a time. "Reset for the next run" puts it back the way a trainee first finds it: refunds every $1 still on the
 * card, drops the sign-ups, purchases, call log and tasks, takes down anything published, forgets board links and uploads, puts
 * fresh sample stock on the price list, and rebuilds the preview. Only the practice lead can be reset.
 */
export async function resetPracticeLead(
  env: Env,
  lead: LeadRow,
  actorName: string,
): Promise<{
  refunded: number;
  refundedCents: number;
  signups: number;
  pagesDeleted: boolean;
  notes: number;
}> {
  if (!isPayTest(lead))
    throw new HttpError(403, "Only the practice lead can be reset");
  // 1. Give trainees their dollar back.
  const paid = await env.DB.prepare(
    "SELECT id FROM signups WHERE lead_id = ? AND paid = 1",
  )
    .bind(lead.id)
    .all<{ id: string }>();
  let refunded = 0;
  let refundedCents = 0;
  for (const s of paid.results) {
    try {
      const r = await refundable(env, s.id);
      for (const c of r.charges) {
        if (c.refundableCents <= 0) continue;
        const out = await refundSignup(env, {
          signupId: s.id,
          chargeId: c.id,
          amountCents: c.refundableCents,
          cancelPlan: true,
          reason: "Practice run reset",
          actorName,
        });
        refunded++;
        refundedCents += out.refundedCents;
      }
    } catch {
      // A refund that fails (already refunded in Stripe, no customer) must not stop the reset; Stripe's dashboard is the backstop.
    }
  }
  // 2. Anything published comes down.
  let pagesDeleted = false;
  if (lead.pages_project) {
    try {
      await deleteProject(
        { accountId: env.CF_ACCOUNT_ID, token: env.CF_API_TOKEN },
        lead.pages_project,
      );
      pagesDeleted = true;
    } catch {
      pagesDeleted = false;
    }
  }
  // 3. Uploads from the board, the gallery and the tablet.
  let cursor: string | undefined;
  do {
    const list = await env.BUCKET.list({ prefix: `owner/${lead.id}/`, cursor });
    if (list.objects.length)
      await env.BUCKET.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  // 4. The paper trail of this run.
  const counts = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE lead_id = ?").bind(
      lead.id,
    ),
    env.DB.prepare(
      "SELECT COUNT(*) AS n FROM lead_notes WHERE lead_id = ?",
    ).bind(lead.id),
  ]);
  const signups =
    (counts[0]?.results?.[0] as { n: number } | undefined)?.n ?? 0;
  const notes = (counts[1]?.results?.[0] as { n: number } | undefined)?.n ?? 0;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM purchases WHERE lead_id = ?").bind(lead.id),
    env.DB.prepare("DELETE FROM signups WHERE lead_id = ?").bind(lead.id),
    env.DB.prepare("DELETE FROM lead_notes WHERE lead_id = ?").bind(lead.id),
    env.DB.prepare("DELETE FROM tasks WHERE lead_id = ?").bind(lead.id),
    env.DB.prepare(
      "UPDATE leads SET sales_status = 'new', status = 'ready', shown_at = NULL, follow_up = NULL, last_contact = NULL, contact = NULL, best_time = NULL, preview_opens = 0, preview_opened_at = NULL, live_url = NULL, pages_project = NULL, published_at = NULL, custom_domain = NULL, client_key = NULL, prices_dirty = 0, pitch_json = NULL, gbp_json = NULL, error = NULL, rewrite = 0 WHERE id = ?",
    ).bind(lead.id),
  ]);
  // 5. The site the way a trainee first sees it: no owner photos, fresh sample stock, scanning on, no staff PIN.
  const fresh = await getLead(env, lead.id);
  const record = fresh?.record_json
    ? (JSON.parse(fresh.record_json) as BusinessRecord)
    : null;
  if (fresh && record) {
    record.media.gallery = record.media.gallery.filter(
      (g) => g.source === "google",
    );
    if (record.media.hero && record.media.hero.source !== "google")
      record.media.hero = undefined;
    record.ext.retail = { ...(record.ext.retail ?? {}), priceList: undefined };
    addSampleStock(record);
    record.ext.retail!.priceList!.scanning = true;
    const copy = fresh.copy_json ? JSON.parse(fresh.copy_json) : null;
    if (copy) await renderPreview(env, fresh, record, copy, fresh.look ?? "");
  }
  return { refunded, refundedCents, signups, pagesDeleted, notes };
}
