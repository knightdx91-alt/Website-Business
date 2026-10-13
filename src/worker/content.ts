import { addonPrice, type AddOn, type AppSettings, type Plan } from "./db.ts";

/**
 * The sales copy the Plans & answers, Show plans and In-person guide screens show, as plain data, so the native
 * Android app can fetch it (`GET /api/content`) instead of carrying its own copy. The web app keeps its own copy of
 * every string in app/public/app.js (PLAN_TAGLINE, PLAN_PITCH, playbookObjections, WALKIN_TIMING, walkinObjections,
 * OFFER_HINT, FOLLOW_UPS…); test/worker/content.test.ts checks the two never drift apart.
 *
 * Placeholders: where app.js uses a function of (greeting, name, url) or of the settings, the string here carries
 * `{greeting}`, `{name}`, `{url}` or `{price}`, filled by the app (follow-up texts, walk-in objections) or by
 * `playbookObjections()` / `payWays()` below (the playbook, filled on the server from Settings).
 */

// ---- plans (Show plans + Plans & answers) ----

/** Customer-facing words for each tier; prices and "what's included" come live from Settings. */
export const PLAN_TAGLINE: Record<string, string> = {
  basic: "Get found on Google and get the phone ringing.",
  plus: "Your website, plus getting found on Google Maps.",
  pro: "Everything handled for you, every month.",
  list: "Just the prices: a live price page, QR tags, a tablet and your board. Not a website.",
};

export const EVERY_PLAN = [
  "We build it for you",
  "Fast, secure hosting",
  "Changes when you text us",
  "Made for phones",
  "A live price list with QR tags and a tablet display, if your stock changes",
  "Your name, photos and words stay yours",
];

export interface PlanPitch {
  fit: string;
  points: string[];
  line: string;
}

/** Selling points by plan tier (callers). */
export const PLAN_PITCH: Record<string, PlanPitch> = {
  basic: {
    fit: "A business that just needs to be found on Google and get the phone ringing.",
    points: [
      "No big bill up front: no setup fee on the 6- or 12-month plan. A custom website usually costs $1,500 to $5,000 before hosting.",
      "We handle hosting, security and updates. They never have to touch a computer.",
      "Need a change? Text us: hours, holiday closures, a new photo.",
      "Built for phones, with tap-to-call and directions on every page.",
    ],
    line: "If it brings you one new customer a month, it's paid for itself.",
  },
  plus: {
    fit: "Most businesses. Anyone who gets customers from Google Maps (restaurants, salons, shops, auto, trades).",
    points: [
      "A monthly text showing how many people looked at their site and tapped to call or get directions. Proof it's working.",
      "We tune up their Google listing (hours, photos, services, description). That's where most local customers find them, and it's a $149 job on its own.",
      "Review QR cards for the counter. More reviews push them higher on Google Maps.",
    ],
    line: "Most folks pick Plus. It's the website plus getting you found on Google Maps.",
  },
  pro: {
    fit: "Busy owners who want it all handled, and businesses in a crowded field (roofing, HVAC, restaurants).",
    points: [
      "We post on their Google profile every month and keep photos fresh. Active profiles tend to show up more.",
      "Their own domain name and a business email like info@theirbusiness.com. Looks established. Their choice: free forwarding into the email they already check, or a full Google mailbox we set up (Google bills them directly, about $7–8 a month).",
      "Their changes go to the front of the line.",
      "Agencies charge $100 to $400 a month just to manage a Google profile.",
    ],
    line: "You run the business. We'll keep you looking sharp online every month.",
  },
  list: {
    fit: "Any business whose stock or prices change often (fish, plants, produce, bakeries, resale, feed, auto parts, used cars) that isn't ready for a whole website.",
    points: [
      "They change what's in each tank, bin or row from their phone in seconds. No login, no computer. Sold out hides it; the count shows how many are left.",
      "QR tags on every section open its live prices; a cheap tablet by the tank or counter shows them with no QR at all, and with the Barcode scanning add-on counts stock in and out by barcode.",
      "A long list goes on in one go: paste it from a spreadsheet or the register's export and it's sorted into sections. No retyping.",
      "No minimum and no setup fee, so there's nothing to think about. Cancel any time.",
      "Every dollar of the month they're on it counts toward a full website when they're ready; the price page just becomes part of it.",
    ],
    line: "Try the price list for a month. If it saves you one argument about a price, it's paid for itself.",
  },
};

