import { parseDesign } from "../generator/themes.ts";
import { z } from "zod";
import { parseMenuText } from "../generator/menu.ts";
import { parsePrice } from "../generator/price.ts";
import { packFor } from "../generator/packs/index.ts";
import { PARTS_COUNTER } from "../generator/packs/auto.ts";
import { CLEANING_FACILITIES } from "../generator/packs/cleaning.ts";
import { normalizeUsPhone } from "../generator/phone.ts";
import { MENU_TAGS, type BusinessRecord, type ConfirmableField, type Copy, type MenuItem, type MenuTag, type Service } from "../generator/types.ts";
import { HttpError } from "./env.ts";

// z.string().url() alone accepts javascript: links; only web addresses may go on a site.
const url = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((u) => u.startsWith("https://") || u.startsWith("http://"), "Links must start with https://")
  .or(z.literal(""));

/** Everything the owner can change from the edit screen. Validated at the API boundary. */
export const EditsSchema = z.object({
  look: z.string().optional(),
  record: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      phone: z.string().trim().max(30).optional(),
      smsEnabled: z.boolean().optional(),
      showStreetAddress: z.boolean().optional(),
      foundedYear: z.number().int().min(1800).max(2100).nullable().optional(),
      familyOwned: z.boolean().optional(),
      insured: z.boolean().optional(),
      license: z.object({ label: z.string().trim().max(80), number: z.string().trim().max(40) }).nullable().optional(),
      emergencyService: z.boolean().optional(),
      freeEstimates: z.boolean().optional(),
      bonded: z.boolean().optional(),
      walkIns: z.enum(["welcome", "appointment_only", "both"]).nullable().optional(),
      ase: z.boolean().optional(),
      warranty: z.object({ months: z.number().int().min(1).max(120).nullable(), miles: z.number().int().min(1).max(500_000).nullable(), nationwide: z.boolean() }).nullable().optional(),
      backgroundChecked: z.boolean().optional(),
      suppliesIncluded: z.boolean().optional(),
      petSafe: z.boolean().optional(),
      email: z.string().trim().email().max(120).or(z.literal("")).optional(),
      designHelp: z.boolean().optional(),
      proofBeforePrint: z.boolean().optional(),
      install: z.boolean().optional(),
      giftCards: z.boolean().optional(),
      delivery: z.boolean().optional(),
      /** Auto parts stores (auto pack, variant parts). What they carry is `services`. */
      parts: z
        .object({
          counter: z.object(Object.fromEntries(PARTS_COUNTER.map((c) => [c.id, z.boolean()]))).partial(),
          counterConfirmed: z.boolean(),
          turnaround: z.string().trim().max(200),
          commercial: z.boolean(),
          commercialText: z.string().trim().max(500),
          program: z.string().trim().max(60),
          orderUrl: url,
        })
        .partial()
        .optional(),
      /** Shops: the Donations section (on by default for thrift stores). */
      donations: z
        .object({
          enabled: z.boolean(),
          accepts: z.array(z.string().trim().min(1).max(80)).max(30),
          doesNotAccept: z.array(z.string().trim().min(1).max(80)).max(30),
          dropOffHours: z.string().trim().max(200),
          pickup: z.boolean(),
          pickupNote: z.string().trim().max(300),
          receipts: z.boolean(),
          note: z.string().trim().max(400),
        })
        .partial()
        .optional(),
      church: z
        .object({
          variant: z.enum(["church", "civic_post", "charity", "community_center"]),
          traditionLabel: z.string().trim().max(80),
          traditionConfirmed: z.boolean(),
          schedule: z.array(z.object({ day: z.string().trim().min(1).max(30), time: z.string().trim().max(30), label: z.string().trim().min(1).max(80) })).max(20),
          scheduleConfirmed: z.boolean(),
          firstVisit: z.object({ parking: z.string().trim().max(300), dress: z.string().trim().max(300), kids: z.string().trim().max(300), length: z.string().trim().max(200), music: z.string().trim().max(200), accessibility: z.string().trim().max(300) }).partial(),
          pastor: z.object({ name: z.string().trim().max(80), title: z.string().trim().max(60), bio: z.string().trim().max(1500) }).partial(),
          pastorOff: z.boolean(),
          beliefs: z.string().trim().max(6000),
          beliefsUrl: url,
          givingUrl: url,
          liveUrl: url,
          sermonsUrl: url,
          spanish: z.boolean(),
          facility: z.string().trim().max(600),
          help: z.string().trim().max(1500),
          donateUrl: url,
          needed: z.string().trim().max(400),
          volunteer: z.string().trim().max(400),
          meetings: z.string().trim().max(300),
          joinText: z.string().trim().max(600),
          joinUrl: url,
          hall: z.string().trim().max(600),
          statusText: z.string().trim().max(200),
          deductibleConfirmed: z.boolean(),
        })
        .partial()
        .optional(),
      finance: z
        .object({
          variant: z.enum(["tax_prep", "accounting", "insurance", "financial_advisor"]),
          credentials: z.string().trim().max(160),
          credentialsConfirmed: z.boolean(),
          ptinConfirmed: z.boolean(),
          efileProvider: z.boolean(),
          cpaPermitConfirmed: z.boolean(),
          cpaPermitNo: z.string().trim().max(40),
          spanish: z.boolean(),
          modes: z.array(z.enum(["drop_off", "in_person", "virtual"])).max(3),
          portalUrl: url,
          offSeason: z.string().trim().max(240),
          whatToBring: z.array(z.string().trim().min(1).max(160)).max(25),
          independent: z.boolean(),
          carriers: z.array(z.string().trim().min(1).max(60)).max(30),
          licensesConfirmed: z.boolean(),
          licenseNo: z.string().trim().max(40),
          medicare: z.boolean(),
          tpmoDisclaimer: z.string().trim().max(1200),
          disclosure: z.string().trim().max(4000),
          complianceApprovedBy: z.string().trim().max(120),
          complianceApprovedOn: z.string().trim().max(40),
          brokercheckUrl: url,
          crsUrl: url,
        })
        .partial()
        .optional(),
      links: z
        .object({ order: url, reserve: url, booking: url, facebook: url, instagram: url, shop: url, giftCards: url })
        .partial()
        .optional(),
      /** Owner proof (every category): awards, memberships, named clients, stats. Empty lists clear. */
      proof: z
        .object({
          awards: z.array(z.object({ name: z.string().trim().min(1).max(80), year: z.string().trim().max(12).optional() })).max(12),
          memberships: z.array(z.string().trim().min(1).max(80)).max(12),
          clients: z.array(z.string().trim().min(1).max(80)).max(20),
          stats: z.array(z.object({ value: z.string().trim().min(1).max(20), label: z.string().trim().min(1).max(60) })).max(6),
        })
        .partial()
        .optional(),
      /** Holiday closures and the visit lines (how to pay, where to park). */
      closures: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), label: z.string().trim().min(1).max(80) })).max(20).optional(),
      visit: z.object({ paymentMethods: z.array(z.string().trim().min(1).max(30)).max(10), parking: z.string().trim().max(240) }).partial().optional(),
      /** Restaurants: per-item photo (a gallery file) and tags, matched to the menu by item name. */
      menuItems: z.array(z.object({ name: z.string().trim().min(1).max(120), image: z.string().trim().max(200).optional(), tags: z.array(z.enum(MENU_TAGS as [MenuTag, ...MenuTag[]])).max(4).optional() })).max(200).optional(),
      restaurant: z
        .object({
          catering: z.boolean(),
          cateringNote: z.string().trim().max(300),
          calendarUrl: url,
          deliveryLinks: z.object({ doordash: url, ubereats: url, grubhub: url }).partial(),
          rewardsUrl: url,
        })
        .partial()
        .optional(),
      salon: z
        .object({
          team: z
            .array(z.object({ name: z.string().trim().min(1).max(60), role: z.string().trim().max(60).optional(), days: z.string().trim().max(60).optional(), bookingUrl: url.optional(), line: z.string().trim().max(200).optional() }))
            .max(20),
          teamConfirmed: z.boolean(),
          rates: z.array(z.object({ minutes: z.number().int().min(5).max(600), price: z.string().trim().min(1).max(20) })).max(10),
          policies: z.object({ deposit: z.string().trim().max(300), cancellation: z.string().trim().max(300), lateness: z.string().trim().max(300), kids: z.string().trim().max(300) }).partial(),
          introOffer: z.object({ text: z.string().trim().max(120), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional() }),
          pet: z.object({ vaccinations: z.string().trim().max(300), pricingFrom: z.string().trim().max(300), mattingNote: z.string().trim().max(300), prep: z.string().trim().max(300) }).partial(),
        })
        .partial()
        .optional(),
      retail: z
        .object({
          florist: z.object({ occasions: z.array(z.string().trim().min(1).max(40)).max(8), deliveryArea: z.string().trim().max(120), cutoff: z.string().trim().max(40), deliveryFee: z.string().trim().max(60), designersChoice: z.boolean() }).partial(),
          vendors: z.object({ boothsAvailable: z.boolean(), note: z.string().trim().max(400) }).partial(),
          departments: z.array(z.string().trim().min(1).max(40)).max(16),
          brands: z.array(z.string().trim().min(1).max(40)).max(24),
          financing: z.object({ lender: z.string().trim().max(60), url: url.optional() }),
          deliveryNote: z.string().trim().max(240),
          dropDay: z.string().trim().max(120),
          holdNote: z.string().trim().max(160),
          occasions: z.array(z.string().trim().min(1).max(40)).max(10),
        })
        .partial()
        .optional(),
      print: z
        .object({
          uploadUrl: url,
          quantityTiers: z.array(z.object({ from: z.number().int().min(1).max(100_000), note: z.string().trim().max(40).optional() })).max(8),
          turnaround: z.string().trim().max(160),
          storeUrl: url,
        })
        .partial()
        .optional(),
      testimonials: z
        .array(z.object({ quote: z.string().trim().min(1).max(400), displayName: z.string().trim().min(1).max(60), town: z.string().trim().max(60).optional() }))
        .max(6)
        .optional(),
      towns: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
      services: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
      menuText: z.string().max(20_000).optional(),
      hiring: z.object({ roles: z.array(z.string().trim().min(1).max(60)).max(8), how: z.string().trim().max(240) }).nullable().optional(),
      events: z
        .array(
          z.object({
            title: z.string().trim().min(1).max(80),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            time: z.string().trim().max(40).optional(),
            detail: z.string().trim().max(240).optional(),
            url: url.optional(),
          }),
        )
        .max(20)
        .optional(),
      galleryAlts: z.record(z.string(), z.string().trim().max(150)).optional(),
      confirmed: z.array(z.enum(["name", "phone", "address", "hours", "services", "service_area", "variant", "menu"])).optional(),
      /* ---- trades, lawn and cleaning modules (Oct 2026); empty strings clear a field ---- */
      /** Plans & pricing cards; an empty list removes them (a lawn crew then shows the no-price defaults again). */
      plans: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(60),
            price: z.string().trim().max(30).optional(),
            unit: z.string().trim().max(30).optional(),
            badge: z.string().trim().max(30).optional(),
            note: z.string().trim().max(160).optional(),
            includes: z.array(z.string().trim().min(1).max(80)).max(8),
          }),
        )
        .max(3)
        .optional(),
      guarantee: z.object({ window: z.string().trim().max(40), remedy: z.string().trim().max(160), text: z.string().trim().max(240) }).partial().nullable().optional(),
      offers: z
        .array(z.object({ title: z.string().trim().min(1).max(80), code: z.string().trim().max(30).optional(), expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(), detail: z.string().trim().max(160).optional() }))
        .max(6)
        .optional(),
      /** Per gallery photo (by src): caption, town, and the file key of the "after" photo it is the "before" of. */
      galleryMeta: z.record(z.string(), z.object({ caption: z.string().trim().max(80), town: z.string().trim().max(40), pairWith: z.string().trim().max(80) }).partial()).optional(),
      contractor: z
        .object({
          financingLender: z.string().trim().max(60),
          financingUrl: url,
          warrantyText: z.string().trim().max(300),
          afterHoursPhone: z.string().trim().max(30),
          afterHoursNote: z.string().trim().max(160),
          afterHoursConfirmed: z.boolean(),
          jobsOver10k: z.boolean(),
          serves: z.enum(["residential", "commercial", "both"]).or(z.literal("")),
        })
        .partial()
        .optional(),
      landscaping: z.object({ seasonal: z.boolean(), adaiPermit: z.string().trim().max(40), crew: z.string().trim().max(160) }).partial().optional(),
      cleaning: z
        .object({
          checklist: z.object({
            rooms: z.array(z.object({ room: z.string().trim().min(1).max(40), tasks: z.array(z.string().trim().min(1).max(100)).max(30) })).max(8),
            tiers: z.array(z.string().trim().min(1).max(30)).max(4),
            extras: z.array(z.string().trim().min(1).max(60)).max(20),
          }),
          facilities: z.array(z.enum(CLEANING_FACILITIES)).max(CLEANING_FACILITIES.length),
          frequency: z.string().trim().max(120),
          afterHours: z.boolean(),
        })
        .partial()
        .optional(),
    })
    .optional(),
  copy: z
    .object({
      heroTagline: z.string().trim().max(200),
      heroSub: z.string().trim().max(300),
      about: z.array(z.string().trim().max(1500)).max(4),
      ctaTitle: z.string().trim().max(100),
      ctaLine: z.string().trim().max(200),
      metaDescription: z.string().trim().max(200),
      serviceBlurbs: z.record(z.string(), z.string().trim().max(400)),
      faq: z.array(z.object({ q: z.string().trim().max(200), a: z.string().trim().max(800) })).max(8),
      approved: z.boolean(),
      heroQuestion: z.string().trim().max(80),
      heroBenefit: z.string().trim().max(80),
    })
    .partial()
    .optional(),
});
export type Edits = z.infer<typeof EditsSchema>;

