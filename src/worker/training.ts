import type { AppSettings } from "./db.ts";

/**
 * The in-app training course (🎓 Training on Home; owner and callers): the whole job from a lead appearing to a live site
 * on the client's own domain, as short lessons with the exact buttons to tap, a "try it now" exercise and a quick check.
 * One source for the web app and the Android app (`GET /api/training`); progress is per person (`training_done`).
 * Placeholders: {company}, {basic}, {plus}, {pro} (plan names + monthly prices from Settings).
 */

export interface CheckQuestion {
  q: string;
  options: string[];
  /** Index into options. */
  answer: number;
  why: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  /** "owner" lessons are done by the owner or full access; callers read them to know what happens next. */
  who: "everyone" | "owner";
  why: string;
  steps: string[];
  tryIt?: string;
  check: CheckQuestion[];
}

const LESSONS: Lesson[] = [
  {
    id: "what-we-sell",
    title: "What we sell, in one breath",
    minutes: 3,
    who: "everyone",
    why: "Every call and visit comes down to one sentence. Know it cold before you learn any screen.",
    steps: [
      "We build a website for a local business that doesn't have one, before we ever talk to them. They see it finished, not a mock-up.",
      "They pay a monthly plan that covers hosting, updates and fixes: {basic}, {plus} or {pro}. Most pick {plusName}. No setup fee on a 6- or 12-month plan.",
      "The line: \"We already built your website. Want to see it? If you like it, it's live this week for about a dollar a day.\"",
      "We never guess at facts. Hours, prices and claims come from the owner. The site is reviewed by them before it goes live.",
      "You are never selling a website. You are selling the phone ringing: people who search for them find them and call.",
    ],
    tryIt: "Open 💬 Plans & answers and read the three plan cards. Say the one-line pitch out loud twice.",
    check: [
      { q: "A restaurant owner asks what it costs. What do you say first?", options: ["The exact monthly price of the middle plan and that there's no setup fee on a 6- or 12-month plan", "\"It depends\"", "Nothing until they've seen the preview"], answer: 0, why: "Price is not a secret. Lead with the middle plan and the no-setup-fee terms; vagueness loses trust." },
      { q: "They ask if the site can say \"best BBQ in Alabama\".", options: ["Yes, if they want it", "Only claims they can back up; the site is theirs to approve, and we don't invent facts", "Never, we don't allow any claims"], answer: 1, why: "The owner reviews every word before it goes live, and we don't publish claims they can't stand behind." },
    ],
  },
  {
    id: "where-leads-come-from",
    title: "Where leads come from",
    minutes: 4,
    who: "everyone",
    why: "Leads appear two ways. Knowing what the card tells you saves a wasted call.",
    steps: [
      "Search runs: the owner taps 🔎 Find new leads, picks business types and Run. The app searches Google around Cullman, keeps businesses with no real website, and builds a preview for each one. They land under the New tab with \"Site ready\".",
      "By hand: ➕ Add a business. Type the name, pick the result, and the app builds the preview in a few minutes. Use it when you drive past a place or someone mentions one.",
      "The card's label matters. \"No website\" and \"Only a social page\" are the best leads. \"Page on another site\" means their only page lives on someone else's website (a landlord, a parent company): still a lead, different opener. \"Outdated website\" means they have one that's broken on phones.",
      "A \"🔗 Found page\" line means the app found a page the Google listing doesn't show. Open it before you call so you're not surprised.",
      "Tabs: New (untouched), Callbacks (due), Activity (anything somebody has worked, newest first), Shown, Sold, Live. The Today card at the top is your call list.",
    ],
    tryIt: "Open the Activity tab and read the last note on three leads. Then search for a business you know and add it (if it's not already in).",
    check: [
      { q: "A card says \"Page on stonebridgewedding.com, not linked from Google\". What does that mean?", options: ["They have a website, skip them", "Their Google listing has no website button; the only page about them is on someone else's site", "The app made a mistake"], answer: 1, why: "It's a real lead with a different opener: people who look them up on Google see no website, and the page they have isn't theirs." },
    ],
  },
  {
    id: "before-you-call",
    title: "Before you call or visit",
    minutes: 4,
    who: "everyone",
    why: "Two minutes of prep makes the call sound like you know them, because you do.",
    steps: [
      "Open the lead and tap 📞 Call guide. It's written for this business: what their site has, what to point out, what they'll likely ask. Read it once.",
      "Tap Preview and look at the site on the phone and in the desktop view. Know what's on it.",
      "Going in person? Tap 🚶 In-person guide for the walk-in script and the best time of day for that kind of business.",
      "Want them to see it first? Text preview link sends a link that works 14 days. You get an alert the moment they open it, and the lead shows under \"Looked at their preview\".",
      "They're out? Leave-behind flyer prints a page with a QR code to their preview. Leaving one marks the lead Shown and books a callback in 2 days.",
    ],
    tryIt: "Pick a New lead, read its call guide, then open its preview and find the Call button and the hours.",
    check: [
      { q: "You texted a preview link yesterday. How do you know if they looked?", options: ["Call and ask", "The app alerts you and the lead shows under \"Looked at their preview\"", "You can't know"], answer: 1, why: "Preview opens are tracked and alerted. Call while it's fresh." },
    ],
  },
  {
    id: "showing-the-preview",
    title: "Showing the preview",
    minutes: 5,
    who: "everyone",
    why: "The demo sells itself when it's about them. Your job is to let them drive and fix things live.",
    steps: [
      "Open Preview on the phone (open the Fold for the desktop view). Hand it to them. Let them scroll.",
      "Point at three things only: the Call button at the bottom, their hours and directions, and their services or menu. Don't tour every section.",
      "When they correct something (\"we close at 7 now\", \"we don't do roofing\"), tap Edit, fix it, Save. The preview rebuilds in seconds. Fixing it in front of them is the moment they believe it's real.",
      "Take a photo of the storefront, truck or shop while you're there. The preview uses a Google photo, which we're not allowed to publish; the owner's photo replaces it (Edit → Photo).",
      "Ask who makes the decision and when they're easiest to reach. Put it in the lead with the contact note (\"Ask for: Jim, mornings\").",
      "Not today? Text them the link, leave a flyer, and log the call with a callback day. Never leave without one of those.",
    ],
    tryIt: "On any lead, open Edit, change the hours, Save, and watch the preview update. Then change them back.",
    check: [
      { q: "The owner says their hours on the preview are wrong.", options: ["Tell them it'll be fixed later", "Tap Edit, fix the hours, Save, and show them the updated preview right there", "Write it on paper"], answer: 1, why: "A live fix is the strongest proof the site is real and easy to keep right." },
      { q: "Why take a photo of the storefront?", options: ["For the call log", "The preview's Google photo can't be published; an owner photo must replace it before the site goes live", "You don't need to"], answer: 1, why: "Google photos are only allowed in previews. Publishing is blocked until an owner, stock or AI photo replaces them." },
    ],
  },
  {
    id: "logging-calls",
    title: "Log every call. Every one.",
    minutes: 3,
    who: "everyone",
    why: "The team shares one list. If it isn't logged, someone else calls them again tomorrow.",
    steps: [
      "After each call or visit, use Log a call or visit on the lead. Phone: No answer, Reached. In person: Owner not in, Talked in person, Left a flyer. Then: Showed them, Call back, Sold, Not interested.",
      "No answer and Owner not in set a callback for tomorrow automatically. Left a flyer marks them Shown (the flyer carries their preview). Call back lets you pick the day. Sold and Not interested clear it.",
      "Not interested asks why (price, has someone, no need, timing). Pick honestly: it feeds the sales numbers.",
      "Add a one-line note with anything useful: who you spoke to, what they said, what to try next. Everyone on the team gets an alert, and the Activity tab shows it.",
      "Callbacks show on the Today card on the day they're due. Overdue ones float to the top.",
    ],
    tryIt: "Log a note on the \"Payment test\" lead, then find it under the Activity tab and in Alerts.",
    check: [
      { q: "You reached the owner, she wants to think about it. What do you log?", options: ["Nothing until she decides", "Reached, with a callback day and a note on what she said", "Sold"], answer: 1, why: "Reached plus a callback keeps her on the Today card on the right day, and the note tells the next person where you left off." },
    ],
  },
  {
    id: "signing-up",
    title: "Signing them up",
    minutes: 6,
    who: "everyone",
    why: "The whole sale happens on your phone in about three minutes: plan, agreement, signature.",
    steps: [
      "Tap 📋 Show plans and let them read {basicName}, {plusName} and {proName}. The page is customer-facing: no notes, no commission, just the plans.",
      "Tap Sign up. Pick the plan, the way to pay (6- or 12-month plan with no setup fee, month to month with the setup fee, or a year up front at a discount) and any extras they want.",
      "The agreement appears, built from exactly what they picked. Hand them the phone: they type their full name, draw their signature and tap agree. Nothing is stored until they sign.",
      "Want them to read it first? 📄 Show them the agreement opens a preview for any plan with nothing signed, and ⬇ PDF gives them a copy.",
      "Churches and some clients prefer an invoice. The sign-up offers \"Pay by check or bank transfer\" where it's allowed; the owner then sends the invoice.",
      "The moment they sign, the lead turns Sold, the team gets an alert, the signed agreement is attached to the lead, and a callback is set for tomorrow in case payment isn't finished.",
    ],
    tryIt: "Open the \"Payment test (not a real business)\" lead and go through Sign up with your own name. It only ever charges $1 and starts no plan. Stop before paying, or pay $1 and refund it in the next lesson.",
    check: [
      { q: "Which way to pay has a setup fee?", options: ["The 12-month plan", "Month to month only", "All of them"], answer: 1, why: "Only month to month carries the setup fee. The 6- and 12-month plans and the yearly up-front option have none." },
    ],
  },
  {
    id: "taking-payment",
    title: "Taking payment",
    minutes: 5,
    who: "everyone",
    why: "Three ways to pay, all on the phone. Payment today is the difference between sold and maybe.",
    steps: [
      "Tap card now: they tap their card (or phone wallet) on the back of your phone. NFC and Location must be on. Stripe saves the card for renewals.",
      "Enter card on this phone: type the card number into Stripe's secure form on the phone. Same result.",
      "Text them the payment link: for people who want to pay from their own phone or later. The lead stays \"Signed, payment not finished\" on Home until they do.",
      "After payment: the lead shows \"Paid … by tap (Visa ••1234)\", Stripe emails them a receipt, the renewal is scheduled for one month or one year out on the same card, and everyone gets a 💳 alert.",
      "Changed their mind? The owner taps ↩ Refund on the paid sign-up. It refunds in Stripe, can cancel the plan, and notes it in the call log.",
      "Tap to Pay rules the phone enforces: Android 13 or newer, NFC on, Location on, Developer options off, no screen recorder running.",
    ],
    tryIt: "On the Payment test lead, pay $1 with your own card by tap, see the note and the alert, then have the owner refund it.",
    check: [
      { q: "The card tap won't start and the screen mentions Developer options.", options: ["Try a different card", "Turn Developer options off in the phone's settings, then try again", "Use the payment link instead and never tap again"], answer: 1, why: "Stripe refuses to take payments while Developer options are on. Turn them off and the tap works." },
    ],
  },
  {
    id: "finish-and-publish",
    title: "Finishing the site and publishing",
    minutes: 6,
    who: "owner",
    why: "We promise \"live within 3 business days\". It's usually ten minutes once the facts are confirmed.",
    steps: [
      "Open the Sold lead. The screen lists what must be done before publishing. Required items block Publish; suggested ones can wait.",
      "Replace the Google photo: Edit → Photo → upload the storefront photo you took. Add more under Photo gallery if you have them.",
      "Confirm the facts the owner gave you: services, prices, the license number for trades, emergency terms for contractors, the team list for salons.",
      "Text wrong in tone? Rewrite regenerates it. Design not right? Try another design, or pick colours and layout under Edit → Design.",
      "Tap Publish. The app runs its checks and pushes the site to Cloudflare. It's live at an address like businessname.pages.dev. The lead turns Live.",
      "Live sites carry \"Website by {company} · Request a change\" in the footer. Their change requests and contact-form messages land in the Inbox and alert the team.",
    ],
    tryIt: "Open any Sold or Live lead and read its to-do list. Find where the photo is uploaded.",
    check: [
      { q: "Publish is greyed out with \"Google photos must be replaced\". What do you do?", options: ["Delete the lead", "Upload the owner's photo under Edit → Photo, then publish", "Publish anyway from the website"], answer: 1, why: "Google's photos are only allowed in previews. An owner, stock or AI photo must replace them." },
    ],
  },
  {
    id: "their-domain",
    title: "Their own domain and email",
    minutes: 5,
    who: "owner",
    why: "The .pages.dev address works, but customers remember smithplumbing.com. The domain stays theirs.",
    steps: [
      "The client buys the domain in their own name (about $10 to $15 a year) at Cloudflare, GoDaddy or Namecheap. The agreement says the domain belongs to them.",
      "On the Live lead tap Custom domain, type it (www.theirbusiness.com is easiest), Save. The app registers it with Cloudflare and shows one DNS record to add.",
      "Add that record where the domain was bought: a CNAME, name www, value theirbusiness.pages.dev. Walk them through it on the phone if needed.",
      "Within a few hours the status turns Active. The app republishes the site so every link uses the new address. The old .pages.dev address keeps working.",
      "{proName} includes business email. Buy the domain at Cloudflare and set up free email forwarding (info@theirbusiness.com → the inbox they already use), or a Google Workspace mailbox billed to them by Google.",
      "Then update the website field on their Google Business Profile (the Google profile tools on the lead walk you through it).",
    ],
    check: [
      { q: "Who owns the client's domain?", options: ["We do, it's part of the plan", "The client; they buy it in their name and we connect it", "Cloudflare"], answer: 1, why: "The domain is theirs under the agreement. We connect it and hand it over cleanly if they ever leave." },
    ],
  },
  {
    id: "after-the-sale",
    title: "After the sale",
    minutes: 4,
    who: "everyone",
    why: "Clients who hear from us stay. Most of this is one tap.",
    steps: [
      "Printables on the Live lead: Google review cards (QR to their review link), QR table tents and a window sign. Drop them off on your next visit.",
      "Text monthly report sends their visits and tap-to-call counts. A client who sees the phone ringing never cancels.",
      "Ask for a review texts them our Google review link once their site is live and they're happy.",
      "Extras later (photo shoot, Spanish page, NFC card, Google profile setup) go through the Buy extras link on the client screen. They sign and pay the same way.",
      "Change requests come in through the footer link on their site and land in the Inbox. Acknowledge the same day, even if the change takes longer.",
      "Renewals charge the stored card automatically. A failed payment alerts the team; the Stripe billing portal button lets the client update their card.",
    ],
    tryIt: "Open a Live lead (or the Payment test lead) and find the review cards, the monthly report and the Buy extras link.",
    check: [
      { q: "A live client texts that their hours changed.", options: ["Tell them to use the Request a change link only", "Edit the hours in the app and republish; thank them and note it in the call log", "Ignore it until the monthly report"], answer: 1, why: "Changes to text, hours and photos are included in every plan. Do it, republish, and log it." },
    ],
  },
];

