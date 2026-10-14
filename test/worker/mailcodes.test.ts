import assert from "node:assert/strict";
import { test } from "node:test";
import { CODE_RE, mailCsv } from "../../src/worker/mailcodes.ts";
import { EXPIRE_SQL } from "../../src/worker/expire.ts";

test("flyer codes are exactly five digits", () => {
  assert.ok(CODE_RE.test("54321"));
  for (const bad of ["5432", "543210", "5432a", " 54321"]) assert.ok(!CODE_RE.test(bad), bad);
});

test("the mail list CSV has a header row and quotes commas", () => {
  const csv = mailCsv([{ id: "a", name: "Smith, Jones & Co", street: "1 Main St", city: "Cullman", state: "AL", zip: "35055", code: "12345", category: "contractor", status: "new" }]);
  const [head, row] = csv.trim().split("\r\n");
  assert.equal(head, "Business,Street,City,State,ZIP,Flyer code,Kind,Status");
  assert.equal(row, '"Smith, Jones & Co",1 Main St,Cullman,AL,35055,12345,contractor,new');
});

test("a lead with a flyer code is kept from expiring (inside the 90-day Google window)", () => {
  assert.match(EXPIRE_SQL, /mail_code_at/);
});
