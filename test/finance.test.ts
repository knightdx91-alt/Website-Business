import assert from "node:assert/strict";
import { test } from "node:test";
import { financeAlsoOffers, financeBannedPhrases, financeVariant } from "../src/generator/packs/finance.ts";
import { buildSite } from "../src/generator/render.ts";
import type { BusinessRecord } from "../src/generator/types.ts";
import { guessCategory } from "../src/places/qualify.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

test("finance offices get the right type; banks, lenders and captive agents are skipped", () => {
  assert.equal(financeVariant("consultant", ["accounting"], "C & L Tax Service"), "tax_prep");
  assert.equal(financeVariant("consultant", ["accounting"], "Smith & Jones CPAs"), "accounting");
  assert.equal(financeVariant("consultant", ["accounting"], "Tax & Bookkeeping by Jo, CPA"), "accounting", "CPA wins over tax words");
  assert.equal(financeVariant("accounting", [], "Johnson Bookkeeping"), "accounting");
  assert.equal(financeVariant("insurance_agency", [], "Kasten Insurance"), "insurance");
  assert.equal(financeVariant("consultant", ["finance"], "Riverbend Wealth Partners"), "financial_advisor");
  assert.equal(financeVariant("consultant", ["accounting"], "Northside Office"), "tax_prep", "accounting type falls back to tax prep");
  assert.equal(financeVariant("bank", [], "First Bank of Cullman"), null);
  assert.equal(financeVariant("finance", [], "World Finance"), null);
  assert.equal(financeVariant("finance", [], "Quick Title Loans"), null);
  assert.equal(financeVariant("insurance_agency", [], "State Farm: Pat Doe"), null);
  assert.equal(financeVariant("consultant", ["accounting"], "H&R Block"), null);
  assert.deepEqual(financeAlsoOffers("tax_prep", "Economy Tax & Insurance"), ["insurance"]);
  const p = (name: string, type: string) => ({ id: "x", displayName: { text: name }, primaryType: type, types: [type] }) as never;
  assert.equal(guessCategory(p("Latinos Taxes y Seguros", "consultant")), "finance");
  assert.equal(guessCategory(p("Kasten Agency", "insurance_agency")), "finance");
});

const finance = (variant: string, ext: NonNullable<BusinessRecord["ext"]["finance"]> = {}, name = "Sample Tax Service") =>
  categoryRecord("finance", { name, variant, ext: { finance: ext }, showStreetAddress: true });

test("required confirmations block publishing until the owner ticks them", async () => {
  const tax = await buildSite({ record: finance("tax_prep"), copy: sampleCopy(), site: { slug: "t", look: "" }, mode: "preview" });
  assert.deepEqual(tax.lint.errors, []);
  assert.ok(tax.todos.some((t) => /PTIN/.test(t)), "tax prep needs the PTIN confirmation");
  assert.ok(tax.files.has("what-to-bring/index.html"), "tax prep gets a what-to-bring page");
  const cpa = await buildSite({ record: finance("accounting", {}, "Smith CPAs"), copy: sampleCopy(), site: { slug: "c", look: "" }, mode: "preview" });
  assert.ok(cpa.todos.some((t) => /CPA firm permit/.test(t)));
  const ok = await buildSite({ record: finance("accounting", { cpaPermitConfirmed: true }, "Smith CPAs"), copy: sampleCopy(), site: { slug: "c", look: "" }, mode: "preview" });
  assert.ok(!ok.todos.some((t) => /CPA firm permit/.test(t)));
  const med = await buildSite({ record: finance("insurance", { medicare: true, licensesConfirmed: true }, "Sample Insurance"), copy: sampleCopy(), site: { slug: "i", look: "" }, mode: "preview" });
  assert.ok(med.todos.some((t) => /Medicare disclaimer/.test(t)));
});

test("financial advisor sites show no reviews and carry the firm's disclosure on every page", async () => {
  const ext = { disclosure: "Securities offered through Example Securities, Member FINRA/SIPC.", complianceApprovedBy: "Jane Roe", complianceApprovedOn: "2026-10-01", brokercheckUrl: "https://brokercheck.finra.org/" };
  const out = await buildSite({ record: finance("financial_advisor", ext, "Sample Planning"), copy: sampleCopy(), site: { slug: "a", look: "" }, mode: "preview" });
  assert.deepEqual(out.lint.errors, []);
  const home = String(out.files.get("index.html"));
  assert.ok(!/id="reviews"/.test(home) && !/Google reviews/.test(home) && !/Leave us a review/.test(home), "no reviews anywhere");
  assert.ok(out.files.has("disclosures/index.html"));
  for (const [path, html] of out.files) if (path.endsWith(".html") && path !== "404.html") assert.ok(String(html).includes("Member FINRA/SIPC"), `${path} has the disclosure`);
  const missing = await buildSite({ record: finance("financial_advisor", {}, "Sample Planning"), copy: sampleCopy(), site: { slug: "a", look: "" }, mode: "preview" });
  assert.ok(missing.todos.some((t) => /compliance/.test(t)) && missing.todos.some((t) => /disclosure/.test(t)));
});

test("AI text may not make refund, rate or credential claims", async () => {
  const bans = financeBannedPhrases(finance("tax_prep"));
  for (const bad of ["Get your maximum refund", "Fast refunds", "IRS-approved preparers", "lowest rates in town", "certified tax pros", "notario público", "We guarantee accuracy"]) {
    assert.ok(bans.some((re) => re.test(bad)), bad);
  }
  for (const fine of ["Tax returns for families and small businesses", "Call us to set up a time", "Bring your W-2s"]) {
    assert.ok(!bans.some((re) => re.test(fine)), fine);
  }
  const out = await buildSite({ record: finance("tax_prep"), copy: sampleCopy({ heroSub: "We get you the maximum refund, fast." }), site: { slug: "t", look: "" }, mode: "preview" });
  assert.ok(out.lint.errors.some((e) => /isn't allowed/.test(e)));
});
