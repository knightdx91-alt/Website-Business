import { shareToken } from "./auth.ts";
import { billingOptions, defaultTerms, getLead, getSettings, updateLead, type BillingOption, type Plan } from "./db.ts";
import { newId, now, type Env } from "./env.ts";
import { escHtml, page } from "./page.ts";

interface SignupRow {
  id: string;
  lead_id: string;
  plan_json: string;
  terms: string;
  signer_name: string;
  signer_title: string | null;
  signer_email: string | null;
  sent_by: string | null;
  paid: number;
  created_at: number;
}

/** What's stored with a signature: the plan as it was, plus the billing choice. */
export type SignedPlan = Omit<Plan, "payLink" | "payLinkFlex" | "payLinkAnnual"> & { billing?: string; billingLabel?: string; billingDetail?: string; monthlyEquivalent?: number };

export async function signupsFor(env: Env, leadId: string) {
  const rows = await env.DB.prepare("SELECT * FROM signups WHERE lead_id = ? ORDER BY created_at DESC").bind(leadId).all<SignupRow>();
  return rows.results.map((r) => ({
    id: r.id,
    plan: JSON.parse(r.plan_json) as SignedPlan,
    signerName: r.signer_name,
    signerTitle: r.signer_title,
    signerEmail: r.signer_email,
    sentBy: r.sent_by,
    paid: !!r.paid,
    createdAt: r.created_at,
  }));
}