/** "Which plan fits?" → [question, plan]. */
export const PLAN_QUESTIONS: Array<[string, string]> = [
  ["Tight budget, or only wants the basics?", "Basic"],
  ["Most of their customers find them on Google or Maps?", "Plus"],
  ["Wants proof it's working?", "Plus (monthly report)"],
  ["Wants everything done for them, or has lots of competition?", "Pro"],
  [
    "Wants a business email (info@theirbusiness.com)?",
    "Pro (free email forwarding, or a Google mailbox Google bills them for)",
  ],
  [
    "Wants their own .com?",
    "Any plan: they buy it, or we buy it in their name and add it to the bill (free on Pro)",
  ],
];

export const PLAYBOOK_ALWAYS = [
  "Be friendly and honest. Never promise rankings, customers or dates.",
  "Only text the preview link after they say it's OK.",
  "Log every call, and set a callback when they ask for one.",
  "Never take card numbers over the phone.",
];

/** Playbook → Extras: when a caller should bring each extra up (matched on the extra's name, case-insensitive). */
export const OFFER_HINT: Array<{ match: string; text: string }> = [
  {
    match: "\\bdomain\\b",
    text: "Anyone who wants their own .com but doesn't want to buy it themselves. Free on Pro; they can also bring their own or use the free address.",
  },
  {
    match: "order|book",
    text: "Restaurants, salons and groomers that already use Square, Toast, DoorDash, Booksy or Calendly.",
  },
  {
    match: "listed",
    text: "Anyone. Ask: “Do you show up on Apple Maps?” Most small shops don't.",
  },
  {
    match: "google business",
    text: "Anyone whose Google listing has old hours, few photos or no description.",
  },
  {
    match: "photo",
    text: "Anyone with no photos, or only Google's. Their site looks twice as good.",
  },
  {
    match: "spanish",
    text: "Mexican restaurants, landscapers, cleaners and shops with Spanish-speaking customers.",
  },
  {
    match: "hiring",
    text: "Restaurants and trades that are hiring. Look for “Now hiring” on their Facebook.",
  },
  {
    match: "rush|same-day",
    text: "Grand openings, busy season, or an event coming up.",
  },
  {
    match: "social",
    text: "Busy owners whose Facebook hasn't posted in months.",
  },
  {
    match: "table|window",
    text: "Restaurants (table tents), shops and salons (counter and window).",
  },
  {
    match: "cards|yard|door",
    text: "Trades (yard signs, door hangers) and anyone out of business cards.",
  },
  { match: "logo", text: "No logo, or a blurry one on their Facebook." },
  {
    match: "review card|nfc",
    text: "Busy counters: restaurants, salons, shops. More reviews, higher on Maps.",
  },
  {
    match: "changes",
    text: "Bigger jobs beyond the plan: a new page or section, a redesign.",
  },
  {
    match: "ads?\\b|ad management",
    text: "Contractors in busy season; restaurants with a new menu or event.",
  },
  {
    match: "tablet",
    text: "Any shop with a board: one tablet by the busiest tank, shelf or counter. We bring it, set it up and mount it.",
  },
  {
    match: "scanning",
    text: "Any shop with packaged stock (feed, filters, parts, bottles, food): deliveries counted in by scanning, on their phone or the tablet.",
  },
  {
    match: "scanner",
    text: "Shops with packaged stock (feed, filters, parts, bottles): a delivery is counted in by scanning.",
  },
  {
    match: "stock list|inventory",
    text: "Shops with a long list in a spreadsheet, a register export or on paper who don't want to type it.",
  },
];

export function offerHint(name: string): string {
  return (
    OFFER_HINT.find((h) => new RegExp(h.match, "i").test(name))?.text ?? ""
  );
}

