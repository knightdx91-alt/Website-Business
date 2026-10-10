/**
 * The site editor as data (Oct 2026): one description of every Edit card and field, built from a lead's detail, and the
 * reverse mapping from typed values back to the `PUT /edits` payload. The Android app renders the cards natively from
 * `GET /api/leads/:id/editform` and saves with `PUT /api/leads/:id/editform {values}`; the field names are the web
 * editor's form element names, so both editors produce the same edits (see viewEdit and the *EditCard / *EditValues
 * helpers in app/public/app.js, which this mirrors card for card).
 */
import type { Edits } from "./edits.ts";

export type FieldType = "text" | "textarea" | "check" | "select" | "number" | "url" | "tel" | "email" | "date" | "heading" | "note" | "hidden";

export interface Field {
  type: FieldType;
  name?: string;
  label?: string;
  hint?: string;
  placeholder?: string;
  value?: string | boolean;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  required?: boolean;
  max?: number;
  /** heading / note text */
  text?: string;
}

export interface GalleryPhoto {
  key: string;
  src: string;
  alt: string;
  caption: string;
  town: string;
  pairWith: string;
}

export interface Card {
  id: string;
  title: string;
  note?: string;
  fields: Field[];
  /** Cards with buttons of their own: the main photo, the gallery, the Spanish page, the design shuffle. */
  kind?: "photo" | "gallery" | "spanish" | "design";
  /** photo: where the current main photo comes from. */
  hero?: "owner" | "google" | null;
  gallery?: GalleryPhoto[];
  /** spanish: whether the site already has a Spanish page. */
  hasSpanish?: boolean;
  /** Cards that start folded on the phone (long optional lists). */
  collapsed?: boolean;
}

export interface EditForm {
  cards: Card[];
  name: string;
  category: string;
  variant: string | null;
}

/** Form values as the app sends them: strings for inputs, booleans for checkboxes; absent = the field wasn't shown. */
export type FormValues = Record<string, string | boolean | undefined>;

// ---- the pieces of the lead detail the form reads (the same JSON /api/leads/:id returns) ----

interface AnyRecord {
  [k: string]: any;
}

export interface EditDetail {
  record: AnyRecord;
  copy: AnyRecord;
  menuText?: string;
  looks: Array<{ id: string; name: string }>;
  layouts?: Array<{ id: string; name: string; about: string }>;
  dnaOrder?: Array<{ id: string; label: string; letter: string; values: Array<{ id: string; name: string }> }>;
  dnaRecipes?: Array<{ id: string; name: string; about: string; dna: Record<string, string> }>;
  dna?: Record<string, string> | null;
  layout?: string | null;
  lookBase?: string | null;
}

// ---- lists shared with the web editor ----

