import type { CategoryId } from "../types.ts";
import { contractorPack } from "./contractor.ts";
import { restaurantPack } from "./restaurant.ts";
import type { CategoryPack } from "./types.ts";

export const PACKS: Partial<Record<CategoryId, CategoryPack>> = {
  restaurant: restaurantPack,
  contractor: contractorPack,
};

export function packFor(category: CategoryId): CategoryPack {
  const p = PACKS[category];
  if (!p) throw new Error(`No category pack for "${category}" yet`);
  return p;
}
