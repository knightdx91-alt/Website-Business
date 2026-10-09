import { parseMenuText } from "../generator/menu.ts";
import type { BusinessRecord, CategoryId, Copy } from "../generator/types.ts";

/**
 * Made-up businesses for the "See examples" section on the company website. Never real leads: names, numbers
 * (555-01xx) and streets are invented, and every page carries an "example site" banner and noindex.
 * `npm run examples` builds them into app/public/examples/<slug>/ and screenshots each one.
 */

export interface Example {
  slug: string;
  /** Shown on the company website card. */
  kind: string;
  design: string;
  record: BusinessRecord;
  copy: Copy;
}

const day = (open: string, close: string) => [{ open, close }];

function base(o: { slug: string; name: string; category: CategoryId; variant: string; phone: string; street?: string; storefront: boolean }): BusinessRecord {
  const weekday = day("08:00", "17:00");
  return {
    placeId: `example-${o.slug}`,
    name: o.name,
    category: o.category,
    variant: o.variant,
    businessStatus: "OPERATIONAL",
    phone: { e164: `+1256555${o.phone}`, display: `(256) 555-${o.phone}` },
    smsEnabled: true,
    address: { street: o.street, city: "Cullman", state: "AL", zip: "35055", county: "Cullman" },
    showStreetAddress: o.storefront,
    geo: { lat: 34.1748, lng: -86.8436 },
    timezone: "America/Chicago",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Cullman%2C+AL",
    hours: o.storefront ? { weekly: [[], weekday, weekday, weekday, weekday, weekday, day("09:00", "13:00")] } : undefined,
    serviceArea: o.storefront ? undefined : { towns: ["Cullman", "Hanceville", "Good Hope", "Vinemont", "Hartselle", "Arab"], counties: ["Cullman"] },
    ownershipTags: ["family_owned"],
    licenses: [],
    services: [],
    offers: [],
    testimonials: [],
    links: { social: {} },
    media: { gallery: [] },
    reputation: { displayMode: "link_only" },
    ext: {},
    confirmed: ["name", "phone", "address", "hours", "services", "service_area", "variant", "menu"],
  };
}

const svc = (names: string[]) => names.map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
const blurbs = (pairs: Array<[string, string]>) => Object.fromEntries(pairs.map(([n, b]) => [n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), b]));

function copy(c: Omit<Copy, "approved" | "meta"> & { metaTitle?: string; description: string }): Copy {
  const { description, metaTitle, ...rest } = c;
  return { ...rest, meta: { title: metaTitle ?? "", description }, approved: true };
}

const said = (quote: string, displayName: string) => ({ quote, displayName, town: "Cullman" });

