import assert from "node:assert/strict";
import { test } from "node:test";
import { todayIso, upcomingEvents } from "../src/generator/components.ts";
import { buildSite } from "../src/generator/render.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test("dated events show near the top, past ones drop off, and the page hides them itself", async () => {
  const record = categoryRecord("auto", {
    events: [
      { title: "Old sale", date: "2020-01-01" },
      { title: "Brake special", date: future(3), endDate: future(30), detail: "$20 off any brake job." },
      { title: "Car show", date: future(1), time: "9 AM – noon", url: "https://example.com/show" },
    ],
  });
  assert.deepEqual(upcomingEvents(record).map((e) => e.title), ["Car show", "Brake special"]);
  const out = await buildSite({ record, copy: sampleCopy(), site: { slug: "e", look: "auto.shop_floor" }, mode: "preview" });
  const home = String(out.files.get("index.html"));
  assert.deepEqual(out.lint.errors, []);
  assert.ok(home.indexOf('id="events"') < home.indexOf('id="services"'), "events sit before the first section");
  assert.doesNotMatch(home, /Old sale/);
  assert.match(home, /data-event-end="/);
  assert.match(home, /href="https:\/\/example.com\/show"/);
  assert.match(String(out.files.get("assets/site.js")), /data-event-end/);
  assert.match(todayIso("America/Chicago"), /^\d{4}-\d{2}-\d{2}$/);
});