// ---- share buttons ----

/** Ready-to-send follow-ups after a preview was shown or texted. `{greeting}` = "Hi, this is X with Co.", `{name}` = the business, `{url}` = a fresh share link. */
export const FOLLOW_UPS: Array<{ label: string; text: string }> = [
  {
    label: "👀 Did you get a look?",
    text: "{greeting} Just checking in: did you get a chance to look at the website preview for {name}? Here it is again: {url}",
  },
  {
    label: "🙋 Any questions?",
    text: "{greeting} Any questions about the website for {name}? Happy to change anything, add your own photos, or walk you through it: {url}",
  },
  {
    label: "👋 Last check-in",
    text: "{greeting} Last check-in on the website preview for {name}. I'll keep it ready for you a little longer. If now's not a good time, no worries at all. {url}",
  },
];

export const SHARE_TEXT =
  "{greeting} Here's the free website preview I made for {name}: {url}";
export const SIGNUP_TEXT =
  "{greeting} Here's the sign-up page for your new website ({plan} plan) for {name}: {url}";

// ---- in-person guide ----

/** The slow part of the day for each kind of business, when an owner has a few minutes. */
export const WALKIN_TIMING: Record<string, string> = {
  restaurant:
    "Between lunch and dinner, about 2 to 4 PM. Never during a rush, at opening or right before closing.",
  salon:
    "A weekday mid-morning, between appointments. If they're with a client, ask when they get a break and come back.",
  contractor:
    "Early morning (7 to 8 AM) at the shop before crews head out, or late afternoon when they're back. Many work from a truck: call first and ask for 5 minutes.",
  auto: "Mid-morning or mid-afternoon on a weekday. Skip opening (drop-offs) and closing (pick-ups).",
  landscaping:
    "Early morning before crews leave, or a rainy day when they're not out. Most are on jobs midday. If there's no shop, call first.",
  cleaning:
    "Most cleaners work from home or are out on jobs: call first and ask to meet for 5 minutes, then bring the preview.",
  print:
    "Late morning or early afternoon on a weekday. Skip deadline days, like Fridays before games and events.",
  retail:
    "A weekday morning soon after opening, or mid-afternoon. Never during a sale or a busy Saturday.",
  church:
    "Tuesday to Thursday mornings during office hours. Never Sunday, never during a service, and skip Wednesday afternoons. No office? Call first and leave the flyer for the pastor. Civic posts: call the commander and ask about the monthly meeting.",
  finance:
    "Tax offices: May through December, when they have time to talk (never January to mid-April). Insurance agencies: a weekday mid-morning or mid-afternoon. Advisors: call first.",
};
export const WALKIN_TIMING_UNKNOWN =
  "A slow part of their day, never during a rush.";
export const WALKIN_TIMING_GENERAL =
  "A slow part of their day, never during a rush. Restaurants 2 to 4 PM, shops and salons mid-morning, trades early morning.";

/** Short answers for what owners say face to face. `{price}` = "plans start at $49 a month with no setup fee on the 6- or 12-month plan". */
export const WALKIN_OBJECTIONS: Array<[string, string]> = [
  [
    "“I'm busy right now.”",
    "Totally understand, I'll get out of your way. Can I leave this with you? The code on it opens your website. When's a better time to swing back by? (Leave the flyer, log the callback.)",
  ],
  [
    "“How much is it?” (before you've shown it)",
    "Short answer: {price}. But let me show you what you'd get first. It takes one minute.",
  ],
  [
    "“I need to think about it.”",
    "Of course. What's the part you want to think over, the price or whether it'll bring in business? (Answer that.) I'll text you the link so you can look tonight. Can I check back Thursday?",
  ],
  [
    "“I need to talk to my husband / wife / partner.”",
    "Makes sense. I'll text you the link so you can show them on your phone. When's a good time for me to come back or call after you've both looked?",
  ],
  [
    "“I already have a Facebook page.”",
    "Keep it! The site links to it. But a lot of people aren't on Facebook, and Facebook pages don't show up well on Google. This is yours and it shows up for everybody.",
  ],
  [
    "“We don't need it. Word of mouth keeps us busy.”",
    "That's the best kind of business. When someone hears about you, the first thing they do is look you up on their phone. This makes sure they find your number and hours, not the place down the road.",
  ],
  [
    "“Is this a scam?”",
    "Fair question. We're local, here in Cullman. You can see your site before paying anything, nothing goes live until you say so, and you sign up through a secure page. I never take card numbers by hand.",
  ],
  [
    "“Not interested.”",
    "No problem at all. I built it for you either way. Mind if I leave this in case you change your mind? (Thank them and go. Never push past a second no.)",
  ],
];

