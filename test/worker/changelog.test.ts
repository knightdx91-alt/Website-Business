import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CHANGELOG, LATEST_CHANGE, changesSince, unseenChanges } from "../../src/worker/changelog.ts";

test("the change log is newest first with unique numbers and real dates", () => {
  for (let i = 1; i < CHANGELOG.length; i++) {
    assert.ok(CHANGELOG[i - 1]!.n > CHANGELOG[i]!.n, `n order at ${CHANGELOG[i]!.title}`);
    assert.ok(CHANGELOG[i - 1]!.date >= CHANGELOG[i]!.date, `date order at ${CHANGELOG[i]!.title}`);
  }
  for (const e of CHANGELOG) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(e.title.length > 3 && e.items.length > 0, e.title);
  }
  assert.equal(LATEST_CHANGE, CHANGELOG[0]!.n);
});

test("every Android release has a change-log entry (newest entry with a version = build.gradle versionName)", () => {
  const gradle = String(readFileSync("android/app/build.gradle.kts"));
  const name = /versionName = "([^"]+)"/.exec(gradle)![1];
  assert.equal(CHANGELOG.find((e) => e.android)!.android, name, "Add a CHANGELOG entry with android: the new versionName");
});

test("unseen entries and what an update brings", () => {
  assert.deepEqual(unseenChanges(null).map((e) => e.n), [LATEST_CHANGE]);
  assert.deepEqual(unseenChanges(LATEST_CHANGE), []);
  assert.equal(unseenChanges(LATEST_CHANGE - 2).length, 2);
  const latestAndroid = CHANGELOG.find((e) => e.android)!.android!;
  assert.deepEqual(changesSince(latestAndroid), CHANGELOG.slice(0, CHANGELOG.findIndex((e) => e.android === latestAndroid)));
  const since = changesSince("2.72").map((e) => e.android ?? "web");
  assert.ok(since.includes("2.73") && !since.includes("2.72") && !since.includes("2.71"));
  assert.ok(changesSince("2.9").some((e) => e.android === "2.11"), "2.11 is newer than 2.9");
});