export const EXAMPLES: Example[] = [
  (() => {
    const record = base({ slug: "magnolia-table", name: "Magnolia Table Cafe", category: "restaurant", variant: "southern", phone: "0101", street: "210 Example St SE", storefront: true });
    record.hours = { weekly: [[], [], day("06:30", "14:00"), day("06:30", "14:00"), day("06:30", "14:00"), day("06:30", "20:00"), day("07:00", "14:00")] };
    record.ext.restaurant = {
      cuisineLabel: "Southern cooking",
      serviceOptions: { dineIn: true, takeout: true, servesBreakfast: true, servesLunch: true, servesDinner: true, servesCoffee: true, menuForChildren: true, goodForGroups: true },
      menu: {
        sections: parseMenuText(`# Breakfast
Biscuits & sausage gravy | $7 | Two scratch biscuits
Country breakfast | $11 | Two eggs, bacon or sausage, grits, biscuit
Sweet potato pancakes | $9
# Lunch plates
Meat & three | $12 | Pick a meat and three sides, with cornbread
Fried chicken plate | $13 | Two pieces, two sides
Chicken salad croissant | $10
# Sides
Mac & cheese | $3
Fried okra | $3
Turnip greens | $3`),
        lastUpdated: "October 2026",
      },
    };
    record.testimonials = [said("Best biscuits we've had in years. The staff knows everybody by name.", "Linda P."), said("Meat and three every Friday. Never had a bad meal.", "Jerry W."), said("Fast, friendly and the sweet tea is just right.", "Amanda R.")];
    return {
      slug: "magnolia-table",
      kind: "Southern cafe",
      design: "restaurant.garden_table~split",
      record,
      copy: copy({
        heroTagline: "Scratch biscuits, plate lunches and Friday supper, served with a smile.",
        heroSub: "Home-style Southern cooking for breakfast and lunch in downtown Cullman, plus supper on Fridays.",
        about: ["We cook the way our grandmothers taught us: biscuits rolled every morning, vegetables cooked low and slow, and pie when we can't help ourselves.", "Pull up a chair, bring the family, and stay for a second cup of coffee."],
        serviceBlurbs: {},
        faq: [
          { q: "Do you do takeout?", a: "Yes. Call ahead and we'll have it ready at the counter." },
          { q: "Do you have a kids' menu?", a: "We do, with smaller plates and kid-friendly sides." },
          { q: "Can you cater?", a: "We cater small events around Cullman. Give us a call to talk it over." },
        ],
        ctaTitle: "Come hungry",
        ctaLine: "Stop in for breakfast or lunch, or call ahead for takeout.",
        cuisineLabel: "Southern cooking",
        description: "Home-style Southern breakfast and lunch in downtown Cullman, AL: scratch biscuits, meat and three plates and Friday supper. Call ahead for takeout.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "ridgeline-plumbing", name: "Ridgeline Plumbing & Drain", category: "contractor", variant: "plumbing", phone: "0102", storefront: false });
    record.services = svc(["Leak repair", "Drain cleaning", "Water heaters", "Toilet repair", "Repiping", "Emergency service"]);
    record.insured = true;
    record.licenses = [{ label: "AL Plumbing License", number: "EX-00000" }];
    record.ext.contractor = { residential: true, commercial: true, emergencyService: true, freeEstimates: true };
    record.testimonials = [said("Came out the same afternoon and had our water heater running by supper.", "Mark T."), said("Honest price, clean work, and he explained everything.", "Debbie S."), said("They fixed a leak two other plumbers couldn't find.", "Carl H.")];
    return {
      slug: "ridgeline-plumbing",
      kind: "Plumber",
      design: "contractor.ridgeline~poster",
      record,
      copy: copy({
        heroTagline: "Leaks, clogs and water heaters fixed right the first time.",
        heroSub: "Licensed, insured plumbing for homes and businesses across Cullman County, with emergency service when you need it.",
        about: ["We're a local, family-run plumbing company serving Cullman County homes and businesses.", "We show up when we say we will, explain the fix before we start, and clean up before we leave."],
        serviceBlurbs: blurbs([
          ["Leak repair", "We find and fix leaks under sinks, in walls and in yards."],
          ["Drain cleaning", "Slow or clogged drains cleared, from kitchen sinks to main lines."],
          ["Water heaters", "Repair and replacement for tank and tankless water heaters."],
          ["Toilet repair", "Running, leaking or clogged toilets fixed or replaced."],
          ["Repiping", "Old or failing pipes replaced with new lines."],
          ["Emergency service", "Burst pipe or no water? Call us any time."],
        ]),
        faq: [
          { q: "Do you charge for estimates?", a: "No. We'll look at the job and give you a price before any work starts." },
          { q: "What should I do if a pipe bursts?", a: "Shut off the main water valve, then call us right away." },
          { q: "Do you work on commercial buildings?", a: "Yes, we work on homes and businesses." },
          { q: "Are you licensed and insured?", a: "Yes. Our license number is listed at the bottom of every page." },
        ],
        serviceAreaIntro: "We serve homes and businesses across Cullman County and the towns around it.",
        ctaTitle: "Got a leak?",
        ctaLine: "Call now or send a request and we'll get back to you fast.",
        description: "Licensed, insured plumber in Cullman, AL for leaks, clogged drains, water heaters and repiping. Free estimates and emergency service. Call today.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "ivy-iron-barber", name: "Ivy & Iron Barber Co", category: "salon", variant: "barber", phone: "0103", street: "88 Example Ave NE", storefront: true });
    record.hours = { weekly: [[], [], day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "18:00"), day("08:00", "14:00")] };
    record.services = svc(["Haircut", "Skin fade", "Beard trim", "Hot towel shave", "Kids' cut", "Line up"]);
    record.services.forEach((s, i) => (s.price = { mode: "exact", amount: [25, 30, 15, 30, 18, 12][i] }));
    record.ext.salon = { walkIns: "both" };
    record.links.booking = "https://booksy.com/";
    record.testimonials = [said("Best fade in town and the conversation is just as good.", "Tyler B."), said("My son actually looks forward to haircuts now.", "Rachel M."), said("Clean shop, sharp cuts, fair prices.", "Dustin K.")];
    return {
      slug: "ivy-iron-barber",
      kind: "Barbershop",
      design: "salon.night_shift~editorial",
      record,
      copy: copy({
        heroTagline: "Classic cuts, sharp fades and hot towel shaves in downtown Cullman.",
        heroSub: "Walk in or book ahead. Cuts for men and kids, beard work and straight-razor shaves.",
        about: ["Ivy & Iron is a neighborhood barbershop with old-school service and modern cuts.", "Grab a seat, catch up on the game, and leave looking your best."],
        serviceBlurbs: blurbs([
          ["Haircut", "A classic cut finished with a neck shave."],
          ["Skin fade", "Clean fades blended to your taste."],
          ["Beard trim", "Shaped and lined up."],
          ["Hot towel shave", "Straight-razor shave with hot towels."],
          ["Kids' cut", "For ages 12 and under."],
          ["Line up", "A quick clean-up between cuts."],
        ]),
        faq: [
          { q: "Do you take walk-ins?", a: "Yes. Walk-ins are welcome, or book ahead to skip the wait." },
          { q: "How long does a cut take?", a: "Most cuts take about 30 minutes." },
          { q: "Do you cut kids' hair?", a: "Yes, kids are always welcome." },
        ],
        ctaTitle: "Ready for a fresh cut?",
        ctaLine: "Book online or walk in today.",
        description: "Barbershop in downtown Cullman, AL for classic cuts, skin fades, beard trims and hot towel shaves. Walk-ins welcome or book online today.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "crossroads-auto", name: "Crossroads Auto Care", category: "auto", variant: "general", phone: "0104", street: "1500 Example Rd SW", storefront: true });
    record.services = svc(["Brakes", "Oil changes", "Check engine light", "A/C repair", "Tires & alignment", "Inspections"]);
    record.ext.auto = { ase: true, freeEstimates: true, warranty: { months: 12, miles: 12000 } };
    record.testimonials = [said("They told me what could wait and what couldn't. That's rare.", "Steve L."), said("Fair price on brakes and done the same day.", "Megan D."), said("I trust them with all three of our family's cars.", "Ron G.")];
    return {
      slug: "crossroads-auto",
      kind: "Auto repair shop",
      design: "auto.clear_diagnostic~overlap",
      record,
      copy: copy({
        heroTagline: "Honest auto repair, done right and explained in plain English.",
        heroSub: "Brakes, oil changes, A/C and check engine lights for every make and model in Cullman.",
        about: ["We're a family-owned repair shop that treats your car like our own.", "You'll get a straight answer, a clear price, and a call before we do anything extra."],
        serviceBlurbs: blurbs([
          ["Brakes", "Pads, rotors and brake lines checked and replaced."],
          ["Oil changes", "Quick oil and filter changes with a free look-over."],
          ["Check engine light", "We find the cause and explain your options."],
          ["A/C repair", "Get cold air back before summer."],
          ["Tires & alignment", "New tires, rotations and alignments."],
          ["Inspections", "A full check before a trip or a purchase."],
        ]),
        faq: [
          { q: "Do I need an appointment?", a: "Appointments are best, but call us and we'll fit you in when we can." },
          { q: "Do you warranty your work?", a: "Yes. Ask us about the warranty when you drop off your car." },
          { q: "Can you work on my make?", a: "We work on most cars, trucks and SUVs." },
        ],
        ctaTitle: "Car acting up?",
        ctaLine: "Call or request a quote and we'll take a look.",
        description: "Family-owned auto repair in Cullman, AL for brakes, oil changes, A/C, check engine lights and tires. Clear prices and honest advice. Call today.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "green-acre-lawn", name: "Green Acre Lawn & Landscape", category: "landscaping", variant: "lawn_crew", phone: "0105", storefront: false });
    record.services = svc(["Lawn mowing", "Edging & trimming", "Leaf cleanup", "Mulch & flower beds", "Shrub trimming", "Sod installation"]);
    record.insured = true;
    record.ext.landscaping = { freeEstimates: true };
    record.testimonials = [said("Our yard has never looked this good. They show up every week like clockwork.", "Brenda C."), said("Great job on our fall cleanup, and they hauled everything off.", "Paul A."), said("Friendly crew and fair prices.", "Kim J.")];
    return {
      slug: "green-acre-lawn",
      kind: "Lawn care",
      design: "landscaping.fresh_stripe~soft",
      record,
      copy: copy({
        heroTagline: "Weekly mowing and yard care that keeps your place looking sharp.",
        heroSub: "Mowing, cleanups, mulch and shrub trimming for homes across Cullman County.",
        about: ["We're a local lawn crew that takes pride in clean lines and tidy yards.", "We show up on schedule, do the job right, and leave your yard better than we found it."],
        serviceBlurbs: blurbs([
          ["Lawn mowing", "Weekly or every-other-week mowing through the season."],
          ["Edging & trimming", "Crisp edges along drives, walks and beds."],
          ["Leaf cleanup", "Fall leaves cleared and hauled off."],
          ["Mulch & flower beds", "Fresh mulch and weeded, tidy beds."],
          ["Shrub trimming", "Bushes and hedges shaped and cleaned up."],
          ["Sod installation", "New grass laid for a fresh start."],
        ]),
        faq: [
          { q: "Do you give free estimates?", a: "Yes. We'll come look at your yard and give you a price." },
          { q: "How often do you mow?", a: "Weekly or every other week, whichever works for your yard." },
          { q: "Do I need to be home?", a: "No. Just leave the gate unlocked and keep pets inside." },
        ],
        serviceAreaIntro: "We mow and maintain yards across Cullman County.",
        ctaTitle: "Get your free estimate",
        ctaLine: "Tell us about your yard and we'll get back to you with a price.",
        description: "Lawn mowing, leaf cleanup, mulch and shrub trimming in Cullman, AL and nearby towns. Insured local crew with free estimates. Request yours today.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "spotless-cottage", name: "Spotless Cottage Cleaning", category: "cleaning", variant: "residential", phone: "0106", storefront: false });
    record.services = svc(["Standard cleaning", "Deep cleaning", "Move-in / move-out", "Recurring cleaning", "Rental turnovers", "Office cleaning"]);
    record.insured = true;
    record.bonded = true;
    record.ext.cleaning = { freeEstimates: true, backgroundChecked: true, suppliesIncluded: true, petSafe: true };
    record.testimonials = [said("I come home every other Friday to a spotless house. Worth every penny.", "Jennifer H."), said("They got our rental ready in one day.", "Mike R."), said("Careful with our things and great with our dogs.", "Sarah L.")];
    return {
      slug: "spotless-cottage",
      kind: "House cleaning",
      design: "cleaning.magnolia_porch~minimal",
      record,
      copy: copy({
        heroTagline: "A clean home without lifting a finger.",
        heroSub: "Weekly, every-other-week and deep cleaning for homes and rentals around Cullman.",
        about: ["We're a small, local cleaning team that treats your home with care.", "We bring our own supplies, show up on time, and leave every room fresh."],
        serviceBlurbs: blurbs([
          ["Standard cleaning", "Kitchens, baths, floors and dusting throughout."],
          ["Deep cleaning", "Top-to-bottom cleaning for a fresh start."],
          ["Move-in / move-out", "Empty homes cleaned and ready."],
          ["Recurring cleaning", "Weekly, every other week or monthly."],
          ["Rental turnovers", "Quick turnovers between guests."],
          ["Office cleaning", "Small offices kept clean after hours."],
        ]),
        faq: [
          { q: "Do you bring supplies?", a: "Yes, we bring everything we need." },
          { q: "Do I need to be home?", a: "No. Many clients give us a key or door code." },
          { q: "Are your cleaners background-checked?", a: "Yes, every member of our team." },
        ],
        serviceAreaIntro: "We clean homes and small offices across Cullman County.",
        ctaTitle: "Get a free quote",
        ctaLine: "Tell us about your home and we'll send you a price.",
        description: "House cleaning in Cullman, AL: recurring, deep and move-out cleaning by a background-checked, insured local team. Supplies included. Get a quote.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "main-street-tees", name: "Main Street Tees", category: "print", variant: "screen_printing", phone: "0107", street: "305 Example St NW", storefront: true });
    record.email = "hello@example.com";
    record.services = svc(["Custom T-shirts", "Hoodies & sweatshirts", "Team & school spirit wear", "Business & work shirts", "Event & fundraiser shirts", "Small full-color runs"]);
    record.ext.print = { designHelp: true, proofBeforePrint: true };
    record.testimonials = [said("Our reunion shirts came out perfect and right on time.", "Donna F."), said("They helped us fix our logo before printing. Big help.", "Coach Allen"), said("Great quality and easy to work with.", "Heather V.")];
    return {
      slug: "main-street-tees",
      kind: "Screen printing shop",
      design: "print.fresh_ink~classic",
      record,
      copy: copy({
        heroTagline: "Custom shirts and hoodies for teams, schools, churches and businesses around Cullman.",
        heroSub: "Screen-printed tees, hoodies and work shirts for teams, schools, reunions and local businesses.",
        about: ["Main Street Tees prints custom shirts for the people and groups that make Cullman home.", "Bring us a logo, a sketch or just an idea, and we'll help you turn it into something you're proud to wear."],
        serviceBlurbs: blurbs([
          ["Custom T-shirts", "For teams, reunions and staff shirts."],
          ["Hoodies & sweatshirts", "Warm, printed hoodies for cool weather."],
          ["Team & school spirit wear", "Show your colors on game day."],
          ["Business & work shirts", "Your logo on shirts your crew will wear."],
          ["Event & fundraiser shirts", "Shirts that help raise money for a cause."],
          ["Small full-color runs", "A handful of shirts with full-color designs."],
        ]),
        faq: [
          { q: "What file types work best?", a: "Vector files like AI, EPS or PDF are best, but send what you have and we'll help." },
          { q: "What if I don't have a logo?", a: "Tell us your idea and we'll help put a design together." },
          { q: "Can I see it before it's printed?", a: "Yes. We send a proof for you to approve first." },
        ],
        ctaTitle: "Let's make some shirts",
        ctaLine: "Ask for a quote or call us to talk through your idea.",
        description: "Custom screen-printed T-shirts, hoodies and work shirts in Cullman, AL for teams, schools, churches and businesses. Get a quote on your design today.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "willow-wren", name: "Willow & Wren Boutique", category: "retail", variant: "boutique", phone: "0108", street: "120 Example Ave SE", storefront: true });
    record.hours = { weekly: [[], [], day("10:00", "17:30"), day("10:00", "17:30"), day("10:00", "17:30"), day("10:00", "17:30"), day("10:00", "16:00")] };
    record.services = svc(["Tops & blouses", "Dresses", "Jeans & bottoms", "Shoes & boots", "Jewelry & accessories", "Gifts"]);
    record.links.social = { instagram: "https://www.instagram.com/", facebook: "https://www.facebook.com/" };
    record.ext.retail = { giftCards: true, shopUrl: "https://example.com/" };
    record.testimonials = [said("Always something new, and they help you put an outfit together.", "Kayla N."), said("My go-to for gifts. Everything is so cute.", "Melissa O."), said("Friendly owners and great prices.", "Tasha W.")];
    return {
      slug: "willow-wren",
      kind: "Clothing boutique",
      design: "retail.shop_window~split",
      record,
      copy: copy({
        heroTagline: "Cute clothes, shoes and gifts in downtown Cullman.",
        heroSub: "Come see what's new this week. Fresh styles arrive all the time, so there's always something to find.",
        about: ["Willow & Wren is a small boutique with clothes, shoes and gifts picked for real life in North Alabama.", "Stop in to browse, try something on, or grab a last-minute gift."],
        serviceBlurbs: blurbs([
          ["Tops & blouses", "Easy tops for work, church and weekends."],
          ["Dresses", "Casual and dressy styles for every season."],
          ["Jeans & bottoms", "Denim and pants in a range of fits."],
          ["Shoes & boots", "Sandals, sneakers and boots to finish the look."],
          ["Jewelry & accessories", "Earrings, bags and little extras."],
          ["Gifts", "Candles, home goods and gifts for friends."],
        ]),
        faq: [],
        ctaTitle: "Come see what's new",
        ctaLine: "Stop by the shop or follow us to see new arrivals first.",
        description: "Clothing boutique in downtown Cullman, AL with tops, dresses, jeans, shoes, jewelry and gifts. New arrivals all the time. Stop by or shop online.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "sycamore-tax", name: "Sycamore Tax & Bookkeeping", category: "finance", variant: "tax_prep", phone: "0109", street: "415 Example St NE", storefront: true });
    record.hours = { weekly: [[], day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "18:00"), day("09:00", "17:00"), day("09:00", "13:00")] };
    record.services = svc(["Individual tax returns", "Self-employed & 1099 returns", "Small business returns", "Prior-year & amended returns", "Bookkeeping", "Payroll"]);
    record.ext.finance = {
      credentials: "Enrolled Agent",
      credentialsConfirmed: true,
      ptinConfirmed: true,
      efileProvider: true,
      spanish: true,
      modes: ["drop_off", "in_person", "virtual"],
      offSeason: "After tax season we're open Monday through Thursday, 9 to 4, and by appointment.",
      portalUrl: "https://example.com/",
    };
    record.testimonials = [said("They explained everything and made tax time easy.", "Brandon T."), said("Friendly, patient and they answer the phone.", "Ana R."), said("They keep my small business books straight all year.", "Dale K.")];
    return {
      slug: "sycamore-tax",
      kind: "Tax office",
      design: "finance.bright_desk~ticker",
      record,
      copy: copy({
        heroTagline: "Tax returns, bookkeeping and payroll for families and small businesses around Cullman.",
        heroSub: "Friendly help with your taxes, in English or Spanish, from people who take the time to explain.",
        about: ["Sycamore Tax & Bookkeeping is a small office on the north side of Cullman that helps families, self-employed folks and small businesses.", "Stop by, drop off your paperwork, or send it through our client portal. We'll walk you through it."],
        serviceBlurbs: blurbs([
          ["Individual tax returns", "Federal and state returns for individuals and families."],
          ["Self-employed & 1099 returns", "Returns for contractors, gig workers and side businesses."],
          ["Small business returns", "Returns for small businesses, with your records kept organized."],
          ["Prior-year & amended returns", "Help catching up on past years or fixing a return."],
          ["Bookkeeping", "Monthly books kept current so tax time is simpler."],
          ["Payroll", "Paychecks and payroll filings for small teams."],
        ]),
        faq: [
          { q: "Do I need an appointment?", a: "Appointments are easiest, but you can also drop off your paperwork. Give us a call and we'll find a time that works." },
          { q: "How long does it take?", a: "It depends on your return. We'll give you an idea when you come in, and call you when it's ready to review." },
        ],
        ctaTitle: "Let's get your taxes done",
        ctaLine: "Call, stop by, or book a time that works for you.",
        description: "Tax preparation, bookkeeping and payroll in Cullman, AL for families, self-employed folks and small businesses. Se habla español. Call or stop by.",
      }),
    };
  })(),
  (() => {
    const record = base({ slug: "cedar-creek", name: "Cedar Creek Baptist Church", category: "church", variant: "church", phone: "0110", street: "2200 Example Rd NW", storefront: true });
    record.hours = { weekly: [[], [], day("09:00", "13:00"), day("09:00", "13:00"), day("09:00", "13:00"), [], []] };
    record.services = svc(["Sunday School & Bible classes", "Kids", "Students", "Women", "Men", "Music & choir"]);
    record.foundedYear = 1923;
    record.ownershipTags = [];
    record.links.social = { facebook: "https://www.facebook.com/" };
    record.ext.church = {
      tradition: "baptist",
      traditionLabel: "Missionary Baptist church",
      traditionConfirmed: true,
      schedule: [
        { day: "Sunday", time: "9:45 AM", label: "Sunday School" },
        { day: "Sunday", time: "11:00 AM", label: "Morning Worship" },
        { day: "Sunday", time: "6:00 PM", label: "Evening Worship" },
        { day: "Wednesday", time: "6:30 PM", label: "Prayer & Bible Study" },
      ],
      scheduleConfirmed: true,
      firstVisit: {
        parking: "Park anywhere in the front lot. The main doors face the road, and a greeter will meet you.",
        dress: "Some folks wear a suit and some wear jeans. Come as you are comfortable.",
        kids: "Nursery for babies through age 3 during Sunday School and worship.",
        length: "Morning worship usually runs about an hour.",
      },
      pastor: { name: "Bro. Tom Hale", title: "Pastor", bio: "Bro. Tom and his wife, Carol, have served at Cedar Creek for twelve years. He loves fishing, a good church dinner on the grounds, and visiting folks in their homes." },
      givingUrl: "https://example.com/",
      liveUrl: "https://example.com/",
    };
    return {
      slug: "cedar-creek",
      kind: "Country church",
      design: "church.country_chapel~letter",
      record,
      copy: copy({
        heroTagline: "There's a place here for every age, from little ones to senior adults.",
        heroSub: "A church family on the edge of Cullman. We'd love to meet you this Sunday.",
        serviceAreaIntro: "It's normal to wonder what to expect at a new church. Here are a few answers before you come.",
        about: ["Cedar Creek Baptist Church is a small country church just outside Cullman, where neighbors gather on Sundays and Wednesday nights.", "Whether you've been in church all your life or it's been a while, you're welcome here."],
        serviceBlurbs: blurbs([
          ["Sunday School & Bible classes", "Classes for every age before morning worship."],
          ["Kids", "A place for children to learn and make friends."],
          ["Students", "Middle and high schoolers growing together."],
          ["Women", "Women of all ages meeting to study and serve."],
          ["Men", "Men gathering for fellowship and service."],
          ["Music & choir", "Anyone who loves to sing is welcome to join in."],
        ]),
        faq: [{ q: "Who's welcome?", a: "Everyone. Whether you're new to Cullman or just looking for a church home, we'd be glad to have you. Give us a call with any questions." }],
        ctaTitle: "We'd love to see you",
        ctaLine: "Join us this Sunday, or call the church office with any questions.",
        description: "Cedar Creek Baptist Church in Cullman, AL: service times, what to expect on your first visit, ministries for every age, and directions. Join us Sunday.",
      }),
    };
  })(),
];
