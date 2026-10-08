import type { Service } from "./types.ts";

/** "$25", "from $40", "$30-$45", "consult" → a Service price. Unknown text means no price shown. */
export function parsePrice(text: string): Service["price"] {
  const t = text.toLowerCase().replace(/,/g, "");
  const nums = [...t.matchAll(/\$?\s*(\d+(?:\.\d{1,2})?)/g)].map((m) => Number(m[1]));
  if (/consult/.test(t)) return { mode: "quote" };
  if (nums.length >= 2) return { mode: "range", min: nums[0], max: nums[1] };
  if (nums.length === 1) return { mode: /from|start|\+/.test(t) ? "from" : "exact", amount: nums[0] };
  return undefined;
}