function serviceId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Drops empty strings and empty arrays so a cleared field disappears from the record instead of lingering as "". */
function compact<T extends object>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === "" || v === undefined || (Array.isArray(v) && !v.length)) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = compact(v as object);
      if (Object.keys(inner).length) out[k] = inner;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** Owner proof, closures, visit lines and the Oct 2026 restaurant / salon / retail / print fields (research/trends-2026). */
function applyFsrpEdits(r: BusinessRecord, e: NonNullable<Edits["record"]>): void {
  if (e.proof !== undefined) {
    const p = compact({ ...(r.proof ?? {}), ...e.proof }) as BusinessRecord["proof"];
    r.proof = p && Object.keys(p).length ? p : undefined;
  }
  if (e.closures !== undefined) r.closures = e.closures.length ? e.closures : undefined;
  if (e.visit !== undefined) {
    const v = compact({ ...(r.visit ?? {}), ...e.visit }) as BusinessRecord["visit"];
    r.visit = v && Object.keys(v).length ? v : undefined;
  }
  if (r.category === "restaurant" && e.restaurant) {
    const x = (r.ext.restaurant = r.ext.restaurant ?? { serviceOptions: {} });
    const { deliveryLinks, ...rest } = e.restaurant;
    for (const [k, v] of Object.entries(rest)) (x as unknown as Record<string, unknown>)[k] = v === "" ? undefined : v;
    if (deliveryLinks) {
      const d = compact({ ...(x.deliveryLinks ?? {}), ...deliveryLinks }) as typeof x.deliveryLinks;
      x.deliveryLinks = d && Object.keys(d).length ? d : undefined;
    }
  }
  if (r.category === "salon" && e.salon) {
    const x = (r.ext.salon = r.ext.salon ?? {});
    const { team, rates, policies, introOffer, pet, ...rest } = e.salon;
    for (const [k, v] of Object.entries(rest)) (x as unknown as Record<string, unknown>)[k] = v;
    if (team !== undefined) x.team = team.length ? team.map((m) => compact(m) as typeof m) : undefined;
    if (rates !== undefined) x.rates = rates.length ? rates : undefined;
    if (policies !== undefined) {
      const p = compact(policies);
      x.policies = Object.keys(p).length ? (p as typeof x.policies) : undefined;
    }
    if (introOffer !== undefined) x.introOffer = introOffer.text ? { text: introOffer.text, until: introOffer.until || undefined } : undefined;
    if (pet !== undefined) {
      const p = compact(pet);
      x.pet = Object.keys(p).length ? (p as typeof x.pet) : undefined;
    }
  }
  if (r.category === "retail" && e.retail) {
    const x = (r.ext.retail = r.ext.retail ?? {});
    const { florist, vendors, financing, ...rest } = e.retail;
    for (const [k, v] of Object.entries(rest)) (x as unknown as Record<string, unknown>)[k] = v === "" || (Array.isArray(v) && !v.length) ? undefined : v;
    if (florist !== undefined) {
      const f = compact({ ...(x.florist ?? {}), ...florist });
      if (florist.designersChoice === false) delete f.designersChoice;
      x.florist = Object.keys(f).length ? (f as typeof x.florist) : undefined;
    }
    if (vendors !== undefined) {
      const v = compact({ ...(x.vendors ?? {}), ...vendors });
      if (vendors.boothsAvailable === false) delete v.boothsAvailable;
      x.vendors = Object.keys(v).length ? (v as typeof x.vendors) : undefined;
    }
    if (financing !== undefined) x.financing = financing.lender ? { lender: financing.lender, url: financing.url || undefined } : undefined;
  }
  if (r.category === "print" && e.print) {
    const x = (r.ext.print = r.ext.print ?? {});
    const { quantityTiers, ...rest } = e.print;
    for (const [k, v] of Object.entries(rest)) (x as unknown as Record<string, unknown>)[k] = v === "" ? undefined : v;
    if (quantityTiers !== undefined) x.quantityTiers = quantityTiers.length ? quantityTiers.map((t) => ({ from: t.from, note: t.note || undefined })) : undefined;
  }
}

