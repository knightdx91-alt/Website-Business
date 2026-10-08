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