export const PARTS_COUNTER: Array<[string, string]> = [["battery", "Battery testing & charging"], ["install", "Wiper & bulb install"], ["loaner", "Loaner tools"], ["hose", "Hydraulic hose assembly"], ["machine", "Machine shop"], ["keys", "Key cutting"], ["paint", "Paint mixing"]];
const PARTS_DEFAULT_ON = ["battery", "install", "loaner"];
const PLAN_HINT: Record<string, [string, string, string, string, string]> = {
  contractor: ["Comfort plan", "$149", "year", "Most popular", "Two tune-ups a year\n15% off repairs\nPriority scheduling"],
  landscaping: ["Every 2 weeks", "$45", "visit", "Most popular", "Mowing & edging\nTrimming\nBlowing off drives and walks"],
  cleaning: ["Every 2 weeks", "$120", "visit", "Most popular", "Kitchen and baths\nDusting and floors\nBeds made"],
};
const CHECKLIST_ROOMS = ["Every room", "Kitchen", "Bathrooms", "Bedrooms", "Living areas"];
export const CLEANING_FACILITIES = ["Offices", "Medical & dental", "Churches", "Schools & daycares", "Retail stores", "Restaurants", "Banks", "Gyms", "Industrial & warehouses", "Apartment common areas", "Vacation rentals", "Post-construction"];
export const AUTO_AMENITIES: Array<[string, string]> = [["loaner", "Loaner cars"], ["shuttle", "Shuttle service"], ["key_drop", "After-hours key drop"], ["wifi", "Waiting room with Wi-Fi"], ["digital_inspection", "Digital inspections texted to you"], ["second_opinion", "Free second opinions"], ["walk_ins", "Walk-ins welcome"], ["same_day", "Same-day service on most jobs"], ["towing", "Towing available"], ["spanish", "Spanish spoken"]];
const AUTO_PROGRAMS = ["NAPA AutoCare", "TechNet", "Jasper", "AAA Approved Auto Repair", "Bosch Service", "ASE Blue Seal", "RepairPal Certified", "BBB Accredited"];
const CH_VARIANTS: Array<[string, string]> = [["church", "Church"], ["civic_post", "VFW, Legion, Lions, lodge or club"], ["charity", "Food pantry or charity"], ["community_center", "Community center"]];
const FIN_VARIANTS: Array<[string, string]> = [["tax_prep", "Tax preparation"], ["accounting", "Accounting & bookkeeping"], ["insurance", "Insurance agency"], ["financial_advisor", "Financial advisor"]];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MENU_TAGS: Array<[string, string]> = [["popular", "Popular"], ["new", "New"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["gluten_free", "Gluten-free"], ["spicy", "Spicy"]];

// ---- small builders ----

const txt = (name: string, label: string, value: unknown, o: Partial<Field> = {}): Field => ({ type: "text", name, label, value: value == null ? "" : String(value), ...o });
const ta = (name: string, label: string, value: unknown, rows = 3, o: Partial<Field> = {}): Field => ({ type: "textarea", name, label, value: value == null ? "" : String(value), rows, ...o });
const cb = (name: string, label: string, on: unknown): Field => ({ type: "check", name, label, value: !!on });
const sel = (name: string, label: string, value: unknown, options: Array<[string, string]>, o: Partial<Field> = {}): Field => ({ type: "select", name, label, value: value == null ? "" : String(value), options: options.map(([v, l]) => ({ value: v, label: l })), ...o });
const h3 = (text: string): Field => ({ type: "heading", text });
const note = (text: string): Field => ({ type: "note", text });
const url = (name: string, label: string, value: unknown, o: Partial<Field> = {}): Field => ({ type: "url", name, label, value: value == null ? "" : String(value), placeholder: "https://", ...o });

export const photoKey = (src: string): string => src.split("/").pop()!.split(".")[0]!;

function priceOf(s: AnyRecord): string {
  const p = s.price;
  if (!p) return "";
  if (p.mode === "exact") return `$${p.amount}`;
  if (p.mode === "from") return `from $${p.amount}`;
  if (p.mode === "range") return `$${p.min}-$${p.max}`;
  if (p.mode === "quote") return "consult";
  return "";
}

const pipeJoin = (parts: unknown[]): string => parts.map((x) => (x == null ? "" : String(x))).join(" | ").replace(/( \|\s*)+$/, "");

export function eventLines(events: AnyRecord[] | undefined): string {
  return (events || []).map((e) => pipeJoin([e.endDate ? `${e.date}..${e.endDate}` : e.date, e.title, e.time || "", e.detail || "", e.url || ""])).join("\n");
}

export function offerLines(offers: AnyRecord[] | undefined): string {
  return (offers || []).map((o) => pipeJoin([o.title, o.code || "", o.expiresOn || "", o.detail || ""])).join("\n");
}

function carrierLines(list: unknown[] | undefined): string {
  return (list || []).map((c: any) => (typeof c === "string" ? c : pipeJoin([c.name, c.payUrl || "", c.claimsPhone || "", c.claimsUrl || ""]))).join("\n");
}

/** What the Confirm card lists for this business (also what `confirmed` may contain). */
function confirmable(r: AnyRecord): Array<[string, string]> {
  const cat = r.category as string;
  const isR = cat === "restaurant", isS = cat === "salon", isA = cat === "auto", isC = cat === "contractor", isL = cat === "landscaping", isK = cat === "cleaning";
  const isParts = isA && r.variant === "parts";
  const hasServices = !isR;
  const hasTowns = isC || isL || isK || (isA && !isParts);
  const out: Array<[string, string]> = [["name", "Business name is right"], ["phone", "Phone number is right"], ["address", "Address is right"]];
  if (r.hours) out.push(["hours", "Hours are right"]);
  if (hasServices) out.push(["services", isS ? "Services and prices are right" : isParts ? "The what-we-carry list is right" : "Services list is right"]);
  if (hasTowns) out.push(["service_area", "Service area towns are right"]);
  if (isR) out.push(["menu", "Menu is right"]);
  return out;
}

// ---- the form ----

export function editForm(l: EditDetail): EditForm {
  const r = l.record;
  const c = l.copy;
  const cat = r.category as string;
  const isR = cat === "restaurant", isC = cat === "contractor", isS = cat === "salon", isA = cat === "auto", isL = cat === "landscaping", isK = cat === "cleaning", isP = cat === "print", isRt = cat === "retail", isF = cat === "finance", isCh = cat === "church";
  const isM = isS && r.variant === "massage";
  const isParts = isA && r.variant === "parts";
  const serviceArea = isC || isL || isK;
  const hasServices = !isR;
  const hasTowns = isC || isL || isK || (isA && !isParts);
  const ext: AnyRecord = (r.ext || {})[cat] || {};
  const conf = new Set<string>(r.confirmed || []);
  const t: AnyRecord[] = (r.testimonials || []).concat([{}, {}, {}]).slice(0, 3);
  const serviceLines = (r.services || []).map((s: AnyRecord) => (isS ? pipeJoin([s.name, priceOf(s), s.durationMin ? `${s.durationMin} min` : ""]) : s.name)).join("\n");
  const lic = (r.licenses || [])[0] || {};
  const w = ext.warranty || {};
  const cards: Card[] = [];
  const card = (id: string, title: string, fields: Field[], extra: Partial<Card> = {}) => { cards.push({ id, title, fields, ...extra }); };

  card("confirm", "Confirm with the owner", [
    txt("name", "Business name", r.name, { required: true }),
    txt("phone", "Phone", r.phone?.display ?? "", { type: "tel", required: true }),
    cb("smsEnabled", "This number takes texts", r.smsEnabled),
    ...(serviceArea ? [cb("showStreetAddress", "Show the street address (they have a storefront)", r.showStreetAddress)] : []),
    ...confirmable(r).map(([k, label]) => cb("confirm_" + k, label, conf.has(k))),
  ]);

  const hero = r.media?.hero;
  card("photo", "Photo", [
    note(hero && hero.source === "google" ? "Using a Google photo (fine for the preview, but it must be replaced before publishing)." : hero ? "Using the owner's photo." : "No photo yet."),
  ], { kind: "photo", hero: hero ? (hero.source === "google" ? "google" : "owner") : null });

  const gallery: AnyRecord[] = r.media?.gallery || [];
  const galleryFields: Field[] = [];
  for (const p of gallery) {
    const key = photoKey(p.src);
    galleryFields.push(h3(p.caption || p.alt || key));
    galleryFields.push(txt(`gcap_${key}`, "Caption", p.caption || "", { max: 80, placeholder: "Patio" }));
    galleryFields.push(txt(`gtown_${key}`, "Town", p.town || "", { max: 40, placeholder: "Hanceville" }));
    galleryFields.push(sel(`gpair_${key}`, "Before/after", p.pairWith || "", [["", "Not a “before” photo"], ...gallery.filter((o) => o !== p).map((o): [string, string] => [photoKey(o.src), `This is the BEFORE of: ${o.caption || o.alt || photoKey(o.src)}`])]));
  }
  card("gallery", "Photo gallery", [
    note("Up to 12 of the owner's own photos (the photo shoot extra): their place, their work, their team. They show as a photo grid on the site. Captions show under the photo (“Patio, Hanceville”); pick a photo's “after” to show the two side by side."),
    ...galleryFields,
  ], { kind: "gallery", gallery: gallery.map((p) => ({ key: photoKey(p.src), src: p.src, alt: p.alt || "", caption: p.caption || "", town: p.town || "", pairWith: p.pairWith || "" })) });

  card("es", "Spanish page", [
    note(c.es ? "This site has a Spanish page at /es/, linked as “Español” in the menu. Rewrite it after big text changes." : "Optional extra. AI translates the site's text into a Spanish page with Spanish buttons and hours (about 20 seconds)."),
  ], { kind: "spanish", hasSpanish: !!c.es });

  card("hiring", "We're hiring", [
    note("Optional. Adds a “We're hiring” section with Call/Text buttons. Leave the jobs empty to remove it."),
    ta("hiringRoles", "Jobs open (one per line)", ((r.hiring || {}).roles || []).join("\n"), 3, { placeholder: "Line cook\nServer" }),
    txt("hiringHow", "How to apply", (r.hiring || {}).how || "", { max: 240, placeholder: "Stop by between 2 and 4, or give us a call." }),
  ], { collapsed: !(r.hiring && r.hiring.roles && r.hiring.roles.length) });

  card("events", "Events & specials", [
    note("Optional. Dated things in the owner's words: an event, a sale, a coupon, a deadline. One per line as date | title | time | details | link. Dates are YYYY-MM-DD; write 2026-11-01..2026-11-30 for something that runs for a while. Past items drop off the site on their own."),
    ta("events", "Coming up", eventLines(r.events), 4, { placeholder: "2026-10-25 | Trunk or Treat | 5–7 PM | Candy, games and hot dogs in the parking lot." }),
  ], { collapsed: !(r.events && r.events.length) });

  const designFields: Field[] = [
    sel("lookBase", "Colors & fonts", l.lookBase ?? "", l.looks.map((x): [string, string] => [x.id, x.name])),
    sel("layout", "Layout", l.layout ?? "classic", (l.layouts || []).map((x): [string, string] => [x.id, `${x.name}: ${x.about}`])),
    h3("Page structure"),
    note("How the page is put together: the opening, the top bar, buttons, how services are shown. Mix these with any colors and layout."),
  ];
  for (const k of l.dnaOrder || []) {
    designFields.push(sel("dna_" + k.id, k.label, (l.dna || {})[k.id] || k.values[0]!.id, k.values.map((v): [string, string] => [v.id, v.name])));
  }
  card("design", "Design", designFields, { kind: "design", collapsed: true });

  const facts: Field[] = [
    txt("foundedYear", "Year they started", r.foundedYear || "", { type: "number", placeholder: "1998" }),
    cb("familyOwned", "Family-owned", (r.ownershipTags || []).includes("family_owned")),
  ];
  if (isS) facts.push(sel("walkIns", "Walk-ins or appointments?", ext.walkIns || "", [["", "Not set yet"], ["welcome", "Walk-ins welcome"], ["appointment_only", "By appointment only"], ["both", "Both"]]));
  if (isC || isL || isK) facts.push(cb("insured", "Insured", !!r.insured));
  if (isK) facts.push(cb("bonded", "Bonded", !!r.bonded));
  if (isC || isL || isM) {
    facts.push(txt("licenseLabel", "License type", lic.label || "", { placeholder: isC ? "AL Plumbing License" : isM ? "AL Massage Therapist License" : "License" }));
    facts.push(txt("licenseNumber", "License #", lic.number || ""));
  }
  if (isC) facts.push(cb("emergencyService", "Offers emergency service", !!ext.emergencyService));
  if (isA) {
    facts.push(cb("ase", isParts ? "ASE-certified parts specialists" : "ASE-certified", !!ext.ase));
    if (!isParts) {
      facts.push(txt("warrantyMonths", "Warranty months", w.months || "", { type: "number" }));
      facts.push(txt("warrantyMiles", "Warranty miles", w.miles || "", { type: "number" }));
      facts.push(cb("warrantyNationwide", "Warranty is nationwide", !!w.nationwide));
    }
  }
  if (isK) facts.push(cb("backgroundChecked", "Team is background-checked", !!ext.backgroundChecked), cb("suppliesIncluded", "They bring their own supplies", !!ext.suppliesIncluded), cb("petSafe", "Uses pet-safe products", !!ext.petSafe));
  if (isC || (isA && !isParts) || isL || isK) facts.push(cb("freeEstimates", isA || isC ? "Free estimates" : "Free quotes", !!ext.freeEstimates));
  if (isP) {
    facts.push(cb("designHelp", "They help design artwork", !!ext.designHelp), cb("proofBeforePrint", "They send a proof before printing", !!ext.proofBeforePrint));
    if (r.variant === "signs") facts.push(cb("install", "They install signs", !!ext.install));
  }
  if (isRt) facts.push(cb("giftCardsSold", "They sell gift cards", !!ext.giftCards), cb("delivery", "They deliver", !!ext.delivery));
  card("facts", "Facts (only if the owner says so)", facts);

  const pr = r.proof || {};
  card("proof", "Awards & proof", [
    note("Only what the owner can back up. Awards and memberships show in the opening; named clients show as “Trusted by” (ask permission first)."),
    ta("prAwards", "Awards (one per line: Award | Year)", (pr.awards || []).map((a: AnyRecord) => pipeJoin([a.name, a.year || ""])).join("\n"), 3, { placeholder: "Best of the Best, Cullman Times | 2025" }),
    ta("prMemberships", "Memberships (one per line)", (pr.memberships || []).join("\n"), 2, { placeholder: "Cullman Area Chamber of Commerce" }),
    ta("prClients", "Clients we can name (one per line)", (pr.clients || []).join("\n"), 2, { placeholder: "Cullman City Schools\nWallace State" }),
    ta("prStats", "Numbers (one per line: Value | Label)", (pr.stats || []).map((x: AnyRecord) => `${x.value} | ${x.label}`).join("\n"), 2, { placeholder: "40 | vendor booths\n20,000 | square feet" }),
  ], { collapsed: true });

  const vis = r.visit || {};
  card("visit", "Closures, parking & payment", [
    note("Holiday closures show under the hours and in the top strip the week before, then drop off on their own."),
    ta("vsClosures", "Closures (one per line: YYYY-MM-DD | Why)", (r.closures || []).map((x: AnyRecord) => `${x.date} | ${x.label}`).join("\n"), 3, { placeholder: "2026-11-26 | Thanksgiving\n2026-12-25 | Christmas" }),
    txt("vsPay", "Ways to pay (comma separated)", (vis.paymentMethods || []).join(", "), { placeholder: "Cash, Visa, Mastercard, Venmo" }),
    txt("vsParking", "Parking", vis.parking || "", { max: 240, placeholder: "Free lot behind the building; enter from 2nd Ave." }),
  ], { collapsed: true });

  if (isR) {
    const truck = r.variant === "food_truck";
    const d = ext.deliveryLinks || {};
    card("restaurant", "Restaurant details", [
      cb("rsCatering", "They cater (adds a Catering section and request form)", !!ext.catering),
      txt("rsCateringNote", "What they cater (their words)", ext.cateringNote || "", { max: 300, placeholder: "Pans and plates for 20 to 200: church suppers, reunions, work lunches." }),
      ...(truck ? [url("rsCalendar", "Schedule link (Google Calendar or Facebook events)", ext.calendarUrl || "", { hint: "This week's stops go in Events & specials as date | Place | time" })] : []),
      h3("Order through (their own pages)"),
      url("rsDoordash", "DoorDash", d.doordash || ""),
      url("rsUbereats", "Uber Eats", d.ubereats || ""),
      url("rsGrubhub", "Grubhub", d.grubhub || ""),
      url("rsRewards", "Rewards / loyalty sign-up link", ext.rewardsUrl || ""),
      note("With a reservations link (Links card), Reserve a table becomes the main button for dine-in places. Gift cards: paste the link in the Links card."),
    ]);
  }

  if (isS) {
    const massage = r.variant === "massage", pet = r.variant === "pet";
    const pol = ext.policies || {}, io = ext.introOffer || {}, pt = ext.pet || {};
    const teamLines = (ext.team || []).map((m: AnyRecord) => pipeJoin([m.name, m.role || "", m.days || "", m.bookingUrl || "", m.line || ""])).join("\n");
    card("salon", pet ? "Grooming details" : massage ? "Massage details" : "Salon details", [
      note("People book people. One person per line: Name | Role | Days | Booking link | One line about them. Required to confirm before the site goes live."),
      ta("slTeam", "Team", teamLines, 4, { placeholder: "Jess Carter | Owner, stylist | Tue–Sat | https://booksy.com/… | Color and balayage" }),
      cb("slTeamOk", "Owner confirmed the team list (required once a team is listed)", !!ext.teamConfirmed),
      ...(massage ? [ta("slRates", "Session rates (one per line: Minutes | Price)", (ext.rates || []).map((x: AnyRecord) => `${x.minutes} | ${x.price}`).join("\n"), 3, { placeholder: "30 | $45\n60 | $80\n90 | $115" })] : []),
      h3("Good to know (their wording)"),
      txt("slDeposit", "Deposits", pol.deposit || "", { max: 300, placeholder: "A $20 deposit holds color appointments." }),
      txt("slCancel", "Cancellations", pol.cancellation || "", { max: 300, placeholder: "Please give us 24 hours' notice." }),
      txt("slLate", "Running late", pol.lateness || "", { max: 300, placeholder: "15 minutes late may mean a shorter service." }),
      txt("slKids", "Kids", pol.kids || "", { max: 300, placeholder: "Kids are welcome for their own appointments." }),
      h3("New-client offer"),
      txt("slOffer", "Offer", io.text || "", { max: 120, placeholder: "$10 off your first cut" }),
      txt("slOfferUntil", "Ends on", io.until || "", { type: "date" }),
      ...(pet ? [
        h3("Before your appointment"),
        txt("slVax", "Vaccinations they require", pt.vaccinations || "", { max: 300, placeholder: "Proof of current rabies and DHPP, please." }),
        txt("slPricing", "Pricing line", pt.pricingFrom || "", { max: 300, placeholder: "Full grooms start at $45 for small dogs; price depends on size and coat." }),
        txt("slMatting", "Matting / de-shedding note", pt.mattingNote || "", { max: 300, placeholder: "Heavy matting may mean a shorter cut and an extra charge." }),
        txt("slPrep", "What to bring / prep", pt.prep || "", { max: 300, placeholder: "A potty break before you arrive, and their vaccine record the first time." }),
      ] : []),
    ]);
  }

  if (isRt) {
    const v = r.variant as string;
    const fl = ext.florist || {}, vd = ext.vendors || {}, fin = ext.financing || {};
    const booths = v === "antique" || v === "thrift" || v === "boutique" || v === "gift";
    const stock = v === "farm_feed" || v === "hardware" || v === "furniture";
    const f: Field[] = [];
    if (v === "florist") {
      f.push(h3("Florist"), ta("rtOccasions", "Occasions (one per line; leave empty for the usual four)", (fl.occasions || []).join("\n"), 3, { placeholder: "Sympathy & funeral\nWeddings & events\nBirthdays & anniversaries\nJust because" }),
        txt("rtArea", "Delivery area", fl.deliveryArea || "", { max: 120, placeholder: "Cullman and Hanceville" }),
        txt("rtCutoff", "Same-day cutoff", fl.cutoff || "", { max: 40, placeholder: "1 PM" }),
        txt("rtFee", "Delivery fee", fl.deliveryFee || "", { max: 60, placeholder: "$10 in town" }),
        cb("rtDesigners", "Offer designer's choice (we pick what's freshest)", !!fl.designersChoice),
        note("The site only says “same-day” once a cutoff time is typed here."));
    }
    if (booths) f.push(h3("Vendors & booths"), cb("rtBooths", "Booths available (adds a booth inquiry form)", !!vd.boothsAvailable), txt("rtVendorNote", "Vendor note (their words)", vd.note || "", { max: 400, placeholder: "Booths from 8x10; month-to-month. Ask about rates." }));
    if (stock) f.push(h3("Departments & brands"), ta("rtDepartments", "Departments (one per line)", (ext.departments || []).join("\n"), 3, { placeholder: "Cattle & horse\nPoultry\nPets\nLawn & garden" }), ta("rtBrands", "Brands they carry (one per line, names only)", (ext.brands || []).join("\n"), 3, { placeholder: "Purina\nNutrena\nStihl" }));
    if (v === "furniture" || v === "farm_feed" || v === "hardware") f.push(h3("Delivery & financing"), txt("rtDeliveryNote", "Delivery rule (their words)", ext.deliveryNote || "", { max: 240, placeholder: "Free delivery in Cullman County on orders over $499." }), txt("rtLender", "Financing partner", fin.lender || "", { max: 60, placeholder: "Synchrony, Acima…" }), url("rtLenderUrl", "Apply link", fin.url || ""));
    if (v === "boutique" || v === "gift") f.push(h3("New arrivals"), txt("rtDropDay", "Drop day", ext.dropDay || "", { max: 120, placeholder: "New arrivals every Thursday at 10, in store and on Facebook Live." }), ta("rtOcc2", "Occasions (one per line)", (ext.occasions || []).join("\n"), 3, { placeholder: "Homecoming\nGame day\nProm\nBaby showers" }));
    if (booths || v === "furniture") f.push(txt("rtHold", "Hold line", ext.holdNote || "", { max: 160, placeholder: "Call to hold an item for 24 hours." }));
    if (f.length) card("retail", "Shop details", f);
  }

  if (isP) {
    card("print", "Print shop details", [
      url("ptUpload", "Artwork upload link", ext.uploadUrl || "", { hint: "A Dropbox or Google Drive “file request” link: customers upload, files land in their folder", placeholder: "https://www.dropbox.com/request/…" }),
      txt("ptTurnaround", "Typical turnaround (their words)", ext.turnaround || "", { max: 160, placeholder: "About 10 business days after you approve the proof." }),
      txt("ptTiers", "Price breaks at (quantities, comma separated)", (ext.quantityTiers || []).map((x: AnyRecord) => (x.note ? `${x.from} ${x.note}` : String(x.from))).join(", "), { placeholder: "12, 24, 48, 72" }),
      url("ptStore", "Online / team store link", ext.storeUrl || ""),
      note("The quote form asks what, how many, needed-by date, print locations, artwork status and rush. The text never states turnaround or minimums unless typed here."),
    ]);
  }

  if (isParts) {
    const p = ext.parts || {};
    const counter = p.counter || {};
    const isOn = (id: string) => (id in counter ? !!counter[id] : PARTS_DEFAULT_ON.includes(id));
    card("parts", "Auto parts details", [
      note("The site sells the counter: call to check stock, special orders, people who know the part. Only what the owner tells you."),
      ta("services", "What they carry (one per line)", serviceLines, 8),
      h3("Services at the counter"),
      ...PARTS_COUNTER.map(([id, label]) => cb("pc_" + id, label, isOn(id))),
      cb("partsCounterOk", "Owner confirmed this is the list (required)", !!p.counterConfirmed),
      txt("partsTurnaround", "Special-order turnaround", p.turnaround || "", { max: 200, hint: "Their words, e.g. “Most parts by the next morning.”" }),
      cb("partsCommercial", "They offer commercial accounts / delivery to shops", !!p.commercial),
      ta("partsCommercialText", "Commercial accounts line (optional)", p.commercialText || "", 2, { placeholder: "Shops and fleets: ask about a commercial account and twice-daily delivery." }),
      txt("partsProgram", "Buying group / program", p.program || "", { max: 60, placeholder: "NAPA, Carquest, Parts Plus…" }),
      url("partsOrderUrl", "Its online ordering page (for pickup)", p.orderUrl || ""),
      note("With an ordering link, the site gets an “Order online for pickup” button and the text may mention it. Without one it never claims online ordering, shipping or prices."),
    ]);
  }

  if (isA && !isParts) {
    const v = r.variant as string;
    const on = new Set<string>(ext.amenities || []);
    const programs: string[] = ext.programs || [];
    const other = programs.filter((p) => !AUTO_PROGRAMS.includes(p));
    const fin = ext.financing || {}, tow = ext.tow || {}, body = ext.body || {};
    const f: Field[] = [
      note("Only what the owner confirms. Amenities go in a “Good to know” row under the opening; programs show as plain text (no logos)."),
      h3("Good to know"),
      ...AUTO_AMENITIES.map(([id, label]) => cb("am_" + id, label, on.has(id))),
      h3("Programs they belong to"),
      ...AUTO_PROGRAMS.map((p, i) => cb("pg_" + i, p, programs.includes(p))),
      txt("autoProgramsOther", "Other programs (comma separated)", other.join(", "), { placeholder: "Mitchell 1, Interstate Batteries dealer" }),
      txt("autoFinLender", "Financing through", fin.lender || "", { hint: "lender name only; the site never states approval odds or “no credit check”", placeholder: "Synchrony Car Care" }),
      url("autoFinUrl", "Apply link (optional)", fin.url || ""),
    ];
    if (v === "towing") f.push(h3("Towing"), txt("towPhone", "Tow line (if different from the shop number)", tow.phone || "", { type: "tel", placeholder: "(256) 555-0100" }), cb("towAlways", "Tow line is staffed 24/7 (owner confirmed; required before the site may say 24/7)", !!tow.always), txt("towYard", "Yard / pickup note (optional)", tow.yardNote || "", { placeholder: "Yard pickup weekdays 8 to 5; bring your ID and proof of ownership." }));
    if (v === "tire") f.push(h3("Tires"), ta("tireBrands", "Brands they carry (one per line)", (ext.tireBrands || []).join("\n"), 4, { placeholder: "Michelin\nGoodyear\nCooper" }), url("tireStoreUrl", "Online tire store (adds “Shop tires online”)", ext.storeUrl || ""));
    if (v === "body") f.push(h3("Body shop"), ta("bodyInsurers", "Insurance companies they work with (one per line)", (body.insurers || []).join("\n"), 4, { placeholder: "State Farm\nAlfa\nProgressive" }), ta("bodyCerts", "Certifications (one per line, their words)", (body.certifications || []).join("\n"), 3, { placeholder: "I-CAR Gold Class\nFord Certified Collision Network" }), cb("bodyRight", "Show the “You choose the shop” right-to-choose line (owner confirmed)", !!body.rightToChooseConfirmed), txt("bodyEstimate", "Estimate note (optional)", body.estimateNote || "", { placeholder: "Text us photos of the damage and we'll give you a rough estimate the same day." }), note("Before/after photos go in the Photo gallery card above (send 3 pairs)."));
    card("auto", "Auto shop details", f);
  }

  if (isRt) {
    const d = ext.donations || {};
    const thrift = r.variant === "thrift";
    const enabled = d.enabled === undefined ? thrift : !!d.enabled;
    card("donations", "Donations", [
      note(`${thrift ? "Thrift sites have two jobs: are you open, and what can I donate. Required until the lists and hours are filled in." : "For shops that take donations (resale, church stores, animal rescue shops)."} Only their own list.`),
      cb("donEnabled", "Show a Donations section", enabled),
      ta("donAccepts", "We gladly take (one per line)", (d.accepts || []).join("\n"), 5, { placeholder: "Clothing and shoes\nHousewares\nFurniture in good shape\nBooks and toys" }),
      ta("donNo", "We can't take (one per line)", (d.doesNotAccept || []).join("\n"), 4, { placeholder: "Mattresses\nTVs and old electronics\nCar seats and cribs" }),
      txt("donHours", "Drop-off hours", d.dropOffHours || "", { max: 200, placeholder: "Monday to Saturday, 10 to 4, at the back door" }),
      cb("donPickup", "They pick up furniture (adds a pickup request form)", !!d.pickup),
      txt("donPickupNote", "Pickup note (optional)", d.pickupNote || "", { max: 300, placeholder: "We pick up in Cullman County on Tuesdays and Thursdays." }),
      cb("donReceipts", "They're a nonprofit and give donation receipts", !!d.receipts),
      txt("donNote", "Intro line (optional)", d.note || "", { max: 400, placeholder: "Every donation helps fund the food pantry next door." }),
    ], { collapsed: !enabled });
  }

  if (isF) {
    const v = r.variant as string;
    const modes: string[] = ext.modes || [];
    const sh = ext.seasonHours || {}, ara = ext.advisorReviewsApproved || {};
    const peopleLines = (ext.people || []).map((p: AnyRecord) => pipeJoin([p.name, p.title || "", p.credentials || "", p.line || ""])).join("\n");
    const feeLines = (ext.fees || []).map((p: AnyRecord) => `${p.service} | ${p.price}`).join("\n");
    const f: Field[] = [
      note("Only what the owner tells you. Required checks block publishing until they're ticked."),
      sel("finVariant", "Type of office", v, FIN_VARIANTS),
      txt("finCredentials", "Credentials line", ext.credentials || "", { hint: "Their exact words, e.g. “Enrolled Agent” or “Jane Smith, CPA”" }),
      cb("finCredentialsConfirmed", "Owner confirmed the credentials line is right", !!ext.credentialsConfirmed),
      ta("finPeople", "Who you'll work with, one person per line: Name | Title | Credentials | One line", peopleLines, 4, { placeholder: "Jane Smith | Owner | Enrolled Agent | Jane has prepared returns in Cullman since 2009." }),
      cb("finPeopleOk", "Owner confirmed every name and credential above (required while anyone is listed)", !!ext.peopleConfirmed),
      txt("finWhoWeServe", "Who they serve (their words, optional)", ext.whoWeServe || "", { placeholder: "farms, trucking companies and small contractors" }),
      ta("finFees", "Published fees (optional), one per line: Service | Price", feeLines, 3, { hint: "Published fees must be honored for 30 days after a change.", placeholder: "Form 1040 with W-2s | from $150\nSchedule C | from $250" }),
      txt("finFeesAsOf", "Fees as of (month and year)", ext.feesAsOf || "", { placeholder: `${MONTHS_LONG[new Date().getMonth()]} ${new Date().getFullYear()}` }),
    ];
    if (v === "tax_prep") f.push(
      cb("finPtin", "Owner confirmed every paid preparer has a current PTIN (required)", !!ext.ptinConfirmed),
      cb("finEfile", "Owner confirmed they're an Authorized IRS e-file Provider (has an EFIN)", !!ext.efileProvider),
      txt("finOffSeason", "Hours after tax season", ext.offSeason || "", { placeholder: "After April 15, Monday to Thursday 9 to 4, or by appointment" }),
      h3("Tax season hours"),
      note("Google's hours stay the regular set. Inside this window the site shows these first with a “Tax season hours” chip; outside it they move under the regular hours."),
      txt("finSeasonFrom", "From (MM-DD)", sh.from || "", { placeholder: "01-15" }),
      txt("finSeasonTo", "To (MM-DD)", sh.to || "", { placeholder: "04-15" }),
      txt("finSeasonSummary", "Season hours (their words)", sh.summary || "", { placeholder: "Monday to Friday 8 to 7, Saturday 9 to 3" }),
      ta("finBring", "What to bring (one per line; leave blank for the standard list)", (ext.whatToBring || []).join("\n"), 5),
    );
    if (v === "tax_prep" || v === "accounting") f.push(cb("finCpa", "Owner confirmed an Alabama CPA firm permit (required if “CPA” appears anywhere)", !!ext.cpaPermitConfirmed), txt("finCpaNo", "Firm permit # (optional, shown in the footer)", ext.cpaPermitNo || ""));
    if (v === "insurance") f.push(
      cb("finIndependent", "Independent agency (works with several companies)", !!ext.independent),
      ta("finCarriers", "Companies they're appointed with, one per line: Name | pay-a-bill link | claims phone | claims link", carrierLines(ext.carriers), 5, { hint: "A name alone is fine; links add a “Pay a bill / Report a claim” list.", placeholder: "Progressive | https://account.progressive.com | 800-776-4737 | https://www.progressive.com/claims/\nAuto-Owners" }),
      txt("finMemberships", "Memberships (comma separated; text chips only, no logos)", (ext.memberships || []).join(", "), { placeholder: "Trusted Choice, Big “I”" }),
      cb("finLicenses", "Owner confirmed the agents shown are licensed in Alabama for these lines (required)", !!ext.licensesConfirmed),
      txt("finLicenseNo", "License # or NPN (optional, shown in the footer)", ext.licenseNo || ""),
      cb("finMedicare", "They sell Medicare Advantage or Part D plans", !!ext.medicare),
      ta("finTpmo", "Medicare disclaimer (required if they sell Medicare plans)", ext.tpmoDisclaimer || "", 4, { hint: "Paste the current (October 2026) CMS wording from their carrier or FMO; the SHIP reference was removed, so an older paste is out of date." }),
    );
    if (v === "financial_advisor") f.push(
      note("Ask first: does their firm let them use their own website? Most need compliance approval."),
      ta("finDisclosure", "Firm disclosure text (required, word for word)", ext.disclosure || "", 5, { placeholder: "Securities offered through …, Member FINRA/SIPC. Advisory services offered through …" }),
      txt("finApprovedBy", "Compliance approved by (required)", ext.complianceApprovedBy || ""),
      txt("finApprovedOn", "Approval date", ext.complianceApprovedOn || "", { type: "date" }),
      url("finBrokercheck", "BrokerCheck link", ext.brokercheckUrl || "", { placeholder: "https://brokercheck.finra.org/…" }),
      url("finCrs", "Form CRS link", ext.crsUrl || ""),
      note("Advisor sites show no reviews, ratings or testimonials by default. Alabama dropped its testimonial ban in Dec 2025, so if the firm's compliance department approves it in writing, fill in who and when and the site adds a reviews section with the SEC disclosure line under it."),
      txt("finRevBy", "Reviews approved by (compliance)", ara.by || ""),
      txt("finRevOn", "Approval date", ara.on || "", { type: "date" }),
    );
    f.push(cb("finSpanish", "Se habla español", !!ext.spanish), cb("finDrop", "Drop-off", modes.includes("drop_off")), cb("finInPerson", "In person", modes.includes("in_person")), cb("finVirtual", "Virtual", modes.includes("virtual")), url("finPortal", "Client portal link (document upload)", ext.portalUrl || ""));
    card("finance", "Tax & finance details", f);
  }

  if (isCh) {
    const v = r.variant as string;
    const fv = ext.firstVisit || {}, p = ext.pastor || {}, k = ext.kids || {}, hd = ext.hallDetails || {};
    const lines = (ext.schedule || []).map((s: AnyRecord) => `${s.day} | ${s.time} | ${s.label}${s.lang === "es" ? " | es" : ""}`).join("\n");
    const f: Field[] = [note("Only their own words. We never write beliefs, history or claims for them."), sel("chVariant", "Kind of group", v, CH_VARIANTS)];
    if (v === "church") f.push(
      txt("chLabel", "How they describe their church", ext.traditionLabel || "", { hint: "e.g. “Missionary Baptist church”, or just “Church”" }),
      cb("chLabelOk", "They confirmed this wording (required)", !!ext.traditionConfirmed),
      ta("chSchedule", "Service times, one per line: Day | Time | What", lines, 5, { hint: "add | es for a Spanish service", placeholder: "Sunday | 9:45 AM | Sunday School\nSunday | 11:00 AM | Worship\nWednesday | 6:30 PM | Prayer & Bible Study" }),
      cb("chScheduleOk", "They confirmed the service times (required)", !!ext.scheduleConfirmed),
      h3("Plan a visit (their answers)"),
      txt("chParking", "Parking and which door", fv.parking || ""), txt("chDress", "What people wear", fv.dress || ""), txt("chKids", "Kids and nursery", fv.kids || ""),
      txt("chLength", "How long services last", fv.length || ""), txt("chMusic", "Music", fv.music || ""), txt("chAccess", "Accessibility", fv.accessibility || ""),
      h3("Pastor"),
      txt("chPastorName", "Name", p.name || ""), txt("chPastorTitle", "Title (their words)", p.title || "", { placeholder: "Pastor, Bro., Father, Minister" }),
      ta("chPastorBio", "About them (written or approved by the church)", p.bio || "", 4),
      cb("chPastorOff", "Leave the pastor section off", !!ext.pastorOff),
      ta("chBeliefs", "What we believe (their statement, word for word; optional)", ext.beliefs || "", 4),
      url("chBeliefsUrl", "Or a link to their statement", ext.beliefsUrl || ""),
      url("chGive", "Online giving link (optional)", ext.givingUrl || "", { placeholder: "https://tithe.ly/…" }),
      url("chLive", "Watch live link (YouTube or Facebook)", ext.liveUrl || ""),
      url("chSermons", "Past services / sermons link", ext.sermonsUrl || ""),
      cb("chSpanish", "They have services in Spanish", !!ext.spanish),
      txt("chFacility", "Weddings & facility use (their policy)", ext.facility || ""),
      h3("Kids & students (their words)"),
      txt("chKidsNursery", "Nursery", k.nursery || "", { placeholder: "Birth through age 3, during Sunday School and worship" }), txt("chKidsKids", "Kids", k.kids || "", { placeholder: "Children's church for K to 5th grade during the 11:00 service" }),
      txt("chKidsStudents", "Students", k.students || "", { placeholder: "Youth meet Wednesdays at 6:30 in the fellowship hall" }), txt("chKidsCheckIn", "Check-in (only if they really do it)", k.checkIn || ""),
      h3("Links"),
      url("chPlanVisit", "Their own Plan-a-visit form (Church Center, Tithely…)", ext.planVisitUrl || ""),
      url("chConnectCard", "Connect card link", ext.connectCardUrl || ""),
      txt("chPrayer", "Prayer requests go to", ext.prayerUrl || "", { hint: "a link, mailto:pastor@… or sms:+1256…; we never store requests", placeholder: "mailto:" }),
      url("chBulletin", "Bulletin / newsletter link", ext.bulletinUrl || ""),
      url("chApp", "Church app link", ext.appUrl || ""),
      url("chPodcast", "Podcast link", ext.podcastUrl || ""),
      txt("chLiveNote", "Watch line (their words)", ext.liveNote || "", { placeholder: "Live Sundays at 10:30 on Facebook" }),
    );
    if (v === "charity") f.push(ta("chHelp", "Getting help: days, hours, who can come, what to bring (required)", ext.help || "", 4));
    if (v === "civic_post") f.push(txt("chMeetings", "When and where they meet (required)", ext.meetings || "", { placeholder: "2nd Tuesday, 6:30 PM, at the post home" }), ta("chJoinText", "Who can join and how (their words)", ext.joinText || "", 3), url("chJoinUrl", "Join link (optional)", ext.joinUrl || ""));
    if (v === "civic_post" || v === "community_center") f.push(txt("chHall", "Hall rental (a sentence or two)", ext.hall || ""), txt("chHallCap", "Seats (number)", hd.capacity || "", { placeholder: "150" }), txt("chHallTables", "Tables & chairs", hd.tables || "", { placeholder: "20 round tables, 160 chairs" }), cb("chHallKitchen", "Kitchen available", !!hd.kitchen), txt("chHallHow", "How to book", hd.how || "", { placeholder: "Call the post home Tuesday to Friday, 10 to 2." }));
    if (v === "charity") f.push(url("chVolunteerUrl", "Volunteer sign-up link", ext.volunteerUrl || ""));
    if (v !== "church") f.push(url("chDonate", "Donate link", ext.donateUrl || ""), txt("chNeeded", "Items they need", ext.needed || ""), txt("chVolunteer", "How to volunteer", ext.volunteer || ""), txt("chStatus", "Nonprofit status line (their words)", ext.statusText || "", { placeholder: "We're a 501(c)(3); gifts are tax-deductible." }), cb("chStatusOk", "They confirmed this status line", !!ext.deductibleConfirmed));
    card("church", "Church & nonprofit details", f);
  }

  if (isC) {
    const fin = ext.financing || {}, ah = ext.afterHours || {};
    const hvac = r.variant === "hvac", remodel = r.variant === "remodeling";
    card("contractor", "Contractor details", [
      sel("cServes", "Who they work with", ext.serves || "", [["", "Not set"], ["residential", "Homeowners"], ["commercial", "Businesses"], ["both", "Both homes and businesses"]]),
      h3("Financing"),
      note("Name the lender and paste their application link. The site says “Financing available” and “Apply with <lender>”; it never states rates, 0% or approval odds."),
      txt("cFinLender", "Lender", fin.lender || "", { max: 60, placeholder: "Wisetack, GreenSky, Synchrony…" }),
      url("cFinUrl", "Application link", fin.url || ""),
      ta("cWarranty", "Warranty, in their words", ext.warrantyText || "", 2, { max: 300, placeholder: "Our workmanship is covered for one year. If something we did fails, we come back and fix it at no charge." }),
      h3("Emergency calls"),
      note(ext.emergencyService ? "“Offers emergency service” is on, so the site shows an “Emergency? Call…” line under the header. Required before publishing: confirm the terms." : "Tick “Offers emergency service” under Facts to show an emergency line."),
      txt("cAhPhone", "After-hours number (if different)", ah.phone || "", { type: "tel", max: 30, placeholder: "(256) 555-0199" }),
      txt("cAhNote", "Terms, their words", ah.note || "", { max: 160, placeholder: "Nights and weekends; after-hours rates apply" }),
      cb("cAhOk", "Owner confirmed the emergency terms (hours, extra charges)" + (ext.emergencyService ? " (required)" : ""), !!ah.confirmed),
      ...(hvac ? [note("Alabama HVAC rule: the AL# certification number must be on the home page. Type it under License # in Facts; the site shows “AL# …” next to the name.")] : []),
      ...(remodel ? [cb("cOver10k", "They take jobs over $10,000 (Alabama then requires the HBLB license number on the site)", !!ext.jobsOver10k)] : []),
    ]);
  }

  if (isL) {
    card("landscaping", "Lawn & landscape details", [
      cb("lSeasonal", "Show a 4-season “what we do when” calendar (built from the services list, North Alabama timing)", !!ext.seasonal),
      txt("lAdai", "ADAI permit #", ext.adaiPermit || "", { max: 40, hint: "Required before publishing if the services include fertilizing, weed control or pest treatments" }),
      txt("lCrew", "Meet the crew (one line, their words)", ext.crew || "", { max: 160, placeholder: "Owner-operated: Jake runs every job." }),
    ]);
  }

  if (isK) {
    if (r.variant === "commercial") {
      const fac = new Set<string>(ext.facilities || []);
      card("cleaning", "Commercial cleaning details", [
        note("The site asks for a walkthrough, then a written scope and a schedule. Tick only the building types they really clean."),
        h3("Buildings they clean"),
        ...CLEANING_FACILITIES.map((n, i) => cb("kFac_" + i, n, fac.has(n))),
        txt("kFreq", "How often, their words", ext.frequency || "", { max: 120, placeholder: "Nightly, weekly or on your schedule" }),
        cb("kAfterHours", "They clean after hours", !!ext.afterHours),
      ]);
    } else if (r.variant === "residential") {
      const ck = ext.checklist || { rooms: [], tiers: [], extras: [] };
      const rooms = cleaningRooms(ck);
      const tasksOf = (name: string) => { const rm = (ck.rooms || []).find((q: AnyRecord) => q.room === name); return rm ? rm.tasks.join("\n") : ""; };
      card("cleaning", "What's included", [
        note("Their checklist, one task per line. Name the tiers (e.g. Standard, Deep, Move-out), then tag a task that's only in some tiers with @deep or @move; untagged tasks are in every tier. It renders as a tick-box comparison table."),
        txt("kTiers", "Tiers (comma separated)", (ck.tiers || []).join(", "), { max: 120, placeholder: "Standard, Deep, Move-out" }),
        ...rooms.map((name, i) => ta("kRoom_" + i, name, tasksOf(name), 3, { placeholder: i === 1 ? "Counters and sink\nOutside of appliances\nInside the oven @deep @move" : i === 0 ? "Dust surfaces\nVacuum and mop floors\nBaseboards @deep @move" : "" })),
        ta("kExtras", "May cost extra (one per line)", (ck.extras || []).join("\n"), 3, { placeholder: "Inside the fridge\nInterior windows\nLaundry" }),
      ]);
    }
  }

  if (isC || isL || isK) {
    const h = PLAN_HINT[cat] || PLAN_HINT.cleaning!;
    const list: AnyRecord[] = (r.plans || []).concat([{}, {}, {}]).slice(0, 3);
    const lawn = isL && r.variant === "lawn_crew";
    const pf: Field[] = [note(`Up to 3 cards: ${isC ? "maintenance or service plans (HVAC, pest, garage doors)" : isL ? "ways to work with us (weekly, every 2 weeks, one-time)" : r.variant === "exterior" ? "flat-rate packages" : "recurring tiers"}. Prices are optional and always shown as starting points.${lawn ? " Lawn sites show weekly / every 2 weeks / one-time cards with no prices until you fill these in; one named plan here replaces them." : ""}`)];
    list.forEach((p, i) => {
      pf.push(h3(`Plan ${i + 1}${p.name ? ": " + p.name : ""}`));
      pf.push(txt(`plan${i}_name`, "Name", p.name || "", { max: 60, placeholder: h[0] }), txt(`plan${i}_badge`, "Badge", p.badge || "", { max: 30, placeholder: h[3] }));
      pf.push(txt(`plan${i}_price`, "Price (optional)", p.price || "", { max: 30, placeholder: h[1] }), txt(`plan${i}_unit`, "Per", p.unit || "", { max: 30, placeholder: h[2] }));
      pf.push(ta(`plan${i}_includes`, "What's included (one per line)", (p.includes || []).join("\n"), 4, { placeholder: h[4] }));
      pf.push(txt(`plan${i}_note`, "Note (optional)", p.note || "", { max: 160, placeholder: "Cancel any time." }));
    });
    card("plans", "Plans & pricing", pf, { collapsed: !(r.plans && r.plans.length) });
    const g = r.guarantee || {};
    card("guarantee", "Guarantee", [
      note("Only in the owner's words; the site shows nothing here until something is typed. It becomes a trust chip, a line under the services and an FAQ answer."),
      txt("gWindow", "Window", g.window || "", { max: 40, placeholder: isK ? "24 hours" : "30 days" }),
      txt("gRemedy", "What they do", g.remedy || "", { max: 160, placeholder: isK ? "we'll come back and re-clean it free" : "we come back and make it right" }),
      txt("gText", "Or the whole line, their way (optional)", g.text || "", { max: 240, placeholder: isK ? "Not happy with a room? Tell us within 24 hours and we'll re-clean it free." : "" }),
    ], { collapsed: !(g.window || g.text) });
    card("offers", "Offers & coupons", [
      note("One per line as offer | code | expires | details. Code and details are optional; expires is YYYY-MM-DD and the offer hides itself after that day. The first one shows as a bar under the opening, the rest as cards."),
      ta("offers", "Offers", offerLines(r.offers), 3, { placeholder: "$25 off your first clean | WEB25 | 2026-12-31 | New customers, mention this website." }),
    ], { collapsed: !(r.offers && r.offers.length) });
  }

  const links = r.links || {};
  const social = links.social || {};
  card("links", "Links", [
    ...(isR ? [url("order", "Online ordering link", links.order || ""), url("reserve", "Reservations link", links.reserve || "")] : []),
    ...(isRt ? [url("shop", r.variant === "florist" ? "Online flower order page" : "Online shop (Shopify, Etsy, Facebook shop)", ext.shopUrl || "")] : []),
    ...(isP ? [txt("email", "Email for artwork", r.email || "", { type: "email", placeholder: "orders@…" })] : []),
    url("booking", "Online booking link", links.booking || ""),
    ...(isR || isS || isRt ? [url("giftCards", "Gift cards link (Square, Toast, their booking tool)", links.giftCards || "")] : []),
    ...(isA && !isParts ? [note("Ask which shop software they use. Tekmetric: Settings → Online Booking gives a public “direct link”. Shopmonkey: the Work Request form has a shareable public URL. ShopGenie: the online scheduling page has its own link. AutoLeap: the online booking page URL. Paste that link here and the site's main button becomes Book online.")] : []),
    url("facebook", "Facebook page", social.facebook || "", { placeholder: "https://facebook.com/…" }),
    url("instagram", "Instagram", social.instagram || "", { placeholder: "https://instagram.com/…" }),
  ]);

  const textFields: Field[] = [
    txt("heroTagline", "Headline line", c.heroTagline || ""),
    ta("heroSub", "Short intro", c.heroSub || "", 2),
    ta("about", "About (blank line between paragraphs)", (c.about || []).join("\n\n"), 8),
    txt("ctaTitle", "Closing heading", c.ctaTitle || ""),
    txt("ctaLine", "Closing line", c.ctaLine || ""),
    ta("metaDescription", "Google search description", c.meta?.description || "", 3, { hint: "About 150 characters" }),
  ];
  if (isC || isL || isK) textFields.push(txt("heroQuestion", "Question headline", c.heroQuestion || "", { max: 80, hint: "Used by the “A question” headline style", placeholder: "Is your AC blowing warm air?" }), txt("heroBenefit", "Benefit headline", c.heroBenefit || "", { max: 80, hint: "Used by the “A benefit” headline style", placeholder: "Take your weekend back" }));
  if (hasServices) for (const s of r.services || []) textFields.push(ta("blurb_" + s.id, s.name, (c.serviceBlurbs || {})[s.id] || "", 3));
  card("text", "Text", textFields);

  if (isR) {
    const items: AnyRecord[] = ((((r.ext || {}).restaurant || {}).menu || {}).sections || []).flatMap((s: AnyRecord) => s.items).slice(0, 60);
    const photos: AnyRecord[] = gallery.filter((g) => g.source !== "google");
    const mf: Field[] = [note("One item per line: Name | $Price | Description. Start a section with # Section name."), ta("menuText", "Menu", l.menuText || "", 12, { placeholder: "# Plates\nPulled pork plate | $12 | Two sides and bread" })];
    if (!items.length) mf.push(note("Save the menu first, then come back to add dish photos and tags."));
    else {
      mf.push(h3(`Dish photos & tags (${items.length} items)`));
      mf.push(note(photos.length ? "Pick a gallery photo for 3 or 4 best sellers and tag them Popular: they become photo tiles on the home page." : "Add the owner's dish photos in Photo gallery first, then pick one per item here. Tags show on the menu."));
      items.forEach((it, i) => {
        mf.push({ type: "hidden", name: `mi_name_${i}`, value: it.name });
        mf.push(h3(it.name));
        if (photos.length) mf.push(sel(`mi_img_${i}`, "Photo", it.image?.src || "", [["", "No photo"], ...photos.map((g, gi): [string, string] => [g.src, `Photo ${gi + 1}: ${g.alt}`])]));
        for (const [tg, label] of MENU_TAGS) mf.push(cb(`mi_tag_${i}_${tg}`, label, (it.tags || []).includes(tg)));
      });
    }
    card("menu", "Menu", mf);
  }

  if (hasServices && !isParts) {
    card("services", hasTowns ? "Services & area" : "Services", [
      ta("services", isS ? "Services, prices and how long, one per line" : "Services (one per line)", serviceLines, 7, isS ? { hint: "e.g. Haircut | $25 | 30 min or Color | from $80 | 90 min" } : {}),
      ...(hasTowns ? [ta("towns", "Towns served (comma separated)", (r.serviceArea || { towns: [] }).towns.join(", "), 3)] : []),
    ]);
  }

  card("quotes", "Customer quotes", [
    note("Only real quotes the customer said you can use. Never copy Google reviews."),
    ...t.flatMap((q, i) => [ta(`q${i}`, `Quote ${i + 1}`, q.quote || "", 2), txt(`qn${i}`, "Name", q.displayName || "", { placeholder: "Amy R." }), txt(`qt${i}`, "Town", q.town || "")]),
  ], { collapsed: !t.some((q) => q.quote) });

  card("approved", "Approval", [cb("approved", "The owner has read and approved all the text", !!c.approved)]);

  return { cards, name: r.name, category: cat, variant: r.variant ?? null };
}

function cleaningRooms(ck: AnyRecord): string[] {
  return CHECKLIST_ROOMS.concat((ck.rooms || []).map((rm: AnyRecord) => rm.room).filter((n: string) => !CHECKLIST_ROOMS.includes(n)));
}

// ---- values → edits ----

export interface EditsResult {
  edits: Edits;
  warnings: string[];
}

/** The same object the web editor's Save builds, from the app's field values. Unknown or absent fields are left out. */
export function editsFromForm(l: EditDetail, values: FormValues): EditsResult {
  const r = l.record;
  const cat = r.category as string;
  const isR = cat === "restaurant", isC = cat === "contractor", isS = cat === "salon", isA = cat === "auto", isL = cat === "landscaping", isK = cat === "cleaning", isP = cat === "print", isRt = cat === "retail", isF = cat === "finance", isCh = cat === "church";
  const isM = isS && r.variant === "massage";
  const isParts = isA && r.variant === "parts";
  const serviceArea = isC || isL || isK;
  const hasServices = !isR;
  const hasTowns = isC || isL || isK || (isA && !isParts);
  const warnings: string[] = [];

  const has = (n: string) => values[n] !== undefined;
  const v = (n: string): string | undefined => (has(n) ? String(values[n] ?? "").trim() : undefined);
  const raw = (n: string): string | undefined => (has(n) ? String(values[n] ?? "") : undefined);
  const on = (n: string): boolean | undefined => (has(n) ? values[n] === true || values[n] === "true" || values[n] === "on" : undefined);
  const num = (n: string): number | null => (v(n) ? Number(v(n)) : null);
  const lines = (n: string): string[] | undefined => (has(n) ? String(values[n] ?? "").split("\n").map((x) => x.trim()).filter(Boolean) : undefined);
  const pipe = (line: string) => line.split("|").map((x) => x.trim());
  const clean = <T extends Record<string, unknown>>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) as Partial<T>;

  const confirmed = confirmable(r).map(([k]) => k).filter((k) => on("confirm_" + k));
  const testimonials = [0, 1, 2].map((i) => ({ quote: v("q" + i), displayName: v("qn" + i), town: v("qt" + i) || undefined })).filter((q) => q.quote && q.displayName);
  const blurbs: Record<string, string> = {};
  if (hasServices) for (const s of r.services || []) { const b = v("blurb_" + s.id); if (b !== undefined) blurbs[s.id] = b; }

  const events: AnyRecord[] = [];
  for (const line of (raw("events") || "").split("\n")) {
    const parts = pipe(line);
    if (parts.length < 2 || !parts[1]) continue;
    const m = /^(\d{4}-\d{2}-\d{2})(?:\s*\.\.\s*(\d{4}-\d{2}-\d{2}))?$/.exec(parts[0] || "");
    if (!m) { warnings.push(`Event "${parts[1]}" needs a date like 2026-10-25.`); continue; }
    const e: AnyRecord = { title: parts[1].slice(0, 80), date: m[1] };
    if (m[2]) e.endDate = m[2];
    if (parts[2]) e.time = parts[2].slice(0, 40);
    if (parts[3]) e.detail = parts[3].slice(0, 240);
    if (parts[4] && /^https?:\/\//.test(parts[4])) e.url = parts[4];
    events.push(e);
  }

  const offers: AnyRecord[] = [];
  if (has("offers")) {
    for (const line of (raw("offers") || "").split("\n")) {
      const parts = pipe(line);
      if (!parts[0]) continue;
      const o: AnyRecord = { title: parts[0].slice(0, 80) };
      if (parts[1]) o.code = parts[1].slice(0, 30);
      if (parts[2]) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(parts[2])) { warnings.push(`Offer "${o.title}" needs an expiry like 2026-12-31 (or leave it blank).`); continue; }
        o.expiresOn = parts[2];
      }
      if (parts[3]) o.detail = parts[3].slice(0, 160);
      offers.push(o);
    }
  }

  // proof + visit
  const awards = (lines("prAwards") || []).map((ln) => { const [name, year] = pipe(ln); return name ? { name: name.slice(0, 80), year: (year || "").slice(0, 12) || undefined } : null; }).filter(Boolean) as AnyRecord[];
  const stats = (lines("prStats") || []).map((ln) => { const [value, label] = pipe(ln); return value && label ? { value: value.slice(0, 20), label: label.slice(0, 60) } : null; }).filter(Boolean) as AnyRecord[];
  const proof = { awards: awards.slice(0, 12), memberships: (lines("prMemberships") || []).slice(0, 12), clients: (lines("prClients") || []).slice(0, 20), stats: stats.slice(0, 6) };
  const closures = (lines("vsClosures") || []).map((ln) => { const [date, label] = pipe(ln); return /^\d{4}-\d{2}-\d{2}$/.test(date || "") && label ? { date, label: label.slice(0, 80) } : null; }).filter(Boolean).slice(0, 20) as AnyRecord[];
  const visit = { paymentMethods: (v("vsPay") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10), parking: v("vsParking") || "" };

  // gallery meta
  const galleryMeta: Record<string, AnyRecord> = {};
  for (const p of r.media?.gallery || []) {
    const key = photoKey(p.src);
    if (!has("gcap_" + key)) continue;
    galleryMeta[p.src] = { caption: v("gcap_" + key) || "", town: v("gtown_" + key) || "", pairWith: v("gpair_" + key) || "" };
  }

  // category modules
  const restaurant = isR ? clean({ catering: on("rsCatering"), cateringNote: v("rsCateringNote"), calendarUrl: v("rsCalendar"), rewardsUrl: v("rsRewards"), deliveryLinks: { doordash: v("rsDoordash") || "", ubereats: v("rsUbereats") || "", grubhub: v("rsGrubhub") || "" } }) : undefined;
  const menuItems: AnyRecord[] | undefined = isR ? (() => {
    const out: AnyRecord[] = [];
    for (let i = 0; i < 60; i++) {
      const name = v(`mi_name_${i}`);
      if (!name) break;
      const tags = MENU_TAGS.map(([tg]) => tg).filter((tg) => on(`mi_tag_${i}_${tg}`));
      const img = v(`mi_img_${i}`);
      out.push(clean({ name, image: img, tags }));
    }
    return out;
  })() : undefined;

  let salon: AnyRecord | undefined;
  if (isS) {
    const team = (lines("slTeam") || []).map((ln) => { const [name, role, days, bookingUrl, line] = pipe(ln); return name ? clean({ name: name.slice(0, 60), role: role || undefined, days: days || undefined, bookingUrl: bookingUrl && /^https?:\/\//.test(bookingUrl) ? bookingUrl : undefined, line: line || undefined }) : null; }).filter(Boolean).slice(0, 20);
    const out: AnyRecord = { team, teamConfirmed: on("slTeamOk"), policies: { deposit: v("slDeposit") || "", cancellation: v("slCancel") || "", lateness: v("slLate") || "", kids: v("slKids") || "" }, introOffer: { text: v("slOffer") || "", until: v("slOfferUntil") || "" } };
    if (r.variant === "massage") out.rates = (lines("slRates") || []).map((ln) => { const [m, price] = pipe(ln); const minutes = Number((m || "").replace(/\D/g, "")); return minutes && price ? { minutes, price: price.slice(0, 20) } : null; }).filter(Boolean).slice(0, 10);
    if (r.variant === "pet") out.pet = { vaccinations: v("slVax") || "", pricingFrom: v("slPricing") || "", mattingNote: v("slMatting") || "", prep: v("slPrep") || "" };
    salon = clean(out);
  }

  let retail: AnyRecord | undefined;
  if (isRt) {
    const out: AnyRecord = {};
    if (r.variant === "florist") out.florist = { occasions: lines("rtOccasions") || [], deliveryArea: v("rtArea") || "", cutoff: v("rtCutoff") || "", deliveryFee: v("rtFee") || "", designersChoice: !!on("rtDesigners") };
    if (has("rtBooths")) out.vendors = { boothsAvailable: !!on("rtBooths"), note: v("rtVendorNote") || "" };
    if (has("rtDepartments")) { out.departments = lines("rtDepartments"); out.brands = lines("rtBrands"); }
    if (has("rtDeliveryNote")) { out.deliveryNote = v("rtDeliveryNote"); out.financing = { lender: v("rtLender") || "", url: v("rtLenderUrl") || "" }; }
    if (has("rtDropDay")) { out.dropDay = v("rtDropDay"); out.occasions = lines("rtOcc2"); }
    if (has("rtHold")) out.holdNote = v("rtHold");
    retail = clean(out);
  }

  const print = isP ? clean({
    uploadUrl: v("ptUpload"), turnaround: v("ptTurnaround"), storeUrl: v("ptStore"),
    quantityTiers: (v("ptTiers") || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const m = /^(\d+)\+?\s*(.*)$/.exec(x); return m ? { from: Number(m[1]), note: (m[2] || "").slice(0, 40) || undefined } : null; }).filter((x): x is { from: number; note: string | undefined } => !!x && x.from > 0).slice(0, 8),
  }) : undefined;

  const parts = isParts ? (() => { const counter: Record<string, boolean> = {}; PARTS_COUNTER.forEach(([id]) => { counter[id] = !!on("pc_" + id); }); return { counter, counterConfirmed: on("partsCounterOk"), turnaround: v("partsTurnaround"), commercial: on("partsCommercial"), commercialText: v("partsCommercialText"), program: v("partsProgram"), orderUrl: v("partsOrderUrl") }; })() : undefined;

  const auto = isA && !isParts ? clean({
    amenities: AUTO_AMENITIES.map(([id]) => id).filter((id) => on("am_" + id)),
    programs: AUTO_PROGRAMS.filter((_, i) => on("pg_" + i)).concat((v("autoProgramsOther") || "").split(",").map((x) => x.trim()).filter(Boolean)),
    financing: v("autoFinLender") ? { lender: v("autoFinLender"), url: v("autoFinUrl") || "" } : null,
    tow: r.variant === "towing" ? { phone: v("towPhone") || "", always: !!on("towAlways"), yardNote: v("towYard") || "" } : undefined,
    tireBrands: r.variant === "tire" ? lines("tireBrands") : undefined,
    storeUrl: r.variant === "tire" ? v("tireStoreUrl") : undefined,
    body: r.variant === "body" ? { insurers: lines("bodyInsurers") || [], certifications: lines("bodyCerts") || [], rightToChooseConfirmed: !!on("bodyRight"), estimateNote: v("bodyEstimate") || "" } : undefined,
  }) : undefined;

  const donations = isRt ? clean({ enabled: on("donEnabled"), accepts: lines("donAccepts"), doesNotAccept: lines("donNo"), dropOffHours: v("donHours"), pickup: on("donPickup"), pickupNote: v("donPickupNote"), receipts: on("donReceipts"), note: v("donNote") }) : undefined;

  let finance: AnyRecord | undefined;
  if (isF) {
    const parseCarriers = (text: string) => text.split("\n").map((ln) => pipe(ln)).filter((p) => p[0]).map((p) => (p.length === 1 ? p[0] : { name: p[0], payUrl: p[1] || undefined, claimsPhone: p[2] || undefined, claimsUrl: p[3] || undefined }));
    finance = clean({
      variant: v("finVariant"), credentials: v("finCredentials"), credentialsConfirmed: on("finCredentialsConfirmed"),
      ptinConfirmed: on("finPtin"), efileProvider: on("finEfile"), offSeason: v("finOffSeason"), whatToBring: lines("finBring"),
      cpaPermitConfirmed: on("finCpa"), cpaPermitNo: v("finCpaNo"),
      independent: on("finIndependent"), carriers: has("finCarriers") ? parseCarriers(raw("finCarriers") || "") : undefined, licensesConfirmed: on("finLicenses"), licenseNo: v("finLicenseNo"), medicare: on("finMedicare"), tpmoDisclaimer: v("finTpmo"),
      disclosure: v("finDisclosure"), complianceApprovedBy: v("finApprovedBy"), complianceApprovedOn: v("finApprovedOn"), brokercheckUrl: v("finBrokercheck"), crsUrl: v("finCrs"),
      spanish: on("finSpanish"), modes: ([["finDrop", "drop_off"], ["finInPerson", "in_person"], ["finVirtual", "virtual"]] as const).filter(([n]) => on(n)).map(([, m]) => m),
      portalUrl: v("finPortal"),
      people: has("finPeople") ? (raw("finPeople") || "").split("\n").map((ln) => pipe(ln)).filter((p) => p[0]).map((p) => ({ name: p[0], title: p[1] || "", credentials: p[2] || undefined, line: p.slice(3).join(" | ") || undefined })) : undefined,
      peopleConfirmed: on("finPeopleOk"), whoWeServe: v("finWhoWeServe"),
      fees: has("finFees") ? (raw("finFees") || "").split("\n").map((ln) => pipe(ln)).filter((p) => p[0] && p[1]).map((p) => ({ service: p[0], price: p[1] })) : undefined,
      feesAsOf: v("finFeesAsOf"),
      seasonHours: has("finSeasonSummary") ? (v("finSeasonFrom") && v("finSeasonTo") && v("finSeasonSummary") ? { from: v("finSeasonFrom"), to: v("finSeasonTo"), summary: v("finSeasonSummary") } : null) : undefined,
      memberships: has("finMemberships") ? (v("finMemberships") || "").split(",").map((x) => x.trim()).filter(Boolean) : undefined,
      advisorReviewsApproved: has("finRevBy") ? (v("finRevBy") && v("finRevOn") ? { by: v("finRevBy"), on: v("finRevOn") } : null) : undefined,
    });
  }

  let church: AnyRecord | undefined;
  if (isCh) {
    const sched = has("chSchedule") ? (raw("chSchedule") || "").split("\n").map((ln) => pipe(ln)).filter((p) => p.length >= 2 && p[0]).map((p) => {
      const es = p.length >= 4 && /^es$/i.test(p[p.length - 1]!);
      const ps = es ? p.slice(0, -1) : p;
      const row: AnyRecord = ps.length === 2 ? { day: ps[0], time: "", label: ps[1] } : { day: ps[0], time: ps[1], label: ps.slice(2).join(" ") || ps[1] };
      return es ? { ...row, lang: "es" } : row;
    }) : undefined;
    church = clean({
      variant: v("chVariant"), traditionLabel: v("chLabel"), traditionConfirmed: on("chLabelOk"), schedule: sched, scheduleConfirmed: on("chScheduleOk"),
      firstVisit: has("chParking") ? { parking: v("chParking"), dress: v("chDress"), kids: v("chKids"), length: v("chLength"), music: v("chMusic"), accessibility: v("chAccess") } : undefined,
      pastor: has("chPastorName") ? { name: v("chPastorName"), title: v("chPastorTitle"), bio: v("chPastorBio") } : undefined,
      pastorOff: on("chPastorOff"), beliefs: v("chBeliefs"), beliefsUrl: v("chBeliefsUrl"),
      givingUrl: v("chGive"), liveUrl: v("chLive"), sermonsUrl: v("chSermons"), spanish: on("chSpanish"), facility: v("chFacility"),
      help: v("chHelp"), meetings: v("chMeetings"), joinText: v("chJoinText"), joinUrl: v("chJoinUrl"), hall: v("chHall"),
      donateUrl: v("chDonate"), needed: v("chNeeded"), volunteer: v("chVolunteer"), statusText: v("chStatus"), deductibleConfirmed: on("chStatusOk"),
      kids: has("chKidsNursery") ? { nursery: v("chKidsNursery"), kids: v("chKidsKids"), students: v("chKidsStudents"), checkIn: v("chKidsCheckIn") } : undefined,
      planVisitUrl: v("chPlanVisit"), connectCardUrl: v("chConnectCard"), prayerUrl: v("chPrayer"), bulletinUrl: v("chBulletin"), appUrl: v("chApp"), podcastUrl: v("chPodcast"), liveNote: v("chLiveNote"),
      hallDetails: has("chHallCap") ? { capacity: v("chHallCap"), kitchen: !!on("chHallKitchen"), tables: v("chHallTables"), how: v("chHallHow") } : undefined,
      volunteerUrl: v("chVolunteerUrl"),
    });
  }

  const contractor = isC ? clean({ serves: v("cServes"), financingLender: v("cFinLender"), financingUrl: v("cFinUrl"), warrantyText: v("cWarranty"), afterHoursPhone: v("cAhPhone"), afterHoursNote: v("cAhNote"), afterHoursConfirmed: on("cAhOk"), jobsOver10k: on("cOver10k") }) : undefined;
  const landscaping = isL ? clean({ seasonal: on("lSeasonal"), adaiPermit: v("lAdai"), crew: v("lCrew") }) : undefined;

  let cleaning: AnyRecord | undefined;
  if (isK) {
    if (r.variant === "commercial") {
      if (has("kFreq")) cleaning = { facilities: CLEANING_FACILITIES.filter((_, i) => on("kFac_" + i)), frequency: v("kFreq"), afterHours: !!on("kAfterHours") };
    } else if (has("kTiers")) {
      const ck = ((r.ext || {}).cleaning || {}).checklist || { rooms: [] };
      const rooms: AnyRecord[] = [];
      cleaningRooms(ck).forEach((name, i) => { const tasks = (lines("kRoom_" + i) || []).slice(0, 30); if (tasks.length) rooms.push({ room: name, tasks }); });
      cleaning = { checklist: { rooms, tiers: (v("kTiers") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4), extras: (lines("kExtras") || []).slice(0, 20) } };
    }
  }

  let plans: AnyRecord[] | undefined;
  if (isC || isL || isK) {
    plans = [];
    for (let i = 0; i < 3; i++) {
      if (!has(`plan${i}_name`)) { plans = undefined; break; }
      const name = v(`plan${i}_name`);
      if (!name) continue;
      plans.push({ name, price: v(`plan${i}_price`) || "", unit: v(`plan${i}_unit`) || "", badge: v(`plan${i}_badge`) || "", note: v(`plan${i}_note`) || "", includes: (lines(`plan${i}_includes`) || []).slice(0, 8) });
    }
  }
  const guarantee = (isC || isL || isK) && has("gWindow") ? { window: v("gWindow") || "", remedy: v("gRemedy") || "", text: v("gText") || "" } : undefined;

  const hiringRoles = (lines("hiringRoles") || []).slice(0, 8);

  const record: AnyRecord = clean({
    name: v("name"),
    phone: v("phone"),
    smsEnabled: on("smsEnabled"),
    showStreetAddress: serviceArea ? on("showStreetAddress") : undefined,
    foundedYear: has("foundedYear") ? num("foundedYear") : undefined,
    familyOwned: on("familyOwned"),
    insured: on("insured"),
    bonded: on("bonded"),
    license: isC || isL || isM ? (v("licenseNumber") ? { label: v("licenseLabel") || "License", number: v("licenseNumber") } : null) : undefined,
    emergencyService: on("emergencyService"),
    freeEstimates: on("freeEstimates"),
    walkIns: isS ? v("walkIns") || null : undefined,
    ase: on("ase"),
    warranty: isA && !isParts && has("warrantyMonths") ? { months: num("warrantyMonths"), miles: num("warrantyMiles"), nationwide: !!on("warrantyNationwide") } : undefined,
    backgroundChecked: on("backgroundChecked"),
    suppliesIncluded: on("suppliesIncluded"),
    petSafe: on("petSafe"),
    links: clean({ order: v("order"), reserve: v("reserve"), booking: v("booking"), facebook: v("facebook"), instagram: v("instagram"), shop: isRt ? v("shop") : undefined, giftCards: isR || isS || isRt ? v("giftCards") : undefined }),
    proof: has("prAwards") ? proof : undefined,
    closures: has("vsClosures") ? closures : undefined,
    visit: has("vsPay") ? visit : undefined,
    restaurant, menuItems,
    salon, retail, print,
    hiring: has("hiringRoles") ? (hiringRoles.length ? { roles: hiringRoles, how: v("hiringHow") || "" } : null) : undefined,
    events: has("events") ? events.slice(0, 20) : undefined,
    email: isP ? v("email") : undefined,
    designHelp: isP ? on("designHelp") : undefined,
    proofBeforePrint: isP ? on("proofBeforePrint") : undefined,
    install: isP && r.variant === "signs" ? on("install") : undefined,
    giftCards: isRt ? on("giftCardsSold") : undefined,
    delivery: isRt ? on("delivery") : undefined,
    donations,
    parts, auto, finance, church, contractor, landscaping, cleaning,
    plans, guarantee,
    offers: has("offers") ? offers.slice(0, 6) : undefined,
    galleryMeta: Object.keys(galleryMeta).length ? galleryMeta : undefined,
    testimonials,
    towns: hasTowns && has("towns") ? (v("towns") || "").split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    services: hasServices && has("services") ? lines("services") : undefined,
    menuText: isR ? raw("menuText") : undefined,
    confirmed,
  });

  const copy: AnyRecord = clean({
    heroTagline: v("heroTagline"),
    heroSub: v("heroSub"),
    about: has("about") ? (raw("about") || "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : undefined,
    ctaTitle: v("ctaTitle"),
    ctaLine: v("ctaLine"),
    metaDescription: v("metaDescription"),
    serviceBlurbs: hasServices ? blurbs : undefined,
    approved: on("approved"),
    heroQuestion: v("heroQuestion"),
    heroBenefit: v("heroBenefit"),
  });

  const edits: AnyRecord = { record, copy };
  if (has("lookBase") && has("layout")) edits.look = `${v("lookBase")}~${v("layout") || "classic"}${dnaCode(values, l.dnaOrder)}`;
  return { edits: edits as Edits, warnings };
}

/** "~h1n0b2…" from the structure picks, or "" when every pick is the classic one. */
export function dnaCode(values: FormValues, order: EditDetail["dnaOrder"]): string {
  if (!order || !order.length) return "";
  let code = "";
  let any = false;
  for (const k of order) {
    const picked = values["dna_" + k.id];
    const i = picked === undefined ? 0 : Math.max(0, k.values.findIndex((x) => x.id === String(picked)));
    code += k.letter + i;
    if (i) any = true;
  }
  return any ? "~" + code : "";
}