export const WALKIN_OBJECTIONS_CHURCH: Array<[string, string]> = [
  [
    "“We'll have to take it to the deacons / the church.”",
    "Of course. Can I leave this for that meeting? It has a code that opens your site. When do you meet? I'll check back the day after. (Log the callback.)",
  ],
  [
    "“We can't afford a monthly bill.”",
    "Understood. {price}. A lot of churches pay yearly so it fits one budget line, and updates are included, so nobody has to learn a website builder.",
  ],
  [
    "“A member does our Facebook.”",
    "Keep it! The site links to it. The site holds what Facebook buries: service times, directions, what to expect and kids. Visitors search Google first.",
  ],
  [
    "“Someone built us one years ago.”",
    "That's common, and those sites tend to break when that person moves on. We keep it running, and the domain stays in the church's name.",
  ],
  [
    "“Will you put our beliefs on it?”",
    "Only your own words, exactly as you give them. We never write beliefs or doctrine.",
  ],
  [
    "“People find us by word of mouth.”",
    "That's the best way. Newcomers and young families still look you up first, and the site makes that first visit easier.",
  ],
  [
    "“Not interested.”",
    "No problem at all. I built it for you either way. Mind if I leave this in case the church wants to look at it? (Thank them and go.)",
  ],
];

export const WALKIN_QUESTIONS = {
  before: [
    "How do most new customers find you right now?",
    "Do people ever call just to ask your hours or where you are?",
    "Who takes care of your Facebook or Google listing?",
  ],
  restaurant:
    "Do you have a menu I could snap a photo of? I'll add it to the site.",
  services: "Is that list of services right? Anything you'd add?",
  after: [
    "Got a few photos of your place or your work? Real photos make a big difference.",
  ],
};

/** What to point at on the preview (only what it really has). `{services}` = the first three service names. */
export const WALKIN_SHOW = {
  name: "Their name up top, and the call button: “One tap and they're calling you.”",
  hours:
    "Their hours, with open or closed right now: “No more calls just to ask if you're open.”",
  directions: "The directions button: “Takes them right to your door.”",
  menu: "The menu section: “Send me your menu and I'll type it in.”",
  services: "The services ({services}): “Tell me if I missed anything.”",
  servicesGeneric: "The services list: “Tell me if I missed anything.”",
  reviews: "The reviews button: “Sends people to your Google reviews.”",
};

export const WALKIN_ALWAYS = [
  "Keep it under 5 minutes unless they keep the conversation going.",
  "Step aside when a customer walks up. Their customers come first.",
  "Be a friendly neighbor, not a salesperson. Never push past a second no.",
  "Don't knock their current site or whoever made it.",
  "Never promise rankings, more customers or a date you can't keep.",
  "Leave on good terms. Plenty of people say yes on the second visit.",
];

// ---- ways to pay (mirrors billingOptions() in db.ts the way app.js payTerms()/payWays() do) ----

export interface PayTerms {
  min: number;
  /** The shorter commitment, only when there are two. */
  short: number;
  commits: number[];
  flex: number;
  free: number;
  church: boolean;
}

export const money = (n: number): string =>
  "$" + (Number.isInteger(n) ? n : Number(n).toFixed(2));