function money(n: number): string {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function payUrl(option: BillingOption, leadId: string, email: string | null): string | null {
  if (!option.payLink) return null;
  const u = new URL(option.payLink);
  // Stripe Payment Links read these; Square ignores them.
  u.searchParams.set("client_reference_id", leadId);
  if (email) u.searchParams.set("prefilled_email", email);
  return u.toString();
}

function payBlock(option: BillingOption, leadId: string, email: string | null, settings: { companyName?: string; companyPhone?: string }): string {
  const url = payUrl(option, leadId, email);
  if (url) {
    return `<p>Last step: set up your payment. It's handled securely by our payment provider and charged automatically (${escHtml(option.detail)}).</p>
<a class="btn" href="${escHtml(url)}" rel="noopener">Set up payment</a>`;
  }
  return `<p>We'll send you an invoice shortly for ${escHtml(option.detail)}${settings.companyPhone ? `. Questions? Call ${escHtml(settings.companyPhone)}` : ""}.</p>`;
}

/** The page a business owner opens from a sign-up link: plan, terms, typed-name acceptance, then payment. */
export async function serveSignup(env: Env, req: Request, leadId: string, planId: string, origin: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const settings = await getSettings(env);
  const brand = settings.companyName || "Website sign-up";
  const plan = settings.plans.find((p) => p.id === planId);
  if (!lead || lead.status === "expired" || !plan) {
    return page("Link not available", `<div class="wrap"><div class="card"><h1>This sign-up link isn't available</h1><p>Please ask us for a new one${settings.companyPhone ? ` at ${escHtml(settings.companyPhone)}` : ""}.</p></div></div>`, { brand, status: 410 });
  }
  const business = lead.name ?? "your business";
  const terms = settings.terms || defaultTerms(settings);
  const options = billingOptions(plan, settings);

  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const name = String(form?.get("name") ?? "").trim().slice(0, 100);
    const title = String(form?.get("title") ?? "").trim().slice(0, 60);
    const email = String(form?.get("email") ?? "").trim().slice(0, 120);
    const agreed = form?.get("agree") === "yes";
    const option = options.find((o) => o.id === form?.get("billing")) ?? options[0]!;
    if (!name || !agreed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return page("Sign up", `<div class="wrap"><div class="card"><p>Please type your name and email and tick the box to agree. <a href="">Go back</a></p></div></div>`, { brand, status: 400 });
    }
    const sent = await env.DB.prepare("SELECT author FROM lead_notes WHERE lead_id = ? AND outcome = 'signup_sent' ORDER BY created_at DESC LIMIT 1").bind(leadId).first<{ author: string }>();
    const { payLink: _a, payLinkFlex: _b, payLinkAnnual: _c, ...rest } = plan;
    const planSnapshot: SignedPlan = { ...rest, billing: option.id, billingLabel: option.label, billingDetail: option.detail, monthlyEquivalent: option.monthlyEquivalent };
    await env.DB.prepare(
      "INSERT INTO signups (id, lead_id, plan_json, terms, signer_name, signer_title, signer_email, sent_by, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(newId(), leadId, JSON.stringify(planSnapshot), terms, name, title || null, email, sent?.author ?? null, req.headers.get("cf-connecting-ip"), (req.headers.get("user-agent") ?? "").slice(0, 300), now())
      .run();
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, 'signed', ?, ?)")
      .bind(newId(), leadId, name, `Signed up for ${plan.name}, ${option.label}: ${option.detail}${title ? `. Signed as ${title}` : ""}. Email: ${email}`, now())
      .run();
    await updateLead(env, leadId, { sales_status: lead.sales_status === "live" ? "live" : "sold", follow_up: null, last_contact: now() });
    return page(
      "Thank you",
      `<div class="wrap"><div class="card"><h1>Thank you, ${escHtml(name.split(" ")[0])}!</h1>
<p class="ok">You're signed up for the ${escHtml(plan.name)} plan (${escHtml(option.label.toLowerCase())}) for ${escHtml(business)}.</p>
${payBlock(option, leadId, email, settings)}
<p class="small muted" style="margin-top:16px">Next, we'll go over your photos, hours and details with you before anything goes live.</p></div></div>`,
      { brand },
    );
  }

  const already = await env.DB.prepare("SELECT signer_name, signer_email, plan_json, created_at FROM signups WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(leadId)
    .first<{ signer_name: string; signer_email: string | null; plan_json: string; created_at: number }>();
  const alreadyOption = already ? (options.find((o) => o.id === (JSON.parse(already.plan_json) as SignedPlan).billing) ?? options[0]!) : null;
  const includes = plan.includes
    .split(/\n|,|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  const preview = lead.status === "ready" ? `${origin}/s/${await shareToken(env, leadId, 30)}/` : null;
  const body = `<div class="wrap">
<div class="card"><p class="muted small" style="margin:0">Website plan for</p><h1>${escHtml(business)}</h1>
${preview ? `<a class="btn btn--ghost" href="${escHtml(preview)}" target="_blank" rel="noopener">See your website preview</a>` : ""}</div>
<div class="card"><h2>${escHtml(plan.name)} plan</h2>
<p class="price">${money(plan.monthly)}<span class="small muted" style="font-weight:400"> / month</span></p>
${includes.length ? `<ul>${includes.map((i) => `<li>${escHtml(i)}</li>`).join("")}</ul>` : ""}</div>
${already && alreadyOption ? `<div class="card"><p class="ok">Signed by ${escHtml(already.signer_name)} on ${new Date(already.created_at).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric", year: "numeric" })}.</p>${payBlock(alreadyOption, leadId, already.signer_email, settings)}</div>` : ""}
<div class="card"><h2>The agreement</h2><div class="terms">${escHtml(terms)}</div></div>
<form class="card" method="post"><h2>${already ? "Sign again" : "Sign up"}</h2>
<fieldset class="billing"><legend>How would you like to pay?</legend>
${options.map((o, i) => `<label class="opt"><input type="radio" name="billing" value="${o.id}"${i === 0 ? " checked" : ""}><span><strong>${escHtml(o.label)}</strong><br><span class="small muted">${escHtml(o.detail)}</span></span></label>`).join("")}
</fieldset>
${settings.addons.length ? `<p class="small muted">Optional extras, just ask: ${settings.addons.map((a) => `${escHtml(a.name)} (${money(a.price)}${a.unit === "month" ? "/month" : a.unit === "each" ? " each" : " one-time"})`).join(" · ")}</p>` : ""}
<label>Your full name<input type="text" name="name" autocomplete="name" required maxlength="100"></label>
<label>Your title <span class="muted small" style="font-weight:400">(optional)</span><input type="text" name="title" placeholder="Owner" maxlength="60"></label>
<label>Email for receipts<input type="email" name="email" autocomplete="email" required maxlength="120"></label>
<label class="check"><input type="checkbox" name="agree" value="yes" required> I'm authorized to sign for ${escHtml(business)}, and I agree to the plan and agreement above. Typing my name counts as my signature.</label>
<button class="btn" type="submit">Accept and continue</button>
<p class="small muted" style="margin-bottom:0">${escHtml(settings.legalName || settings.companyName || "")}${settings.companyPhone ? ` · ${escHtml(settings.companyPhone)}` : ""}${settings.companyEmail ? ` · ${escHtml(settings.companyEmail)}` : ""}</p>
</form></div>`;
  return page(`Sign up: ${business}`, body, { brand });
}