export function applyEdits(record: BusinessRecord, copy: Copy, edits: Edits): { record: BusinessRecord; copy: Copy; look?: string } {
  const r: BusinessRecord = structuredClone(record);
  const c: Copy = structuredClone(copy);
  const e = edits.record ?? {};

  if (e.name !== undefined) r.name = e.name;
  if (e.phone !== undefined) {
    const p = normalizeUsPhone(e.phone);
    if (!p) throw new HttpError(400, "That phone number doesn't look like a US number");
    r.phone = p;
  }
  if (e.smsEnabled !== undefined) r.smsEnabled = e.smsEnabled;
  if (e.showStreetAddress !== undefined) r.showStreetAddress = e.showStreetAddress;
  if (e.foundedYear !== undefined) r.foundedYear = e.foundedYear ?? undefined;
  if (e.familyOwned !== undefined) {
    r.ownershipTags = r.ownershipTags.filter((t) => t !== "family_owned");
    if (e.familyOwned) r.ownershipTags.push("family_owned");
  }
  if (e.insured !== undefined) r.insured = e.insured;
  if (e.license !== undefined) r.licenses = e.license && e.license.number ? [{ label: e.license.label || "License", number: e.license.number }] : [];
  if (e.bonded !== undefined) r.bonded = e.bonded;
  if (r.category === "contractor") {
    r.ext.contractor = r.ext.contractor ?? { residential: true };
    if (e.emergencyService !== undefined) r.ext.contractor.emergencyService = e.emergencyService;
    if (e.freeEstimates !== undefined) r.ext.contractor.freeEstimates = e.freeEstimates;
  }
  if (r.category === "salon") {
    r.ext.salon = r.ext.salon ?? {};
    if (e.walkIns !== undefined) r.ext.salon.walkIns = e.walkIns ?? undefined;
  }
  if (r.category === "auto") {
    r.ext.auto = r.ext.auto ?? {};
    if (e.ase !== undefined) r.ext.auto.ase = e.ase;
    if (e.freeEstimates !== undefined) r.ext.auto.freeEstimates = e.freeEstimates;
    if (e.warranty !== undefined) {
      r.ext.auto.warranty =
        e.warranty && (e.warranty.months || e.warranty.miles)
          ? { months: e.warranty.months ?? undefined, miles: e.warranty.miles ?? undefined, nationwide: e.warranty.nationwide }
          : undefined;
    }
    if (e.parts && r.variant === "parts") {
      const x: Record<string, unknown> = { ...(r.ext.auto.parts ?? {}) };
      for (const [k, v] of Object.entries(e.parts)) x[k] = v === "" ? undefined : v;
      r.ext.auto.parts = x as typeof r.ext.auto.parts;
    }
  }
  if (r.category === "landscaping") {
    r.ext.landscaping = r.ext.landscaping ?? {};
    if (e.freeEstimates !== undefined) r.ext.landscaping.freeEstimates = e.freeEstimates;
  }
  if (e.email !== undefined) r.email = e.email || undefined;
  if (r.category === "print") {
    const x = (r.ext.print = r.ext.print ?? {});
    if (e.designHelp !== undefined) x.designHelp = e.designHelp;
    if (e.proofBeforePrint !== undefined) x.proofBeforePrint = e.proofBeforePrint;
    if (e.install !== undefined) x.install = e.install;
  }
  if (r.category === "retail") {
    const x = (r.ext.retail = r.ext.retail ?? {});
    if (e.giftCards !== undefined) x.giftCards = e.giftCards;
    if (e.delivery !== undefined) x.delivery = e.delivery;
    if (e.links?.shop !== undefined) x.shopUrl = e.links.shop || undefined;
    if (e.donations) {
      const d: Record<string, unknown> = { ...(x.donations ?? {}) };
      for (const [k, v] of Object.entries(e.donations)) d[k] = v === "" || (Array.isArray(v) && !v.length) ? undefined : v;
      x.donations = d as typeof x.donations;
    }
  }
  if (r.category === "church" && e.church) {
    const { variant, pastor, firstVisit, ...rest } = e.church;
    if (variant) r.variant = variant;
    const x: Record<string, unknown> = { ...(r.ext.church ?? {}) };
    for (const [k, v] of Object.entries(rest)) x[k] = v === "" || (Array.isArray(v) && !v.length) ? undefined : v;
    if (pastor) x.pastor = pastor.name ? { name: pastor.name, title: pastor.title || undefined, bio: pastor.bio || undefined } : undefined;
    if (firstVisit) {
      const fv = Object.fromEntries(Object.entries(firstVisit).filter(([, v]) => v));
      x.firstVisit = Object.keys(fv).length ? fv : undefined;
    }
    r.ext.church = x as typeof r.ext.church;
  }
  if (r.category === "finance" && e.finance) {
    const { variant, ...rest } = e.finance;
    if (variant) r.variant = variant;
    const x: Record<string, unknown> = { ...(r.ext.finance ?? {}) };
    // Empty text clears a field; everything here is the owner's own wording or confirmation.
    for (const [k, v] of Object.entries(rest)) x[k] = v === "" || (Array.isArray(v) && !v.length) ? undefined : v;
    r.ext.finance = x as typeof r.ext.finance;
  }
  if (r.category === "cleaning") {
    r.ext.cleaning = r.ext.cleaning ?? {};
    const c = r.ext.cleaning;
    if (e.freeEstimates !== undefined) c.freeEstimates = e.freeEstimates;
    if (e.backgroundChecked !== undefined) c.backgroundChecked = e.backgroundChecked;
    if (e.suppliesIncluded !== undefined) c.suppliesIncluded = e.suppliesIncluded;
    if (e.petSafe !== undefined) c.petSafe = e.petSafe;
  }
  applyFsrpEdits(r, e);
  if (e.links) {
    const l = e.links;
    if (l.giftCards !== undefined) r.links.giftCards = l.giftCards || undefined;
    if (l.order !== undefined) r.links.order = l.order || undefined;
    if (l.reserve !== undefined) r.links.reserve = l.reserve || undefined;
    if (l.booking !== undefined) r.links.booking = l.booking || undefined;
    if (l.facebook !== undefined) r.links.social.facebook = l.facebook || undefined;
    if (l.instagram !== undefined) r.links.social.instagram = l.instagram || undefined;
  }
  if (e.testimonials) r.testimonials = e.testimonials;
  if (e.hiring !== undefined) r.hiring = e.hiring && e.hiring.roles.length ? { roles: e.hiring.roles, how: e.hiring.how || undefined } : undefined;
  if (e.events !== undefined)
    r.events = e.events.length
      ? e.events.map((x) => ({ title: x.title, date: x.date, endDate: x.endDate && x.endDate > x.date ? x.endDate : undefined, time: x.time || undefined, detail: x.detail || undefined, url: x.url || undefined }))
      : undefined;
  if (e.galleryAlts) for (const p of r.media.gallery) if (e.galleryAlts[p.src]) p.alt = e.galleryAlts[p.src]!;
  if (e.towns) r.serviceArea = { towns: e.towns, counties: r.serviceArea?.counties ?? [] };
  if (e.services) {
    const keep = new Map(r.services.map((s) => [s.name.toLowerCase(), s]));
    r.services = e.services.map((line) => {
      const [rawName, rawPrice, rawDuration] = line.split("|").map((x) => x.trim());
      const name = rawName || line;
      const existing = keep.get(name.toLowerCase());
      const svc: Service = existing ? { ...existing, name } : { id: serviceId(name), name, featured: true };
      if (rawPrice !== undefined) svc.price = parsePrice(rawPrice);
      // Salons: a third part is the duration ("Haircut | $25 | 45 min").
      if (rawDuration !== undefined) {
        const mins = /^(\d{1,3})\s*(?:min(?:ute)?s?)?$/i.exec(rawDuration)?.[1];
        svc.durationMin = mins ? Number(mins) : undefined;
      }
      return svc;
    });
  }
  if (e.menuText !== undefined && r.category === "restaurant") {
    r.ext.restaurant = r.ext.restaurant ?? { serviceOptions: {} };
    // Photos and tags ride on the item name, so retyping the menu keeps them.
    const prior = new Map<string, MenuItem>();
    for (const sec of r.ext.restaurant.menu?.sections ?? []) for (const it of sec.items) prior.set(it.name.toLowerCase(), it);
    const sections = parseMenuText(e.menuText);
    for (const sec of sections) for (const it of sec.items) {
      const was = prior.get(it.name.toLowerCase());
      if (was?.image) it.image = was.image;
      if (was?.tags?.length) it.tags = was.tags;
    }
    r.ext.restaurant.menu = sections.length
      ? { sections, lastUpdated: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
      : undefined;
  }
  if (e.menuItems && r.category === "restaurant" && r.ext.restaurant?.menu) {
    // A menu photo is one of the owner's gallery files (never a Google photo); an empty image or tag list clears.
    const gallery = new Map(r.media.gallery.filter((g) => g.source !== "google").map((g) => [g.src, g]));
    const wanted = new Map(e.menuItems.map((m) => [m.name.toLowerCase(), m]));
    for (const sec of r.ext.restaurant.menu.sections) for (const it of sec.items) {
      const m = wanted.get(it.name.toLowerCase());
      if (!m) continue;
      if (m.image !== undefined) it.image = m.image && gallery.has(m.image) ? gallery.get(m.image) : undefined;
      if (m.tags !== undefined) it.tags = m.tags.length ? [...new Set(m.tags)] : undefined;
    }
  }
  if (e.confirmed) r.confirmed = e.confirmed as ConfirmableField[];
  applyTlcEdits(r, e);

  const ce = edits.copy ?? {};
  if (ce.heroTagline !== undefined) c.heroTagline = ce.heroTagline;
  if (ce.heroSub !== undefined) c.heroSub = ce.heroSub;
  if (ce.about !== undefined) c.about = ce.about.filter(Boolean);
  if (ce.ctaTitle !== undefined) c.ctaTitle = ce.ctaTitle;
  if (ce.ctaLine !== undefined) c.ctaLine = ce.ctaLine;
  if (ce.metaDescription !== undefined) c.meta.description = ce.metaDescription;
  if (ce.serviceBlurbs !== undefined) c.serviceBlurbs = { ...c.serviceBlurbs, ...ce.serviceBlurbs };
  if (ce.faq !== undefined) c.faq = ce.faq.filter((f) => f.q && f.a);
  if (ce.heroQuestion !== undefined) c.heroQuestion = ce.heroQuestion || undefined;
  if (ce.heroBenefit !== undefined) c.heroBenefit = ce.heroBenefit || undefined;
  if (ce.approved !== undefined) c.approved = ce.approved;
  // Any text change after approval needs a fresh look from the owner.
  else if (Object.keys(ce).length) c.approved = false;

  let look: string | undefined;
  if (edits.look) {
    const d = parseDesign(edits.look);
    if (!packFor(r.category).looks.includes(d.look) || (edits.look.includes("~") && !d.layout)) throw new HttpError(400, "That look isn't available for this category");
    if (d.dnaRaw && !d.dna) throw new HttpError(400, "That page structure code isn't valid");
    look = edits.look;
  }
  return { record: r, copy: c, look };
}

/** Trades, lawn and cleaning modules (Oct 2026): plans, guarantee, offers, photo captions/pairs, and the per-category details. */
function applyTlcEdits(r: BusinessRecord, e: NonNullable<Edits["record"]>): void {
  const clear = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  if (e.plans !== undefined) {
    r.plans = e.plans.length ? e.plans.map((p) => ({ name: p.name, price: clear(p.price), unit: clear(p.unit), badge: clear(p.badge), note: clear(p.note), includes: p.includes })) : undefined;
  }
  if (e.guarantee !== undefined) {
    const g = e.guarantee ? { window: clear(e.guarantee.window), remedy: clear(e.guarantee.remedy), text: clear(e.guarantee.text) } : undefined;
    r.guarantee = g && (g.window || g.remedy || g.text) ? g : undefined;
  }
  if (e.offers !== undefined) {
    r.offers = e.offers.map((o) => ({ title: o.title, code: clear(o.code), expiresOn: clear(o.expiresOn), detail: clear(o.detail) }));
  }
  if (e.galleryMeta) {
    const keys = new Set(r.media.gallery.map((p) => (p.src.split("/").pop() ?? p.src).split(".")[0]));
    for (const p of r.media.gallery) {
      const m = e.galleryMeta[p.src];
      if (!m) continue;
      if (m.caption !== undefined) p.caption = clear(m.caption);
      if (m.town !== undefined) p.town = clear(m.town);
      // A pair only points at another photo that is on the record (and not at itself).
      if (m.pairWith !== undefined) {
        const key = clear(m.pairWith);
        const own = (p.src.split("/").pop() ?? p.src).split(".")[0];
        p.pairWith = key && key !== own && keys.has(key) ? key : undefined;
      }
    }
  }
  if (r.category === "contractor" && e.contractor) {
    const x = (r.ext.contractor = r.ext.contractor ?? { residential: true });
    const c = e.contractor;
    if (c.financingLender !== undefined || c.financingUrl !== undefined) {
      const lender = c.financingLender !== undefined ? clear(c.financingLender) : x.financing?.lender;
      const link = c.financingUrl !== undefined ? clear(c.financingUrl) : x.financing?.url;
      x.financing = lender ? { lender, url: link ?? "" } : undefined;
    }
    if (c.warrantyText !== undefined) x.warrantyText = clear(c.warrantyText);
    if (c.afterHoursPhone !== undefined || c.afterHoursNote !== undefined || c.afterHoursConfirmed !== undefined) {
      const prev = x.afterHours ?? { confirmed: false };
      let phone = c.afterHoursPhone !== undefined ? clear(c.afterHoursPhone) : prev.phone;
      if (phone) {
        const n = normalizeUsPhone(phone);
        if (!n) throw new HttpError(400, "That after-hours number doesn't look like a US number");
        phone = n.display;
      }
      const note = c.afterHoursNote !== undefined ? clear(c.afterHoursNote) : prev.note;
      const confirmed = c.afterHoursConfirmed ?? prev.confirmed;
      x.afterHours = phone || note || confirmed ? { phone, note, confirmed } : undefined;
    }
    if (c.jobsOver10k !== undefined) x.jobsOver10k = c.jobsOver10k || undefined;
    if (c.serves !== undefined) x.serves = c.serves || undefined;
  }
  if (r.category === "landscaping" && e.landscaping) {
    const x = (r.ext.landscaping = r.ext.landscaping ?? {});
    if (e.landscaping.seasonal !== undefined) x.seasonal = e.landscaping.seasonal || undefined;
    if (e.landscaping.adaiPermit !== undefined) x.adaiPermit = clear(e.landscaping.adaiPermit);
    if (e.landscaping.crew !== undefined) x.crew = clear(e.landscaping.crew);
  }
  if (r.category === "cleaning" && e.cleaning) {
    const x = (r.ext.cleaning = r.ext.cleaning ?? {});
    const k = e.cleaning;
    if (k.checklist !== undefined) {
      const rooms = k.checklist.rooms.filter((room) => room.tasks.length);
      x.checklist = rooms.length || k.checklist.extras.length ? { rooms, tiers: k.checklist.tiers, extras: k.checklist.extras } : undefined;
    }
    if (k.facilities !== undefined) x.facilities = k.facilities.length ? [...new Set(k.facilities)] : undefined;
    if (k.frequency !== undefined) x.frequency = clear(k.frequency);
    if (k.afterHours !== undefined) x.afterHours = k.afterHours || undefined;
  }
}
