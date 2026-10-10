import assert from "node:assert/strict";
import { test } from "node:test";
import { closureText, ownerProof, upcomingClosures } from "../src/generator/components.ts";
import { pickDna } from "../src/generator/dna.ts";
import { pickDesign } from "../src/generator/design.ts";
import { parseMenuText } from "../src/generator/menu.ts";
import { restaurantBannedPhrases } from "../src/generator/packs/restaurant.ts";
import { activeIntroOffer, salonBannedPhrases, seedSalonServices } from "../src/generator/packs/salon.ts";
import { deliveryLine, retailBannedPhrases, seedRetailCarry } from "../src/generator/packs/retail.ts";
import { printBannedPhrases, seedPrintServices } from "../src/generator/packs/print.ts";
import { buildSite } from "../src/generator/render.ts";
import type { BusinessRecord, CategoryId, Copy, Image } from "../src/generator/types.ts";
import { categoryRecord, restaurantRecord, sampleCopy } from "./fixtures.ts";

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const past = (days: number) => future(-days);
const site = { slug: "s", look: "" };
const build = (record: BusinessRecord, copy: Copy = sampleCopy(), mode: "preview" | "publish" = "preview", look = "") => buildSite({ record, copy, site: { ...site, look }, mode, formEndpoint: "https://app.example/f/1" });
const home = async (record: BusinessRecord, copy?: Copy, look?: string) => {
  const out = await build(record, copy, "preview", look);
  assert.deepEqual(out.lint.errors, [], record.name);
  return { out, html: String(out.files.get("index.html")) };
};
const photo = (n: number): Image => ({ src: `/assets/owner/g${n}.jpg`, alt: `Dish ${n}`, source: "owner", width: 800, height: 600 });
const LIVE: Partial<BusinessRecord> = { confirmed: ["name", "phone", "address", "hours", "services", "menu", "service_area"] };

