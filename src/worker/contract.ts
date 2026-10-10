import type { PricedOrder } from "./checkout.ts";
import { addonPrice, defaultTerms, lateFeeOf, missingCoreTerms, money2, returnedFeeOf, type AddOn, type AppSettings, type PenaltySettings } from "./db.ts";

/**
 * Agreements built from exactly what's being bought: the main service agreement, the plan and way to pay, and the
 * terms for each extra (Settings → Extras → contract terms, else the standard terms below). The sign-up pages show
 * every section in a pop-up and hide the ones not picked; the server rebuilds the same text from the picks and stores
 * it with the signature. Plain-language starting points, not legal advice.
 */

const STANDARD_EXTRA_TERMS: Array<[RegExp, string]> = [
  [/order|book/i, "We connect the ordering or booking service you choose (such as Square, Toast, DoorDash, Calendly or Booksy) to your website. You keep your own account with that service and pay its fees directly. We aren't responsible for that service's outages, fees or policies. Switching to a different service later is quoted separately. You give us the access the service needs; if the service changes its embed or rules, a fix is quoted."],
  [/listed/i, "We create or update your listings on Apple Maps, Bing, Yelp, Facebook, Nextdoor and the BBB using the details you confirm. Some sites require you to verify by phone, mail or email, and you agree to help with that. Each site controls its own listings and reviews, so we can't guarantee approval, placement or reviews. Listings belong to you; we use your email and phone so you keep control. Duplicate or suspended listings are that site's decision; we'll appeal once."],
  [/google business/i, "We set up or tune up your Google Business Profile with the details and photos you approve. You stay the owner of the profile and add us as a manager. Google controls verification, rankings and reviews, so we can't guarantee them. Set-up depends on Google verifying your business, which we can't control or speed up; if Google refuses to verify, we refund half of this fee. We reply to reviews only with your written OK. You stay the owner and can remove us at any time."],
  [/photo/i, "We schedule one visit of about an hour at your business and deliver 20 to 30 edited photos. You own the photos and can use them anywhere. You're responsible for getting permission from anyone who appears in them. Please give 24 hours' notice to reschedule. A no-show or a reschedule with less than 24 hours' notice counts as the visit; a new visit is $99. Weather and illness: we reschedule free. Edited photos are delivered within 7 business days; no raw files. We may show them in our portfolio unless you say no."],
  [/spanish/i, "We add a Spanish page to your website, translated with AI and reviewed with you before it goes live. You confirm it's accurate for your business. Updates to the Spanish page are included with your plan's regular updates. As with your English text, you review and approve it and are responsible for it once approved."],
  [/hiring/i, "We add a \"We're hiring\" section with the jobs and application details you give us, and update it when your openings change. You're responsible for making sure your job listings follow employment laws."],
  [/rush|same-day/i, "Without this extra, your site goes live within 3 business days of your approval. With it, we put your site live the same business day we receive everything we need from you and your final approval, and within 24 hours at the latest. Approval received by noon Central on a business day counts for that day; later counts as the next business day. If we miss that window through our own fault, we refund this fee."],
  [/social/i, "Each month we write 8 to 12 Facebook and Instagram posts for your business. You approve each post before it goes up and are responsible for what you approve. You keep ownership of your Facebook and Instagram accounts and give us the access level you choose; we never post anything you haven't approved; Meta may remove or limit posts, which we don't control. Billed monthly, no partial-month refunds; cancel any time with 30 days' notice. We don't guarantee followers, reach or sales."],
  [/table|window/i, "We design and print a set of QR table tents and a window sign. You approve the design before printing. Printed items can't be refunded once printed unless we made the mistake; changes after printing are a new print at the current price."],
  [/cards|yard|door/i, "We give you a written price before any printing. Printing starts only after you approve the price and the proof. Printed items can't be refunded once printed unless we made the mistake."],
  [/logo/i, "We design a simple logo for your business with up to two rounds of changes. Once it's paid for, you own the final logo and can use it anywhere. We may show it in our portfolio unless you ask us not to. We don't do trademark searches, so check the name and mark before you use it widely. You get the logo as final files; the fonts in it are licensed to us, not supplied."],
  [/review card|nfc/i, "Each card is programmed to open your Google review page. Cards can't be returned once programmed unless they don't work; we replace a dead card free within 90 days. Cards work with phones that support NFC (most made since 2017). Google decides which reviews show; we never buy or write reviews."],
  [/changes/i, "For work beyond your plan's included updates, we tell you the price before we start. You're only charged for work you approve. Quotes are good for 30 days and are paid before or at delivery."],
  [/ads?\b|ad management/i, "We set up and manage your Google or Facebook ads and send a monthly report. You pay ad spend directly to Google or Meta; it isn't part of our fee. Billed monthly; cancel any time with 30 days' notice. Ad accounts are opened in your name and stay yours; you set the budget and pay the platform directly; we report spend, clicks and results monthly; ads stop when the fee stops. Platforms may reject or suspend ads or accounts; we'll appeal once. No one can guarantee leads, calls or sales from ads."],
];

