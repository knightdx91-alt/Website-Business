import type {
  BusinessRecord,
  ItemInfo,
  ListKind,
  MenuItem,
  MenuSection,
} from "../generator/types.ts";
import { KINDS, listKind } from "../generator/pricelist.ts";
import { priceList, stamp } from "./tankboard.ts";

/**
 * Sample stock for a preview: when a prospect is interested in the inventory system, the team taps "Add sample items" on the
 * lead and the preview's price page, board and tablet display fill with believable stock for that kind of business (car parts
 * for a parts counter, hardware for a hardware store, a bakery case, tanks of fish…). Every sample item carries `sample: true`,
 * so "Remove sample items" takes exactly those out and leaves anything the shop typed, the preview says they are samples, and
 * the publish gate (a REQUIRED to-do in render.ts) refuses to go live while any remain.
 */

type Row = [
  name: string,
  price: string,
  qty?: number,
  note?: string,
  facts?: Record<string, string>,
];
interface SampleSet {
  /** When the kind alone isn't enough: a name / type-label test picks this set. */
  match?: RegExp;
  kind: ListKind;
  sections: Array<[name: string, rows: Row[]]>;
}

const SETS: SampleSet[] = [
  {
    kind: "parts",
    match: /tire|wheel/i,
    sections: [
      [
        "Passenger tires",
        [
          [
            "205/55R16 all-season",
            "$89",
            8,
            "Set of 4 installed: call for a quote",
            { partNumber: "205/55R16", warranty: "60,000 mi" },
          ],
          [
            "225/65R17 all-season",
            "$112",
            6,
            undefined,
            { partNumber: "225/65R17", warranty: "65,000 mi" },
          ],
          ["195/65R15 touring", "$78", 3],
        ],
      ],
      [
        "Light truck tires",
        [
          [
            "265/70R17 all-terrain",
            "$168",
            12,
            "Most 2015–2024 F-150, Silverado, Ram 1500",
            { partNumber: "265/70R17", fits: "Half-ton pickups" },
          ],
          ["275/65R18 all-terrain", "$189", 4],
          ["LT245/75R16 mud-terrain", "$176", 2],
        ],
      ],
      [
        "Services",
        [
          ["Mount & balance", "$20/tire", undefined, "Includes valve stem"],
          ["Flat repair", "$25", undefined, "Patch and plug, same day"],
          ["Alignment", "$89", undefined, "Four-wheel, printout included"],
        ],
      ],
    ],
  },
  {
    kind: "parts",
    sections: [
      [
        "Filters",
        [
          [
            "Oil filter, spin-on",
            "$6.99",
            24,
            "Most 4- and 6-cylinder engines",
            {
              partNumber: "PH3614",
              fits: "Most Ford, Honda, Toyota 2000–2020",
              brand: "Store brand",
            },
          ],
          [
            "Engine air filter",
            "$14.99",
            12,
            undefined,
            { fits: "2009–2020 F-150 5.0 / 3.5" },
          ],
          ["Cabin air filter", "$12.49", 9],
        ],
      ],
      [
        "Batteries & electrical",
        [
          [
            "Battery, group 24F",
            "$129.99",
            5,
            "Core charge $18, refunded with your old battery",
            { warranty: "24 months free replacement" },
          ],
          [
            "Battery, group 35",
            "$134.99",
            3,
            undefined,
            { warranty: "24 months free replacement" },
          ],
          ["Headlight bulb 9005", "$11.99", 20],
          [
            "Alternator, remanufactured",
            "$159",
            2,
            "Call to check fit",
            { condition: "Remanufactured", warranty: "Lifetime" },
          ],
        ],
      ],
      [
        "Brakes",
        [
          [
            "Ceramic brake pads, front",
            "$42.99",
            10,
            undefined,
            { fits: "2012–2019 Silverado 1500", warranty: "Lifetime" },
          ],
          ["Brake rotor, front", "$54.99", 6],
          ["Brake fluid DOT 3, 32 oz", "$6.49", 15],
        ],
      ],
      [
        "Fluids & wipers",
        [
          ["5W-30 full synthetic, 5 qt", "$27.99", 18],
          ["Antifreeze 50/50, 1 gal", "$13.99", 14],
          ["Wiper blade 22 in", "$12.99", 11],
          ["Wiper blade 18 in", "$10.99", 4],
        ],
      ],
    ],
  },
  {
    kind: "vehicles",
    sections: [
      [
        "Trucks",
        [
          [
            "2018 Ford F-150 XLT SuperCrew",
            "$24,900",
            1,
            "4×4, one owner",
            {
              year: "2018 Ford F-150 XLT",
              mileage: "84,200 mi",
              condition: "Clean title, one owner",
              drivetrain: "4×4, 5.0 V8",
            },
          ],
          [
            "2016 Chevrolet Silverado 1500 LT",
            "$19,500",
            1,
            undefined,
            { mileage: "112,000 mi", condition: "Clean title" },
          ],
          [
            "2020 Toyota Tacoma SR5",
            "$28,750",
            1,
            undefined,
            { mileage: "61,300 mi" },
          ],
        ],
      ],
      [
        "Cars & SUVs",
        [
          [
            "2019 Honda CR-V EX",
            "$21,200",
            1,
            undefined,
            { mileage: "58,900 mi", condition: "Clean title" },
          ],
          [
            "2017 Toyota Camry SE",
            "$15,900",
            1,
            undefined,
            { mileage: "97,400 mi" },
          ],
          [
            "2015 Nissan Altima 2.5 S",
            "$9,800",
            1,
            "Buy here, pay here available",
          ],
        ],
      ],
      [
        "Trailers & equipment",
        [
          [
            "16 ft utility trailer, tandem axle",
            "$3,450",
            2,
            "Ramp gate, new tires",
          ],
          [
            "Zero-turn mower, 54 in",
            "$2,900",
            1,
            undefined,
            { condition: "Used, serviced", mileage: "310 hours" },
          ],
        ],
      ],
    ],
  },
  {
    kind: "fish",
    sections: [
      [
        "Tank 1 · Freshwater community",
        [
          [
            "Neon tetra",
            "$2.99",
            40,
            "Schooling, keep 6+",
            {
              maxSize: "1.5 in",
              diet: "Flake, frozen brine shrimp",
              temperament: "Peaceful, schooling",
              minTank: "10 gal",
              care: "Beginner",
              water: "Freshwater, 72–78 °F",
            },
          ],
          ["Fancy guppy, male", "$4.49", 25],
          [
            "Corydoras, albino",
            "$6.99",
            12,
            undefined,
            {
              temperament: "Peaceful bottom dweller, keep 3+",
              minTank: "20 gal",
            },
          ],
          ["Bristlenose pleco", "$9.99", 5],
        ],
      ],
      [
        "Tank 2 · Cichlids",
        [
          [
            "Electric yellow lab",
            "$12.99",
            8,
            undefined,
            {
              maxSize: "4 in",
              temperament: "Semi-aggressive",
              minTank: "40 gal",
              water: "Hard, 76–82 °F",
            },
          ],
          ["German blue ram, pair", "$34.99", 2, "Pairs only"],
          ["Angelfish, silver", "$14.99", 6],
        ],
      ],
      [
        "Tank 3 · Saltwater",
        [
          [
            "Ocellaris clownfish",
            "$24.99",
            6,
            "Tank-raised",
            {
              maxSize: "3 in",
              care: "Beginner",
              minTank: "20 gal",
              water: "Saltwater, 1.024–1.026",
            },
          ],
          ["Royal gramma", "$29.99", 3],
          ["Cleaner shrimp", "$32.99", 4],
        ],
      ],
      [
        "Plants & supplies",
        [
          ["Anubias nana, potted", "$8.99", 10],
          ["Java fern", "$7.49", 7],
          ["Flake food, 2.2 oz", "$6.99", 15],
          ["Water conditioner, 16 oz", "$11.99", 9],
        ],
      ],
    ],
  },
  {
    kind: "plants",
    sections: [
      [
        "Bench 1 · Perennials",
        [
          [
            "Coneflower, 1 gal",
            "$12.99",
            18,
            "Full sun",
            {
              maxSize: "2–3 ft",
              light: "Full sun",
              zone: "Zone 3–9",
              bloom: "Summer, purple",
            },
          ],
          ["Black-eyed Susan, 1 gal", "$11.99", 14],
          ["Hosta 'Patriot', 1 gal", "$13.99", 9, "Shade"],
          ["Daylily 'Stella de Oro', 1 gal", "$10.99", 22],
        ],
      ],
      [
        "Bench 2 · Shrubs & trees",
        [
          [
            "Knock Out rose, 3 gal",
            "$29.99",
            7,
            undefined,
            { light: "Full sun", bloom: "Spring to frost" },
          ],
          ["Encore azalea, 3 gal", "$34.99", 5],
          ["Crape myrtle 'Natchez', 7 gal", "$69.99", 3],
          ["Japanese maple 'Bloodgood', 5 gal", "$89.99", 2],
        ],
      ],
      [
        "Bench 3 · Vegetables & herbs",
        [
          ["Tomato 'Better Boy', 4 in", "$3.49", 36],
          ["Jalapeño pepper, 4 in", "$3.49", 20],
          ["Basil, 4 in", "$3.99", 15],
          ["Strawberry, 6-pack", "$7.99", 8],
        ],
      ],
    ],
  },
  {
    kind: "pets",
    sections: [
      [
        "Enclosure 1 · Reptiles",
        [
          [
            "Leopard gecko",
            "$49.99",
            4,
            "Captive bred",
            {
              maxSize: "8–10 in",
              diet: "Crickets, mealworms",
              temperament: "Calm, handles well",
              minTank: "20 gal long",
              lifespan: "15–20 years",
              care: "Beginner",
            },
          ],
          [
            "Bearded dragon, juvenile",
            "$79.99",
            3,
            undefined,
            { minTank: "40 gal", diet: "Crickets, greens" },
          ],
          ["Ball python, normal", "$69.99", 2],
        ],
      ],
      [
        "Enclosure 2 · Small animals",
        [
          [
            "Guinea pig",
            "$39.99",
            5,
            "Pairs do best",
            { diet: "Pellets, hay, greens" },
          ],
          ["Syrian hamster", "$19.99", 6],
          ["Holland lop rabbit", "$59.99", 2],
        ],
      ],
      [
        "Supplies",
        [
          ["Heat lamp kit", "$34.99", 7],
          ["Cricket cup (30)", "$3.99", 20],
          ["Timothy hay, 48 oz", "$12.99", 10],
        ],
      ],
    ],
  },
  {
    kind: "food",
    match: /produce|farm|market|orchard|stand/i,
    sections: [
      [
        "Produce",
        [
          ["Tomatoes, vine-ripe", "$2.49/lb", 60, "Picked this morning"],
          ["Sweet corn", "$6/dozen", 30],
          ["Peaches, Chilton County", "$3.99/lb", 25],
          ["Okra", "$3.49/lb", 12],
          ["Watermelon", "$6 each", 9],
        ],
      ],
      [
        "Jams, honey & pickles",
        [
          ["Local wildflower honey, 16 oz", "$12", 14],
          ["Fig preserves, pint", "$8", 10],
          ["Bread & butter pickles, quart", "$9", 7],
        ],
      ],
      [
        "Plants & flowers",
        [
          ["Sunflower bunch", "$8", 6],
          ["Tomato plants, 4 in", "$3", 18],
        ],
      ],
    ],
  },
  {
    kind: "food",
    match: /meat|butcher|processing|smokehouse/i,
    sections: [
      [
        "Beef",
        [
          ["Ribeye steak", "$18.99/lb", 20, "Cut to order"],
          ["Ground chuck", "$6.49/lb", 40],
          ["Chuck roast", "$7.99/lb", 10],
          ["Brisket, whole packer", "$5.99/lb", 4],
        ],
      ],
      [
        "Pork & chicken",
        [
          ["Pork chops, bone-in", "$4.99/lb", 25],
          ["Smoked sausage", "$7.49/lb", 15, "Made here"],
          ["Whole chicken", "$2.99/lb", 12],
        ],
      ],
      [
        "Deer processing",
        [
          ["Basic processing", "$95", undefined, "Skinned, quartered, wrapped"],
          ["Summer sausage, per 10 lb", "$45", undefined],
          ["Jerky, per 5 lb", "$40", undefined],
        ],
      ],
    ],
  },
  {
    kind: "food",
    sections: [
      [
        "Breads",
        [
          [
            "Sourdough loaf",
            "$8",
            6,
            "Baked this morning",
            {
              ingredients: "Flour, water, salt, starter",
              allergens: "Wheat",
              keeps: "3 days at room temp",
            },
          ],
          ["Country white loaf", "$6", 4],
          ["Cinnamon raisin loaf", "$9", 2],
          ["Dinner rolls, dozen", "$7", 5],
        ],
      ],
      [
        "Pastries",
        [
          [
            "Cinnamon roll",
            "$4.50",
            9,
            undefined,
            { allergens: "Wheat, dairy, egg" },
          ],
          ["Blueberry muffin", "$3.25", 7],
          ["Sausage kolache", "$3.50", 12],
          ["Croissant", "$3.75", 3],
        ],
      ],
      [
        "Cakes & pies",
        [
          ["Pecan pie, 9 in", "$24", 3, "Order ahead for holidays"],
          [
            "Chocolate layer cake, 8 in",
            "$32",
            1,
            "Serves 10–12",
            { serves: "10–12" },
          ],
          ["Cookies, half dozen", "$9", 10],
        ],
      ],
    ],
  },
  {
    kind: "goods",
    match: /hardware|lumber|building supply|home center|ace\b|true value/i,
    sections: [
      [
        "Fasteners & hardware",
        [
          [
            "Deck screws 3 in, 5 lb box",
            "$32.99",
            8,
            undefined,
            { brand: "Store brand" },
          ],
          ["Drywall screws 1-5/8 in, 1 lb", "$7.49", 15],
          ["Carriage bolts 3/8 × 4 in", "$0.89 each", 120],
          ["Padlock, 40 mm", "$12.99", 6],
        ],
      ],
      [
        "Plumbing",
        [
          ["PVC pipe 3/4 in × 10 ft", "$4.29", 30],
          ["Wax ring with bolts", "$5.99", 10],
          ["Kitchen faucet, pull-down", "$89", 3],
          ["Water heater element, 4500 W", "$14.99", 5],
        ],
      ],
      [
        "Lawn & garden",
        [
          ["Hardwood mulch, 2 cu ft", "$3.99", 60],
          ["Potting mix, 1 cu ft", "$8.99", 25],
          ["Garden hose 50 ft", "$24.99", 7],
          ["Hand pruners", "$18.99", 9],
        ],
      ],
      [
        "Paint",
        [
          [
            "Interior latex, eggshell, 1 gal",
            "$34.99",
            20,
            "Tinted while you wait",
          ],
          ["Exterior latex, satin, 1 gal", "$42.99", 12],
          ["Roller kit", "$14.99", 10],
        ],
      ],
    ],
  },
  {
    kind: "goods",
    match: /feed|seed|farm supply|co-?op|tractor supply|ag\b/i,
    sections: [
      [
        "Feed",
        [
          [
            "Layer pellets, 50 lb",
            "$18.99",
            24,
            undefined,
            { brand: "Store brand" },
          ],
          ["Sweet feed 12%, 50 lb", "$16.49", 18],
          ["Dog food, 40 lb", "$42.99", 10],
          ["Cracked corn, 50 lb", "$13.99", 15],
        ],
      ],
      [
        "Fencing & hardware",
        [
          ["T-post 6 ft", "$6.99", 80],
          ["Field fence 47 in × 330 ft", "$219", 3],
          ["Gate 12 ft, tube", "$139", 2],
        ],
      ],
      [
        "Seed & lawn",
        [
          ["Bermuda seed, 5 lb", "$44.99", 6],
          ["Fescue blend, 25 lb", "$79.99", 4],
          ["Fertilizer 13-13-13, 40 lb", "$21.99", 20],
        ],
      ],
      [
        "Chicks & supplies",
        [
          ["Rhode Island Red pullets", "$4.99", 30, "Spring only"],
          ["Chick starter, 25 lb", "$15.99", 9],
          ["Waterer, 1 gal", "$9.99", 7],
        ],
      ],
    ],
  },
  {
    kind: "goods",
    match: /thrift|resale|consign|antique|second ?hand|vintage|flea/i,
    sections: [
      [
        "Furniture",
        [
          ["Oak dresser, 6 drawers", "$145", 1, "Booth 12"],
          ["Farmhouse table, seats 6", "$220", 1],
          ["Rocking chair", "$65", 2],
          ["Bookshelf, pine", "$40", 3],
        ],
      ],
      [
        "Housewares",
        [
          ["Cast iron skillet, 10 in", "$28", 2],
          ["Pyrex mixing bowls, set of 3", "$35", 1],
          ["Mason jars, dozen", "$12", 6],
        ],
      ],
      [
        "Clothing & more",
        [
          ["Vintage denim jacket", "$32", 1],
          ["Records, each", "$5", 40],
          ["Framed prints", "$15", 8],
        ],
      ],
    ],
  },
  {
    kind: "goods",
    sections: [
      [
        "New arrivals",
        [
          ["Graphic tee", "$24", 12, "S–XXL"],
          ["Lightweight scarf", "$18", 8],
          ["Canvas tote", "$22", 10],
        ],
      ],
      [
        "Candles & home",
        [
          ["Soy candle, 8 oz", "$16", 15, "Made locally"],
          ["Hand towel set", "$14", 9],
          ["Ceramic mug", "$12", 20],
        ],
      ],
      [
        "Jewelry",
        [
          ["Beaded bracelet", "$14", 18],
          ["Hoop earrings", "$20", 7],
          ["Initial necklace", "$28", 5],
        ],
      ],
    ],
  },
];

