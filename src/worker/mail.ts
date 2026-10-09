import type { Env } from "./env.ts";

/**
 * Transactional email through Resend (https://resend.com), sent as the company email in Settings (info@…), which
 * must be on a domain verified in Resend. Worker secret RESEND_API_KEY; without it nothing is sent and callers fall
 * back to the manual flow. Only for messages a client asked for (never outreach).
 */
export async function sendEmail(
  env: Env,
  m: { from: string; fromName: string; to: string; subject: string; text: string; replyTo?: string },
): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `${m.fromName} <${m.from}>`, to: [m.to], subject: m.subject, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("email failed", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error("email failed", err);
    return false;
  }
}

/** "p•••@gmail.com", so a page can say where something went without showing the whole address. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return user && domain ? `${user[0]}•••@${domain}` : "your email on file";
}
