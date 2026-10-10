import assert from "node:assert/strict";
import { test } from "node:test";
import { OPEN_STATUS_SRC } from "../src/generator/client-script.ts";
import { buildSite } from "../src/generator/render.ts";
import type { Hours } from "../src/generator/types.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

const build = async (record: ReturnType<typeof categoryRecord>, look?: string) => {
  const out = await buildSite({ record, copy: sampleCopy(), site: { slug: "t", look }, mode: "preview" });
  return { home: String(out.files.get("index.html")), out };
};

test("a number that takes texts gets Text us in the call bar, under the hero buttons and in the closing section", async () => {
  const sms = categoryRecord("contractor", { smsEnabled: true });
  const { home, out } = await build(sms);
  const bar = home.slice(home.indexOf('<nav class="bar'), home.indexOf("</nav>", home.indexOf('<nav class="bar')));
  assert.match(bar, /href="sms:/, "call bar has a text button");
  assert.match(bar, /Call<\/span>[\s\S]*Text<\/span>[\s\S]*Free estimate|Call<\/span>[\s\S]*Text<\/span>/);
  assert.equal(home.match(/class="hero__alt">Or text us: <a href="sms:/g)?.length, 2, "one under the hero buttons, one in the closing section");
  assert.ok(!out.suggestions.includes("Can customers text this number?"));

  const noSms = categoryRecord("contractor", { smsEnabled: false });
  const plain = await build(noSms);
  assert.doesNotMatch(plain.home, /sms:/);
  assert.ok(plain.out.suggestions.includes("Can customers text this number?"), "trades without texting get the talking point");
  assert.ok(!(await build(categoryRecord("finance", { smsEnabled: false }))).out.suggestions.includes("Can customers text this number?"));

  // Salons and auto shops carry it in the bar too; four buttons get the tighter bar.
  const salon = await build(categoryRecord("salon", { smsEnabled: true, links: { ...sms.links, booking: "https://booksy.com/x" } }));
  assert.match(salon.home, /<nav class="bar bar--4"[\s\S]*href="sms:/);
});

test("open/closed shows once above the fold: the hero pill, with today's hours in the strip", async () => {
  const r = categoryRecord("salon", {});
  assert.ok(r.hours, "fixture has hours");
  const { home } = await build(r, "salon.night_shift~classic");
  assert.equal(home.match(/data-open-status/g)?.length, 1, "one open/closed pill");
  assert.equal(home.match(/data-today-hours/g)?.length, 1, "the strip shows today's hours instead");
  assert.ok(home.indexOf("data-open-status") < home.indexOf("data-today-hours"));

  // Trades have no hero pill and no strip, so nothing changes for them.
  const c = await build(categoryRecord("contractor", { hours: r.hours }));
  assert.doesNotMatch(c.home, /data-today-hours/);
});

test("today's-hours text that ships to browsers", () => {
  const todayText = new Function(`${OPEN_STATUS_SRC}; return todayText;`)() as (h: Hours, n: { day: number; minutes: number }) => string;
  const wk = [{ open: "11:00", close: "20:00" }];
  const h: Hours = { weekly: [[], wk, wk, [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "17:30" }], wk, wk, []] };
  assert.equal(todayText(h, { day: 1, minutes: 600 }), "Today 11 AM – 8 PM");
  assert.equal(todayText(h, { day: 3, minutes: 600 }), "Today 8 AM – noon, 1 PM – 5:30 PM");
  assert.equal(todayText(h, { day: 0, minutes: 600 }), "Closed today");
  assert.equal(todayText({ weekly: [], open24_7: true }, { day: 0, minutes: 0 }), "Open 24 hours");
});
