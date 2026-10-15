import type { Ctx } from "./components.ts";
import type { Dna } from "./dna.ts";
import { serviceIcon, svgPaths, type IconName } from "./icons.ts";
import type { BusinessRecord, CategoryId } from "./types.ts";

/**
 * The "life" layer (Oct 2026): what a page carries besides color and type. Shaped section edges, big trade icons,
 * soft color shapes, confetti or fine line art behind the opening, the color bands and the closing call. All of it is
 * decoration (aria-hidden, pointer-events off, behind the text) drawn in the look's own colors, so contrast never moves.
 * Nothing is added for the legacy values ("straight" / "none"), so older design ids build byte-identical.
 */

const CATEGORY_ICONS: Record<CategoryId, IconName[]> = {
  restaurant: ["utensils", "cup", "flame", "heart"],
  contractor: ["hammer", "wrench", "home", "bolt"],
  salon: ["scissors", "comb", "sparkles", "heart"],
  auto: ["car", "wrench", "gear", "shield"],
  landscaping: ["leaf", "sun", "flower", "droplet"],
  cleaning: ["sparkles", "droplet", "home", "check"],
  print: ["brush", "tag", "camera", "star"],
  retail: ["bag", "tag", "heart", "star"],
  finance: ["chart", "dollar", "shield", "calendar"],
  church: ["heart", "music", "book", "bell"],
  general: ["star", "heart", "check", "sparkles"],
};

/** The business's own icons: one per kind of service it lists (so a plumber gets drops and flames), then its trade's. */
export function tradeIcons(r: Pick<BusinessRecord, "category" | "services">): IconName[] {
  const base = CATEGORY_ICONS[r.category] ?? CATEGORY_ICONS.general;
  const fromServices = (r.services ?? []).map((s) => serviceIcon(s.name, base[0]!));
  return [...new Set([...fromServices, ...base])].slice(0, 6);
}

function iconSvg(name: IconName, cls: string, style: string): string {
  const d = svgPaths(name);
  const stroke = d.startsWith("S");
  return stroke
    ? `<svg class="${cls}" style="${style}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d.slice(1)}</svg>`
    : `<svg class="${cls}" style="${style}" viewBox="0 0 24 24" fill="currentColor">${d}</svg>`;
}

const BLOBS = [
  "M44 -38C56 -25 64 -8 61 8C58 25 45 40 28 50C11 59 -10 62 -28 55C-46 48 -61 31 -63 12C-66 -7 -55 -27 -40 -40C-25 -53 -6 -58 11 -57C28 -55 32 -51 44 -38Z",
  "M38 -48C51 -38 64 -26 66 -11C69 4 61 21 49 34C37 47 21 56 3 57C-15 59 -35 53 -48 40C-61 27 -67 7 -63 -11C-59 -29 -45 -45 -29 -54C-13 -63 6 -65 18 -61C30 -58 25 -58 38 -48Z",
  "M51 -30C61 -15 60 6 52 24C43 41 27 55 7 60C-13 64 -36 59 -50 45C-64 31 -69 9 -63 -9C-57 -28 -40 -43 -21 -52C-2 -60 19 -62 32 -55C44 -48 41 -45 51 -30Z",
];

/** Positions for the decoration pieces, picked per section so neighbouring bands don't mirror each other. */
const SPOTS = [
  "top:-6%;right:-4%",
  "bottom:-10%;left:-5%",
  "top:8%;left:62%",
  "bottom:-6%;right:18%",
  "top:-12%;left:8%",
];

