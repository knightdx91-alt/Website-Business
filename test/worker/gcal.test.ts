import assert from "node:assert/strict";
import { test } from "node:test";
import { eventBody, eventId, onDomain } from "../../src/worker/gcal.ts";
import { fcmJwt } from "../../src/worker/fcm.ts";

test("Calendar event ids use Google's allowed characters and stay stable per task", () => {
  assert.equal(eventId("f043cb5ec556468e"), "uataskf043cb5ec556468e");
  assert.match(eventId("abcdef0123456789"), /^[a-v0-9]{5,1024}$/);
});

test("Calendar event bodies: timed with a 30-minute reminder, all-day as free time, late tasks roll to the next day", () => {
  const base = { title: "Call Reyes", notes: "Ask for Maria", leadName: "Reyes pizza", leadUrl: "https://app.undergroundassociates.com/#/lead/x" };
  const timed = eventBody({ ...base, due: "2026-10-20", dueTime: "14:30" }) as any;
  assert.deepEqual(timed.start, { dateTime: "2026-10-20T14:30:00", timeZone: "America/Chicago" });
  assert.deepEqual(timed.end, { dateTime: "2026-10-20T15:00:00", timeZone: "America/Chicago" });
  assert.deepEqual(timed.reminders.overrides, [{ method: "popup", minutes: 30 }]);
  assert.match(timed.description, /Ask for Maria\nAbout: Reyes pizza/);
  const late = eventBody({ ...base, due: "2026-12-31", dueTime: "23:45" }) as any;
  assert.deepEqual(late.end, { dateTime: "2027-01-01T00:15:00", timeZone: "America/Chicago" });
  const allDay = eventBody({ ...base, due: "2026-10-31", dueTime: null }) as any;
  assert.deepEqual([allDay.start, allDay.end, allDay.transparency], [{ date: "2026-10-31" }, { date: "2026-11-01" }, "transparent"]);
});

test("only company addresses are reached directly; the JWT acts as that person", async () => {
  assert.ok(onDomain("Chris@UndergroundAssociates.com", "undergroundassociates.com"));
  assert.ok(!onDomain("chris@gmail.com", "undergroundassociates.com"));
  const { privateKey } = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", privateKey)).toString("base64");
  const sa = { client_email: "sa@p.iam.gserviceaccount.com", project_id: "p", private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----` };
  const jwt = await fcmJwt(sa, 1000, "https://www.googleapis.com/auth/calendar.events", "chris@undergroundassociates.com");
  const claims = JSON.parse(Buffer.from(jwt.split(".")[1]!, "base64url").toString());
  assert.equal(claims.sub, "chris@undergroundassociates.com");
  assert.equal(claims.scope, "https://www.googleapis.com/auth/calendar.events");
});
