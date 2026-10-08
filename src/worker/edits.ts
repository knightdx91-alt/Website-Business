import { z } from "zod";
import { parseMenuText } from "../generator/menu.ts";
import { packFor } from "../generator/packs/index.ts";
import { normalizeUsPhone } from "../generator/phone.ts";
import type { BusinessRecord, ConfirmableField, Copy } from "../generator/types.ts";
import { HttpError } from "./env.ts";

const url = z.string().trim().url().max(500).or(z.literal(""));

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
      links: z
        .object({ order: url, reserve: url, booking: url, facebook: url, instagram: url })
        .partial()
        .optional(),
      testimonials: z
        .array(z.object({ quote: z.string().trim().min(1).max(400), displayName: z.string().trim().min(1).max(60), town: z.string().trim().max(60).optional() }))
        .max(6)
        .optional(),
      towns: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
      services: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
      menuText: z.string().max(20_000).optional(),
      confirmed: z.array(z.enum(["name", "phone", "address", "hours", "services", "service_area", "variant", "menu"])).optional(),
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
  if (r.category === "contractor") {
    r.ext.contractor = r.ext.contractor ?? { residential: true };
    if (e.emergencyService !== undefined) r.ext.contractor.emergencyService = e.emergencyService;
    if (e.freeEstimates !== undefined) r.ext.contractor.freeEstimates = e.freeEstimates;
  }
  if (e.links) {
    const l = e.links;
    if (l.order !== undefined) r.links.order = l.order || undefined;
    if (l.reserve !== undefined) r.links.reserve = l.reserve || undefined;
    if (l.booking !== undefined) r.links.booking = l.booking || undefined;
    if (l.facebook !== undefined) r.links.social.facebook = l.facebook || undefined;
    if (l.instagram !== undefined) r.links.social.instagram = l.instagram || undefined;
  }
  if (e.testimonials) r.testimonials = e.testimonials;
  if (e.towns) r.serviceArea = { towns: e.towns, counties: r.serviceArea?.counties ?? [] };
  if (e.services) {
    const keep = new Map(r.services.map((s) => [s.name.toLowerCase(), s]));
    r.services = e.services.map((name) => keep.get(name.toLowerCase()) ?? { id: serviceId(name), name, featured: true });
  }
  if (e.menuText !== undefined && r.category === "restaurant") {
    r.ext.restaurant = r.ext.restaurant ?? { serviceOptions: {} };
    const sections = parseMenuText(e.menuText);
    r.ext.restaurant.menu = sections.length
      ? { sections, lastUpdated: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
      : undefined;
  }
  if (e.confirmed) r.confirmed = e.confirmed as ConfirmableField[];

  const ce = edits.copy ?? {};
  if (ce.heroTagline !== undefined) c.heroTagline = ce.heroTagline;
  if (ce.heroSub !== undefined) c.heroSub = ce.heroSub;
  if (ce.about !== undefined) c.about = ce.about.filter(Boolean);
  if (ce.ctaTitle !== undefined) c.ctaTitle = ce.ctaTitle;
  if (ce.ctaLine !== undefined) c.ctaLine = ce.ctaLine;
  if (ce.metaDescription !== undefined) c.meta.description = ce.metaDescription;
  if (ce.serviceBlurbs !== undefined) c.serviceBlurbs = { ...c.serviceBlurbs, ...ce.serviceBlurbs };
  if (ce.faq !== undefined) c.faq = ce.faq.filter((f) => f.q && f.a);
  if (ce.approved !== undefined) c.approved = ce.approved;
  // Any text change after approval needs a fresh look from the owner.
  else if (Object.keys(ce).length) c.approved = false;

  let look: string | undefined;
  if (edits.look) {
    if (!packFor(r.category).looks.includes(edits.look)) throw new HttpError(400, "That look isn't available for this category");
    look = edits.look;
  }
  return { record: r, copy: c, look };
}
