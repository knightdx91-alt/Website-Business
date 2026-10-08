import type { Action } from "../actions.ts";
import type { Ctx, NavItem } from "../components.ts";
import type { Raw } from "../html.ts";
import type { BusinessRecord, CategoryId, Faq } from "../types.ts";

export interface PageSpec {
  path: string;
  title: string;
  description: string;
  body: Raw;
  crumb: string;
  jsonLd?: Array<Record<string, unknown>>;
}

/** What the copy writer is asked to produce for this category. */
export interface CopyBrief {
  voice: string;
  /** Free-text guidance per Copy field; fields left out are not requested. */
  fields: Partial<Record<"heroTagline" | "heroSub" | "about" | "serviceBlurbs" | "steps" | "faq" | "serviceAreaIntro" | "cta" | "cuisineLabel" | "metaDescription", string>>;
}

export interface CategoryPack {
  id: CategoryId;
  label: string;
  titleMode: "name" | "service";
  locationModel: "storefront" | "service_area";
  hasForm(r: BusinessRecord): boolean;
  looks: string[];
  defaultLook(r: BusinessRecord): string;
  /** Human label for the variant, e.g. "BBQ" or "Plumbing". */
  variantLabel(r: BusinessRecord): string;
  schemaType(r: BusinessRecord): string | string[];
  schemaExtras(ctx: Ctx): Record<string, unknown>;
  homeTitle(r: BusinessRecord, cuisineLabel?: string): string;
  nav(ctx: Ctx): NavItem[];
  actionBar(ctx: Ctx): Action[];
  home(ctx: Ctx): Raw;
  homeFaq(ctx: Ctx): Faq[];
  pages(ctx: Ctx): PageSpec[];
  copyBrief(r: BusinessRecord): CopyBrief;
}

/** Fits "{a} | {b}" into 60 chars by trying shorter variants in order. */
export function fitTitle(candidates: string[], max = 60): string {
  for (const c of candidates) if (c.length <= max) return c;
  const last = candidates[candidates.length - 1]!;
  return last.slice(0, max - 1).trimEnd() + "…";
}
