import { actions, type ActionId } from "../actions.ts";
import { about, cardGrid, contactForm, ctaBand, faq, gallery, hero, infoStrip, reviews, sectionHead, steps, todo, visit, type Ctx } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, raw, type Raw } from "../html.ts";
import type { BusinessRecord, Faq, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

/**
 * Tax preparers, accountants and bookkeepers, independent insurance agencies and financial advisors.
 * research/tax-finance.md: §10 for variants, §5.1-5.6 for what each variant must confirm before publishing,
 * §8 for what the AI may never claim. Not legal advice; the owner (and an advisor's compliance department) confirms.
 */

/** Banks, lenders, pawn, payday, captive agents and franchise tax offices are not ours (§10 exclusions). */
const EXCLUDE_TYPES = /^(bank|atm|local_government_office|government_office|lawyer|real_estate_agency)$/;
const EXCLUDE_NAME =
  /\b(bank|credit union|federal credit|savings|mortgage|home loans?|lending|lenders?|loans?|payday|cash (advance|express|master|solutions)|title (loans?|pawns?)|check cashing|pawn|credit)\b/;
export const FINANCE_CHAINS = [
  "h&r block", "h & r block", "jackson hewitt", "liberty tax", "state farm", "allstate", "farmers insurance", "alfa insurance", "alfa ", "country financial",
  "nationwide", "shelter insurance", "farm bureau", "american family", "globe life", "liberty national", "transamerica", "world financial group",
  "primerica", "edward jones", "raymond james", "ameriprise", "northwestern mutual", "new york life", "massmutual", "thrivent", "modern woodmen",
  "woodmenlife", "kemper", "direct auto", "acceptance insurance", "freeway insurance", "geico", "progressive", "aflac", "regions", "wells fargo",
  "merrill", "morgan stanley", "stifel", "truist",
];

/** §10 assignment, first match wins. null = not this pack (excluded or not a finance office). */
export function financeVariant(primaryType: string | undefined, types: string[], name: string): string | null {
  const all = [primaryType ?? "", ...types].filter(Boolean);
  const n = name.toLowerCase().replace(/[’‘]/g, "'");
  if (all.some((t) => EXCLUDE_TYPES.test(t))) return null;
  if (EXCLUDE_NAME.test(n)) return null;
  if (FINANCE_CHAINS.some((c) => n.includes(c))) return null;
  const onlyFinance = all.includes("finance") && !all.some((t) => /^(accounting|consultant|insurance_agency)$/.test(t));
  if (onlyFinance && /\bfinanc(e|ial services)\b/.test(n)) return null;
  const cpa = /\bc\.?p\.?a\.?s?\b|certified public/.test(n);
  if (!cpa && /\b(tax(es)?|income tax|impuestos|e-?file|refunds?)\b/.test(n)) return "tax_prep";
  if (cpa || primaryType === "accounting" || /\b(accounting|accountants?|bookkeep\w*|books|payroll|ledger)\b/.test(n)) return "accounting";
  if (all.includes("insurance_agency") || /\b(insurance|insurors|seguros|medicare|underwriters)\b/.test(n)) return "insurance";
  if ((all.includes("consultant") && all.includes("finance") && !all.includes("accounting")) || /\b(wealth|financial (planning|planners?|advisors?|group|strategies|partners)|retirement|invest\w*|capital management|asset management|advis(ors?|ory)|fiduciary)\b/.test(n)) return "financial_advisor";
  if (all.includes("accounting")) return "tax_prep";
  return null;
}

/** Secondary lines a multiservice office offers, from its name ("Economy Tax & Insurance"). */
export function financeAlsoOffers(variant: string, name: string): string[] {
  const n = name.toLowerCase();
  const out: string[] = [];
  if (variant !== "insurance" && /\b(insurance|seguros)\b/.test(n)) out.push("insurance");
  if (variant !== "tax_prep" && /\b(tax(es)?|impuestos)\b/.test(n)) out.push("tax_prep");
  if (variant !== "accounting" && /\b(bookkeep\w*|books)\b/.test(n)) out.push("bookkeeping");
  if (/\bpayroll\b/.test(n) && variant !== "accounting") out.push("payroll");
  if (/\bnotar/.test(n)) out.push("notary");
  if (/\b(translat|traduc)/.test(n)) out.push("translation");
  return out;
}

const LABEL: Record<string, string> = {
  tax_prep: "Tax Preparation",
  accounting: "Accounting & Bookkeeping",
  insurance: "Insurance Agency",
  financial_advisor: "Financial Planning",
};

const SEEDS: Record<string, string[]> = {
  tax_prep: ["Individual tax returns", "Self-employed & 1099 returns", "Small business returns", "Prior-year & amended returns", "Bookkeeping", "Payroll"],
  accounting: ["Monthly bookkeeping", "Payroll", "Business tax returns", "Individual tax returns", "QuickBooks setup & help", "Tax planning for businesses"],
  insurance: ["Auto", "Home", "Life", "Business", "Farm & ranch", "Boat, motorcycle & RV"],
  financial_advisor: ["Financial planning", "Retirement planning", "Retirement income", "Investment management", "Insurance & annuities", "Working with your estate attorney"],
};
const EXTRA_SEED: Record<string, string> = { insurance: "Insurance", tax_prep: "Tax preparation", bookkeeping: "Bookkeeping", payroll: "Payroll", notary: "Notary public", translation: "Translation" };

const slug = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function seedFinanceServices(variant: string, alsoOffers: string[] = []): Service[] {
  const names = [...(SEEDS[variant] ?? SEEDS.tax_prep!)];
  for (const x of alsoOffers) {
    const label = EXTRA_SEED[x];
    if (label && !names.some((s) => s.toLowerCase().includes(label.toLowerCase()))) names.push(label);
  }
  return names.map((name) => ({ id: slug(name), name, featured: true }));
}

/** Template checklist for /what-to-bring/ (§8). The owner edits it; it never states limits, credits or deadlines. */
export const DEFAULT_WHAT_TO_BRING = [
  "Photo ID",
  "Social Security cards or ITIN letters for everyone on the return",
  "All W-2s and 1099s (1099-NEC, -K, -INT, -DIV, -R, -G and SSA-1099)",
  "Last year's tax return",
  "Form 1095-A if you had Marketplace health coverage",
  "Form 1098 mortgage interest and property tax records",
  "Form 1098-T and education expenses",
  "Child care provider's name, address and tax ID",
  "Records of estimated tax payments",
  "Business income and expense records if you're self-employed",
  "Bank routing and account number for direct deposit",
  "Your IRS Identity Protection PIN, if you have one",
];

const STEPS: Record<string, Array<{ title: string; body: string }>> = {
  tax_prep: [
    { title: "Call or stop by", body: "Set up a time, or ask about dropping off your paperwork." },
    { title: "Bring your documents", body: "Use our what-to-bring list so nothing gets missed." },
    { title: "We prepare your return", body: "We go over it with you and answer your questions." },
    { title: "Sign and file", body: "You review it, sign, and we file it for you." },
  ],
  accounting: [
    { title: "A first conversation", body: "Tell us about your business and what you need help with." },
    { title: "Send your records", body: "We set up a simple way to get your paperwork to us." },
    { title: "We keep it current", body: "Books, payroll and filings handled on a regular schedule." },
    { title: "Questions anytime", body: "Call us when something comes up during the year." },
  ],
  insurance: [
    { title: "Tell us what you need", body: "Call or send a quick request with the coverage you're after." },
    { title: "We compare options", body: "We look at what fits you and explain it in plain words." },
    { title: "You choose", body: "Pick the coverage that makes sense, with no pressure." },
    { title: "We're here after", body: "Call us for changes, questions or help with a claim." },
  ],
  financial_advisor: [
    { title: "A first conversation", body: "We talk about where you are and what matters to you." },
    { title: "Gather the picture", body: "We look at your accounts, goals and timeline together." },
    { title: "A plan you understand", body: "We walk through options in plain words." },
    { title: "Check in over time", body: "We meet as life changes to keep things on track." },
  ],
};

const MODE_LABEL: Record<string, string> = { drop_off: "Drop-off", in_person: "In person", virtual: "Virtual" };

export const isAdvisor = (r: BusinessRecord) => r.category === "finance" && r.variant === "financial_advisor";
/** "CPA" anywhere (name or credentials) needs the Alabama firm permit confirmed (§5.3). */
export const mentionsCpa = (r: BusinessRecord) => /\bc\.?p\.?a\.?s?\b|certified public/i.test(`${r.name} ${r.ext.finance?.credentials ?? ""}`);

function first(r: BusinessRecord): ActionId[] {
  const book = !!r.links.booking;
  if (r.variant === "insurance") return ["call", "quote"];
  if (r.variant === "financial_advisor") return book ? ["call", "book"] : ["call", "quote"];
  if (r.variant === "accounting") return book ? ["book", "call"] : ["call", "quote"];
  return book ? ["book", "call"] : ["call", "directions"];
}

function trust(r: BusinessRecord): string[] {
  const f = r.ext.finance ?? {};
  const out: string[] = [];
  if (f.credentials && f.credentialsConfirmed) out.push(f.credentials);
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (r.variant === "insurance" && f.independent) out.push("Independent agency");
  if (f.spanish) out.push("Se habla español");
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  else if (r.ownershipTags.includes("locally_owned")) out.push("Locally owned");
  return out.slice(0, 4);
}

function dataFaq(ctx: Ctx): Faq[] {
  const r = ctx.r;
  const f = r.ext.finance ?? {};
  const out: Faq[] = [];
  if (r.variant === "tax_prep") {
    out.push({ q: "What should I bring?", a: "Our what-to-bring list covers the usual paperwork. If you're not sure about something, bring it or give us a call." });
    if (f.modes?.includes("drop_off")) out.push({ q: "Can I drop off my paperwork?", a: "Yes. Call ahead and we'll tell you how drop-off works." });
    if (f.offSeason) out.push({ q: "Are you open after tax season?", a: f.offSeason });
  }
  if (r.variant === "insurance") {
    if (f.carriers?.length) out.push({ q: "Which companies do you work with?", a: `We work with ${f.carriers.join(", ")}. Call us and we'll help you compare.` });
    out.push({ q: "What do I need for a quote?", a: "Your name, address and the coverage you want. For auto, the drivers and vehicles. Call or send a request and we'll take it from there." });
  }
  if (r.variant === "financial_advisor" && f.brokercheckUrl) out.push({ q: "Where can I check your background?", a: "Anyone can look up a financial professional's background on FINRA BrokerCheck. The link is on our disclosures page." });
  if (f.portalUrl) out.push({ q: "How do I send documents?", a: "Use our secure client portal. Please don't email tax documents or send them through the contact form." });
  if (f.spanish) out.push({ q: "¿Hablan español?", a: "Sí. Llámenos y con gusto le ayudamos en español." });
  return out;
}

export const financePack: CategoryPack = {
  id: "finance",
  label: "Tax & finance",
  titleMode: "service",
  locationModel: "storefront",
  hasForm: () => true,
  looks: [],
  defaultLook: (r) => (r.variant === "financial_advisor" ? "finance.long_view" : r.variant === "insurance" ? "finance.main_street_agency" : r.variant === "accounting" || mentionsCpa(r) ? "finance.ledger_linen" : "finance.bright_desk"),
  variantLabel: (r) => (r.variant === "insurance" && !r.ext.finance?.independent ? "Insurance Agency" : LABEL[r.variant] ?? "Tax & Finance"),
  schemaType: (r) => ({ tax_prep: "AccountingService", accounting: "AccountingService", insurance: "InsuranceAgency", financial_advisor: "FinancialService" } as Record<string, string>)[r.variant] ?? "FinancialService",
  schemaExtras: () => ({}),
  homeTitle(r) {
    const l = r.variant === "insurance" ? "Insurance" : LABEL[r.variant] ?? "Tax & Finance";
    return fitTitle([`${l} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${l} in ${r.address.city} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => [
    { label: "Services", href: "/#services" },
    ...(ctx.r.variant === "tax_prep" ? [{ label: "What to bring", href: "/what-to-bring/" }] : []),
    { label: "About", href: "/#about" },
    ...(isAdvisor(ctx.r) ? [{ label: "Disclosures", href: "/disclosures/" }] : [{ label: "Reviews", href: "/#reviews" }]),
    { label: "Hours & location", href: "/#visit" },
    { label: "Contact", href: "/#contact" },
  ],
  actionBar: (ctx) => {
    const r = ctx.r;
    const ids: ActionId[] = [...first(r), ...(r.ext.finance?.portalUrl ? (["portal"] as ActionId[]) : r.variant === "insurance" ? (["text"] as ActionId[]) : (["directions"] as ActionId[]))];
    return actions(r, [...new Set(ids)]).slice(0, 3);
  },
  homeFaq: (ctx) => [...dataFaq(ctx), ...ctx.copy.faq].slice(0, 6),
  reviewsAllowed: (r) => !isAdvisor(r),
  bannedPhrases: (r) => financeBannedPhrases(r),
  footerNote: (ctx) => financeFooter(ctx),
  home(ctx: Ctx) {
    const r = ctx.r;
    const f = r.ext.finance ?? {};
    const label = r.variant === "insurance" ? (f.independent ? "Independent insurance agency" : "Insurance agency") : LABEL[r.variant] ?? "Tax & finance";
    const chips = [...(f.modes ?? []).map((m) => MODE_LABEL[m]).filter((x): x is string => !!x), ...(f.spanish ? ["Se habla español"] : [])];
    const tools = actions(r, ["portal", "book"]);
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${r.variant === "insurance" ? "Insurance" : label} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trust(r),
      showStatus: hasAnyHours(r.hours),
      actions: actions(r, first(r)),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
    })}
${infoStrip(ctx, chips)}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">${label}</span><h2 class="section__title" id="services-title">${r.variant === "insurance" ? "Coverage we can help with" : "How we can help"}</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${cardGrid(r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id] })))}
${r.confirmed.includes("services") ? "" : todo(ctx, "Tick the services you offer", "We started with the usual list for an office like yours. Tell us what to keep, remove or add.", true)}
</div></section>
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
${sectionHead("How it works", r.variant === "tax_prep" ? "Getting your taxes done" : r.variant === "insurance" ? "Getting the right coverage" : "Working with us")}
${steps(ctx.copy.steps?.length ? ctx.copy.steps : STEPS[r.variant] ?? STEPS.tax_prep!)}
<div class="btns">${r.variant === "tax_prep" ? html`<a class="btn btn--secondary" href="/what-to-bring/"><span>See what to bring</span></a>` : ""}${tools.map((a) => html`<a class="btn btn--ghost" href="${a.href}" target="_blank" rel="noopener"><span>${a.label}</span><span class="sr"> (opens in new tab)</span></a>`)}</div>
${r.variant === "tax_prep" && !f.offSeason ? todo(ctx, "Your hours after tax season", "Tell us your hours from mid-April through December (or “by appointment”) and we'll show both on the site.") : ""}
${r.variant !== "insurance" && !f.portalUrl ? todo(ctx, "Do you use a client portal?", "If clients upload documents through a portal (TaxDome, SmartVault, ShareFile, Canopy or similar), send us the link and we'll add an Upload your documents button.") : ""}
</div></section>
${r.variant === "insurance" ? insuranceBand(ctx) : ""}
${gallery(ctx, "Send photos of your office", "A photo of your front door and one of you or your team. People like to see who they'll be talking to about their money.")}
${isAdvisor(r) ? "" : reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${visit(ctx, "Visit our office")}
${faq([...dataFaq(ctx), ...ctx.copy.faq].slice(0, 6), true)}
${contactForm(ctx, r.services.map((s) => s.name), [], [], "Leave your name and number and we'll call you back. Please don't send tax documents, Social Security numbers or account numbers through this form.")}
${ctaBand(ctx, actions(r, first(r)))}
${requiredChecks(ctx)}
</main>`;
  },
  pages(ctx) {
    const r = ctx.r;
    const out = [];
    if (r.variant === "tax_prep") {
      const items = r.ext.finance?.whatToBring?.length ? r.ext.finance.whatToBring : DEFAULT_WHAT_TO_BRING;
      out.push({
        path: "/what-to-bring/",
        title: fitTitle([`What to bring for your tax appointment | ${r.name}`, `What to bring | ${r.name}`]),
        description: `A checklist of what to bring to your tax appointment at ${r.name} in ${r.address.city}, ${r.address.state}. Not sure about something? Call us.`.slice(0, 155),
        crumb: "What to bring",
        body: html`<main id="main" class="section"><div class="wrap narrow">
<span class="section__label">Tax appointment</span><h1>What to bring</h1>
<p class="lead">Bring what applies to you. If you're not sure about something, bring it anyway or give us a call at <a href="tel:${r.phone.e164}">${r.phone.display}</a>.</p>
<ul class="checklist">${items.map((i) => html`<li>${i}</li>`)}</ul>
${r.ext.finance?.whatToBring?.length ? "" : todo(ctx, "Check the what-to-bring list", "This is the usual list for a tax office. Tell us anything to add or remove for your clients.")}
<div class="btns"><a class="btn btn--primary" href="tel:${r.phone.e164}"><span>Call ${r.phone.display}</span></a></div>
</div></main>`,
      });
    }
    if (isAdvisor(r)) {
      const f = r.ext.finance ?? {};
      out.push({
        path: "/disclosures/",
        title: fitTitle([`Disclosures | ${r.name}`]),
        description: `Important disclosures for ${r.name} in ${r.address.city}, ${r.address.state}, including where to look up our registration and background.`.slice(0, 155),
        crumb: "Disclosures",
        body: html`<main id="main" class="section"><div class="wrap narrow">
<h1>Disclosures</h1>
${f.disclosure ? html`<div class="disclosure">${f.disclosure.split(/\n+/).map((p) => html`<p>${p}</p>`)}</div>` : todo(ctx, "Paste your firm's disclosure text", "Copy it word for word from your firm (for example “Securities offered through …, Member FINRA/SIPC”). We show it exactly as written on every page.", true)}
<ul class="list">${f.brokercheckUrl ? html`<li><a href="${f.brokercheckUrl}" target="_blank" rel="noopener">Check the background of this financial professional on FINRA's BrokerCheck<span class="sr"> (opens in new tab)</span></a></li>` : ""}${f.crsUrl ? html`<li><a href="${f.crsUrl}" target="_blank" rel="noopener">Form CRS (client relationship summary)<span class="sr"> (opens in new tab)</span></a></li>` : ""}</ul>
${f.brokercheckUrl || f.crsUrl ? "" : todo(ctx, "Add your BrokerCheck and Form CRS links", "Broker-dealer representatives need a BrokerCheck link, and most advisors need their Form CRS linked. Send us the links your firm uses.", true)}
</div></main>`,
      });
    }
    return out;
  },
  copyBrief: (r) => ({
    voice: `${
      { tax_prep: "Friendly, plain and reassuring", accounting: "Steady, organized and small-business focused", insurance: "Neighborly and practical, about protecting what people have, never fear-based", financial_advisor: "Calm, plain and educational, with no promises" }[r.variant] ?? "Friendly and plain"
    }. 6th-8th grade reading level, short sentences, name the town. Never claim or invent: credentials or titles (CPA, enrolled agent, CFP, licensed, certified, registered, bonded), "IRS-approved" or e-file wording, years in business, numbers of clients or carriers, refund size or speed ("maximum", "fast", "guaranteed" refunds), avoiding audits, rates or savings ("lowest", "cheapest", "affordable", "save"), carrier names, "free", "fiduciary", "fee-only", "independent", "wealth management", any tax, insurance or investment advice or tax-law facts (deductions, limits, deadlines), predictions or performance, "notario" or immigration services. Describe services, not outcomes.`,
    fields: {
      heroTagline: `One sentence (12-22 words) introducing the services list: what kind of help the office gives people and businesses around ${r.address.city}. No outcomes or claims.`,
      heroSub: "One line (12-22 words) under the headline: who they help, built only from the facts given. No superlatives, no promises.",
      serviceBlurbs: "For each service id, one line (8-16 words) describing the service in plain words. Never outcomes (bigger refund, savings, lower rates), never prices.",
      faq: "4-5 questions people ask about working with this office (appointments, how it works, what happens next) with short answers (30-60 words) about the office only. Never answer tax, insurance or investment questions, never state deadlines, rules, limits or prices. End with an invitation to call when specifics are needed.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a warm, true introduction to the office (what it does, who it helps, where) without inventing history, people, credentials or years.",
      cta: "ctaTitle: 3-6 words inviting them to call. ctaLine: one sentence, at most 16 words, no promises.",
      metaDescription: "140-155 characters: service + town + what they help with in general + an action (call). No claims.",
    },
  }),
};

/** Coverage band for insurance: who they work with (owner's list only) and the Medicare disclaimer when it applies. */
function insuranceBand(ctx: Ctx): Raw {
  const f = ctx.r.ext.finance ?? {};
  return html`<section class="section" id="companies" aria-labelledby="companies-title"><div class="wrap narrow">
${sectionHead(f.independent ? "Independent agency" : "Our agency", f.independent ? "We shop more than one company for you" : "Help from people you know", f.carriers?.length ? `Companies we work with: ${f.carriers.join(", ")}.` : undefined)}
${f.carriers?.length ? "" : todo(ctx, "Which companies do you work with?", "Send us the list of insurance companies you're appointed with. We list them by name only (no logos unless the company allows it).")}
${f.medicare ? (f.tpmoDisclaimer ? html`<p class="disclosure">${f.tpmoDisclaimer}</p>` : "") : ""}
</div></section>`;
}

/**
 * Required confirmations (§5.1 publish gate). Each one is a required to-do until the owner confirms it in Edit,
 * so nothing goes live before the owner (or an advisor's compliance department) has checked it.
 */
function requiredChecks(ctx: Ctx): Raw {
  const r = ctx.r;
  const f = r.ext.finance ?? {};
  const out: Raw[] = [];
  if (f.credentials && !f.credentialsConfirmed) out.push(todo(ctx, "Confirm your credentials", "Check the credentials line (for example “Enrolled Agent”) is exactly right for each person named. We never add titles you didn't give us.", true));
  if (r.variant === "tax_prep" && !f.ptinConfirmed) out.push(todo(ctx, "Confirm every paid preparer has a current PTIN", "The IRS requires one for anyone paid to prepare returns. It doesn't go on the site; we just need your OK.", true));
  if (mentionsCpa(r) && !f.cpaPermitConfirmed) out.push(todo(ctx, "Confirm your Alabama CPA firm permit", "Using “CPA” in your name or titles needs a firm permit from the Alabama State Board of Public Accountancy. Confirm you have one (the permit number can go in the footer).", true));
  if (r.variant === "insurance" && !f.licensesConfirmed) out.push(todo(ctx, "Confirm your agents are licensed", "Confirm each agent named on the site holds an Alabama producer license for the coverage shown.", true));
  if (r.variant === "insurance" && f.medicare && !f.tpmoDisclaimer) out.push(todo(ctx, "Paste the Medicare disclaimer", "Agencies selling Medicare Advantage or Part D plans must show the CMS disclaimer. Paste the current wording from your carrier or FMO, with your numbers.", true));
  if (isAdvisor(r)) {
    if (!f.disclosure) out.push(todo(ctx, "Paste your firm's disclosure text", "Word for word from your firm. It shows in the footer of every page.", true));
    if (!f.complianceApprovedBy || !f.complianceApprovedOn) out.push(todo(ctx, "Get your compliance department's approval", "Most firms must approve a website before it goes live. Send them the preview link, then tell us who approved it and when.", true));
  }
  if (!out.length) return raw("");
  return html`<section class="section" aria-label="Before this site can go live"><div class="wrap narrow">${out}</div></section>`;
}

/** Footer lines that must be on every page: credentials, e-file line, CPA permit, licenses, advisor disclosure. */
function financeFooter(ctx: Ctx): Raw {
  const r = ctx.r;
  const f = r.ext.finance ?? {};
  const lines: string[] = [];
  if (f.credentials && f.credentialsConfirmed) lines.push(f.credentials);
  if (r.variant === "tax_prep" && f.efileProvider) lines.push("Authorized IRS e-file Provider");
  if (f.cpaPermitConfirmed && f.cpaPermitNo) lines.push(`Alabama CPA firm permit #${f.cpaPermitNo}`);
  if (f.licenseNo) lines.push(`License #${f.licenseNo}`);
  const disclosure = isAdvisor(r) && f.disclosure ? f.disclosure : "";
  if (!lines.length && !disclosure && !(isAdvisor(r) && f.brokercheckUrl)) return raw("");
  return html`<div class="ftr__note">${lines.length ? html`<p>${lines.join(" · ")}</p>` : ""}${disclosure ? disclosure.split(/\n+/).map((p) => html`<p>${p}</p>`) : ""}${
    isAdvisor(r) && f.brokercheckUrl ? html`<p>Check the background of this financial professional on <a href="${f.brokercheckUrl}" target="_blank" rel="noopener">FINRA's BrokerCheck<span class="sr"> (opens in new tab)</span></a>. <a href="/disclosures/">Disclosures</a></p>` : ""
  }</div>`;
}

/** Phrases the AI copy may never use for this category (§8). Owner-entered fields render separately and aren't checked here. */
export function financeBannedPhrases(r: BusinessRecord): RegExp[] {
  const out = [
    /\b(certified|licensed|registered|bonded|enrolled agents?|c\.?p\.?a\.?s?|cfp|chfc|clu)\b/i,
    /\birs[- ](approved|endorsed|certified|authorized)\b|\be-?file provider\b/i,
    /\b(max(imum)?|biggest|bigger|largest|guaranteed|fast(er|est)?|quick(er|est)?|same[- ]day|instant)\s+refunds?\b|\bmaximi[sz]e (your )?refund/i,
    /\brefund (advance|transfer|anticipation)|\baudit[- ]proof\b|\bavoid (an |any )?audits?\b|\bevery deduction\b/i,
    /\b(lowest|cheapest|best|affordable|low|great|competitive) (rates?|prices?|premiums?)\b|\bsave (up to|\$|\d)|\$0 premium/i,
    /\bguarantee/i,
    /\bfree\b/i,
    /\b(fiduciary|fee-only|unbiased|conflict-free|wealth management)\b/i,
    /\b(notario|abogado|lawyer|legal advice|immigration)\b/i,
    /\b(protect your (savings|principal|nest egg)|guaranteed income|returns? on|outperform)\b/i,
  ];
  if (!(r.variant === "insurance" && r.ext.finance?.independent)) out.push(/\bindependent\b/i);
  return out;
}
