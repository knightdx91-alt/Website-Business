import { raw, type Raw } from "./html.ts";

const PATHS = {
  phone:
    '<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
  clock:
    '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.2 3.1.8-1.3-4.5-2.7z"/>',
  bag: '<path d="M18 7h-2a4 4 0 0 0-8 0H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-6-2a2 2 0 0 1 2 2h-4a2 2 0 0 1 2-2zm6 15H6V9h2v2h2V9h4v2h2V9h2z"/>',
  calendar:
    '<path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14zm0-12H5V6h14z"/>',
  menu: '<path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/>',
  close: '<path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/>',
  star: '<path d="M12 17.3 18.2 21l-1.6-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.4 14l-1.6 7z"/>',
  check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>',
  message:
    '<path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H5.2L4 17.2V4h16z"/>',
  list: '<path d="M4 6h2v2H4zm4 0h12v2H8zM4 11h2v2H4zm4 0h12v2H8zm-4 5h2v2H4zm4 0h12v2H8z"/>',
  clipboard:
    '<path d="M19 3h-4.2a3 3 0 0 0-5.6 0H5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 17H5V5h2v3h10V5h2z"/>',
  wrench:
    '<path d="M22.7 19 13.6 9.9a6.4 6.4 0 0 0-1.5-6.8 6.6 6.6 0 0 0-7.4-1.3l4.3 4.3-3 3-4.4-4.3a6.6 6.6 0 0 0 8.1 8.9l9.1 9.1a1 1 0 0 0 1.4 0l2.5-2.4a1 1 0 0 0 0-1.4z"/>',
  arrow: '<path d="M12 4l-1.4 1.4 5.6 5.6H4v2h12.2l-5.6 5.6L12 20l8-8z"/>',
  // Service icons (Oct 2026): drawn as 2px strokes so a plumber's six services aren't six wrenches. `S` marks a stroke icon.
  droplet: 'S<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
  flame: 'S<path d="M12 22c4 0 7-2.8 7-6.8 0-3.4-2.2-5.7-3.6-7.6-.6 1.8-1.6 2.9-2.9 3.4.3-3-1-6-3.5-8C9 6.6 5 9.6 5 15.2 5 19.2 8 22 12 22z"/><path d="M12 22c-1.8 0-3.2-1.4-3.2-3.2 0-1.6 1.2-2.6 2-3.8.9.9 1.5 1.4 2.8 1.8 1 .3 1.6 1.1 1.6 2 0 1.8-1.4 3.2-3.2 3.2z"/>',
  snowflake: 'S<path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/><path d="m12 2 2.5 2.5M12 2 9.5 4.5M12 22l2.5-2.5M12 22l-2.5-2.5M2 12l2.5 2.5M2 12l2.5-2.5M22 12l-2.5 2.5M22 12l-2.5-2.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  home: '<path d="m12 3 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V11z"/>',
  leaf: 'S<path d="M4 20c0-9 5-15 16-16-1 11-7 16-16 16z"/><path d="M4 20c3-5 7-9 11-11"/>',
  sparkles: 'S<path d="M12 3c.8 4 2.5 6 7 7-4.5 1-6.2 3-7 7-.8-4-2.5-6-7-7 4.5-1 6.2-3 7-7z"/><path d="M19 16c.3 1.6 1 2.4 2.5 2.7-1.5.3-2.2 1.1-2.5 2.8-.3-1.7-1-2.5-2.5-2.8 1.5-.3 2.2-1.1 2.5-2.7zM5 2c.3 1.4.9 2 2.3 2.3C5.9 4.6 5.3 5.2 5 6.6 4.7 5.2 4.1 4.6 2.7 4.3 4.1 4 4.7 3.4 5 2z"/>',
  car: 'S<path d="M5 16h14M6.5 16 8 10.5A2 2 0 0 1 9.9 9h4.2a2 2 0 0 1 1.9 1.5L17.5 16"/><path d="M4 16v3h3v-2h10v2h3v-3a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
  truck: 'S<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  shield: 'S<path d="M12 3 5 6v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  scissors: 'S<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M20 4 8.3 15.7M20 20 8.3 8.3M14 12l2 2"/>',
  heart: 'S<path d="M12 20s-7.5-4.6-9.3-9A5 5 0 0 1 12 6.8 5 5 0 0 1 21.3 11c-1.8 4.4-9.3 9-9.3 9z"/>',
  dollar: 'S<path d="M12 2v20M16.5 7.5A3.5 3.5 0 0 0 13 5h-2.5a3.5 3.5 0 0 0 0 7h3a3.5 3.5 0 0 1 0 7H10a3.5 3.5 0 0 1-3.5-3.5"/>',
  tag: 'S<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  tooth: 'S<path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4 1.5 7.5S5.5 21 7 21c1.8 0 2-4 3-5.5.5-.8 1-1 2-1s1.5.2 2 1c1 1.5 1.2 5.5 3 5.5 1.5 0 2.5-2.5 2.5-6S21 10.5 21 7.5C21 5 19.5 3 17 3c-2 0-3 1.2-5 1.2S9 3 7 3z"/>',
  paw: 'S<circle cx="7" cy="8" r="2"/><circle cx="12" cy="5.5" r="2"/><circle cx="17" cy="8" r="2"/><path d="M12 10c-3 0-6 3.5-6 6.5 0 1.5 1 2.5 2.5 2.5 1.2 0 2-.6 3.5-.6s2.3.6 3.5.6c1.5 0 2.5-1 2.5-2.5 0-3-3-6.5-6-6.5z"/>',
  book: 'S<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  camera: 'S<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 20): Raw {
  const d = PATHS[name] as string;
  const stroke = d.startsWith("S");
  return raw(
    stroke
      ? `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d.slice(1)}</svg>`
      : `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${d}</svg>`,
  );
}