function decorMarkup(kind: Dna["decor"], icons: IconName[], n: number, where: "hero" | "band" | "cta"): string {
  const pick = <T>(xs: readonly T[], i: number) => xs[(n + i) % xs.length]!;
  if (kind === "icons") {
    // Two big outline icons from the trade, tilted, very faint; one small one for rhythm.
    const a = pick(icons, 0);
    const b = pick(icons, 1);
    const c = pick(icons, 2);
    return (
      iconSvg(a, "dec__i dec__i--l", `${pick(SPOTS, 0)};transform:rotate(${(n % 2 ? -1 : 1) * 14}deg)`) +
      iconSvg(b, "dec__i dec__i--m", `${pick(SPOTS, 1)};transform:rotate(${(n % 2 ? 1 : -1) * 10}deg)`) +
      (where === "band" ? "" : iconSvg(c, "dec__i dec__i--s", `${pick(SPOTS, 2)};transform:rotate(-8deg)`))
    );
  }
  if (kind === "blobs") {
    const one = pick(BLOBS, 0);
    const two = pick(BLOBS, 1);
    return (
      `<svg class="dec__b dec__b--1" style="${pick(SPOTS, 0)}" viewBox="-70 -70 140 140"><path d="${one}"/></svg>` +
      `<svg class="dec__b dec__b--2" style="${pick(SPOTS, 1)}" viewBox="-70 -70 140 140"><path d="${two}"/></svg>`
    );
  }
  if (kind === "confetti") {
    // A scatter of dots, squares and squiggles; deterministic from the section index.
    let s = 7 + n * 13;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const parts: string[] = [];
    for (let i = 0; i < 26; i++) {
      const x = (rnd() * 100).toFixed(1);
      const y = (rnd() * 100).toFixed(1);
      // Keep the middle of the band (where the text is) mostly clear.
      if (+x > 22 && +x < 78 && +y > 15 && +y < 85) continue;
      const r = (rnd() * 360).toFixed(0);
      const size = 10 + Math.round(rnd() * 12);
      const shape =
        i % 4 === 0
          ? `<circle cx="12" cy="12" r="10"/>`
          : i % 4 === 1
            ? `<rect x="3" y="3" width="18" height="18" rx="4"/>`
            : i % 4 === 2
              ? `<path d="M2 12q5-8 10 0t10 0" fill="none" stroke-width="3.5" stroke-linecap="round"/>`
              : `<path d="M12 2L22 21H2Z"/>`;
      parts.push(`<svg class="dec__c c${i % 3}" style="left:${x}%;top:${y}%;width:${size}px;transform:rotate(${r}deg)" viewBox="0 0 24 24">${shape}</svg>`);
    }
    return parts.join("");
  }
  if (kind === "lines") {
    // Fine line art: concentric rings, a dotted field and an arc, in the text color at low opacity.
    return (
      `<svg class="dec__l dec__l--r" style="${pick(SPOTS, 0)}" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="72"/><circle cx="100" cy="100" r="48"/></svg>` +
      `<svg class="dec__l dec__l--d" style="${pick(SPOTS, 1)}" viewBox="0 0 120 120">${Array.from({ length: 36 }, (_, i) => `<circle cx="${10 + (i % 6) * 20}" cy="${10 + Math.floor(i / 6) * 20}" r="1.8"/>`).join("")}</svg>`
    );
  }
  return "";
}

/** Adds section edges and decoration to a page body. Called on every page's `<main>…` by doc(). */
export function addLife(ctx: Ctx, body: string): string {
  const dna = ctx.theme.dna;
  const edge = dna.edge && dna.edge !== "straight";
  const decor = dna.decor && dna.decor !== "none" ? dna.decor : null;
  // Never a photo the page already shows (a What's new or gallery photo would appear twice, once huge).
  const pics = dna.pics && dna.pics !== "none" ? (ctx.photos ?? []).filter((p) => !body.includes(`src="${esc(p.src)}"`) && !body.includes(`src="${p.src}"`)) : [];
  if (!edge && !decor && !pics.length) return body;
  const icons = tradeIcons(ctx.r);
  let n = 0;
  const dec = (where: "hero" | "band" | "cta") => (decor ? `<i class="dec" aria-hidden="true">${decorMarkup(decor, icons, n++, where)}</i>` : "");
  const top = edge ? `<i class="edg" aria-hidden="true"></i>` : "";
  const bottom = edge ? `<i class="edg edg--b" aria-hidden="true"></i>` : "";
  // A "since" seal on the opening when the owner gave a founding year (decorative; the year is in the text elsewhere).
  const year = ctx.r.foundedYear;
  const seal = decor && year && year > 1800 && year <= new Date().getFullYear() ? `<i class="seal" aria-hidden="true"><b>Since</b><strong>${year}</strong><b>${esc(ctx.r.address.city)}</b></i>` : "";
  let out = body
    .replace(/<section class="hero [^"]*"[^>]*>/, (m) => m + dec("hero") + seal)
    .replace(/<section class="section section--band"[^>]*>/g, (m) => m + top + bottom + dec("band"));
  const ctaPhoto = dna.pics === "cta" ? pics[0] : undefined;
  out = out.replace(/<section class="cta([ "])([^>]*)>/g, (_m, sep: string, rest: string) =>
    ctaPhoto
      ? `<section class="cta cta--photo${sep === '"' ? '"' : " "}${rest}>${top}<div class="cta__ph"><img src="${esc(ctaPhoto.src)}" alt="" loading="lazy" decoding="async"></div>`
      : `<section class="cta${sep}${rest}>${top}${dec("cta")}`,
  );
  // The photo band: one wide photo (two side by side on wide screens) between the middle sections of the home page.
  if (dna.pics === "band" && pics.length && out.includes('id="hero-title"')) {
    const two = pics.slice(0, 2);
    const band = `<div class="pband${two.length > 1 ? " pband--2" : ""}" aria-hidden="true">${two.map((p) => `<img src="${esc(p.src)}" alt="" loading="lazy" decoding="async">`).join("")}</div>`;
    const at = out.search(/<section class="section[^"]*" id="(reviews|about|visit|faq)"/);
    const cta = out.search(/<section class="cta[ "]/);
    const i = at >= 0 ? at : cta;
    if (i >= 0) out = out.slice(0, i) + band + out.slice(i);
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The footer's top edge (the footer is rendered outside the page body). */
export function footerEdge(dna: Dna): string {
  return dna.edge && dna.edge !== "straight" ? `<i class="edg" aria-hidden="true"></i>` : "";
}
