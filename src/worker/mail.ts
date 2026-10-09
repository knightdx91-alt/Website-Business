import type { Env } from "./env.ts";

/**
 * Transactional email (only messages a client asked for, never outreach), sent as the company email in Settings
 * (info@…), whose domain must be verified with the provider. MailerSend (secret MAILERSEND_API_KEY) or Resend
 * (RESEND_API_KEY); without either, nothing is sent and callers fall back to the manual flow.
 */
export function mailReady(env: Env): boolean {
  return !!(env.MAILERSEND_API_KEY || env.RESEND_API_KEY);
}

export async function sendEmail(
  env: Env,
  m: { from: string; fromName: string; to: string; subject: string; text: string; replyTo?: string },
): Promise<boolean> {
  let req: { url: string; key: string; body: unknown } | null = null;
  if (env.MAILERSEND_API_KEY) {
    req = {
      url: "https://api.mailersend.com/v1/email",
      key: env.MAILERSEND_API_KEY,
      body: { from: { email: m.from, name: m.fromName }, to: [{ email: m.to }], subject: m.subject, text: m.text, ...(m.replyTo ? { reply_to: { email: m.replyTo } } : {}) },
    };
  } else if (env.RESEND_API_KEY) {
    req = {
      url: "https://api.resend.com/emails",
      key: env.RESEND_API_KEY,
      body: { from: `${m.fromName} <${m.from}>`, to: [m.to], subject: m.subject, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) },
    };
  }
  if (!req) return false;
  try {
    const res = await fetch(req.url, {
      method: "POST",
      headers: { authorization: `Bearer ${req.key}`, "content-type": "application/json" },
      body: JSON.stringify(req.body),
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