/** Keyword → icon, so a services list shows what each line is about instead of one repeated wrench. First match wins. */
const SERVICE_ICONS: Array<[RegExp, IconName]> = [
  [/\b(tow|towing|haul|hauling|deliver|delivery|moving|pickup|dump|junk)\b/i, "truck"],
  [/\b(a\/c|ac|air[- ]?condition\w*|cooling|freez\w*|refrigerat\w*|ice|frost|hvac)\b/i, "snowflake"],
  [/\b(heat\w*|furnace|boiler|fire\w*|grill\w*|smok\w*|bbq|barbecue|hot\b|oven|bak\w*)\b/i, "flame"],
  [/\b(leak\w*|pipe\w*|plumb\w*|drain\w*|sewer|septic|faucet|toilet|water|sink|pressure wash\w*|irrigat\w*|sprinkler\w*|pool)\b/i, "droplet"],
  [/\b(electric\w*|wiring|rewir\w*|panel|breaker|lighting|lights?|generator|outlet|power)\b/i, "bolt"],
  [/\b(roof\w*|gutter\w*|siding|remodel\w*|renovat\w*|kitchen|bath\w*|home|house\w*|window\w*|door\w*|deck\w*|fence|fencing|floor\w*|drywall|paint\w*|cabinet\w*|insulat\w*|foundation|concrete|garage)\b/i, "home"],
  [/\b(lawn|mow\w*|landscap\w*|tree\w*|shrub\w*|hedge\w*|mulch\w*|garden\w*|sod|seed\w*|fertiliz\w*|weed\w*|leaf|leaves|yard|plant\w*|flower\w*|bouquet\w*|floral)\b/i, "leaf"],
  [/\b(clean\w*|wash\w*|detail\w*|sanitiz\w*|disinfect\w*|carpet\w*|move[- ]?(in|out)|janitor\w*|maid|tidy|dust\w*|polish\w*|shine)\b/i, "sparkles"],
  [/\b(brake\w*|oil|tire\w*|engine\w*|transmission|alignment|inspection\w*|diagnos\w*|battery|batteries|car|cars|vehicle\w*|auto|truck repair|suspension|exhaust|muffler|tune[- ]?up|check engine)\b/i, "car"],
  [/\b(warranty|warranties|insur\w*|guarantee\w*|protect\w*|security|safety|pest|termite\w*|bug\w*|mosquito\w*|rodent\w*)\b/i, "shield"],
  [/\b(cut\w*|fade\w*|trim\w*|shave\w*|color\w*|highlight\w*|style|styling|blowout|hair\w*|beard|nail\w*|manicure|pedicure|wax\w*|lash\w*|brow\w*|braid\w*|perm|extension\w*)\b/i, "scissors"],
  [/\b(massage|spa|facial\w*|wellness|therap\w*|relax\w*|care|health\w*|senior\w*|baby|kids?|children|youth|family|families|wedding\w*|sympathy|prayer|worship|ministr\w*|fellowship|love)\b/i, "heart"],
  [/\b(tax\w*|bookkeep\w*|payroll|account\w*|audit\w*|loan\w*|invoice\w*|pric\w*|fee\w*|financ\w*|budget\w*|refund\w*|quote\w*|estimate\w*|billing|pay\w*)\b/i, "dollar"],
  [/\b(dental|dentist\w*|teeth|tooth|orthodont\w*|whitening)\b/i, "tooth"],
  [/\b(pets?|dogs?|cats?|puppy|puppies|kitten\w*|groom\w*|boarding|vet\w*|animal\w*|livestock|feed)\b/i, "paw"],
  [/\b(bible|sunday school|class\w*|lesson\w*|tutor\w*|study|studies|school|training|course\w*|workshop\w*|book\w*|read\w*)\b/i, "book"],
  [/\b(photo\w*|portrait\w*|headshot\w*|video\w*|film\w*|camera)\b/i, "camera"],
  [/\b(shirt\w*|tee\w*|print\w*|sign\w*|banner\w*|embroider\w*|decal\w*|label\w*|sticker\w*|logo\w*|merch\w*|apparel|uniform\w*|hat\w*|cap\w*)\b/i, "tag"],
  [/\b(event\w*|party|parties|birthday\w*|rental\w*|bounce\w*|tent\w*|book\w*|appointment\w*|schedul\w*|reserv\w*|cater\w*)\b/i, "calendar"],
];

export function serviceIcon(title: string, fallback: IconName): IconName {
  for (const [re, name] of SERVICE_ICONS) if (re.test(title)) return name;
  return fallback;
}