/** Every aria-labelledby points at a real id, on every page of a build. */
function headingsOk(files: Map<string, string | Uint8Array>, label: string) {
  for (const [path, content] of files) {
    if (!path.endsWith(".html")) continue;
    const h = String(content);
    const ids = new Set([...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of h.matchAll(/aria-labelledby="([^"]+)"/g)) for (const id of m[1]!.split(/\s+/)) assert.ok(ids.has(id), `${label} ${path}: aria-labelledby="${id}" has no id`);
  }
}

/* ---------- shared: owner proof, DNA hints ---------- */

test("owner proof shows in the trust row or proof band, clients as Trusted by; nothing without it", async () => {
  const proof = { awards: [{ name: "Best of the Best", year: "2025" }], memberships: ["Cullman Chamber of Commerce"], clients: ["Cullman City Schools", "Wallace State"], stats: [{ value: "40", label: "vendor booths" }] };
  assert.deepEqual(ownerProof(restaurantRecord({ proof })), ["Best of the Best 2025", "Cullman Chamber of Commerce", "40 vendor booths"]);
  assert.deepEqual(ownerProof(restaurantRecord({ proof: { memberships: ["Rotary Club", "Member, Alabama Retail Association"] } })), ["Rotary Club member", "Member, Alabama Retail Association"], "'member' only where it's missing");
  const inline = await home(restaurantRecord({ proof }), sampleCopy(), "restaurant.pit_plank~classic~h0n0b0s0v0c0f0a0p0t0r0k0d0o0m0q0");
  assert.match(inline.html, /class="hero__trust">[\s\S]*Best of the Best 2025/);
  assert.match(inline.html, /Trusted by<\/strong> Cullman City Schools · Wallace State/);
  const band = await home(restaurantRecord({ proof }), sampleCopy(), "restaurant.pit_plank~classic~h0n0b0s0v0c0f0a0p0t0r0k0d0o0m0q1");
  assert.match(band.html, /class="proof__list">[\s\S]*40 vendor booths/);
  assert.ok(band.html.indexOf('class="proof"') < band.html.indexOf('class="proof proof--clients"'), "clients line sits under the proof band");
  const none = await home(restaurantRecord());
  assert.doesNotMatch(none.html, /Trusted by|proof--clients/);
});

test("pickDna hints: owner proof prefers the band, no owner photo prefers a photo-less opening; no hints means the old pick", () => {
  const cats: CategoryId[] = ["restaurant", "salon", "retail", "print", "contractor", "auto", "church"];
  for (const cat of cats) {
    for (let i = 0; i < 12; i++) {
      const seed = `lead-${cat}-${i}`;
      assert.deepEqual(pickDna(seed, cat), pickDna(seed, cat, {}), "no hints is deterministic and unchanged");
      assert.equal(pickDna(seed, cat, { hints: { proof: true } }).proof, "band");
      const d = pickDna(seed, cat, { hints: { noPhoto: true } });
      assert.ok(["statement", "billboard", "banner"].includes(d.hero), `${cat} ${seed}: ${d.hero}`);
    }
  }
  const lights = Array.from({ length: 40 }, (_, i) => pickDna(`x${i}`, "contractor", { hints: { noPhoto: true } })).filter((d) => d.tone === "light").length;
  assert.ok(lights > 0 && lights < 40, "a light opening is allowed, not forced");
  const picked = pickDesign({ leadId: "lead-9", looks: ["restaurant.pit_plank"], used: [], taken: [], hints: { proof: true, noPhoto: true } });
  assert.match(picked, /q1$/, "the design id carries the band");
});

/* ---------- shared: closures, payment methods, parking ---------- */

test("closures show under the hours and in the strip the week before; pay and parking lines; nothing when empty", async () => {
  const record = restaurantRecord({
    closures: [{ date: past(3), label: "Labor Day" }, { date: future(20), label: "Thanksgiving" }, { date: future(2), label: "Staff holiday" }, { date: future(40), label: "Closing early" }],
    visit: { paymentMethods: ["Cash", "Visa", "Venmo"], parking: "Free lot behind the building." },
  });
  assert.deepEqual(upcomingClosures(record).map((c) => c.label), ["Staff holiday", "Thanksgiving", "Closing early"]);
  assert.match(closureText({ date: "2026-11-26", label: "Thanksgiving" }), /^Closed Nov 26 for Thanksgiving$/);
  assert.match(closureText({ date: "2026-12-24", label: "Closing at 2 PM" }), /^Closing at 2 PM Dec 24$/);
  const { out, html } = await home(record);
  assert.match(html, /class="closures"[\s\S]*Closed \w{3} \d+ for Staff holiday/);
  assert.match(html, new RegExp(`data-until="${future(20)}"`));
  assert.doesNotMatch(html, /Labor Day/);
  assert.match(html, new RegExp(`<p class="strip__note" data-soon="${future(2)}">`), "the next closure is in the strip, not hidden, since it's within a week");
  assert.match(html, /<strong>We take:<\/strong> Cash, Visa, Venmo/);
  assert.match(html, /<strong>Parking:<\/strong> Free lot behind the building\./);
  assert.match(String(out.files.get("assets/site.js")), /data-until/);
  const later = await home(restaurantRecord({ closures: [{ date: future(20), label: "Thanksgiving" }] }));
  assert.match(later.html, /class="strip__note" data-soon="[^"]+" hidden>/, "a closure 3 weeks out waits in the strip until the week before");
  const none = await home(restaurantRecord());
  assert.doesNotMatch(none.html, /strip__note|class="closures"|We take:|Parking:/);
});

/* ---------- restaurant ---------- */

function diner(over: Partial<BusinessRecord> = {}, ext: Partial<NonNullable<BusinessRecord["ext"]["restaurant"]>> = {}): BusinessRecord {
  const sections = parseMenuText("# Plates\nPulled pork plate | $12 | Two sides\nBrisket plate | $15\nSmoked wings | $11\n# Sides\nFried okra | $3\nSlaw | $3");
  const base = restaurantRecord(over);
  return { ...base, media: { gallery: [photo(1), photo(2)] }, ext: { restaurant: { ...base.ext.restaurant!, menu: { sections, lastUpdated: "October 2026" }, ...ext } } };
}

test("menu photos and tags: Popular tiles on the home page, tags and a legend on the menu page", async () => {
  const r = diner();
  const items = r.ext.restaurant!.menu!.sections.flatMap((s) => s.items);
  items[0]!.image = photo(1);
  items[0]!.tags = ["popular", "spicy"];
  items[1]!.image = photo(2);
  items[2]!.tags = ["popular"];
  items[3]!.tags = ["vegetarian", "gluten_free"];
  const { out, html } = await home(r);
  assert.match(html, /<h2 class="section__title" id="menu-title">Popular<\/h2>/);
  assert.match(html, /class="tiles">[\s\S]*tile__img[\s\S]*Pulled pork plate[\s\S]*Brisket plate[\s\S]*Smoked wings/);
  assert.equal((html.match(/<li class="tile/g) ?? []).length, 3);
  assert.match(html, /<span class="tag">Spicy<\/span>/);
  assert.doesNotMatch(html, /class="tag">Popular/, "the Popular tag is the heading, not a chip");
  const menu = String(out.files.get("menu/index.html"));
  assert.match(menu, /menu-item menu-item--photo[\s\S]*menu-item__img/);
  assert.match(menu, /<span class="tag">Vegetarian<\/span><span class="tag">Gluten-free<\/span>/);
  assert.match(menu, /class="menu-legend"[\s\S]*Popular[\s\S]*Vegetarian/);
  // One popular item isn't enough for tiles: the classic cards stay, with a to-do asking for dish photos.
  const one = diner();
  one.ext.restaurant!.menu!.sections[0]!.items[0]!.tags = ["popular"];
  const classic = await home(one);
  assert.match(classic.html, /From the menu/);
  assert.ok(classic.out.suggestions.includes("Send photos of your popular dishes"));
  // Google photos never go on a live menu: a tile falls back to text and the item to a plain row.
  const g = diner();
  g.ext.restaurant!.menu!.sections[0]!.items[0]!.image = { ...photo(1), source: "google" };
  g.ext.restaurant!.menu!.sections[0]!.items[0]!.tags = ["popular"];
  g.ext.restaurant!.menu!.sections[0]!.items[1]!.tags = ["popular"];
  const pub = await buildSite({ record: { ...g, ...LIVE, media: { gallery: [] } }, copy: sampleCopy({ approved: true }), site: { ...site, origin: "https://x.pages.dev" }, mode: "publish" });
  assert.doesNotMatch(String(pub.files.get("index.html")), /tile__img/);
  assert.doesNotMatch(String(pub.files.get("menu/index.html")), /menu-item--photo/);
});

test("catering section and form render only when the owner caters; reserve leads for dine-in with a link", async () => {
  const plain = await home(diner());
  assert.doesNotMatch(plain.html, /id="catering"|name="guests"/);
  const cat = await home(diner({ links: { reserve: "https://resy.com/x", order: "https://toasttab.com/x", social: {} } }, { catering: true, cateringNote: "Pans for 20 to 200." }));
  assert.match(cat.html, /id="catering"[\s\S]*Pans for 20 to 200\./);
  assert.match(cat.html, /name="topic" value="Catering"/);
  for (const n of ["event_date", "guests", "needs"]) assert.match(cat.html, new RegExp(`name="${n}"`));
  assert.match(cat.html, /name="event_date" type="date"/);
  assert.match(cat.html, /">Catering<\/a><\/li>/, "nav link");
  assert.match(cat.html, /data-hero-actions><a class="btn btn--primary" href="https:\/\/resy.com\/x"[^>]*>[\s\S]*?Reserve a table/);
  assert.match(cat.html, /btn--ghost" href="https:\/\/toasttab.com\/x"/, "order is the second button when reserve leads");
  assert.ok(cat.out.files.has("privacy/index.html"), "a form means a privacy page");
  const noNote = await home(diner({}, { catering: true }));
  assert.ok(noNote.out.suggestions.includes("What do you cater?"));
  // Takeout-only places keep Order first even with a reserve link.
  const takeout = diner({ links: { reserve: "https://resy.com/x", order: "https://toasttab.com/x", social: {} } });
  takeout.ext.restaurant!.serviceOptions.dineIn = false;
  assert.match((await home(takeout)).html, /data-hero-actions><a class="btn btn--primary" href="https:\/\/toasttab.com\/x"/);
});

test("food trucks get This week from events, a schedule link and a Book the truck form", async () => {
  const truck = diner({ variant: "food_truck", events: [{ title: "Cullman Farmers Market", date: future(2), time: "11–2" }] }, { calendarUrl: "https://calendar.google.com/x" });
  const { out, html } = await home(truck);
  assert.match(html, /id="events"[\s\S]*Where to find us[\s\S]*Cullman Farmers Market[\s\S]*Full schedule/);
  assert.ok(html.indexOf('id="events"') < html.indexOf('id="menu"'), "this week sits above the menu");
  assert.match(html, /name="topic" value="Book the truck"/);
  assert.match(html, /name="location"/);
  assert.match(html, /data-hero-actions>[\s\S]*Book the truck/);
  assert.match(html, /">Find us<\/a><\/li><li><a href="\/#book">Book the truck<\/a>/);
  assert.ok(!out.suggestions.includes("Where can people find you?"));
  const bare = await home(diner({ variant: "food_truck", links: { social: {} } }));
  assert.match(bare.html, /id="events"[\s\S]*Call \(256\) 555-0123 to find out where/);
  assert.ok(bare.out.suggestions.includes("Where can people find you?"));
  const live = await buildSite({ record: { ...truck, ...LIVE, media: { gallery: [] } }, copy: sampleCopy({ approved: true }), site: { ...site, origin: "https://t.pages.dev" }, mode: "publish", formEndpoint: "https://app.example/f/1" });
  assert.deepEqual(live.lint.errors, []);
  headingsOk(live.files, "truck");
});

test("order row: partners, gift cards and rewards only from links the owner gave; copy may not claim them otherwise", async () => {
  const none = await home(diner());
  assert.doesNotMatch(none.html, /id="order"|DoorDash|Gift cards/);
  const r = diner({ links: { giftCards: "https://squareup.com/gift/x", social: {} } }, { deliveryLinks: { doordash: "https://doordash.com/x" }, rewardsUrl: "https://toasttab.com/rewards" });
  const { html } = await home(r);
  assert.match(html, /id="order"[\s\S]*href="https:\/\/doordash.com\/x"[\s\S]*DoorDash[\s\S]*Gift cards[\s\S]*Join our rewards/);
  assert.doesNotMatch(html, /Uber Eats/);
  const bans = restaurantBannedPhrases(diner());
  for (const bad of ["We cater weddings", "Order on DoorDash", "Ask about gift cards"]) assert.ok(bans.some((re) => re.test(bad)), bad);
  assert.ok(!restaurantBannedPhrases(r).some((re) => re.test("Order on DoorDash or ask about gift cards")));
  assert.ok(restaurantBannedPhrases(r).some((re) => re.test("Grubhub too")));
});

/* ---------- salon ---------- */

const salon = (variant: string, ext: NonNullable<BusinessRecord["ext"]["salon"]> = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("salon", { name: "Sample Salon", variant, services: seedSalonServices(variant), ext: { salon: { walkIns: "both", ...ext } }, ...over });

test("salon team cards with Book with <first name>, required to confirm; durations next to prices", async () => {
  const team = [
    { name: "Jess Carter", role: "Owner, stylist", days: "Tue–Sat", bookingUrl: "https://booksy.com/jess", line: "Color and balayage." },
    { name: "Mike", role: "Barber" },
  ];
  const r = salon("salon", { team }, { links: { booking: "https://booksy.com/shop", social: {} } });
  r.services[0]!.price = { mode: "exact", amount: 35 };
  r.services[0]!.durationMin = 45;
  r.services[1]!.durationMin = 90;
  const { out, html } = await home(r);
  assert.match(html, /id="team"[\s\S]*Meet the team[\s\S]*Jess Carter[\s\S]*Owner, stylist · Tue–Sat[\s\S]*Color and balayage\.[\s\S]*href="https:\/\/booksy.com\/jess"[\s\S]*Book with Jess/);
  assert.match(html, /Mike[\s\S]*href="https:\/\/booksy.com\/shop"[\s\S]*Book with Mike/, "no personal link: the shop's booking link");
  assert.match(html, /\$35 · 45 min/);
  assert.match(html, /90 min/);
  assert.match(html, /">Team<\/a><\/li>/);
  assert.ok(out.todos.includes("Confirm the team list"));
  const confirmed = await home(salon("salon", { team, teamConfirmed: true }));
  assert.ok(!confirmed.out.todos.includes("Confirm the team list"));
  const none = await home(salon("salon"));
  assert.doesNotMatch(none.html, /id="team"/);
  assert.ok(!none.out.todos.includes("Confirm the team list"), "no team, nothing to confirm");
  await assert.rejects(
    buildSite({ record: salon("salon", { team }, { ...LIVE, hours: undefined }), copy: sampleCopy({ approved: true }), site: { ...site, origin: "https://s.pages.dev" }, mode: "publish" }),
    /Confirm the team list/,
  );
});

test("massage rates table, policies, intro offer with end date, pet prep, payment methods in the trust row", async () => {
  const m = salon("massage", { rates: [{ minutes: 30, price: "$45" }, { minutes: 60, price: "$80" }], policies: { cancellation: "24 hours' notice, please.", deposit: "" } }, { licenses: [{ label: "AL License", number: "123" }] });
  const massage = await home(m);
  assert.match(massage.html, /id="rates"[\s\S]*<td>30 minutes<\/td><td>\$45<\/td>[\s\S]*60 minutes/);
  assert.match(massage.html, /id="policies"[\s\S]*<dt>Cancellations<\/dt><dd>24 hours&#39; notice, please\.<\/dd>/);
  assert.doesNotMatch(massage.html, /<dt>Deposits<\/dt>/);
  assert.match(massage.html, /">Rates<\/a><\/li>/);
  const offer = await home(salon("barber", { introOffer: { text: "$5 off your first cut", until: future(10) } }, { visit: { paymentMethods: ["Cash", "Cards"] } }));
  assert.match(offer.html, /class="hero__trust">[\s\S]*\$5 off your first cut \(through \w{3} \d+\)/);
  assert.match(offer.html, /Cash, Cards accepted/);
  const expired = await home(salon("barber", { introOffer: { text: "$5 off your first cut", until: past(1) } }));
  assert.doesNotMatch(expired.html, /\$5 off/);
  assert.equal(activeIntroOffer(salon("barber", { introOffer: { text: "x", until: past(1) } })), undefined);
  const pet = await home(salon("pet", { pet: { vaccinations: "Proof of rabies, please.", pricingFrom: "Full grooms from $45." } }));
  assert.match(pet.html, /id="prep"[\s\S]*Before your appointment[\s\S]*<dt>Vaccinations<\/dt><dd>Proof of rabies, please\.<\/dd>[\s\S]*<dt>Pricing<\/dt>/);
  assert.doesNotMatch(pet.html, /<dt>Matting/);
  const petBare = await home(salon("pet"));
  assert.doesNotMatch(petBare.html, /id="prep"/);
  assert.ok(petBare.out.suggestions.includes("What vaccinations do you require?") && !petBare.out.todos.includes("What vaccinations do you require?"));
  assert.doesNotMatch((await home(salon("barber", { rates: [{ minutes: 30, price: "$45" }] }))).html, /id="rates"/, "rates are a massage thing");
  const bans = salonBannedPhrases(salon("massage"));
  for (const bad of ["Massage that cures back pain", "a new-client special", "$10 off your first visit", "A deposit holds your spot", "Our stylists love color"]) assert.ok(bans.some((re) => re.test(bad)), bad);
  assert.ok(salonBannedPhrases(m).some((re) => re.test("A deposit holds your spot")), "no deposit line given: the copy may not mention one");
  assert.ok(!salonBannedPhrases(salon("salon", { policies: { deposit: "$20 holds color." } })).some((re) => re.test("A deposit holds your spot")));
  assert.ok(!salonBannedPhrases(salon("barber", { introOffer: { text: "$5 off", until: future(3) } })).some((re) => re.test("$5 off your first cut")));
});

/* ---------- retail ---------- */

const shop = (variant: string, ext: NonNullable<BusinessRecord["ext"]["retail"]> = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("retail", { name: "Sample Shop", variant, showStreetAddress: true, hours: restaurantRecord().hours, services: seedRetailCarry(variant), ext: { retail: ext }, ...over });

test("florist: occasion tiles, delivery line only with a cutoff, designer's choice, inquiry form; street address in the opening", async () => {
  const bare = await home(shop("florist"));
  assert.match(bare.html, /id="occasions"[\s\S]*Sympathy &amp; funeral[\s\S]*Weddings &amp; events[\s\S]*Birthdays[\s\S]*Just because/);
  assert.match(bare.html, /href="#inquiry"[\s\S]*Sympathy/);
  assert.match(bare.html, /name="topic" value="Sympathy &amp; weddings"/);
  for (const n of ["occasion", "event_date", "budget_range"]) assert.match(bare.html, new RegExp(`name="${n}"`));
  assert.doesNotMatch(bare.html, /Same-day|We deliver/);
  assert.ok(bare.out.suggestions.includes("Your delivery rule"));
  assert.match(bare.html, /class="hero__addr">[\s\S]*100 Main Ave NE, Cullman/);
  assert.match(bare.html, /">Occasions<\/a><\/li>/);
  const full = await home(shop("florist", { shopUrl: "https://example.com/order", florist: { occasions: ["Sympathy", "Prom", "Just because"], deliveryArea: "Cullman and Hanceville", cutoff: "1 PM", deliveryFee: "$10", designersChoice: true } }));
  assert.match(full.html, /Same-day delivery in Cullman and Hanceville on orders by 1 PM, \$10\./);
  assert.match(full.html, /Designer's choice/);
  assert.match(full.html, /<a href="https:\/\/example.com\/order" target="_blank" rel="noopener">Prom<\/a>/);
  assert.equal(deliveryLine({ deliveryArea: "Cullman" }), "We deliver in Cullman.");
  assert.equal(deliveryLine({}), undefined);
  const bans = retailBannedPhrases(shop("florist"));
  assert.ok(bans.some((re) => re.test("Same-day delivery available")) && bans.some((re) => re.test("free delivery")));
  assert.ok(!retailBannedPhrases(shop("florist", { florist: { cutoff: "1 PM", deliveryArea: "Cullman" } })).some((re) => re.test("same-day delivery in Cullman")));
  assert.doesNotMatch((await home(shop("gift"))).html, /id="occasions"|id="inquiry"/);
});

test("antique vendors + booth form, feed departments and brands, furniture financing and delivery, boutique drop day, hold note, gift cards", async () => {
  const antique = await home(shop("antique", { vendors: { boothsAvailable: true, note: "Booths from 8x10, month to month." }, holdNote: "Call to hold an item for 24 hours." }));
  assert.match(antique.html, /id="vendors"[\s\S]*Booths available[\s\S]*Booths from 8x10[\s\S]*href="#booth"/);
  assert.match(antique.html, /name="topic" value="Booth inquiry"[\s\S]*name="booth"[^>]*required/);
  assert.match(antique.html, /<strong>Call to hold an item for 24 hours\.<\/strong> <a href="tel:\+12565550123">Call/);
  assert.match(antique.html, /">Vendors<\/a><\/li>/);
  const noteOnly = await home(shop("antique", { vendors: { note: "Our vendor list is full right now." } }));
  assert.match(noteOnly.html, /id="vendors"/);
  assert.doesNotMatch(noteOnly.html, /id="booth"/);
  const feed = await home(shop("farm_feed", { departments: ["Cattle & horse", "Poultry"], brands: ["Purina", "Nutrena"] }, { events: [{ title: "Chick days", date: future(5) }] }));
  assert.match(feed.html, /<h3 style="margin-top:28px">Departments<\/h3><ul class="towns">[\s\S]*Cattle &amp; horse[\s\S]*Poultry/);
  assert.match(feed.html, /Brands we carry[\s\S]*Purina[\s\S]*Nutrena/);
  assert.match(feed.html, /This season[\s\S]*Coming up at the store[\s\S]*Chick days/);
  const furn = await home(shop("furniture", { financing: { lender: "Synchrony", url: "https://example.com/apply" }, deliveryNote: "Free delivery in Cullman County over $499." }));
  assert.match(furn.html, /id="delivery"[\s\S]*<dt>Delivery<\/dt><dd>Free delivery in Cullman County over \$499\.<\/dd>[\s\S]*Financing available through Synchrony[\s\S]*href="https:\/\/example.com\/apply"/);
  const boutique = await home(shop("boutique", { dropDay: "New arrivals every Thursday at 10.", occasions: ["Homecoming", "Game day"] }, { links: { giftCards: "https://squareup.com/gift/y", social: { facebook: "https://facebook.com/x" } } }));
  assert.match(boutique.html, /id="occasions"[\s\S]*Shop by occasion[\s\S]*Homecoming[\s\S]*Game day/);
  assert.match(boutique.html, /<p class="lead">New arrivals every Thursday at 10\.<\/p>/);
  assert.match(boutique.html, /href="https:\/\/squareup.com\/gift\/y"[\s\S]*Gift cards/);
  const plain = await home(shop("boutique"));
  assert.doesNotMatch(plain.html, /id="occasions"|id="vendors"|id="delivery"|Departments|Brands we carry|Gift cards|Call to hold/);
  const bans = retailBannedPhrases(shop("furniture"));
  assert.ok(bans.some((re) => re.test("0% APR financing")) && bans.some((re) => re.test("booth rental")));
  assert.ok(!retailBannedPhrases(shop("furniture", { financing: { lender: "Acima" } })).some((re) => re.test("financing through Acima")));
});

/* ---------- print ---------- */

const printer = (variant: string, ext: NonNullable<BusinessRecord["ext"]["print"]> = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("print", { name: "Sample Tees", variant, showStreetAddress: true, services: seedPrintServices(variant), ext: { print: ext }, ...over });

test("print quote form asks when, where and about artwork; upload link, Good to know and store button only when given", async () => {
  const bare = await home(printer("screen_printing"));
  assert.match(bare.html, /name="topic" value="Quote"/);
  for (const n of ["quantity", "needed_by", "placements", "artwork_status", "rush"]) assert.match(bare.html, new RegExp(`name="${n}"`), n);
  assert.match(bare.html, /name="needed_by" type="date"/);
  assert.match(bare.html, /Print locations \(front, back, sleeve\)/);
  assert.match(bare.html, /<option>I have a print-ready file<\/option>/);
  assert.doesNotMatch(bare.html, /<span>Upload your artwork<\/span>|id="details"|online store/);
  assert.ok(bare.out.suggestions.includes("Add an upload link"));
  const full = await home(printer("signs", { uploadUrl: "https://www.dropbox.com/request/abc", turnaround: "About 10 business days after proof approval.", quantityTiers: [{ from: 48, note: "best price" }, { from: 12 }], proofBeforePrint: true, storeUrl: "https://example.com/store" }));
  assert.match(full.html, /<a class="btn btn--primary" href="https:\/\/www.dropbox.com\/request\/abc"[^>]*><span>Upload your artwork<\/span>/);
  assert.match(full.html, /id="details"[\s\S]*<dt>Typical turnaround<\/dt><dd>About 10 business days after proof approval\.<\/dd>[\s\S]*Price breaks at 12, 48\+ \(best price\)\.[\s\S]*<dt>Proofs<\/dt>/);
  assert.match(full.html, /Where will it go\? \(window, truck, yard, building\)/);
  assert.match(full.html, /href="https:\/\/example.com\/store"[\s\S]*Shop our online store/);
  assert.ok(!full.out.suggestions.includes("Add an upload link"));
  const bans = printBannedPhrases(printer("print_shop"));
  for (const bad of ["Ready in 3 business days", "fast turnaround", "no minimums", "shop our online store"]) assert.ok(bans.some((re) => re.test(bad)), bad);
  assert.ok(!printBannedPhrases(printer("print_shop", { turnaround: "10 days", quantityTiers: [{ from: 12 }] })).some((re) => re.test("about 10 business days, no minimum order")));
});

/* ---------- every variant, filled and empty, builds clean ---------- */

test("filled and empty records for every variant lint clean in preview and keep every heading id", async () => {
  const cases: BusinessRecord[] = [
    diner(),
    diner({ variant: "food_truck", events: [{ title: "Market", date: future(1) }] }, { catering: true, calendarUrl: "https://calendar.google.com/x", deliveryLinks: { ubereats: "https://ubereats.com/x" } }),
    restaurantRecord({ variant: "bakery" }),
    ...["barber", "salon", "nails", "pet", "massage"].map((v) => salon(v)),
    salon("massage", { rates: [{ minutes: 60, price: "$80" }], team: [{ name: "Ann" }], policies: { kids: "Kids welcome." } }),
    salon("pet", { pet: { vaccinations: "Rabies.", mattingNote: "Extra for matting.", prep: "Bring records." }, introOffer: { text: "First groom $5 off" } }),
    ...["florist", "antique", "thrift", "farm_feed", "furniture", "boutique", "gift", "hardware"].map((v) => shop(v)),
    shop("florist", { florist: { cutoff: "noon", deliveryArea: "Cullman" } }),
    shop("thrift", { vendors: { boothsAvailable: true }, donations: { accepts: ["Clothes"], dropOffHours: "10-4" } }),
    ...["screen_printing", "embroidery", "signs", "print_shop"].map((v) => printer(v)),
    printer("embroidery", { uploadUrl: "https://drive.google.com/x", turnaround: "Two weeks", quantityTiers: [{ from: 6 }] }),
  ];
  for (const record of cases) {
    const withProof = { ...record, proof: { awards: [{ name: "Best of the Best", year: "2025" }] }, closures: [{ date: future(3), label: "Inventory" }], visit: { paymentMethods: ["Cash"], parking: "Out front." } };
    for (const r of [record, withProof]) {
      const out = await build(r);
      assert.deepEqual(out.lint.errors, [], `${r.name}/${r.variant}`);
      headingsOk(out.files, `${r.name}/${r.variant}`);
      const h = String(out.files.get("index.html"));
      assert.doesNotMatch(h, /<div class="wrap"><\/div>|<ul class="[^"]*"><\/ul>|<dl class="facts"><\/dl>/, "no empty wrappers");
    }
  }
});
