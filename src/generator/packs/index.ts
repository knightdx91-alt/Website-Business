import type { CategoryId } from "../types.ts";
import { autoPack } from "./auto.ts";
import { churchPack } from "./church.ts";
import { cleaningPack } from "./cleaning.ts";
import { financePack } from "./finance.ts";
import { contractorPack } from "./contractor.ts";
import { landscapingPack } from "./landscaping.ts";
import { printPack } from "./print.ts";
import { retailPack } from "./retail.ts";
import { restaurantPack } from "./restaurant.ts";
import { salonPack } from "./salon.ts";
import { looksFor } from "../themes.ts";
import type { CategoryPack } from "./types.ts";

export const PACKS: Partial<Record<CategoryId, CategoryPack>> = {
  restaurant: restaurantPack,
  contractor: contractorPack,
  salon: salonPack,
  auto: autoPack,
  landscaping: landscapingPack,
  cleaning: cleaningPack,
  print: printPack,
  retail: retailPack,
  finance: financePack,
  church: churchPack,
};

// Each pack lists its first four looks (best fits first); every other look written for the category joins them.
for (const [category, pack] of Object.entries(PACKS) as Array<[CategoryId, CategoryPack]>) {
  pack.looks = [...new Set([...pack.looks, ...looksFor(category)])];
}

export function packFor(category: CategoryId): CategoryPack {
  const p = PACKS[category];
  if (!p) throw new Error(`No category pack for "${category}" yet`);
  return p;
}
