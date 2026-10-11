import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ADDONS, DEFAULT_LIST_PLAN, type AppSettings } from "../../src/worker/db.ts";
import { LESSON_IDS, trainingCourse } from "../../src/worker/training.ts";

const settings = () =>
  ({
    plans: [{ id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "" }, { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" }, { id: "pro", name: "Pro", setup: 0, monthly: 149, includes: "" }, DEFAULT_LIST_PLAN],
    addons: DEFAULT_ADDONS,
    companyName: "Underground Associates",
  }) as unknown as AppSettings;

test("the course is well formed: unique ids, every lesson has steps and a check with a valid answer, no placeholder left unfilled", () => {
  const { lessons } = trainingCourse(settings());
  assert.equal(new Set(LESSON_IDS).size, LESSON_IDS.length);
  assert.ok(lessons.length >= 12);
  for (const l of lessons) {
    assert.ok(l.steps.length >= 3, l.id);
    assert.ok(l.check.length >= 1, l.id);
    for (const c of l.check) {
      assert.ok(c.options.length >= 2 && c.answer >= 0 && c.answer < c.options.length, `${l.id}: ${c.q}`);
      assert.ok(c.why.length > 20, `${l.id}: why`);
    }
    const text = [l.why, ...l.steps, l.tryIt ?? "", ...l.check.flatMap((c) => [c.q, ...c.options, c.why])].join("\n");
    assert.doesNotMatch(text, /\{[a-zA-Z]+\}/, `${l.id} has an unfilled placeholder`);
  }
});

test("prices come from Settings: plan lines, the per-day line and the Price list plan", () => {
  const { lessons } = trainingCourse(settings());
  const first = lessons[0]!;
  assert.match(first.steps.join("\n"), /Basic \$49\/month, Plus \$89\/month or Pro \$149\/month/);
  assert.match(first.steps.join("\n"), /under \$2 a day/); // 49 × 12 / 365 = $1.61
  assert.match(first.steps.join("\n"), /the Price list plan at \$29 a month/);
  const pl = lessons.find((l) => l.id === "live-price-list")!;
  assert.match(pl.steps.join("\n"), /Price list plan at \$29 a month, no minimum/);
});

test("the barcode and price-list lessons use the real button names", () => {
  const { lessons } = trainingCourse(settings());
  const bc = lessons.find((l) => l.id === "barcode-scanning")!;
  const t = bc.steps.join("\n");
  for (const label of ["▦ Scan", "➕ Put in", "➖ Take out", "Scan the next one", "Barcode", "keyboard mode"]) assert.ok(t.includes(label), label);
  assert.match(bc.tryIt!, /4006381333931/);
  const pl = lessons.find((l) => l.id === "live-price-list")!;
  for (const label of ["Revoke old links", "Open it here", "Tablet & staff", "QR price tags", "Live price list & QR labels"]) assert.ok(pl.steps.join("\n").includes(label), label);
  // Call-log outcomes match the app's labels (👍 Interested, not "Showed them").
  const log = lessons.find((l) => l.id === "logging-calls")!;
  assert.match(log.steps[0]!, /👍 Interested/);
  assert.doesNotMatch(log.steps.join("\n"), /Showed them/);
});
