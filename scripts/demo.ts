/**
 * Local end-to-end run: find leads in Cullman for one category, build preview sites for the top N.
 *   npm run demo -- --category restaurant --limit 3 --out /path/to/out
 * Needs GOOGLE_PLACES_API_KEY and PIPELINE_ANTHROPIC_API_KEY. Places results and AI copy are cached in <out>/cache.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { COPY_PROMPT_VERSION, writeCopy } from "../src/copy/write.ts";
import { slugify } from "../src/generator/html.ts";
import { packFor } from "../src/generator/packs/index.ts";
import { buildSite } from "../src/generator/render.ts";
import type { CategoryId, Copy } from "../src/generator/types.ts";
import { fetchPhoto, RESTAURANT_FLAGS, searchText, type Place } from "../src/places/client.ts";
import { qualify } from "../src/places/qualify.ts";
import { placeToRecord, reviewTexts } from "../src/places/to-record.ts";

const { values: args } = parseArgs({
  options: {
    category: { type: "string", default: "restaurant" },
    limit: { type: "string", default: "3" },
    out: { type: "string", default: "out" },
    pages: { type: "string", default: "1" },
    model: { type: "string" },
  },
});

const CULLMAN = { lat: 34.1748, lng: -86.8436 };
const QUERIES: Record<string, string[]> = {
  restaurant: ["restaurants in Cullman, AL", "barbecue in Cullman, AL", "mexican restaurant in Cullman, AL", "cafe in Cullman, AL"],
  contractor: ["plumber in Cullman, AL", "heating and air conditioning in Cullman, AL", "electrician in Cullman, AL", "roofing contractor in Cullman, AL"],
};

const category = args.category as CategoryId;
const pack = packFor(category);
const outDir = args.out!;
const cacheDir = join(outDir, "cache");
const loadFont = (pkg: string, file: string) => readFile(`node_modules/@fontsource/${pkg}/files/${file}`);

async function cached<T>(key: string, make: () => Promise<T>): Promise<T> {
  const path = join(cacheDir, `${createHash("sha1").update(key).digest("hex").slice(0, 16)}.json`);
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    const v = await make();
    await mkdir(cacheDir, { recursive: true });
    await writeFile(path, JSON.stringify(v));
    return v;
  }
}

async function writeFiles(dir: string, files: Map<string, string | Uint8Array>) {
  for (const [rel, content] of files) {
    const p = join(dir, rel);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, content);
  }
}

const placesKey = process.env.GOOGLE_PLACES_API_KEY;
const aiKey = process.env.PIPELINE_ANTHROPIC_API_KEY;
if (!placesKey || !aiKey) throw new Error("Set GOOGLE_PLACES_API_KEY and PIPELINE_ANTHROPIC_API_KEY");

let placesRequests = 0;
const all: Place[] = [];
for (const q of QUERIES[category] ?? []) {
  const places = await cached(`search:${category}:${q}:${args.pages}`, async () => {
    const pages = Number(args.pages);
    placesRequests += pages;
    return searchText(placesKey, {
      textQuery: q,
      center: CULLMAN,
      radiusMeters: 30_000,
      extraFields: category === "restaurant" ? RESTAURANT_FLAGS : [],
      maxPages: pages,
    });
  });
  all.push(...places);
}

const leads = qualify(all);
console.log(`\n${all.length} places found, ${leads.length} qualified leads (${category}):\n`);
for (const l of leads) console.log(`  ${String(l.score).padStart(5)}  ${l.place.displayName?.text}  ·  ${l.reason}`);

const client = new Anthropic({ apiKey: aiKey });
const usedLooks: string[] = [];
const summary: Array<Record<string, unknown>> = [];
let tokensIn = 0;
let tokensOut = 0;

for (const lead of leads.slice(0, Number(args.limit))) {
  const p = lead.place;
  const record = placeToRecord(p, category);
  const slug = slugify(record.name);
  const siteDir = join(outDir, "sites", slug);

  if (p.photos?.[0]) {
    const photo = p.photos[0];
    const img = await cached(`photo:${photo.name}`, async () => {
      placesRequests++;
      const { bytes } = await fetchPhoto(placesKey, photo.name);
      return Buffer.from(bytes).toString("base64");
    });
    await mkdir(join(siteDir, "assets/img"), { recursive: true });
    await writeFile(join(siteDir, "assets/img/hero.jpg"), Buffer.from(img, "base64"));
    const author = photo.authorAttributions?.[0];
    record.media.hero = {
      src: "/assets/img/hero.jpg",
      alt: "",
      source: "google",
      width: Math.min(photo.widthPx, 1600),
      height: Math.round((Math.min(photo.widthPx, 1600) / photo.widthPx) * photo.heightPx),
      attribution: author ? { name: author.displayName, uri: author.uri } : undefined,
    };
  }

  const reviews = reviewTexts(p);
  const result = await cached(`copy:v${COPY_PROMPT_VERSION}:${p.id}:${args.model ?? "default"}`, async () => {
    const r = await writeCopy(client, {
      record,
      pack,
      reviewContext: reviews,
      editorialSummary: p.editorialSummary?.text,
      primaryTypeLabel: p.primaryTypeDisplayName?.text,
      model: args.model,
    });
    tokensIn += r.usage.input;
    tokensOut += r.usage.output;
    return r;
  });
  const copy: Copy = result.copy;

  // Neighbor rule: don't give two leads in the same run the same look.
  let look = pack.defaultLook(record);
  if (usedLooks.includes(look)) look = pack.looks.find((l) => !usedLooks.includes(l)) ?? look;
  usedLooks.push(look);

  const out = await buildSite({ record, copy, site: { slug, look }, mode: "preview", reviewTexts: reviews, loadFont });
  await writeFiles(siteDir, out.files);
  console.log(`\n▸ ${record.name}  (${pack.variantLabel(record)}, look ${out.look})`);
  console.log(`  ${siteDir}`);
  if (result.issues.length) console.log(`  copy notes: ${result.issues.join("; ")}`);
  if (out.lint.errors.length) console.log(`  ERRORS:\n   - ${out.lint.errors.join("\n   - ")}`);
  if (out.lint.warnings.length) console.log(`  warnings: ${out.lint.warnings.join("; ")}`);
  console.log(`  before publish: ${out.lint.publishBlockers.length} items (${out.todos.join(", ")})`);
  summary.push({
    name: record.name,
    slug,
    phone: record.phone.display,
    address: `${record.address.street ?? ""}, ${record.address.city}`,
    reason: lead.reason,
    score: lead.score,
    look: out.look,
    errors: out.lint.errors,
    blockers: out.lint.publishBlockers,
  });
}

await writeFile(join(outDir, `summary-${category}.json`), JSON.stringify(summary, null, 2));
const aiCost = (tokensIn * 4 + tokensOut * 20) / 1_000_000;
console.log(`\nThis run: ${placesRequests} new Google requests, AI tokens ${tokensIn} in / ${tokensOut} out (~$${aiCost.toFixed(3)} at Opus 5.5 rates).`);