/** The sample set for this business: its kind, narrowed by what the name or Google type says. */
export function sampleSetFor(r: BusinessRecord): SampleSet {
  const kind = listKind(r);
  const text = `${r.name} ${r.typeLabel ?? ""} ${r.variant}`;
  const ofKind = SETS.filter((s) => s.kind === kind);
  return (
    ofKind.find((s) => s.match && s.match.test(text)) ??
    ofKind.find((s) => !s.match) ??
    SETS.find((s) => s.kind === "goods" && !s.match)!
  );
}

function toInfo(
  kind: ListKind,
  facts?: Record<string, string>,
): ItemInfo | undefined {
  if (!facts) return undefined;
  const labels = new Map(
    KINDS[kind].fields.map(([key, label]) => [key, label]),
  );
  const info: ItemInfo = {};
  const extra: Array<{ label: string; value: string }> = [];
  for (const [key, value] of Object.entries(facts)) {
    if (
      kind === "fish" &&
      [
        "maxSize",
        "diet",
        "temperament",
        "minTank",
        "care",
        "water",
        "origin",
      ].includes(key)
    )
      (info as unknown as Record<string, string>)[key] = value;
    else extra.push({ label: labels.get(key) ?? key, value });
  }
  if (extra.length) info.facts = extra;
  return info;
}

