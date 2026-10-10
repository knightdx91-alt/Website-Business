import type { Env } from "./env.ts";

/**
 * Transactional email (only messages a client asked for, never outreach), sent as the company email in Settings
 * (info@…), whose domain must be verified with the provider. Resend (secret RESEND_API_KEY) or MailerSend
 * (MAILERSEND_API_KEY); without either, nothing is sent and callers fall back to the manual flow.
 */
export function mailReady(env: Env): boolean {
  return !!(env.MAILERSEND_API_KEY || env.RESEND_API_KEY);
}

export async function sendEmail(
  env: Env,
  m: { from: string; fromName: string; to: string; subject: string; text: string; replyTo?: string; attachments?: MailAttachment[] },
): Promise<boolean> {
  return (await sendEmailDetailed(env, m)).ok;
}

/** Same as sendEmail, plus which provider was used and the provider's error text (for the Settings test button). */
export interface MailAttachment {
  filename: string;
  /** Base64 of the file bytes. */
  content: string;
  contentType?: string;
}

export async function sendEmailDetailed(
  env: Env,
  m: { from: string; fromName: string; to: string; subject: string; text: string; replyTo?: string; attachments?: MailAttachment[] },
): Promise<{ ok: boolean; provider: "resend" | "mailersend" | null; error?: string }> {
  let req: { url: string; key: string; body: unknown } | null = null;
  // Resend wins when both keys are set (MailerSend turned the account down in Oct 2026).
  if (env.RESEND_API_KEY) {
    req = {
      url: "https://api.resend.com/emails",
      key: env.RESEND_API_KEY,
      body: {
        from: `${m.fromName} <${m.from}>`,
        to: [m.to],
        subject: m.subject,
        text: m.text,
        ...(m.replyTo ? { reply_to: m.replyTo } : {}),
        ...(m.attachments?.length ? { attachments: m.attachments.map((a) => ({ filename: a.filename, content: a.content, ...(a.contentType ? { content_type: a.contentType } : {}) })) } : {}),
      },
    };
  } else if (env.MAILERSEND_API_KEY) {
    req = {
      url: "https://api.mailersend.com/v1/email",
      key: env.MAILERSEND_API_KEY,
      body: {
        from: { email: m.from, name: m.fromName },
        to: [{ email: m.to }],
        subject: m.subject,
        text: m.text,
        ...(m.replyTo ? { reply_to: { email: m.replyTo } } : {}),
        ...(m.attachments?.length ? { attachments: m.attachments.map((a) => ({ filename: a.filename, content: a.content, disposition: "attachment" })) } : {}),
      },
    };
  }
  const provider = env.RESEND_API_KEY ? "resend" : env.MAILERSEND_API_KEY ? "mailersend" : null;
  if (!req) return { ok: false, provider, error: "No email key is set" };
  try {
    const res = await fetch(req.url, {
      method: "POST",
      headers: { authorization: `Bearer ${req.key}`, "content-type": "application/json" },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, provider };
    const error = `${res.status} ${(await res.text()).slice(0, 300)}`;
    console.error("email failed", error);
    return { ok: false, provider, error };
  } catch (err) {
    console.error("email failed", err);
    return { ok: false, provider, error: String(err) };
  }
}

/** "p•••@gmail.com", so a page can say where something went without showing the whole address. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return user && domain ? `${user[0]}•••@${domain}` : "your email on file";
}
