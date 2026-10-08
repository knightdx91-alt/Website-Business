import type { CategoryId } from "../types.ts";
import { autoPack } from "./auto.ts";
import { cleaningPack } from "./cleaning.ts";
import { contractorPack } from "./contractor.ts";
import { landscapingPack } from "./landscaping.ts";
import { restaurantPack } from "./restaurant.ts";
import { salonPack } from "./salon.ts";
import type { CategoryPack } from "./types.ts";

export const PACKS: Partial<Record<CategoryId, CategoryPack>> = {
  restaurant: restaurantPack,
  contractor: contractorPack,
  salon: salonPack,
  auto: autoPack,
  landscaping: landscapingPack,
  cleaning: cleaningPack,
};

export function packFor(category: CategoryId): CategoryPack {
  const p = PACKS[category];
  if (!p) throw new Error(`No category pack for "${category}" yet`);
  return p;
}