export function payTerms(s: Partial<AppSettings>, church = false): PayTerms {
  const min = s.minMonths ?? 12;
  const short = s.shortMonths ?? 6;
  const commits = [
    short && min && short < min ? short : null,
    min || null,
  ].filter((x): x is number => !!x);
  const free = church
    ? (s.churchAnnualMonthsFree ?? 4)
    : (s.annualMonthsFree ?? 2);
  return {
    min,
    short: commits.length > 1 ? short : 0,
    commits,
    flex: min ? (s.flexSetup ?? 299) : 0,
    free,
    church,
  };
}

/** "6- or 12-month" */
export const commitWords = (t: PayTerms): string =>
  t.commits.length > 1
    ? `${t.commits[0]}- or ${t.commits[1]}-month`
    : `${t.commits[0]}-month`;

export function payWays(
  s: Partial<AppSettings>,
  plans: Plan[],
  church = false,
): Array<[string, string]> {
  const t = payTerms(s, church);
  const out: Array<[string, string]> = t.commits.map((m) => [
    `${m}-month plan`,
    `The monthly price, no setup fee. After ${m} months, cancel any time with 30 days' notice.`,
  ]);
  if (!t.commits.length)
    out.push(["Monthly", "The monthly price. Cancel any time."]);
  if (t.flex)
    out.push([
      "Month to month",
      `Same monthly price plus a one-time ${money(t.flex)} setup fee. No contract, cancel any time.`,
    ]);
  if (s.invoiceForAll !== false || church)
    out.push([
      "Pay by invoice",
      "We send an invoice; pay by check or bank transfer. Monthly invoices are due in 15 days, yearly in 30. Nothing is charged online.",
    ]);
  if (t.free)
    out.push([
      `Pay yearly, ${t.free} months free`,
      `12 months for the price of ${12 - t.free}${t.church ? " for churches and nonprofits" : ""}, no setup fee. ${plans.map((p) => `${p.name} ${money(p.monthly * (12 - t.free))}/year`).join(" · ")}`,
    ]);
  return out;
}

/** The cheapest website plan: the Price list plan is not a website, so "plans start at" never names it. */
const cheapestOf = (plans: Plan[]) =>
  plans.reduce<Plan | null>(
    (a, p) =>
      p.id !== "list" && p.monthly && (!a || p.monthly < a.monthly) ? p : a,
    null,
  );

/** "plans start at $49 a month with no setup fee on the 6- or 12-month plan" (the walk-in `{price}`). */
export function priceShort(
  s: Partial<AppSettings>,
  plans: Plan[],
  church = false,
): string {
  const t = payTerms(s, church);
  const cheapest = cheapestOf(plans);
  const noSetup = t.commits.length
    ? ` with no setup fee on the ${commitWords(t)} plan`
    : "";
  return cheapest
    ? `plans start at ${money(cheapest.monthly)} a month${noSetup}`
    : "it's a low monthly price";
}