const GENERIC_EXTRA_TERMS = "We provide this extra as described. One-time items are paid before work starts and aren't refundable once delivered unless we made the mistake. Monthly items are billed monthly and can be canceled any time with 30 days' notice.";

/** When the site goes live, in the agreement. GO_LIVE_TEXT (db.ts) is the short version shown on the buying pages. */
export const TIMING_TEXT = "Standard timing: your site goes live within 3 business days after you approve the final details. That is the timing included in every plan; finishing sooner is a bonus, not a promise. Same-day timing is a separate paid extra (Same-day build): with it, your site goes live the same business day you approve it, within 24 hours at the latest, and we refund that extra if we miss the window through our own fault. Approval received after noon Central counts as the next business day for the same-day window.";

/** Added to HOW YOU PAY when they pay against an invoice instead of online. */
/** How paying by invoice works (churches and anyone who asks), with the late fee from Settings. */
export function invoiceText(s: PenaltySettings): string {
  const fee = lateFeeOf(s);
  return `Paying by invoice: we email an invoice to your billing contact; nothing is charged online. Monthly invoices are due within 15 days, yearly invoices within 30 days.${fee ? ` If an invoice is 15 days overdue we add a $${fee % 1 ? fee.toFixed(2) : fee} late fee;` : " If an invoice is overdue,"} at 45 days we may take the site offline until it's paid; at 75 days we may end this agreement and the balance is due. You can switch to a card or bank account on file at any time. The person signing confirms they're authorized by the church or organization to make this purchase.`;
}

/** Heading for the core lines added when the owner's own service agreement doesn't say them. */
const ALSO_HEADING = "ALSO PART OF THIS AGREEMENT";

/** The terms for one extra: the owner's own wording from Settings, else the standard wording for that kind of extra. */
export function extraTerms(a: Pick<AddOn, "name" | "terms">): string {
  return a.terms?.trim() || STANDARD_EXTRA_TERMS.find(([re]) => re.test(a.name))?.[1] || GENERIC_EXTRA_TERMS;
}

export function esignClause(legal: string): string {
  return `By signing, you agree to do business with ${legal} electronically: your typed name and drawn signature are your legal signature, this agreement and our notices may be sent to you electronically, and you're authorized to sign for the business. You confirm you can open and keep a copy on your device, and you can ask us for a paper copy at any time.`;
}

/**
 * Recurring payment authorization: the words that let us charge the card or debit the bank account on file for the
 * plan, extras and anything owed (NACHA-style: identifies who may debit, what, when, how to revoke; card networks:
 * amount, frequency, how to cancel). Card and bank details themselves live only with Stripe. Not legal advice.
 */
export function paymentAuthText(s: PenaltySettings & { legalName?: string; companyName?: string }): string {
  const legal = s.legalName || s.companyName || "Underground Associates LLC";
  const ret = returnedFeeOf(s);
  return [
    `If you pay by card or bank account on file, you authorize ${legal} to charge that card (credit or debit) or to debit that bank account by ACH, through our payment processor (Stripe), for: your plan on its billing day each month or year; extras you approve; and amounts you owe under this agreement, including late fees, the reinstatement fee, the early cancellation fee and dispute or returned-payment fees.`,
    `Amounts change only when your plan or extras change or a fee under this agreement applies; we'll tell you at least 10 days before a charge that differs from your regular amount. This authorization stays in effect until you cancel it by texting or emailing us at least 3 business days before the next charge. Cancelling it doesn't end what you owe, and without a working payment method on file your plan may be suspended.`,
    `A bank debit that comes back unpaid may be retried once${ret ? ` and carries a ${money2(ret)} returned-payment fee` : ""}. You confirm you're authorized to use this payment method and that it belongs to your business or to you. We never see or store your full card or account numbers. You can ask us for a copy of this authorization at any time.`,
  ].join("\n");
}

export interface ContractInput {
  business: string;
  /** "signup" = plan + extras; "extras" = extras added to an existing client's agreement. */
  kind: "signup" | "extras";
}

function legalName(s: AppSettings): string {
  return s.legalName || s.companyName || "Underground Associates LLC";
}

function orderLines(order: PricedOrder): string[] {
  const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
  return [
    ...order.lines.map((l) => `- ${l.name}${l.qty > 1 ? ` x${l.qty}` : ""}: ${money(l.amount * l.qty)}${l.interval ? ` per ${l.interval}` : " one-time"}`),
    ...order.quotes.map((q) => `- ${q}: priced per job (we'll quote before any work)`),
    order.invoice
      ? `On your first invoice: ${money(order.dueToday)}${order.renews ? `. Then ${money(order.renews.amount)} per ${order.renews.interval}, invoiced.` : "."}`
      : `Due today: ${money(order.dueToday)}${order.renews ? `. Then ${money(order.renews.amount)} per ${order.renews.interval}, charged automatically.` : "."}`,
  ];
}