export const hasSampleStock = (r: BusinessRecord): boolean =>
  (r.ext.retail?.priceList?.sections ?? []).some((s) =>
    s.items.some((it) => it.sample),
  );

/** Adds (or refreshes) the sample sections. Real items stay where they are; sample sections go after them. */
export function addSampleStock(r: BusinessRecord): {
  sections: number;
  items: number;
} {
  removeSampleStock(r);
  const set = sampleSetFor(r);
  const pl = priceList(r);
  const existing = new Set(pl.sections.map((s) => s.name.toLowerCase()));
  let items = 0;
  for (const [name, rows] of set.sections) {
    const secName = existing.has(name.toLowerCase())
      ? `${name} (sample)`
      : name;
    const sec: MenuSection = {
      name: secName,
      items: rows.map(([n, price, qty, note, facts]): MenuItem => {
        items++;
        return {
          name: n,
          price,
          qty,
          description: note,
          info: toInfo(set.kind, facts),
          sample: true,
        };
      }),
    };
    pl.sections.push(sec);
  }
  r.ext.retail!.priceList = {
    ...pl,
    kind: pl.kind ?? set.kind,
    lastUpdated: stamp(),
  };
  return { sections: set.sections.length, items };
}

/** Takes every sample item out, drops sections that are left empty, and forgets sample names the catalog picked up. */
export function removeSampleStock(r: BusinessRecord): number {
  const pl = r.ext.retail?.priceList;
  if (!pl) return 0;
  let removed = 0;
  const names = new Set<string>();
  const sections = pl.sections
    .map((s) => {
      const keep = s.items.filter((it) => {
        if (!it.sample) return true;
        removed++;
        names.add(it.name.toLowerCase());
        return false;
      });
      return { ...s, items: keep };
    })
    .filter((s) => s.items.length);
  const realNames = new Set(
    sections.flatMap((s) => s.items.map((it) => it.name.toLowerCase())),
  );
  const catalog = (pl.catalog ?? []).filter(
    (c) =>
      !names.has(c.name.toLowerCase()) || realNames.has(c.name.toLowerCase()),
  );
  r.ext.retail!.priceList = {
    ...pl,
    sections,
    catalog: catalog.length ? catalog : undefined,
    lastUpdated: removed ? stamp() : pl.lastUpdated,
  };
  if (!sections.length && !catalog.length && !pl.staffPin && !pl.scanning)
    r.ext.retail!.priceList = undefined;
  return removed;
}
