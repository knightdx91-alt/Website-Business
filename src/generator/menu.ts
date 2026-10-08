import type { MenuSection } from "./types.ts";

/**
 * Parses the owner's menu typed in the app:
 *   # Plates
 *   Pulled pork plate | $12 | Two sides and bread
 *   Brisket plate | $15
 * Lines without a "#" section header go into a "Menu" section.
 */
export function parseMenuText(text: string): MenuSection[] {
  const sections: MenuSection[] = [];
  let current: MenuSection | undefined;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      current = { name: line.replace(/^#+\s*/, ""), items: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { name: "Menu", items: [] };
      sections.push(current);
    }
    const [name, price, ...rest] = line.split("|").map((s) => s.trim());
    if (!name) continue;
    current.items.push({ name, price: price || undefined, description: rest.join(" | ") || undefined });
  }
  return sections.filter((s) => s.items.length > 0);
}

export function menuToText(sections: MenuSection[]): string {
  return sections
    .map((s) => [`# ${s.name}`, ...s.items.map((i) => [i.name, i.price ?? "", i.description ?? ""].join(" | ").replace(/( \| )+$/, ""))].join("\n"))
    .join("\n\n");
}