const money = (n: number | undefined) => (n == null ? "" : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);

/** The course with the company and plan names/prices filled in from Settings. */
export function trainingCourse(s: AppSettings): { lessons: Lesson[] } {
  const plans = s.plans ?? [];
  const byId = (id: string, i: number) => plans.find((p) => p.id === id) ?? plans[i];
  const basic = byId("basic", 0);
  const plus = byId("plus", 1);
  const pro = byId("pro", 2);
  const vars: Record<string, string> = {
    company: s.companyName || "Underground Associates",
    basic: basic ? `${basic.name} ${money(basic.monthly)}/month` : "Basic",
    plus: plus ? `${plus.name} ${money(plus.monthly)}/month` : "Plus",
    pro: pro ? `${pro.name} ${money(pro.monthly)}/month` : "Pro",
    basicName: basic?.name ?? "Basic",
    plusName: plus?.name ?? "Plus",
    proName: pro?.name ?? "Pro",
  };
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
  return {
    lessons: LESSONS.map((l) => ({
      ...l,
      why: fill(l.why),
      steps: l.steps.map(fill),
      tryIt: l.tryIt ? fill(l.tryIt) : undefined,
      check: l.check.map((c) => ({ ...c, q: fill(c.q), options: c.options.map(fill), why: fill(c.why) })),
    })),
  };
}

export const LESSON_IDS = LESSONS.map((l) => l.id);
