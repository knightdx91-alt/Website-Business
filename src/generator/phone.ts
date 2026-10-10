import type { BusinessRecord } from "./types.ts";

/** Normalizes a US number to E.164 and "(256) 555-0123". Returns null if it isn't a valid 10-digit NANP number. */
export function normalizeUsPhone(input: string): { e164: string; display: string } | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return {
    e164: `+1${digits}`,
    display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
  };
}

export function telHref(e164: string): string {
  return `tel:${e164}`;
}

export function smsHref(e164: string): string {
  return `sms:${e164}`;
}

/**
 * Other numbers a site may legitimately link with tel: besides the main line: a towing shop's tow line and an
 * insurance agency's carrier claims numbers. The lint allows these; anything else is a wrong number.
 */
export function extraPhones(r: BusinessRecord): string[] {
  const raw: string[] = [];
  if (r.ext.auto?.tow?.phone) raw.push(r.ext.auto.tow.phone);
  for (const c of r.ext.finance?.carriers ?? []) if (typeof c !== "string" && c.claimsPhone) raw.push(c.claimsPhone);
  return raw.map((p) => normalizeUsPhone(p)?.e164).filter((p): p is string => !!p);
}