/** Common things owners say on the call, and an honest answer to each, with the prices and terms from Settings filled in. */
export function playbookObjections(
  s: Partial<AppSettings>,
  plans: Plan[],
): Array<[string, string]> {
  const cheapest = cheapestOf(plans);
  const low = cheapest
    ? `${cheapest.name} is ${money(cheapest.monthly)} a month`
    : "Our starter plan is low monthly";
  const t = payTerms(s);
  const min = t.min;
  const flex = t.flex;
  return [
    [
      "“I don't need a website. I get plenty of business from word of mouth.”",
      "That's great, word of mouth is the best kind. But when someone hears about you, the first thing they do is look you up on their phone. This makes sure they find your hours and number right away, and not the place down the road.",
    ],
    [
      "“I already have a Facebook page.”",
      "Keep it! We link to it from the site. But a lot of people aren't on Facebook, and Facebook pages don't show up well on Google. The website is yours, it shows up on Google, and it works for everybody.",
    ],
    [
      "“It's too expensive.” / “I can't afford it right now.”",
      `I hear you. ${low}${t.commits.length ? `, with no setup fee on the ${commitWords(t)} plan` : ""}. If it brings you one customer a month, it pays for itself. Want to start there? You can move up any time.`,
    ],
    [
      "“I don't want a contract.” / “A year is too long.”",
      `${t.short ? `No problem. There's a ${t.short}-month plan, same price and still no setup fee. ` : "No problem. "}${flex ? `Or go month to month: same monthly price, a one-time ${money(flex)} setup fee, and cancel any time with 30 days' notice.` : "You can cancel any time with 30 days' notice."}`,
    ],
    [
      "“Do I have to pay extra for email?”",
      "No. Pro comes with a business email like info@yourbusiness.com that forwards free to the email you already use. If you want a full mailbox you can send from too, we set up Google's for you and Google bills you directly, about $7 to $8 a month. We don't mark it up.",
    ],
    [
      "“Do I need to buy a domain name?” / “What's a domain?”",
      "A domain is your web address, like smithplumbing.com. You've got three choices. Use the free address that comes with every plan (like smithplumbing.pages.dev). Buy your own at Cloudflare, GoDaddy or Namecheap, about $10 to $15 a year, and we hook it up. Or we buy it for you and add a small charge to your monthly bill; it's included with Pro. Whichever you pick, it's in your name and it belongs to you.",
    ],
    [
      "“I need to think about it.”",
      "Of course. Can I ask what you want to think over: the price, or whether it'll bring in business? (Answer that.) I'll text you the preview so you can look at it tonight. Is Thursday good for a quick call back? (Log the callback.)",
    ],
    [
      "“I need to talk to my wife / husband / partner.”",
      "Makes sense. I'll text you the preview link so you can show them on your phone. When's a good time to call back after you've both looked? (Log the callback.)",
    ],
    [
      "“Just send me some information.” / “Email me something.”",
      "Sure. Better than a brochure, I'll text you your actual website. It only takes a minute to look at. (Text the preview link, then set a callback for 2 or 3 days.)",
    ],
    [
      "“My nephew / a friend can build me one.”",
      "That works for some folks. The difference is we keep it running every month: hosting, security, and changes when you text us, without waiting on anybody's free time. And yours is already built. You can see it right now.",
    ],
    [
      "“I already have a website.”",
      "Read the lead's reason line first. If it's broken, old or not made for phones, say what's wrong: “I pulled it up and it [doesn't load / is hard to use on a phone]. Most people look you up on their phone, so that's costing you calls.” If they own the domain, it stays theirs. We just point it at the new site.",
    ],
    [
      "“I'm too busy for this.”",
      "That's the point: it takes almost nothing from you. It's already built. All I need is a few minutes to check your hours and services. After that, you just text us changes.",
    ],
    [
      "“I'm not good with computers.”",
      "You don't have to be. We do all of it. If you want something changed, you text us like you'd text a friend.",
    ],
    [
      "“Is this a scam?” / “I've been burned before.”",
      `Fair question. ${s.companyName ? `${s.companyName} is a local company here in Cullman.` : "We're local, here in Cullman."} You can see your site before you pay anything, nothing goes live until you say so, and you sign up and pay through a secure link. I never take card numbers over the phone.`,
    ],
    [
      "“Do I own it?” / “What if I cancel?”",
      `Your name, logo, photos and text are always yours, and a domain you own stays in your name. ${min ? `After the first ${min} months you can cancel any time with 30 days' notice` : "You can cancel any time with 30 days' notice"}, and we'll send you a copy of the site's files if you ask.`,
    ],
    [
      "“Can you guarantee more customers?”",
      "Nobody honest can promise that. What I can tell you is that it's built to show up on Google and make it easy to call you, and with Plus you get a text every month showing how many people looked and tapped to call.",
    ],
    [
      "“Can I make changes myself?”",
      "You don't need to. Text us and we'll do it. Small changes like hours, prices and photos are included in every plan.",
    ],
    [
      "“Business is good. I'm not taking new customers.”",
      "Good to hear! A site still saves you phone time: people see your hours, services and directions before they call. And it keeps you strong if things slow down.",
    ],
    [
      "“Why does it cost money every month?”",
      "The monthly covers hosting, security, keeping it working on new phones, and your changes. You never get hit with a surprise bill to fix something. If you pay for the year, you get 2 months free.",
    ],
    [
      "“I'm not interested.”",
      "No problem at all. I built this one for you either way, so can I text you the link in case you change your mind? (If they say no, thank them and log “Not interested”. Never push past a second no.)",
    ],
    [
      "“Do you have a referral program?”",
      `Yes. When a business you refer signs up for a ${s.referralMinMonths ?? 6}- or 12-month plan and their first payment goes through, you get ${s.referralMonths ?? 2} months of your plan free, up to ${s.referralMaxPerYear ?? 2} referrals a year; more than that carry over to the next year. Just have them mention your business name when they sign up.`,
    ],
  ];
}

