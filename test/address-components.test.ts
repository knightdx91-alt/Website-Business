import assert from "node:assert/strict";
import { test } from "node:test";
import type { Place } from "../src/places/client.ts";
import { placeToRecord } from "../src/places/to-record.ts";

// Oct 2026: two feed / nutrition shops failed to build because Google sent the street line as an address component
// with no `types` ("Cannot read properties of undefined (reading 'includes')").
test("an address component without types neither crashes nor loses the street", () => {
  const place = {
    id: "p1",
    displayName: { text: "A Country Feed & Farm Supply" },
    formattedAddress: "8743 US-31 N, Kimberly, AL 35091, USA",
    nationalPhoneNumber: "(256) 555-0100",
    internationalPhoneNumber: "+1 256-555-0100",
    location: { latitude: 33.77, longitude: -86.81 },
    businessStatus: "OPERATIONAL",
    types: ["store"],
    addressComponents: [
      { longText: "8743 US-31 N", languageCode: "en" },
      { longText: "Kimberly", shortText: "Kimberly", types: ["locality", "political"] },
      { longText: "Alabama", shortText: "AL", types: ["administrative_area_level_1", "political"] },
      { longText: "35091", shortText: "35091", types: ["postal_code"] },
    ],
  } as unknown as Place;
  const r = placeToRecord(place, "retail");
  assert.equal(r.address.street, "8743 US-31 N");
  assert.equal(r.address.city, "Kimberly");
  assert.equal(r.address.zip, "35091");
});