/** The service agreement text: the owner's own from Settings, else the default. */
function serviceTerms(s: AppSettings): { text: string; also: string[] } {
  const custom = s.terms?.trim();
  const text = custom || defaultTerms(s);
  return { text, also: missingCoreTerms(text, s) };
}

/** The exact agreement text stored with a signature. */
export function contractText(s: AppSettings, order: PricedOrder, o: ContractInput): string {
  const legal = legalName(s);
  const out: string[] = [];
  out.push(o.kind === "signup" ? `WEBSITE SERVICES AGREEMENT` : `EXTRAS AGREEMENT`);
  out.push(`Between ${legal} ("we") and ${o.business} ("you").`);
  out.push("", "YOUR ORDER", ...orderLines(order));
  if (o.kind === "signup") {
    if (order.plan) {
      const inc = order.plan.includes.split("\n").map((x) => x.trim()).filter(Boolean);
      out.push("", `YOUR PLAN: ${order.plan.name.toUpperCase()}`, `$${order.plan.monthly} a month. Includes:`, ...inc.map((x) => `- ${x}`));
    }
    if (order.option) out.push("", "HOW YOU PAY", `${order.option.label}: ${order.option.detail}${order.invoice ? `\n${invoiceText(s)}` : ""}`);
    out.push("", "PAYMENT AUTHORIZATION", paymentAuthText(s));
    out.push("", "TIMING", TIMING_TEXT);
    const terms = serviceTerms(s);
    out.push("", "SERVICE AGREEMENT", terms.text);
    if (terms.also.length) out.push("", ALSO_HEADING, ...terms.also);
  } else {
    out.push("", `These extras are added to your existing website service agreement with ${legal}, and its terms still apply.`);
    out.push("", "PAYMENT AUTHORIZATION", paymentAuthText(s));
  }
  const picked = order.extras.map((x) => x.name).concat(order.quotes);
  for (const name of picked) {
    const a = s.addons.find((x) => x.name === name);
    if (a) out.push("", `EXTRA: ${a.name.toUpperCase()} (${addonPrice(a)})`, extraTerms(a));
  }
  out.push("", "ELECTRONIC SIGNATURE", esignClause(legal));
  return out.join("\n");
}

/**
 * Every section of the agreement as HTML for the pop-up. Plan, way-to-pay and extra sections carry data-plan /
 * data-billing / data-extra so the page shows only what's picked. The order summary is filled in by the page.
 */
export function contractSectionsHtml(s: AppSettings, o: ContractInput & { esc: (t: string) => string }): string {
  const e = o.esc;
  const legal = legalName(s);
  const sec = (title: string, body: string, attr = "") => `<section class="ct"${attr}><h3>${e(title)}</h3>${body}</section>`;
  const para = (t: string) => t.split("\n").filter((x) => x.trim()).map((x) => `<p>${e(x)}</p>`).join("");
  const parts: string[] = [];
  parts.push(`<p class="ct-title"><strong>${o.kind === "signup" ? "Website Services Agreement" : "Extras Agreement"}</strong><br>Between ${e(legal)} (“we”) and <span data-business>${e(o.business)}</span> (“you”).</p>`);
  parts.push(sec("Your order", `<div data-order></div>`));
  if (o.kind === "signup") {
    for (const p of s.plans.filter((x) => x.monthly)) {
      const inc = p.includes.split("\n").map((x) => x.trim()).filter(Boolean);
      parts.push(sec(`Your plan: ${p.name}`, `<p>$${p.monthly} a month. Includes:</p><ul>${inc.map((x) => `<li>${e(x)}</li>`).join("")}</ul>`, ` data-plan="${p.id}"`));
    }
    parts.push(sec("How you pay", `<p data-billing-text></p><p data-invoice-text hidden>${e(invoiceText(s))}</p>`));
    parts.push(sec("Payment authorization", para(paymentAuthText(s))));
    parts.push(sec("Timing", para(TIMING_TEXT)));
    const terms = serviceTerms(s);
    parts.push(sec("Service agreement", para(terms.text)));
    if (terms.also.length) parts.push(sec("Also part of this agreement", para(terms.also.join("\n"))));
  } else {
    parts.push(`<p>These extras are added to your existing website service agreement with ${e(legal)}, and its terms still apply.</p>`);
    parts.push(sec("Payment authorization", para(paymentAuthText(s))));
  }
  s.addons.forEach((a, i) => parts.push(sec(`Extra: ${a.name} (${addonPrice(a)})`, para(extraTerms(a)), ` data-extra="${i}"`)));
  parts.push(sec("Electronic signature", para(esignClause(legal))));
  return parts.join("");
}