/** The plans the app falls back to when Settings has none (same as SUGGESTED_PLANS in app.js). */
export const SUGGESTED_PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    setup: 0,
    monthly: 49,
    includes:
      "Your website on fast, secure hosting\nSmall text, hours and photo updates\nTap-to-call and directions on every page\nLive price list with QR tags and a tablet display, if your stock changes",
  },
  {
    id: "plus",
    name: "Plus",
    setup: 0,
    monthly: 89,
    includes:
      "Everything in Basic\nMonthly visitor report by text\nGoogle Business Profile tune-up\nGoogle review QR cards for your counter",
  },
  {
    id: "pro",
    name: "Pro",
    setup: 0,
    monthly: 149,
    includes:
      "Everything in Plus\nMonthly Google profile posts and photo updates\nYour own domain name, bought and renewed for you, in your name\nBusiness email (info@yourbusiness.com): free forwarding to the email you already use, or a full Google mailbox we set up, billed to you by Google\nPriority changes",
  },
  {
    id: "list",
    name: "Price list",
    setup: 0,
    monthly: 29,
    includes:
      "A live price page for your business, with a section for every tank, shelf, bin or row\nYour board: change names, prices, counts and photos from your phone, any time, no login\nPut your whole list on at once: paste it from a spreadsheet or your register's export\nSold out hides an item until it's back; the page shows how many are left\nQR price tags for every section (first sheet included) and a tablet display page\nStaff mode on the tablet: count stock in and out and add new items, PIN-locked\nFast, secure hosting; changes when you text us\nNo minimum: cancel any time. Upgrade to a full website any time",
  },
];

/** "$49 one-time", "$129/month", "$35 each", "Priced per job" (the app's capitalised form). */
export function addonPriceText(a: Pick<AddOn, "price" | "unit">): string {
  return a.unit === "quote" ? "Priced per job" : addonPrice(a);
}

/** Everything `GET /api/content` returns: the static copy plus the pieces filled from Settings. */
export function appContent(s: AppSettings) {
  const plans = s.plans.length ? s.plans : SUGGESTED_PLANS;
  const church = payTerms(s, true);
  return {
    planTagline: PLAN_TAGLINE,
    everyPlan: EVERY_PLAN,
    planPitch: PLAN_PITCH,
    planQuestions: PLAN_QUESTIONS,
    playbookObjections: playbookObjections(s, plans),
    playbookAlways: PLAYBOOK_ALWAYS,
    offerHints: OFFER_HINT,
    followUps: FOLLOW_UPS,
    shareText: SHARE_TEXT,
    signupText: SIGNUP_TEXT,
    walkinTiming: WALKIN_TIMING,
    walkinTimingUnknown: WALKIN_TIMING_UNKNOWN,
    walkinTimingGeneral: WALKIN_TIMING_GENERAL,
    walkinObjections: WALKIN_OBJECTIONS,
    walkinObjectionsChurch: WALKIN_OBJECTIONS_CHURCH,
    walkinQuestions: WALKIN_QUESTIONS,
    walkinShow: WALKIN_SHOW,
    walkinAlways: WALKIN_ALWAYS,
    /** Playbook → Churches & nonprofits card: the ministry rate, when there is one. */
    churchYearly: church.free
      ? {
          free: church.free,
          payFor: 12 - church.free,
          plans: plans
            .filter((p) => p.monthly && p.id !== "list")
            .map((p) => ({
              name: p.name,
              year: money(p.monthly * (12 - church.free)),
            })),
        }
      : null,
  };
}
